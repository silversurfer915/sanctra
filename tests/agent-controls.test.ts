import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./agent-fixture.ts";
test("controls reject unknown fields and bounds while preserving unspecified controls", async () => {
  const f = await fixture();
  const b = {
    operationId: "control",
    reason: "Pause",
    expectedVersions: { aiConfig: "" },
    input: { enabled: false },
  };
  assert.equal(
    (
      await f.call("/ai/controls", "PATCH", {
        ...b,
        input: { apiKey: "secret" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.call("/ai/controls", "PATCH", {
        ...b,
        input: { requestsPerMinute: 61 },
      })
    ).status,
    400,
  );
  const r = await f.call("/ai/controls", "PATCH", b);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).data.chatEnabled, true);
});
