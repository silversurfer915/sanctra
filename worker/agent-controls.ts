import {
  AgentError,
  object,
  integer,
  textValue,
  invalid,
} from "./agent-auth.ts";
import type { AgentTransaction, Data } from "./agent-store.ts";
import {
  DEFAULT_AI_CONFIG,
  DEFAULT_AI_ACCESS,
} from "../src/features/ai-admin/config.ts";
export const PLATFORM_DEFAULTS = {
  groupsEnabled: true,
  supportEnabled: true,
  rankingsEnabled: true,
  maintenanceMode: false,
  syllabusEnabled: false,
  jeeTrackEnabled: false,
  sitePaused: false,
  chatEnabled: true,
  chatAttachmentsEnabled: true,
  groupCreationEnabled: true,
  announcementPopupsEnabled: true,
  notice: "",
  maintenanceMessage: "",
  maintenanceEta: "",
  noticeType: "info",
  pauseStartsAt: 0,
  pauseEndsAt: 0,
  noticeEndsAt: 0,
};
export function checkVersion(actual: string, expected: Data, key: string) {
  if (typeof expected[key] !== "string")
    invalid(`expectedVersions.${key} is required.`);
  if (actual !== expected[key])
    throw new AgentError(
      "conflict",
      "The record changed. Reload before editing.",
      409,
    );
}
export function pick(data: Data | null, keys: string[]): Data {
  return Object.fromEntries(
    keys
      .filter(
        (k) =>
          data &&
          data[k] !== undefined &&
          (data[k] === null ||
            typeof data[k] === "boolean" ||
            (typeof data[k] === "number" && Number.isFinite(data[k])) ||
            (typeof data[k] === "string" &&
              data[k].length <= 5000 &&
              !data[k].startsWith("data:"))),
      )
      .map((k) => [k, data![k]]),
  );
}
export function controlsProjection(
  kind: string,
  data: Data | null,
  now: number,
) {
  const defaults =
    kind === "platform"
      ? PLATFORM_DEFAULTS
      : kind === "aiAccess"
        ? DEFAULT_AI_ACCESS
        : DEFAULT_AI_CONFIG;
  const value: Data = { ...defaults, ...pick(data, Object.keys(defaults)) };
  return kind === "platform"
    ? {
        ...value,
        effectiveSitePaused:
          value.sitePaused &&
          (!value.pauseStartsAt || value.pauseStartsAt <= now) &&
          (!value.pauseEndsAt || value.pauseEndsAt > now),
      }
    : value;
}
export function validateControlPatch(kind: string, input: unknown) {
  const defaults =
      kind === "platform"
        ? PLATFORM_DEFAULTS
        : kind === "aiAccess"
          ? DEFAULT_AI_ACCESS
          : DEFAULT_AI_CONFIG,
    p = object(input, Object.keys(defaults));
  if (!Object.keys(p).length) invalid("Supply at least one control.");
  for (const [k, v] of Object.entries(p)) {
    if (["dailyLimit", "extraDaily"].includes(k)) {
      if (k === "dailyLimit" && v === null) continue;
      integer(v, 0, 1000000);
    } else if (k === "requestsPerMinute") {
      if (kind === "aiAccess" && v === null) continue;
      integer(v, 1, 60);
    } else if (k === "inputPricePerMillion" || k === "outputPricePerMillion") {
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1000)
        invalid("Invalid cost.");
    } else if (["pauseStartsAt", "pauseEndsAt", "noticeEndsAt"].includes(k))
      integer(v, 0, 4102444800000);
    else if (k === "noticeType") {
      if (!["info", "warning", "maintenance"].includes(v))
        invalid("Invalid notice type.");
    } else if (k === "model") {
      textValue(v, 100);
      if (v && !/^gemini-[A-Za-z0-9._-]+$/.test(v))
        invalid("Invalid Gemini model.");
    } else if (typeof (defaults as Data)[k] === "boolean") {
      if (typeof v !== "boolean") invalid("Invalid switch.");
    } else
      textValue(
        v,
        k === "notice" || kind === "aiConfig"
          ? 300
          : k === "maintenanceEta"
            ? 150
            : 2000,
        kind === "aiConfig" ? 1 : 0,
      );
  }
  return p;
}
export async function changeControls(
  tx: AgentTransaction,
  kind: string,
  path: string,
  input: unknown,
  expected: Data,
  actorUid: string,
  now: number,
  auditId: string,
) {
  const patch = validateControlPatch(kind, input),
    doc = await tx.read(path);
  checkVersion(doc.version, expected, kind);
  const next = { ...doc.data, ...patch };
  if (
    kind === "platform" &&
    next.pauseStartsAt &&
    next.pauseEndsAt &&
    next.pauseEndsAt <= next.pauseStartsAt
  )
    invalid("Pause end must follow its start.");
  const defaults =
    kind === "platform"
      ? PLATFORM_DEFAULTS
      : kind === "aiAccess"
        ? DEFAULT_AI_ACCESS
        : DEFAULT_AI_CONFIG;
  tx.patch(
    path,
    {
      ...(!doc.data ? defaults : {}),
      ...patch,
      [kind === "aiAccess"
        ? "grantedBy"
        : kind === "aiConfig"
          ? "updatedBy"
          : "actorUid"]: actorUid,
    },
    ["updatedAt"],
  );
  if (kind === "platform")
    tx.create(
      `platform_operations_audit/${auditId}`,
      {
        actorUid,
        changed: Object.keys(patch),
        sitePaused: !!next.sitePaused,
        notice: next.notice || "",
      },
      ["createdAt"],
    );
  return {
    data: controlsProjection(kind, next, now),
    changed: Object.keys(patch),
    controlBefore: pick(doc.data, Object.keys(patch)),
    controlAfter: patch,
  };
}
