import test from "node:test";
import assert from "node:assert/strict";
import { fixture, env, now } from "./agent-fixture.ts";
import { createAgentApi } from "../worker/agent-api.ts";
import { authenticateAgent } from "../worker/agent-auth.ts";
import {
  createFirestoreAgentStore,
  committedVersion,
} from "../worker/agent-store.ts";
test("mutations replay once, conflict on changed payload and recheck current role", async () => {
  const f = await fixture(),
    body = {
      operationId: "op",
      reason: "Set allowance",
      expectedVersions: { aiAccess: "" },
      input: { extraDaily: 5 },
    };
  assert.equal((await f.call("/users/u/ai", "PATCH", body)).status, 200);
  assert.equal((await f.call("/users/u/ai", "PATCH", body)).status, 200);
  assert.equal(
    [...f.docs.keys()].filter((k) => k.includes("/receipts/")).length,
    1,
  );
  assert.equal(
    (
      await f.call("/users/u/ai", "PATCH", {
        ...body,
        input: { extraDaily: 6 },
      })
    ).status,
    409,
  );
  f.docs.delete("admins/owner");
  assert.equal((await f.call("/users/u/ai", "PATCH", body)).status, 403);
});
test("audit failure commits no mutation and releases no private read data", async () => {
  const f = await fixture();
  f.setFailAudit(true);
  assert.equal(
    (
      await f.call("/users/u/ai", "PATCH", {
        operationId: "op",
        reason: "Set",
        expectedVersions: { aiAccess: "" },
        input: { enabled: false },
      })
    ).status,
    503,
  );
  assert.ok(!f.docs.has("ai_access/u"));
  assert.equal((await f.call("/users/u")).status, 503);
});
test("grant management requires browser origin, fresh verified identity, lists own and never replays secret", async () => {
  const f = await fixture(),
    body = {
      operationId: "grant-op",
      reason: "Connect",
      label: "Hermes",
      scopes: ["study:read"],
    };
  assert.equal((await f.call("/grants", "POST", body, "firebase")).status, 403);
  const a = await f.call(
    "/grants",
    "POST",
    body,
    "firebase",
    env.ALLOWED_ORIGIN,
  );
  assert.equal(a.status, 201);
  assert.ok((await a.json()).data.token);
  const b = await f.call(
    "/grants",
    "POST",
    body,
    "firebase",
    env.ALLOWED_ORIGIN,
  );
  const result = await b.json();
  assert.equal(result.data.secretUnavailable, true);
  assert.equal(result.data.token, undefined);
  assert.ok(!JSON.stringify([...f.docs]).includes("sanctra_agent_"));
});
test("owner connection never expires, blocks duplicate active issue and rotates atomically", async () => {
  const f = await fixture(),
    body = {
      operationId: "permanent",
      reason: "Connect",
      label: "Hermes",
      scopes: ["study:read"],
    };
  const r = await (
    await f.call("/grants", "POST", body, "firebase", env.ALLOWED_ORIGIN)
  ).json();
  assert.equal(r.data.grant.expiresAt, null);
  assert.match(r.data.grant.version, /^v\d+$/);
  await f.store.transact((tx) =>
    authenticateAgent(tx, r.data.token, "study:read", now + 1000 * 86400000),
  );
  assert.equal(
    (
      await f.call(
        "/grants",
        "POST",
        { ...body, operationId: "duplicate" },
        "firebase",
        env.ALLOWED_ORIGIN,
      )
    ).status,
    409,
  );
  const rotate = {
    operationId: "rotate",
    reason: "Replace",
    expectedVersions: { grant: r.data.grant.version },
  };
  const rotated = await (
    await f.call(
      `/grants/${r.data.grant.id}/rotate`,
      "POST",
      rotate,
      "firebase",
      env.ALLOWED_ORIGIN,
    )
  ).json();
  assert.ok(rotated.data.token);
  assert.equal(
    f.docs.get(`agent_grants/${r.data.grant.id}`)!.data.revokedAt,
    new Date(now).toISOString(),
  );
  assert.equal(
    (await f.call("/connection", "GET", undefined, r.data.token)).status,
    401,
  );
  assert.equal(
    (await f.call("/connection", "GET", undefined, rotated.data.token)).status,
    200,
  );
  assert.equal(
    f.docs.get("agent_owner_slots/owner")!.data.grantId,
    rotated.data.grant.id,
  );
});
test("nonowner administrator and stale sign-in cannot issue owner grants", async () => {
  const f = await fixture();
  f.docs.set("admins/other", { data: {}, version: "v1" });
  for (const identity of [
    { uid: "other", authTime: now / 1000 },
    { uid: "owner", authTime: now / 1000 - 301 },
  ]) {
    const api = createAgentApi({
      store: f.store,
      now: () => now,
      verifyIdentity: async () => identity,
    });
    const r = await api(
      new Request("https://api.test/v1/agent/grants", {
        method: "POST",
        headers: {
          origin: env.ALLOWED_ORIGIN,
          authorization: "Bearer firebase",
        },
        body: JSON.stringify({
          operationId: "bad",
          reason: "Connect",
          label: "Hermes",
          scopes: ["study:read"],
        }),
      }),
      env,
    );
    assert.equal(r.status, identity.uid === "other" ? 403 : 401);
  }
});
test("concurrent revocation or browser edit aborts the whole operation", async () => {
  for (const change of ["revoke", "account"]) {
    const f = await fixture();
    f.setBeforeCommit(() => {
      if (change === "revoke")
        f.docs.set(`agent_grants/${f.issued.record.id}`, {
          data: { ...f.issued.record, revokedAt: "2026-10-13" },
          version: "v2",
        });
      else
        f.docs.set("users/u", {
          data: {
            ...f.docs.get("users/u")!.data,
            tasks: [{ id: "browser", text: "Keep me" }],
          },
          version: "v2",
        });
    });
    const r = await f.call("/users/u/tasks", "POST", {
      operationId: "concurrent",
      reason: "Plan",
      expectedVersions: { account: "v1" },
      input: { tasks: [{ text: "Agent", dueDate: "" }] },
    });
    assert.equal(r.status, change === "revoke" ? 401 : 409);
    assert.ok(![...f.docs.keys()].some((k) => k.includes("/receipts/")));
    assert.equal(
      f.docs.get("users/u")!.data.tasks.length,
      change === "revoke" ? 0 : 1,
    );
  }
});
test("cursor target changes, oversized requests, wrong origin and credential namespaces fail safely", async () => {
  const f = await fixture();
  f.docs.get("users/u")!.data.tasks = [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
  ];
  const r = await (await f.call("/users/u/tasks?limit=1")).json();
  assert.ok(r.nextCursor);
  assert.equal(
    (await f.call("/users/u/calendar?cursor=" + r.nextCursor)).status,
    409,
  );
  assert.equal(
    (
      await f.call(
        "/connection",
        "GET",
        undefined,
        f.issued.token,
        "https://evil.test",
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await f.call(
        "/connection",
        "GET",
        undefined,
        "sanctra_personal_" + "a".repeat(43),
      )
    ).status,
    401,
  );
  assert.equal(
    (await f.call("/users/u/ai", "PATCH", { padding: "a".repeat(262145) }))
      .status,
    413,
  );
});
test("Firestore adapter binds reads and queries to transaction and resolves committed versions", async () => {
  const calls: Array<{ url: string; body: any }> = [];
  let commits = 0;
  const fetcher = async (url: any, init: any) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), body });
    if (String(url).endsWith(":beginTransaction"))
      return Response.json({ transaction: "tx" + commits });
    if (String(url).endsWith(":batchGet"))
      return Response.json([{ missing: body.documents[0] }]);
    if (String(url).endsWith(":runQuery")) return Response.json([]);
    if (String(url).endsWith(":rollback")) return Response.json({});
    commits++;
    return commits === 1
      ? new Response("{}", { status: 409 })
      : Response.json({
          writeResults: body.writes.map(() => ({
            updateTime: "commit-version",
          })),
        });
  };
  const store = createFirestoreAgentStore(
    "https://firestore.test/v1/projects/demo/databases/(default)/documents",
    "server-token",
    fetcher as any,
  );
  const r = await store.transact(async (tx) => {
    await tx.read("agent_owner_slots/owner");
    await tx.query({
      collection: "agent_grants",
      filters: [{ field: "creatorUid", value: "owner" }],
      limit: 26,
    });
    tx.create("agent_audit/a", { actorUid: "owner" }, ["createdAt"]);
    tx.patch("agent_owner_slots/owner", { grantId: "g" });
    return { version: committedVersion("agent_owner_slots/owner") };
  });
  assert.equal(commits, 2);
  assert.equal(r.version, "commit-version");
  for (const c of calls.filter(
    (c) => c.url.endsWith(":batchGet") || c.url.endsWith(":runQuery"),
  ))
    assert.ok(c.body.transaction);
  const write = calls.filter((c) => c.url.endsWith(":commit")).at(-1)!.body
    .writes[0];
  assert.deepEqual(write.currentDocument, { exists: false });
  assert.deepEqual(write.updateTransforms, [
    { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
  ]);
});
test("all approved read tools return bounded safe envelopes on empty account fixtures", async () => {
  const f = await fixture();
  f.docs.set("support_tickets/t", {
    version: "t1",
    data: { ownerUid: "u", status: "open", secret: "never" },
  });
  f.docs.get("users/u")!.data.passwordHash = "never";
  f.docs.get("users/u")!.data.settings = {
    customWallpaper: "data:image/png;base64,never",
    timezone: "Asia/Kolkata",
  };
  f.docs.set("platform_users/u", {
    version: "v1",
    data: { uid: "u", displayName: "Student", secret: "never" },
  });
  for (const path of [
    "/connection",
    "/users",
    "/users/u",
    "/users/u/analytics",
    "/users/u/sessions",
    "/users/u/tasks",
    "/users/u/calendar",
    "/users/u/jee",
    "/tickets",
    "/tickets/t",
    "/ai/controls?uid=u",
    "/users/u/ai/usage",
    "/platform/controls",
    "/audit",
  ]) {
    const r = await f.call(path);
    assert.equal(r.status, 200, path);
    const body = await r.json();
    assert.equal(body.apiVersion, "1");
    assert.ok(!JSON.stringify(body).includes("never"), path);
  }
});
