import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./agent-fixture.ts";
test("reply retries never duplicate, attribution is real admin and attachment data is omitted", async () => {
  const f = await fixture();
  f.docs.set("support_tickets/t", {
    version: "t1",
    data: { ownerUid: "u", status: "open" },
  });
  const b = {
    operationId: "reply",
    reason: "Help",
    expectedVersions: { ticket: "t1" },
    input: { text: "Hello" },
  };
  assert.equal((await f.call("/tickets/t/replies", "POST", b)).status, 200);
  assert.equal((await f.call("/tickets/t/replies", "POST", b)).status, 200);
  const msgs = [...f.docs].filter(([p]) => p.includes("/messages/"));
  assert.equal(msgs.length, 1);
  assert.equal(msgs[0][1].data.senderUid, "owner");
  assert.equal(msgs[0][1].data.channel, "agent");
  msgs[0][1].data.image = "data:image/png;base64,PRIVATE";
  const r = await (await f.call("/tickets/t")).json();
  assert.ok(!JSON.stringify(r).includes("PRIVATE"));
});
