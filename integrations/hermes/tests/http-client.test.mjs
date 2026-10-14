import { test } from "node:test";
import assert from "node:assert/strict";
const token = "sanctra_agent_" + "a".repeat(22) + "." + "b".repeat(43);
const load = () => import("../dist/http-client.js");
test("missing and placeholder credentials are rejected", async () => {
  const { createSanctraClient } = await load();
  for (const value of [
    undefined,
    "",
    "YOUR_TOKEN",
    "sanctra_agent_placeholder",
  ])
    assert.throws(() => createSanctraClient({ token: value }), /credential/i);
});
test("client fixes origin, encodes queries and sends no Origin or redirect follow", async () => {
  const { createSanctraClient } = await load();
  let captured;
  const client = createSanctraClient({
    token,
    fetchImpl: async (url, init) => {
      captured = { url: String(url), init };
      return Response.json({ apiVersion: "1", data: { ok: true } });
    },
  });
  assert.deepEqual(
    await client.request("GET", "/users", {
      query: { cursor: "a /+", limit: 25 },
    }),
    { apiVersion: "1", data: { ok: true } },
  );
  assert.equal(
    captured.url,
    "https://api.sanctrastudy.live/v1/agent/users?cursor=a+%2F%2B&limit=25",
  );
  assert.equal(captured.init.headers.Origin, undefined);
  assert.equal(captured.init.redirect, "error");
  assert.throws(
    () => createSanctraClient({ token, baseUrl: "https://evil.test" }),
    /origin/i,
  );
});
test("errors never reflect upstream messages or credentials; writes are not retried", async () => {
  const { createSanctraClient } = await load();
  for (const status of [401, 403, 409, 429, 503]) {
    let calls = 0;
    const c = createSanctraClient({
      token,
      fetchImpl: async () => {
        calls++;
        return Response.json(
          {
            apiVersion: "1",
            error: { code: "expired", message: token, retryable: true },
          },
          { status },
        );
      },
    });
    await assert.rejects(
      c.request("POST", "/tickets/x/replies", { body: { operationId: "op" } }),
      (e) => !e.message.includes(token),
    );
    assert.equal(calls, 1);
  }
});
test("malformed, oversized, redirects, unsafe routes and timeout fail safely", async () => {
  const { createSanctraClient } = await load();
  for (const response of [
    new Response("no json"),
    Response.json({ data: {} }),
    new Response("x".repeat(1048577)),
    new Response("", { status: 302 }),
  ]) {
    const c = createSanctraClient({ token, fetchImpl: async () => response });
    await assert.rejects(c.request("GET", "/connection"));
  }
  const c = createSanctraClient({
    token,
    fetchImpl: async () => new Promise(() => {}),
    timeoutMs: 10,
  });
  await assert.rejects(c.request("GET", "/connection"), /timed out/);
  await assert.rejects(c.request("GET", "//evil.test/x"), /route/);
});
test("streaming limit cancels the source and success bodies redact token", async () => {
  const { createSanctraClient } = await load();
  let canceled = false;
  const stream = new ReadableStream({
    pull(c) {
      c.enqueue(new Uint8Array(600000));
    },
    cancel() {
      canceled = true;
    },
  });
  const c = createSanctraClient({
    token,
    fetchImpl: async () => new Response(stream),
  });
  await assert.rejects(c.request("GET", "/connection"), /size/);
  assert.equal(canceled, true);
  const safe = createSanctraClient({
    token,
    fetchImpl: async () =>
      Response.json({ apiVersion: "1", data: { note: token } }),
  });
  assert.equal(
    (await safe.request("GET", "/connection")).data.note,
    "[REDACTED]",
  );
});
