import { AgentError, object, textValue, invalid } from "./agent-auth.ts";
import { pick, checkVersion } from "./agent-controls.ts";
import type { AgentTransaction, Data } from "./agent-store.ts";
export const ticketProjection = (d: Data) =>
  pick(d, [
    "ownerUid",
    "ownerName",
    "title",
    "category",
    "status",
    "createdAt",
    "updatedAt",
    "isPriority",
  ]);
export function messageProjection(d: Data) {
  return {
    ...pick(d, ["senderUid", "senderName", "text", "createdAt", "channel"]),
    ...(d.image
      ? { attachment: { kind: "image", inlineDataOmitted: true } }
      : {}),
  };
}
export async function changeTicket(
  tx: AgentTransaction,
  ticketId: string,
  action: string,
  input: unknown,
  expected: Data,
  actorUid: string,
  grantId: string,
  operationKey: string,
) {
  const p = object(input, action === "replies" ? ["text"] : ["status"]);
  if (action === "replies") textValue(p.text, 5000, 1);
  else if (!["open", "in_progress", "resolved"].includes(p.status))
    invalid("Invalid ticket status.");
  const path = `support_tickets/${ticketId}`,
    doc = await tx.read(path);
  checkVersion(doc.version, expected, "ticket");
  if (!doc.data) throw new AgentError("missing", "Ticket not found.", 404);
  if (action === "replies") {
    if (doc.data.status === "resolved")
      throw new AgentError(
        "conflict",
        "Reopen the ticket before replying.",
        409,
      );
    tx.create(
      `${path}/messages/${operationKey}`,
      {
        senderUid: actorUid,
        senderName: "Hermes · Administrator",
        text: p.text,
        channel: "agent",
        agentGrantId: grantId,
      },
      ["createdAt"],
    );
    tx.patch(path, {}, ["updatedAt"]);
    return {
      data: { ticketId, messageId: operationKey, status: doc.data.status },
      changed: ["reply"],
    };
  }
  tx.patch(path, { status: p.status }, ["updatedAt"]);
  return { data: { ticketId, status: p.status }, changed: ["status"] };
}
