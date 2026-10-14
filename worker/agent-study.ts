import { CANONICAL_JEE_SYLLABUS } from "../src/utils/jeetrackData.ts";
import { Temporal } from "@js-temporal/polyfill";
import {
  AgentError,
  object,
  id,
  integer,
  textValue,
  invalid,
} from "./agent-auth.ts";
import type { AgentTransaction, Data } from "./agent-store.ts";
import { checkVersion } from "./agent-controls.ts";
import {
  records,
  date,
  timezone,
  taskProjection,
  sessionProjection,
} from "./agent-projections.ts";
const TASK_KEYS = [
  "text",
  "dueDate",
  "subjectId",
  "workspaceId",
  "startTime",
  "endTime",
  "jee",
];
function time(v: unknown) {
  if (typeof v !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
    invalid("Use HH:mm.");
  return v as string;
}
export async function validateTag(tx: AgentTransaction, uid: string, tag: unknown) {
  const j = object(tag, ["subject", "chapterId", "kind", "questions"]);
  if (
    !["physics", "chemistry", "maths"].includes(j.subject) ||
    !["lecture", "practice", "revision", "mockAnalysis"].includes(j.kind)
  )
    invalid("Invalid JEE tag.");
  integer(j.chapterId, 1, 100000);
  if (j.questions !== undefined) {
    integer(j.questions, 1, 10000);
    if (j.kind !== "practice") invalid("Question counts require practice.");
  }
  const path = `users/${uid}/jeetrack/chapter_${j.subject}_${j.chapterId}`,
    doc = await tx.read(path);
  const canonicalChapter = CANONICAL_JEE_SYLLABUS[j.subject as keyof typeof CANONICAL_JEE_SYLLABUS].find(c=>c.id===j.chapterId);
  if (!canonicalChapter && (!doc.data || doc.data.kind !== "chapter" || doc.data.value?.subject !== j.subject || doc.data.value?.id !== j.chapterId)) invalid("Select a chapter from the full syllabus or a saved custom chapter.");
  return { path, doc, tag: j, chapter: canonicalChapter || doc.data!.value };
}
export function subject(a: Data, value: unknown) {
  const sid = id(value),
    s = records(a.subjects).find((s) => s.id === sid);
  if (!s) invalid("Select a saved subject ID.");
  return s!;
}
export function consistentSubject(a: Data, sid: unknown, tag: unknown) {
  if (!sid || !tag) return;
  const label = String(subject(a, sid).name || "")
      .toLowerCase()
      .replace(/[^a-z]/g, ""),
    normalized = ["mathematics", "math"].includes(label) ? "maths" : label;
  if (
    ["physics", "chemistry", "maths"].includes(normalized) &&
    normalized !== (tag as Data).subject
  )
    invalid("The JEE chapter must match the saved subject.");
}
async function taskInput(
  tx: AgentTransaction,
  uid: string,
  a: Data,
  input: unknown,
  create: boolean,
) {
  const p = object(input, TASK_KEYS);
  if (create || p.text !== undefined) textValue(p.text, 500, 1);
  if (create || p.dueDate !== undefined) {
    if (p.dueDate !== "") date(p.dueDate);
  }
  if (p.subjectId !== undefined) subject(a, p.subjectId);
  if (
    p.workspaceId !== undefined &&
    !records(a.settings?.workspaces || a.workspaces).some(
      (w) => w.id === id(p.workspaceId),
    )
  )
    invalid("Select a saved workspace ID.");
  if (p.startTime !== undefined) time(p.startTime);
  if (p.endTime !== undefined) time(p.endTime);
  if (p.startTime && p.endTime && p.endTime <= p.startTime)
    invalid("Task end must follow start on the same date.");
  if (p.jee !== undefined) await validateTag(tx, uid, p.jee);
  consistentSubject(a, p.subjectId, p.jee);
  return p;
}
async function completeChapter(
  tx: AgentTransaction,
  uid: string,
  tag: unknown,
  expected: Data,
) {
  if (!tag)
    throw new AgentError(
      "validation",
      "Generic syllabus completion is browser-only. Select a saved JEE chapter.",
      400,
    );
  const c = await validateTag(tx, uid, tag);
  checkVersion(c.doc.version, expected, "jeeChapter");
  if (!["lecture", "practice"].includes(c.tag.kind))
    invalid("Chapter completion requires lecture or practice.");
  tx.patch(c.path, {
    kind:"chapter",
    value: {
      ...c.chapter,
      ...c.doc.data?.value,
      subject:c.tag.subject,
      [c.tag.kind === "lecture" ? "theory" : "practice"]: true,
    },
  });
}
export async function changeStudy(
  tx: AgentTransaction,
  uid: string,
  kind: string,
  itemId: string | undefined,
  input: unknown,
  expected: Data,
  actorUid: string,
  grantId: string,
  operationKey: string,
  now: number,
) {
  const path = `users/${uid}`,
    doc = await tx.read(path);
  checkVersion(doc.version, expected, "account");
  if (!doc.data)
    throw new AgentError("missing", "Saved account not found.", 404);
  const a = doc.data,
    attribution = {
      channel: "agent",
      actorUid,
      grantId,
      operationId: operationKey,
    };
  if (kind === "create_tasks") {
    const p = object(input, ["tasks"]);
    if (!Array.isArray(p.tasks) || p.tasks.length < 1 || p.tasks.length > 30)
      invalid("Supply 1–30 tasks.");
    const tasks = [];
    for (const [i, raw] of p.tasks.entries()) {
      const t = await taskInput(tx, uid, a, raw, true);
      tasks.push({
        ...t,
        id: `agent-${operationKey}-${i}`,
        completed: false,
        category: t.dueDate ? "today" : "unscheduled",
        createdAt: now,
        agentAttribution: attribution,
      });
    }
    tx.patch(path, {
      tasks: [...tasks, ...records(a.tasks)],
      lastSyncedAt: now,
    });
    return { data: { items: tasks.map(taskProjection) }, changed: ["tasks"] };
  }
  if (kind === "update_task" || kind === "complete_task") {
    const tasks = records(a.tasks),
      index = tasks.findIndex((t) => t.id === itemId);
    if (index < 0) throw new AgentError("missing", "Task not found.", 404);
    let patch: Data;
    if (kind === "update_task") {
      patch = await taskInput(tx, uid, a, input, false);
      if (!Object.keys(patch).length) invalid("Supply fields to update.");
    } else {
      const p = object(input, ["completed", "completeJeeChapter"]);
      if (
        typeof p.completed !== "boolean" ||
        (p.completeJeeChapter !== undefined &&
          typeof p.completeJeeChapter !== "boolean")
      )
        invalid("Invalid completion.");
      if (p.completeJeeChapter && !p.completed)
        invalid("Chapter completion requires a completed task.");
      if (p.completeJeeChapter)
        await completeChapter(tx, uid, tasks[index].jee, expected);
      patch = { completed: p.completed, completedAt: p.completed ? now : null };
    }
    const updated: Data = {
      ...tasks[index],
      ...patch,
      agentAttribution: attribution,
    };
    consistentSubject(a, updated.subjectId, updated.jee);
    if (
      updated.startTime &&
      updated.endTime &&
      updated.endTime <= updated.startTime
    )
      invalid("Task end must follow start.");
    tasks[index] = updated;
    tx.patch(path, { tasks, lastSyncedAt: now });
    return {
      data: taskProjection(updated),
      changed: [
        "tasks",
        ...((input as Data).completeJeeChapter ? ["jeeChapter"] : []),
      ],
    };
  }
  if (kind === "schedule_sessions") {
    const p = object(input, ["sessions"]);
    if (
      !Array.isArray(p.sessions) ||
      !p.sessions.length ||
      p.sessions.length > 30
    )
      invalid("Supply 1–30 sessions.");
    const plans: Data[] = [],
      tasks: Data[] = [];
    for (const [i, raw] of p.sessions.entries()) {
      const s = object(raw, [
        "subjectId",
        "date",
        "startTime",
        "plannedDurationSeconds",
        "timezone",
        "title",
        "notes",
        "jee",
      ]);
      const sub = subject(a, s.subjectId);
      date(s.date);
      time(s.startTime);
      integer(s.plannedDurationSeconds, 1, 86400);
      if (s.title !== undefined) textValue(s.title, 500, 1);
      if (s.notes !== undefined) textValue(s.notes, 5000);
      if (s.jee !== undefined) await validateTag(tx, uid, s.jee);
      consistentSubject(a, s.subjectId, s.jee);
      const zone = timezone(
        s.timezone || a.settings?.timezone || "Asia/Kolkata",
      );
      let local: any;
      try {
        local = Temporal.PlainDateTime.from(
          `${s.date}T${s.startTime}`,
        ).toZonedDateTime(zone, { disambiguation: "reject" });
      } catch {
        invalid(
          "The scheduled time is ambiguous or does not exist in this timezone.",
        );
      }
      const sessionId = `agent-${operationKey}-${i}`,
        plan = {
          id: sessionId,
          subjectId: sub.id,
          subjectName: sub.name,
          plannedDurationSeconds: s.plannedDurationSeconds,
          actualDurationSeconds: 0,
          rankingDurationSeconds: 0,
          scheduledStart: local.toInstant().toString(),
          timezone: zone,
          status: "planned",
          isPaused: false,
          accumulatedSeconds: 0,
          mode: "stopwatch",
          source: "agent",
          deviceId: "hermes",
          notes: s.notes || "",
          revision: 1,
          updatedAt: now,
          agentAttribution: attribution,
          ...(s.jee ? { jee: s.jee } : {}),
        };
      if (!local.add({ seconds: s.plannedDurationSeconds }).toPlainDate().equals(local.toPlainDate()))
        invalid("Split sessions crossing midnight into separate daily plans.");
      tx.create(`${path}/personal_sessions/${sessionId}`, plan);
      plans.push(plan);
      tasks.push({
        id: `task-${sessionId}`,
        text: s.title || sub.name,
        dueDate: s.date,
        startTime: s.startTime,
        endTime: local
          .add({ seconds: s.plannedDurationSeconds })
          .toPlainTime()
          .toString()
          .slice(0, 5),
        subjectId: sub.id,
        ...(s.jee ? { jee: s.jee } : {}),
        category: "today",
        completed: false,
        createdAt: now,
        agentAttribution: attribution,
      });
    }
    tx.patch(path, {
      tasks: [...tasks, ...records(a.tasks)],
      lastSyncedAt: now,
    });
    return {
      data: { items: plans.map(sessionProjection), createdTasks: tasks.length },
      changed: ["tasks", "sessions"],
    };
  }
  const p = object(input, [
    "notes",
    "subjectId",
    "date",
    "startTime",
    "durationSeconds",
    "scheduledStart",
    "plannedDurationSeconds",
    "completeJeeChapter",
    "jee",
  ]);
  if (!Object.keys(p).length) invalid("Supply fields to update.");
  if (p.notes !== undefined) textValue(p.notes, 5000);
  if (p.date !== undefined) date(p.date);
  if (p.startTime !== undefined) integer(p.startTime, 0, 4102444800000);
  if (p.durationSeconds !== undefined) integer(p.durationSeconds, 0, 86400);
  if (p.plannedDurationSeconds !== undefined)
    integer(p.plannedDurationSeconds, 1, 86400);
  if (
    p.completeJeeChapter !== undefined &&
    typeof p.completeJeeChapter !== "boolean"
  )
    invalid();
  if (p.jee !== undefined) await validateTag(tx, uid, p.jee);
  const sub = p.subjectId !== undefined ? subject(a, p.subjectId) : null;
  const sessionPath = `${path}/personal_sessions/${itemId}`,
    canonical = await tx.read(sessionPath);
  checkVersion(canonical.version, expected, "session");
  const history = records(a.sessions),
    index = history.findIndex((s) => s.id === itemId);
  if (!canonical.data && index < 0)
    throw new AgentError("missing", "Session not found.", 404);
  if (canonical.data?.status === "active")
    throw new AgentError(
      "conflict",
      "Stop the active timer before editing its history.",
      409,
    );
  const old = canonical.data || history[index],
    isPlanned = old.status === "planned";
  consistentSubject(a, p.subjectId || old.subjectId, p.jee || old.jee);
  if (
    isPlanned &&
    (p.durationSeconds !== undefined ||
      p.startTime !== undefined ||
      p.date !== undefined ||
      p.completeJeeChapter)
  )
    invalid("A planned session has no completed study time.");
  if (
    !isPlanned &&
    (p.scheduledStart !== undefined || p.plannedDurationSeconds !== undefined)
  )
    invalid("Only planned sessions can be rescheduled.");
  const { completeJeeChapter: complete, ...patch } = p;
  let local: any;
  if (p.scheduledStart !== undefined) {
    textValue(p.scheduledStart, 100);
    try {
      local = Temporal.Instant.from(p.scheduledStart).toZonedDateTimeISO(
        old.timezone || a.settings?.timezone || "Asia/Kolkata",
      );
    } catch {
      invalid("Use an ISO instant with an explicit offset.");
    }
  }
  if (complete) await completeChapter(tx, uid, p.jee || old.jee, expected);
  const next: Data = {
    ...old,
    ...patch,
    ...(sub ? { subjectName: sub.name } : {}),
    updatedAt: now,
    agentAttribution: attribution,
  };
  if (canonical.data) {
    if (!isPlanned && p.durationSeconds !== undefined) {
      next.actualDurationSeconds = p.durationSeconds;
      next.accumulatedSeconds = p.durationSeconds;
    }
    next.revision = (Number(old.revision) || 0) + 1;
    tx.patch(sessionPath, next);
  }
  if (index >= 0) {
    const hist: Data = {
      ...history[index],
      ...patch,
      ...(sub ? { subjectName: sub.name } : {}),
      agentAttribution: attribution,
    };
    if (p.durationSeconds !== undefined || p.startTime !== undefined)
      hist.endTime = hist.startTime + hist.durationSeconds * 1000;
    hist.rankingDurationSeconds =
      history[index].rankingDurationSeconds ?? history[index].durationSeconds;
    history[index] = hist;
    tx.patch(path, { sessions: history, lastSyncedAt: now });
    return {
      data: sessionProjection(hist),
      changed: ["sessions", ...(complete ? ["jeeChapter"] : [])],
    };
  }
  if (isPlanned) {
    const start =
      local ||
      Temporal.Instant.from(next.scheduledStart).toZonedDateTimeISO(
        old.timezone || a.settings?.timezone || "Asia/Kolkata",
      );
    if (!start.add({ seconds: next.plannedDurationSeconds }).toPlainDate().equals(start.toPlainDate()))
      invalid("Split sessions crossing midnight into separate daily plans.");
    const tasks = records(a.tasks).map((t) =>
      t.id === `task-${itemId}`
        ? {
            ...t,
            dueDate: start.toPlainDate().toString(),
            startTime: start.toPlainTime().toString().slice(0, 5),
            endTime: start
              .add({ seconds: next.plannedDurationSeconds })
              .toPlainTime()
              .toString()
              .slice(0, 5),
            subjectId: next.subjectId,
            ...(next.jee ? { jee: next.jee } : {}),
            agentAttribution: attribution,
          }
        : t,
    );
    tx.patch(path, { tasks, lastSyncedAt: now });
  }
  return {
    data: sessionProjection(next),
    changed: [
      "sessions",
      ...(isPlanned ? ["tasks"] : []),
      ...(complete ? ["jeeChapter"] : []),
    ],
  };
}
