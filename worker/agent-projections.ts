import { Temporal } from "@js-temporal/polyfill";
import { projectCalendarEntries } from "../src/features/calendar/projection.ts";
import { jeeCalendarEvents } from "../src/utils/jeeIntegration.ts";
import {
  AgentError,
  canonical,
  b64,
  invalid,
  integer,
  textValue,
  id,
} from "./agent-auth.ts";
import { pick } from "./agent-controls.ts";
import type {
  AgentTransaction,
  Data,
  AgentQuery,
  AgentDocument,
} from "./agent-store.ts";
export const records = (v: unknown): Data[] =>
  Array.isArray(v)
    ? v.filter((x) => x && typeof x === "object" && !Array.isArray(x))
    : [];
export function date(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    invalid("Use YYYY-MM-DD.");
  try {
    Temporal.PlainDate.from(value as string);
  } catch {
    invalid("Invalid date.");
  }
  return value as string;
}
export function timezone(v: unknown): string {
  textValue(v, 100, 1);
  try {
    Temporal.Now.zonedDateTimeISO(v as string);
  } catch {
    invalid("Invalid timezone.");
  }
  return v as string;
}
export function readOptions(url: URL, allowed: string[], defaultLimit = 25) {
  const p: Data = {};
  for (const [k, v] of url.searchParams) {
    if (!["limit", "cursor", ...allowed].includes(k) || k in p)
      invalid("Unknown or duplicated query parameter.");
    p[k] = v;
  }
  p.limit =
    p.limit === undefined ? defaultLimit : integer(Number(p.limit), 1, 100);
  if (p.cursor) textValue(p.cursor, 4096, 1);
  if (p.from) date(p.from);
  if (p.to) date(p.to);
  if (p.from && p.to && p.from > p.to) invalid("Date range is reversed.");
  if (p.timezone) timezone(p.timezone);
  if (p.uid) id(p.uid);
  if (p.ownerUid) id(p.ownerUid);
  if (p.completed !== undefined && !["true", "false"].includes(p.completed))
    invalid("Invalid completion filter.");
  if (p.search !== undefined) textValue(p.search, 200, 1);
  return p;
}
export function cursorContext(route: string, p: Data, version = "") {
  const { cursor, limit, ...filters } = p;
  return canonical({ route, filters, version });
}
export function cursorAfter(cursor: unknown, context: string) {
  if (!cursor) return "";
  try {
    const c = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(String(cursor).replace(/-/g, "+").replace(/_/g, "/")),
          (x) => x.charCodeAt(0),
        ),
      ),
    );
    if (c.context !== context || typeof c.after !== "string") throw Error();
    return c.after;
  } catch {
    throw new AgentError(
      "conflict",
      "Cursor does not match this request or data version. Reload the first page.",
      409,
    );
  }
}
const makeCursor = (context: string, after: string) =>
  b64(new TextEncoder().encode(JSON.stringify({ context, after })));
