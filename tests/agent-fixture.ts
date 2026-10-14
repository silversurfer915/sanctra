import { createAgentApi } from "../worker/agent-api.ts";
import { issueAgentToken } from "../worker/agent-auth.ts";
import type {
  AgentStore,
  AgentTransaction,
  Data,
} from "../worker/agent-store.ts";
import { resolveCommittedVersions } from "../worker/agent-store.ts";
export function memoryStore(seed: Record<string, Data> = {}) {
  const docs = new Map(
    Object.entries(seed).map(([k, data]) => [
      k,
      { data: structuredClone(data), version: "v1" },
    ]),
  );
  let serial = 1;
  let failAudit = false;
  let beforeCommit: (() => void) | undefined;
  const store: AgentStore = {
    async transact(work) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const snapshot = structuredClone(docs),
          staged: Array<() => void> = [];
        const tx: AgentTransaction = {
          read: async (p) =>
            structuredClone(snapshot.get(p) || { data: null, version: "" }),
          query: async (q) =>
            [...snapshot]
              .filter(
                ([p, d]) =>
                  p.startsWith(q.collection + "/") &&
                  p.split("/").length === q.collection.split("/").length + 1 &&
                  (!q.after || p.split("/").at(-1)! > q.after) &&
                  (q.filters || []).every((f) => d.data[f.field] === f.value),
              )
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(0, q.limit)
              .map(([p, d]) => ({
                ...structuredClone(d),
                id: p.split("/").at(-1),
              })),
          delete(p){staged.push(()=>{docs.delete(p);});},
          create(p, d, ts = []) {
            if (snapshot.has(p)) throw Error("exists");
            staged.push(() => {
              if (failAudit && p.startsWith("agent_audit/"))
                throw Error("audit failed");
              docs.set(p, {
                data: {
                  ...structuredClone(d),
                  ...Object.fromEntries(ts.map((k) => [k, "server-time"])),
                },
                version: "v" + ++serial,
              });
            });
          },
          patch(p, d, ts = []) {
            staged.push(() =>
              docs.set(p, {
                data: {
                  ...docs.get(p)?.data,
                  ...structuredClone(d),
                  ...Object.fromEntries(ts.map((k) => [k, "server-time"])),
                },
                version: "v" + ++serial,
              }),
            );
          },
        };
        const result = await work(tx);
        const hook = beforeCommit;
        beforeCommit = undefined;
        hook?.();
        if (JSON.stringify([...snapshot]) !== JSON.stringify([...docs]))
          continue;
        try {
          for (const write of staged) write();
        } catch (e) {
          docs.clear();
          for (const [k, v] of snapshot) docs.set(k, v);
          throw e;
        }
        return resolveCommittedVersions(
          result,
          new Map([...docs].map(([k, v]) => [k, v.version])),
        );
      }
      throw Error("Concurrent changes");
    },
  };
  return {
    store,
    docs,
    setFailAudit: (b: boolean) => {
      failAudit = b;
    },
    setBeforeCommit: (hook: () => void) => {
      beforeCommit = hook;
    },
  };
}
export const now = 1800000000000,
  env = {
    FIREBASE_PROJECT_ID: "demo",
    ALLOWED_ORIGIN: "https://sanctra.test",
    PERSONAL_OWNER_UID: "owner",
  };
export async function fixture(
  scopes: any[] = [
    "ai:write",
    "ai:read",
    "users:read",
    "study:read",
    "study:write",
    "support:read",
    "support:write",
    "platform:read",
    "platform:write",
    "audit:read",
  ],
) {
  const issued = await issueAgentToken("owner", "Hermes", scopes, 30, now),
    m = memoryStore({
      [`agent_grants/${issued.record.id}`]: issued.record,
      "admins/owner": {},
      "users/u": {
        subjects: [{ id: "physics", name: "Physics" }],
        tasks: [],
        sessions: [],
      },
    });
  const api = createAgentApi({
    store: m.store,
    now: () => now,
    verifyIdentity: async () => ({ uid: "owner", authTime: now / 1000 }),
    rateLimit: async () => true,
  });
  const call = async (
    path: string,
    method = "GET",
    body?: unknown,
    token = issued.token,
    origin?: string,
  ) =>
    api(
      new Request("https://api.test/v1/agent" + path, {
        method,
        headers: {
          authorization: "Bearer " + token,
          ...(origin ? { origin } : {}),
          "content-type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
      env,
    );
  return { ...m, issued, api, call };
}
