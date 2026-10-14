import { AgentError } from "./agent-auth.ts";
export type Data = Record<string, any>;
export interface AgentDocument {
  data: Data | null;
  version: string;
  id?: string;
}
export interface AgentQuery {
  collection: string;
  filters?: Array<{ field: string; value: unknown }>;
  after?: string;
  limit: number;
}
export interface AgentReader {
  read(path: string): Promise<AgentDocument>;
}
export interface AgentTransaction extends AgentReader {
  query(query: AgentQuery): Promise<AgentDocument[]>;
  create(path: string, data: Data, timestamps?: string[]): void;
  delete?(path:string):void;
  patch(path: string, data: Data, timestamps?: string[]): void;
}
export interface AgentStore {
  transact<T>(work: (tx: AgentTransaction) => Promise<T>): Promise<T>;
}
export const committedVersion = (path: string) =>
  `@agent-committed-version:${path}`;
export function resolveCommittedVersions<T>(
  result: T,
  versions: Map<string, string>,
): T {
  const resolve = (v: any): any =>
    typeof v === "string" && v.startsWith("@agent-committed-version:")
      ? versions.get(v.slice(25)) || v
      : Array.isArray(v)
        ? v.map(resolve)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v).map(([k, x]) => [k, resolve(x)]),
            )
          : v;
  return resolve(result);
}
const decode = (v: any): any =>
  v?.stringValue ??
  (v?.integerValue !== undefined
    ? Number(v.integerValue)
    : (v?.doubleValue ??
      v?.booleanValue ??
      v?.timestampValue ??
      (v?.arrayValue
        ? (v.arrayValue.values || []).map(decode)
        : v?.mapValue
          ? Object.fromEntries(
              Object.entries(v.mapValue.fields || {}).map(([k, x]) => [
                k,
                decode(x),
              ]),
            )
          : null)));
const encode = (v: any): any =>
  v === null || v === undefined
    ? { nullValue: null }
    : typeof v === "string"
      ? { stringValue: v }
      : typeof v === "boolean"
        ? { booleanValue: v }
        : typeof v === "number"
          ? Number.isInteger(v)
            ? { integerValue: String(v) }
            : { doubleValue: v }
          : Array.isArray(v)
            ? { arrayValue: { values: v.map(encode) } }
            : {
                mapValue: {
                  fields: Object.fromEntries(
                    Object.entries(v).map(([k, x]) => [k, encode(x)]),
                  ),
                },
              };
const unpack = (doc: any): AgentDocument => ({
  id: doc.name.split("/").at(-1),
  data: Object.fromEntries(
    Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)]),
  ),
  version: doc.updateTime,
});
/** All data and authorization reads share the Firestore transaction snapshot. No write-only fallback. */
export function createFirestoreAgentStore(
  base: string,
  token: string,
  fetcher: typeof fetch = fetch,
): AgentStore {
  const headers = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    root = base.split("/v1/")[1];
  const call = async (url: string, body: unknown) =>
    fetcher(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  return {
    async transact(work) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const begin = await call(`${base}:beginTransaction`, {
          options: { readWrite: {} },
        });
        if (!begin.ok)
          throw new AgentError(
            "unavailable",
            "Storage is unavailable.",
            503,
            true,
          );
        const { transaction } = (await begin.json()) as any;
        const reads = new Map<string, AgentDocument>(),
          writes: any[] = [];
        const tx: AgentTransaction = {
          async read(path) {
            if (reads.has(path)) return reads.get(path)!;
            const r = await call(`${base}:batchGet`, {
              documents: [`${root}/${path}`],
              transaction,
            });
            if (!r.ok) throw Error("Read failed");
            const raw = (await r.json()) as any;
            const entry = (Array.isArray(raw) ? raw : [raw])[0];
            if (!entry?.found && !entry?.missing) throw Error("Invalid read");
            const doc = entry.found
              ? unpack(entry.found)
              : { data: null, version: "" };
            reads.set(path, doc);
            return doc;
          },
          async query(q) {
            const parts = q.collection.split("/"),
              collectionId = parts.pop()!,
              parent = parts.length ? `${base}/${parts.join("/")}` : base;
            const filters = (q.filters || []).map((f) => ({
              fieldFilter: {
                field: { fieldPath: f.field },
                op: "EQUAL",
                value: encode(f.value),
              },
            }));
            const structuredQuery = {
              from: [{ collectionId }],
              orderBy: [
                { field: { fieldPath: "__name__" }, direction: "ASCENDING" },
              ],
              limit: q.limit,
              ...(filters.length
                ? {
                    where:
                      filters.length === 1
                        ? filters[0]
                        : { compositeFilter: { op: "AND", filters } },
                  }
                : {}),
              ...(q.after
                ? {
                    startAt: {
                      values: [
                        {
                          referenceValue: `${root}/${q.collection}/${q.after}`,
                        },
                      ],
                      before: false,
                    },
                  }
                : {}),
            };
            const r = await call(`${parent}:runQuery`, {
              structuredQuery,
              transaction,
            });
            if (!r.ok) throw Error("Query failed");
            const raw = (await r.json()) as any[];
            return raw
              .filter((e) => e.document)
              .map((e) => {
                const d = unpack(e.document);
                reads.set(`${q.collection}/${d.id}`, d);
                return d;
              });
          },
          delete(path){if(!reads.has(path))throw Error("Delete requires a versioned read");const version=reads.get(path)!.version;if(version)writes.push({delete:`${root}/${path}`,currentDocument:{updateTime:version}});},
          create(path, data, timestamps = []) {
            writes.push({
              update: {
                name: `${root}/${path}`,
                fields: Object.fromEntries(
                  Object.entries(data).map(([k, v]) => [k, encode(v)]),
                ),
              },
              currentDocument: { exists: false },
              ...(timestamps.length
                ? {
                    updateTransforms: timestamps.map((fieldPath) => ({
                      fieldPath,
                      setToServerValue: "REQUEST_TIME",
                    })),
                  }
                : {}),
            });
          },
          patch(path, data, timestamps = []) {
            if (!reads.has(path))
              throw Error("Patch requires a versioned read");
            const version = reads.get(path)!.version;
            writes.push({
              update: {
                name: `${root}/${path}`,
                fields: Object.fromEntries(
                  Object.entries(data).map(([k, v]) => [k, encode(v)]),
                ),
              },
              updateMask: { fieldPaths: Object.keys(data) },
              currentDocument: version
                ? { updateTime: version }
                : { exists: false },
              ...(timestamps.length
                ? {
                    updateTransforms: timestamps.map((fieldPath) => ({
                      fieldPath,
                      setToServerValue: "REQUEST_TIME",
                    })),
                  }
                : {}),
            });
          },
        };
        try {
          const result = await work(tx);
          const commit = await call(`${base}:commit`, { writes, transaction });
          if (commit.ok) {
            const output = (await commit.json()) as any;
            return resolveCommittedVersions(
              result,
              new Map(
                writes.map((w, i) => [
                  (w.update?.name||w.delete).slice(root.length + 1),
                  output.writeResults[i].updateTime||output.commitTime,
                ]),
              ),
            );
          }
          if (![409, 412].includes(commit.status)) throw Error("Commit failed");
        } catch (e) {
          await call(`${base}:rollback`, { transaction }).catch(() => {});
          throw e;
        }
        await call(`${base}:rollback`, { transaction }).catch(() => {});
      }
      throw new AgentError(
        "conflict",
        "Concurrent change; reload before retrying.",
        409,
        true,
      );
    },
  };
}