export function pageArray(items: Data[], p: Data, context: string) {
  const sorted = [...items].sort((a, b) =>
      String(a.id).localeCompare(String(b.id)),
    ),
    after = cursorAfter(p.cursor, context);
  if (after && !sorted.some((x) => String(x.id) === after))
    throw new AgentError("conflict", "Page data changed. Reload.", 409);
  const start = after ? sorted.findIndex((x) => String(x.id) === after) + 1 : 0,
    page = sorted.slice(start, start + p.limit);
  return {
    data: { items: page },
    nextCursor:
      start + p.limit < sorted.length
        ? makeCursor(context, String(page.at(-1)!.id))
        : null,
  };
}
export async function pageQuery(
  tx: AgentTransaction,
  q: Omit<AgentQuery, "after" | "limit">,
  p: Data,
  context: string,
  project: (d: Data) => Data,
) {
  const docs = await tx.query({
      ...q,
      after: cursorAfter(p.cursor, context),
      limit: p.limit + 1,
    }),
    page = docs.slice(0, p.limit);
  return {
    data: {
      items: page.map(
        (d): Data => ({ id: d.id, ...project(d.data!), version: d.version }),
      ),
    },
    nextCursor:
      docs.length > p.limit ? makeCursor(context, page.at(-1)!.id!) : null,
  };
}
export const taskProjection = (d: Data) => ({
  ...pick(d, [
    "id",
    "text",
    "completed",
    "dueDate",
    "category",
    "startTime",
    "endTime",
    "subjectId",
    "workspaceId",
    "createdAt",
    "completedAt",
  ]),
  ...(d.jee
    ? { jee: pick(d.jee, ["subject", "chapterId", "kind", "questions"]) }
    : {}),
});
export const sessionProjection = (d: Data) => ({
  ...pick(d, [
    "id",
    "subjectId",
    "subjectName",
    "subjectColor",
    "workspaceId",
    "workspaceName",
    "date",
    "startTime",
    "endTime",
    "durationSeconds",
    "rankingDurationSeconds",
    "mode",
    "notes",
    "status",
    "scheduledStart",
    "plannedDurationSeconds",
    "actualDurationSeconds",
    "updatedAt",
    "source",
    "timeOfDayUnknown",
  ]),
  ...(d.jee
    ? { jee: pick(d.jee, ["subject", "chapterId", "kind", "questions"]) }
    : {}),
});
export const eventProjection = (d: Data) =>
  pick(d, [
    "id",
    "title",
    "notes",
    "location",
    "timezone",
    "allDay",
    "start",
    "end",
    "startDate",
    "endDateExclusive",
    "workspaceId",
    "revision",
  ]);
