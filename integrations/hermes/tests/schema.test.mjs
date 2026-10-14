import { test } from "node:test";
import assert from "node:assert/strict";
test('documented nonblank search, title and AI maintenance match API',async()=>{
 const {aiGlobal,scheduled}=await import('../dist/schemas.js');const {tools}=await import('../dist/tools.js');
 assert.equal(aiGlobal.safeParse({maintenanceMessage:'   '}).success,false);
 assert.equal(scheduled.safeParse({subjectId:'physics',date:'2026-10-13',startTime:'10:00',plannedDurationSeconds:60,title:'   '}).success,false);
 for(const search of ['', '   '])assert.equal(tools.find(t=>t.name==='list_users').schema.safeParse({search}).success,false);
});
test('calendar advertises bounded explicit planner or JEE sources',async()=>{
 const {tools}=await import('../dist/tools.js');const calendar=tools.find(t=>t.name==='get_calendar');
 for(const source of ['planner','jee'])assert.equal(calendar.schema.safeParse({uid:'owner',source,limit:25}).success,true);
 assert.equal(calendar.schema.safeParse({uid:'owner',source:'all'}).success,false);
 assert.equal(tools.find(t=>t.name==='get_sessions').schema.safeParse({uid:'owner',source:'jee'}).success,false);
});
test('global AI text bounds match persisted admin controls',async()=>{
 const {aiGlobal}=await import('../dist/schemas.js');
 for(const patch of [{maintenanceMessage:''},{maintenanceMessage:'x'.repeat(301)},{model:'gemini-'+ 'x'.repeat(94)}])assert.equal(aiGlobal.safeParse(patch).success,false);
 assert.equal(aiGlobal.safeParse({maintenanceMessage:'x'.repeat(300),model:'gemini-'+ 'x'.repeat(93)}).success,true);
});
test("normalized study bounds match the API including unscheduled tasks", async () => {
  const { task, scheduled, jee, sessionPatch } = await import(
    "../dist/schemas.js"
  );
  assert.equal(task.safeParse({ text: "Read", dueDate: "" }).success, true);
  for (const input of [
    { text: "x".repeat(501), dueDate: "" },
    { text: "Read", dueDate: "2026-10-13", startTime: "99:99" },
  ])
    assert.equal(task.safeParse(input).success, false);
  assert.equal(
    scheduled.safeParse({
      subjectId: "physics",
      date: "2026-10-13",
      startTime: "10:00",
      plannedDurationSeconds: 60,
      title: "x".repeat(500),
    }).success,
    true,
  );
  assert.equal(
    sessionPatch.safeParse({ notes: "x".repeat(5001) }).success,
    false,
  );
  assert.equal(
    jee.safeParse({ subject: "physics", chapterId: 100001, kind: "lecture" })
      .success,
    false,
  );
});
test("tools reject unsupported route-specific read filters and oversized replies", async () => {
  const { tools } = await import("../dist/tools.js");
  for (const name of ["get_jee", "get_ai_usage"])
    assert.equal(
      tools
        .find((t) => t.name === name)
        .schema.safeParse({ uid: "owner", from: "2026-10-13" }).success,
      false,
    );
  assert.equal(
    tools
      .find((t) => t.name === "get_agent_audit")
      .schema.safeParse({ uid: "owner" }).success,
    false,
  );
  assert.equal(
    tools
      .find((t) => t.name === "reply_ticket")
      .schema.safeParse({
        id: "ticket",
        operationId: "op",
        reason: "Owner reply",
        expectedVersions: { ticket: "v1" },
        input: { text: "x".repeat(5001) },
      }).success,
    false,
  );
});
test("all 40 tools have strict schemas and mutation preconditions", async () => {
  const { tools } = await import("../dist/tools.js");
  assert.equal(tools.length, 40);
  for (const tool of tools) {
    assert.equal(
      tool.schema.safeParse({ url: "https://evil.test" }).success,
      false,
    );
  }
  const create = tools.find((t) => t.name === "create_tasks");
  const valid = {
    uid: "owner",
    operationId: "op",
    reason: "Study plan",
    expectedVersions: { account: "v1" },
    input: { tasks: [{ text: "Read", dueDate: "2026-10-13" }] },
  };
  assert.equal(create.schema.safeParse(valid).success, true);
  for (const change of [
    { reason: "" },
    { expectedVersions: {} },
    {
      input: { tasks: Array(31).fill({ text: "Read", dueDate: "2026-10-13" }) },
    },
    { input: { tasks: [{ text: "Read", dueDate: "2026-10-13", url: "x" }] } },
  ])
    assert.equal(
      create.schema.safeParse({ ...valid, ...change }).success,
      false,
    );
});
