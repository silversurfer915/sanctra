import type { AgentReader } from "./agent-store.ts";
export const AGENT_SCOPES = [
  "users:read",
  "users:write",
  "study:read",
  "study:write",
  "study:delete",
  "support:read",
  "support:write",
  "ai:read",
  "ai:write",
  "platform:read",
  "platform:write",
  "audit:read",
] as const;
export type AgentScope = (typeof AGENT_SCOPES)[number];
export class AgentError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  constructor(code: string, message: string, status = 400, retryable = false) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
export const invalid = (message = "Invalid request."): never => {
  throw new AgentError("validation", message);
};
export function object(
  value: unknown,
  keys: readonly string[],
): Record<string, any> {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== "object" ||
    Object.keys(value).some((k) => !keys.includes(k))
  )
    invalid("Unknown or invalid fields.");
  return value as Record<string, any>;
}
export function id(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value))
    invalid("Invalid identifier.");
  return value as string;
}
export function textValue(value: unknown, max: number, min = 0): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    value.trim().length < min
  )
    invalid("Invalid text.");
  return value as string;
}
export function integer(value: unknown, min: number, max: number): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < min ||
    Number(value) > max
  )
    invalid("Invalid number.");
  return value as number;
}
export const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
export const hash = async (raw: string) =>
  b64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw)),
    ),
  );
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical((value as any)[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export interface AgentGrant {
  id: string;
  label: string;
  creatorUid: string;
  scopes: AgentScope[];
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  secretHash: string;
}
export async function issueAgentToken(
  creatorUid: string,
  label: string,
  scopes: AgentScope[],
  days: number | null,
  now: number,
) {
  const grantId = b64(crypto.getRandomValues(new Uint8Array(16))),
    secret = b64(crypto.getRandomValues(new Uint8Array(32)));
  const record: AgentGrant = {
    id: grantId,
    label,
    creatorUid,
    scopes,
    createdAt: new Date(now).toISOString(),
    expiresAt:
      days === null ? null : new Date(now + days * 86400000).toISOString(),
    revokedAt: null,
    secretHash: await hash(secret),
  };
  return { token: `sanctra_agent_${grantId}.${secret}`, record };
}
export function grantSummary(g: AgentGrant, version: string) {
  return {
    id: g.id,
    label: g.label,
    creatorUid: g.creatorUid,
    scopes: g.scopes,
    createdAt: g.createdAt,
    expiresAt: g.expiresAt,
    revokedAt: g.revokedAt,
    version,
  };
}
export async function requireAdmin(reader: AgentReader, uid: string) {
  const role = await reader.read(`admins/${id(uid)}`);
  if (
    !role.data ||
    role.data.enabled === false ||
    role.data.disabled === true ||
    role.data.active === false
  )
    throw new AgentError(
      "forbidden",
      "An active administrator role is required.",
      403,
    );
  return role;
}
export async function authenticateAgent(
  reader: AgentReader,
  token: string,
  scope: AgentScope | null,
  now: number,
) {
  const match = /^sanctra_agent_([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(
    token,
  );
  if (!match)
    throw new AgentError(
      "unauthenticated",
      "A valid agent credential is required.",
      401,
    );
  const doc = await reader.read(`agent_grants/${match[1]}`),
    g = doc.data as unknown as AgentGrant | null;
  const candidate = await hash(match[2]);
  let difference = candidate.length ^ (g?.secretHash?.length || 0);
  for (let i = 0; i < candidate.length; i++)
    difference |= candidate.charCodeAt(i) ^ (g?.secretHash?.charCodeAt(i) || 0);
  if (!g || difference || g.revokedAt)
    throw new AgentError(
      "unauthenticated",
      "A valid agent credential is required.",
      401,
    );
  if (
    g.expiresAt !== null &&
    (!Number.isFinite(Date.parse(g.expiresAt)) ||
      Date.parse(g.expiresAt) <= now)
  )
    throw new AgentError("expired", "The agent credential has expired.", 401);
  await requireAdmin(reader, g.creatorUid);
  if (scope && (!Array.isArray(g.scopes) || !g.scopes.includes(scope)))
    throw new AgentError(
      "forbidden",
      "The credential does not grant this scope.",
      403,
    );
  return { grant: g, version: doc.version };
}
