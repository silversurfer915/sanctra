import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./agent-fixture.ts";
test("cross-midnight plans fail without partial planner or session writes", async () => {
  const f = await fixture();
  const response = await f.call("/users/u/sessions/schedule", "POST", {
    operationId:"overnight", reason:"Plan study", expectedVersions:{account:"v1"},
    input:{sessions:[{subjectId:"physics",date:"2026-10-14",startTime:"23:30",plannedDurationSeconds:3600,timezone:"Asia/Kolkata"}]},
  });
  assert.equal(response.status,400);
  assert.equal(f.docs.get("users/u")!.version,"v1");
  assert.equal([...f.docs.keys()].some(k=>k.includes("/personal_sessions/")),false);
});
test("legacy history edits preserve competitive credit and stale account version rejects", async () => {
  const f = await fixture();
  f.docs.get("users/u")!.data.sessions = [
    {
      id: "old",
      durationSeconds: 600,
      rankingDurationSeconds: 300,
      date: "2026-10-13",
      startTime: 1000,
      endTime: 601000,
      notes: "old",
    },
  ];
  const body = {
    operationId: "edit",
    reason: "Correct history",
    expectedVersions: { account: "v1", session: "" },
    input: { durationSeconds: 900, notes: "fixed" },
  };
  assert.equal(
    (await f.call("/users/u/sessions/old", "PATCH", body)).status,
    200,
  );
  const s = f.docs.get("users/u")!.data.sessions[0];
  assert.equal(s.durationSeconds, 900);
  assert.equal(s.rankingDurationSeconds, 300);
  assert.equal(
    (
      await f.call("/users/u/sessions/old", "PATCH", {
        ...body,
        operationId: "edit2",
      })
    ).status,
    409,
  );
});
test("scheduled sessions require explicit duration and reject DST gaps", async () => {
  const f = await fixture();
  const body = {
    operationId: "plan",
    reason: "Plan",
    expectedVersions: { account: "v1" },
    input: {
      sessions: [
        {
          subjectId: "physics",
          date: "2026-03-08",
          startTime: "02:30",
          timezone: "America/New_York",
          plannedDurationSeconds: 3600,
        },
      ],
    },
  };
  assert.equal(
    (await f.call("/users/u/sessions/schedule", "POST", body)).status,
    400,
  );
  body.input.sessions[0].startTime = "04:30";
  assert.equal(
    (await f.call("/users/u/sessions/schedule", "POST", body)).status,
    200,
  );
  assert.equal(f.docs.get("users/u")!.data.tasks[0].startTime, "04:30");
  const plan = [...f.docs].find(([k]) => k.includes("/personal_sessions/"))![1]
    .data;
  assert.equal(plan.actualDurationSeconds, 0);
  assert.equal(plan.rankingDurationSeconds, 0);
  assert.equal(plan.source, "agent");
});
test("task completion requires real cloud chapter version and never invents practice counts", async () => {
  const f = await fixture();
  f.docs.get("users/u")!.data.tasks = [
    {
      id: "t",
      text: "Study",
      completed: false,
      dueDate: "2026-10-13",
      jee: { subject: "physics", chapterId: 1, kind: "lecture" },
    },
  ];
  f.docs.set("users/u/jeetrack/chapter_physics_1", {
    version: "c1",
    data: {
      kind: "chapter",
      value: {
        subject: "physics",
        id: 1,
        name: "Motion",
        theory: false,
        practice: false,
      },
    },
  });
  const b = {
    operationId: "done",
    reason: "Completed lecture",
    expectedVersions: { account: "v1", jeeChapter: "c1" },
    input: { completed: true, completeJeeChapter: true },
  };
  assert.equal(
    (await f.call("/users/u/tasks/t/complete", "POST", b)).status,
    200,
  );
  assert.equal(
    f.docs.get("users/u/jeetrack/chapter_physics_1")!.data.value.theory,
    true,
  );
  assert.equal(
    f.docs.get("users/u/jeetrack/chapter_physics_1")!.data.value.practice,
    false,
  );
  assert.equal(f.docs.get("users/u")!.data.tasks[0].jee.questions, undefined);
});
test("planned sessions and legacy canonical versions are discoverable", async () => {
  const f = await fixture();
  f.docs.set("users/u/personal_sessions/plan", {
    version: "p1",
    data: {
      id: "plan",
      status: "planned",
      scheduledStart: "2026-10-13T10:00:00Z",
      plannedDurationSeconds: 600,
    },
  });
  f.docs.set("users/u/personal_sessions/history", {
    version: "h1",
    data: { id: "history", status: "completed" },
  });
  f.docs.get("users/u")!.data.sessions = [
    { id: "history", date: "2026-10-13", durationSeconds: 300 },
  ];
  const plans = await (await f.call("/users/u/sessions?status=planned")).json();
  assert.equal(plans.data.items[0]?.id, "plan");
  assert.equal(plans.data.items[0]?.versions.session, "p1");
  const history = await (await f.call("/users/u/sessions")).json();
  assert.equal(history.data.items[0].versions.session, "h1");
});
test("calendar returns recurring occurrences in requested local dates", async () => {
  const f = await fixture();
  f.docs.get("users/u")!.data.calendarEvents = [
    {
      id: "e",
      title: "Daily",
      timezone: "Asia/Kolkata",
      allDay: true,
      startDate: "2026-10-12",
      endDateExclusive: "2026-10-13",
      recurrence: { frequency: "daily" },
      revision: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  const r = await (
    await f.call(
      "/users/u/calendar?from=2026-10-13&to=2026-10-14&timezone=Asia%2FKolkata",
    )
  ).json();
  assert.equal(r.data.items.length, 2);
  assert.equal(r.data.items[0].date, "2026-10-13");
});
test("JEE tags cannot contradict the saved subject and scheduled question goals are not completed counts", async () => {
  const f = await fixture();
  f.docs.set("users/u/jeetrack/chapter_chemistry_1", {
    version: "c1",
    data: {
      kind: "chapter",
      value: { subject: "chemistry", id: 1, name: "Chemistry" },
    },
  });
  const b = {
    operationId: "mismatch",
    reason: "Plan",
    expectedVersions: { account: "v1" },
    input: {
      tasks: [
        {
          text: "Study",
          dueDate: "",
          subjectId: "physics",
          jee: { subject: "chemistry", chapterId: 1, kind: "lecture" },
        },
      ],
    },
  };
  assert.equal((await f.call("/users/u/tasks", "POST", b)).status, 400);
});
test("JEE calendar pages over saved records without hiding empty filtered pages", async () => {
  const f = await fixture();
  f.docs.set("users/u/jeetrack/a", {
    version: "a1",
    data: { kind: "chapter", value: { id: 1, name: "Saved" } },
  });
  f.docs.set("users/u/jeetrack/b", {
    version: "b1",
    data: {
      kind: "upcoming",
      value: {
        id: "mock",
        exam: "mains",
        session: "Mock",
        type: "full",
        date: "2026-10-14",
      },
    },
  });
  const route =
    "/users/u/calendar?source=jee&from=2026-10-13&to=2026-10-15&limit=1";
  const first = await (await f.call(route)).json();
  assert.equal(first.data.items.length, 0);
  assert.equal(first.source, "jee");
  assert.ok(first.nextCursor);
  const second = await (
    await f.call(route + "&cursor=" + first.nextCursor)
  ).json();
  assert.equal(second.data.items.length, 1);
  assert.equal(second.data.items[0].title, "Mock · Mock");
  assert.equal(second.nextCursor, null);
});