const JEE_FIELDS: Record<string, string[]> = {
  chapter: [
    "subject",
    "id",
    "name",
    "theory",
    "practice",
    "class",
    "unit",
    "section",
    "revisions",
    "adv",
  ],
  tests: [
    "id",
    "exam",
    "session",
    "paper",
    "type",
    "date",
    "total",
    "max",
    "physics",
    "chemistry",
    "maths",
    "notes",
    "source",
    "durationMinutes",
    "attempted",
    "unattempted",
  ],
  upcoming: ["id", "exam", "session", "type", "date", "venue", "notes"],
  backlogs: [
    "id",
    "title",
    "subject",
    "priority",
    "due",
    "details",
    "done",
    "addedDate",
    "doneDate",
  ],
  practiceLogs: [
    "id",
    "subject",
    "chapterId",
    "chapterName",
    "questions",
    "date",
    "loggedAt",
    "notes",
  ],
  hours: [
    "id",
    "date",
    "subject",
    "lecture",
    "practice",
    "revision",
    "mockAnalysis",
    "total",
    "notes",
    "chapterId",
    "source",
    "sourceSessionId",
    "sessionId",
  ],
  preference: ["key"],
};
export function jeeProjection(d: Data) {
  const kind = String(d.kind);
  if (!JEE_FIELDS[kind]) return { kind: "unknown" };
  let value = pick(d.value || {}, JEE_FIELDS[kind]);
  if (
    kind === "preference" &&
    ["weeklyPracticeGoal", "targetYear", "targetPercentile"].includes(
      value.key,
    ) &&
    ["string", "number"].includes(typeof d.value.value)
  )
    value = { ...value, value: d.value.value };
  if (kind === "preference" && value.key === "profile")
    value = {
      ...value,
      value: pick(d.value.value, [
        "classLevel",
        "studyMode",
        "coaching",
        "targetMainsMarks",
        "targetAdvancedMarks",
      ]),
    };
  if (kind === "preference" && value.key === "examDates")
    value = {
      ...value,
      value: pick(d.value.value, ["mainsJan", "mainsApr", "advanced"]),
    };
  if (kind === "tests" && Array.isArray(d.value.chapterMistakes))
    value.chapterMistakes = records(d.value.chapterMistakes)
      .slice(0, 8)
      .map((m) => pick(m, ["subject", "chapterId", "mistakes", "reason"]));
  return { kind, value };
}
export function validJeeKind(kind: unknown) {
  if (kind !== undefined && !Object.hasOwn(JEE_FIELDS, String(kind)))
    invalid("Invalid JEE record kind.");
}
export async function accountProjection(tx: AgentTransaction, uid: string) {
  const [account, profile, subscription, moderation, admin] = await Promise.all(
    ["users", "platform_users", "subscriptions", "moderation", "admins"].map(
      (c) => tx.read(`${c}/${uid}`),
    ),
  );
  if (![account, profile].some((d) => d.data))
    throw new AgentError("missing", "Account not found.", 404);
  const a = account.data || {},
    settings = pick(a.settings || {}, [
      "timezone",
      "dailyGoalHours",
      "weeklyTargetHours",
      "theme",
      "soundEnabled",
      "notificationsEnabled",
      "wallpaperId",
      "avatarId",
    ]);
  return {
    data: {
      account: {
        uid,
        ...pick(a, ["displayName", "name"]),
        settings,
        subjects: records(a.subjects).map((s) =>
          pick(s, ["id", "name", "color", "workspaceId"]),
        ),
        media: {
          customWallpaperPresent: !!a.settings?.customWallpaper,
          customAvatarPresent: !!a.settings?.customAvatar,
        },
      },
      profile: pick(profile.data, [
        "uid",
        "displayName",
        "email",
        "isGuest",
        "createdAt",
        "lastSeen",
        "photoURL",
      ]),
      subscription: pick(subscription.data, [
        "isPlus",
        "isTrial",
        "status",
        "plan",
        "currentPeriodEnd",
      ]),
      moderation: pick(moderation.data, [
        "reason",
        "expiresAt",
        "permanent",
        "active",
      ]),
      admin: {
        isAdmin: !!admin.data,
        enabled:
          !!admin.data &&
          admin.data.enabled !== false &&
          admin.data.disabled !== true &&
          admin.data.active !== false,
      },
    },
    versions: { account: account.version },
  };
}
export function inRange(d: Data, p: Data) {
  let local = d.date || d.dueDate || d.startDate;
  if (p.timezone && typeof d.startTime === "number" && !d.timeOfDayUnknown)
    local = Temporal.Instant.fromEpochMilliseconds(d.startTime)
      .toZonedDateTimeISO(p.timezone)
      .toPlainDate()
      .toString();
  if (!local && d.scheduledStart)
    local = Temporal.Instant.from(d.scheduledStart)
      .toZonedDateTimeISO(p.timezone || d.timezone || "Asia/Kolkata")
      .toPlainDate()
      .toString();
  return (!p.from || local >= p.from) && (!p.to || local <= p.to);
}
export async function studyRead(
  tx: AgentTransaction,
  uid: string,
  kind: string,
  p: Data,
  route: string,
  now = Date.now(),
) {
  const account = await tx.read(`users/${uid}`),
    a = account.data || {};
  if (kind === "calendar") {
    p.timezone = timezone(p.timezone || a.settings?.timezone || "Asia/Kolkata");
    p.from =
      p.from ||
      Temporal.Instant.fromEpochMilliseconds(now)
        .toZonedDateTimeISO(p.timezone)
        .toPlainDate()
        .toString();
    p.to = p.to || Temporal.PlainDate.from(p.from).add({ days: 30 }).toString();
  }
  const context = cursorContext(route, p, account.version);
  if (kind === "jee") {
    validJeeKind(p.kind);
    return pageQuery(
      tx,
      {
        collection: `users/${uid}/jeetrack`,
        filters: p.kind ? [{ field: "kind", value: p.kind }] : [],
      },
      p,
      cursorContext(route, p),
      jeeProjection,
    );
  }
  const sessions = records(a.sessions).filter((s) => inRange(s, p)),
    tasks = records(a.tasks).filter((t) => inRange(t, p));
  if (kind === "analytics") {
    const seen = new Set<string>();
    const real = sessions.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    return {
      data: {
        recordedSessions: real.length,
        totalDurationSeconds: real.reduce(
          (n, s) => n + Math.max(0, Number(s.durationSeconds) || 0),
          0,
        ),
        unlinkedSessions: real.filter(
          (s) =>
            !s.subjectId ||
            !records(a.subjects).some((x) => x.id === s.subjectId),
        ).length,
        timezone: p.timezone || a.settings?.timezone || null,
        from: p.from || null,
        to: p.to || null,
        source: "saved-history",
      },
      versions: { account: account.version },
    };
  }
  if (kind === "tasks")
    return {
      ...pageArray(
        tasks
          .filter(
            (t) =>
              p.completed === undefined ||
              t.completed === (p.completed === "true"),
          )
          .map(taskProjection),
        p,
        context,
      ),
      versions: { account: account.version },
    };
  if (kind === "sessions") {
    if (p.status && p.status !== "completed") {
      const page = await pageQuery(
        tx,
        {
          collection: `users/${uid}/personal_sessions`,
          filters: [{ field: "status", value: p.status }],
        },
        p,
        cursorContext(route, p, account.version),
        sessionProjection,
      );
      page.data.items = page.data.items
        .filter((s) => inRange(s, p))
        .map((s) => ({
          ...s,
          versions: { account: account.version, session: s.version },
        }));
      return {
        ...page,
        versions: { account: account.version },
        filterScope: "current-canonical-page",
      };
    }
    const unique = [...new Map(sessions.map((s) => [s.id, s])).values()],
      page = pageArray(
        unique.map((s) => ({
          ...sessionProjection(s),
          unlinked:
            !s.subjectId ||
            !records(a.subjects).some((x) => x.id === s.subjectId),
        })),
        p,
        context,
      );
    page.data.items = await Promise.all(
      page.data.items.map(async (s) => ({
        ...s,
        versions: {
          account: account.version,
          session: (await tx.read(`users/${uid}/personal_sessions/${id(s.id)}`))
            .version,
        },
      })),
    );
    return { ...page, versions: { account: account.version } };
  }
  const zone = timezone(p.timezone || a.settings?.timezone || "Asia/Kolkata"),
    rangeStart =
      p.from || Temporal.Now.zonedDateTimeISO(zone).toPlainDate().toString(),
    last =
      p.to || Temporal.PlainDate.from(rangeStart).add({ days: 30 }).toString(),
    rangeEnd = Temporal.PlainDate.from(last).add({ days: 1 }).toString();
  if (
    Temporal.PlainDate.from(rangeStart).until(Temporal.PlainDate.from(rangeEnd))
      .days > 366
  )
    invalid("Calendar range is limited to 366 days.");
  if (p.source === "jee") {
    const page = await pageQuery(
        tx,
        { collection: `users/${uid}/jeetrack` },
        p,
        context,
        jeeProjection,
      ),
      state = {
        upcoming: page.data.items
          .filter((d) => d.kind === "upcoming")
          .map((d) => d.value),
        backlogs: page.data.items
          .filter((d) => d.kind === "backlogs")
          .map((d) => d.value),
      };
    const items = projectCalendarEntries({
      tasks: [],
      events: jeeCalendarEvents(state as any, "original-space", zone),
      workspaceId: "original-space",
      legacySpaceId: "original-space",
      timezone: zone,
      rangeStart,
      rangeEnd,
    }).map((e) =>
      pick(e as unknown as Data, [
        "id",
        "sourceId",
        "kind",
        "title",
        "date",
        "allDay",
        "completed",
        "readonly",
        "notes",
        "location",
      ]),
    );
    return {
      data: { items },
      nextCursor: page.nextCursor,
      source: "jee",
      filterScope: "current-jee-record-page",
      range: { from: rangeStart, to: last, timezone: zone },
    };
  }
  const events = records(a.calendarEvents),
    spaces = new Set([
      "original-space",
      ...tasks.map((t) => t.workspaceId).filter(Boolean),
      ...events.map((e) => e.workspaceId).filter(Boolean),
    ]);
  const entries = [...spaces]
    .flatMap((workspaceId) =>
      projectCalendarEntries({
        tasks: tasks as any,
        events: events as any,
        subjects: records(a.subjects) as any,
        workspaceId,
        legacySpaceId: "original-space",
        timezone: zone,
        rangeStart,
        rangeEnd,
      }),
    )
    .map((e) =>
      pick(e as unknown as Data, [
        "id",
        "sourceId",
        "kind",
        "title",
        "date",
        "allDay",
        "start",
        "end",
        "completed",
        "readonly",
        "occurrenceKey",
        "subjectId",
        "subjectName",
        "color",
        "notes",
        "location",
      ]),
    );
  return {
    ...pageArray(entries, p, context),
    source: "planner",
    versions: { account: account.version },
    range: { from: rangeStart, to: last, timezone: zone },
  };
}
