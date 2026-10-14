import { z } from "zod";
import * as s from "./schemas.js";
type Tool = {
  name: string;
  scope: string;
  method: string;
  path: (a: any) => string;
  schema: z.ZodType;
  targets: string[];
};
export const tools: Tool[] = [];
const add = (
  name: string,
  scope: string,
  method: string,
  path: Tool["path"],
  schema: z.ZodType,
  targets: string[] = [],
) => tools.push({ name, scope, method, path, schema, targets });
const uid = { uid: s.id },
  user = (a: any) => `/users/${encodeURIComponent(a.uid)}`;
add(
  "connection_status",
  "connection",
  "GET",
  () => "/connection",
  z.strictObject({}),
);
add(
  "list_users",
  "users:read",
  "GET",
  () => "/users",
  z.strictObject({ ...s.page, search: z.string().min(1).max(200).refine(value=>value.trim().length>0,'Use a nonblank search').optional() }),
);
add("get_user", "users:read", "GET", user, z.strictObject(uid), ["uid"]);
for (const name of ["analytics", "sessions", "tasks", "calendar", "jee"])
  add(
    `get_${name}`,
    "study:read",
    "GET",
    (a) => `${user(a)}/${name}`,
    z.strictObject({
      ...uid,
      ...s.page,
      ...(name === "jee" ? {} : s.range),
      ...(name === "calendar" ? {source:z.enum(['planner','jee']).optional()} : {}),
      ...(name === "tasks" ? { completed: z.boolean().optional() } : {}),
      ...(name === "sessions"
        ? {
            status: z
              .enum(["planned", "active", "completed", "abandoned"])
              .optional(),
          }
        : {}),
      ...(name === "jee"
        ? {
            kind: z
              .enum([
                "chapter",
                "tests",
                "upcoming",
                "backlogs",
                "practiceLogs",
                "hours",
                "preference",
              ])
              .optional(),
          }
        : {}),
    }),
    ["uid"],
  );
add(
  "create_tasks",
  "study:write",
  "POST",
  (a) => `${user(a)}/tasks`,
  s.mutation(uid, z.strictObject({ tasks: z.array(s.task).min(1).max(30) }), [
    "account",
  ]),
  ["uid"],
);
add(
  "update_task",
  "study:write",
  "PATCH",
  (a) => `${user(a)}/tasks/${encodeURIComponent(a.taskId)}`,
  s.mutation(
    { ...uid, taskId: s.id },
    s.task.partial().refine((x) => Object.keys(x).length > 0),
    ["account"],
  ),
  ["uid", "taskId"],
);
add(
  "complete_task",
  "study:write",
  "POST",
  (a) => `${user(a)}/tasks/${encodeURIComponent(a.taskId)}/complete`,
  s.mutation(
    { ...uid, taskId: s.id },
    z.strictObject({
      completed: z.boolean(),
      completeJeeChapter: z.boolean().optional(),
    }),
    ["account"],
  ),
  ["uid", "taskId"],
);
add(
  "schedule_sessions",
  "study:write",
  "POST",
  (a) => `${user(a)}/sessions/schedule`,
  s.mutation(
    uid,
    z.strictObject({ sessions: z.array(s.scheduled).min(1).max(30) }),
    ["account"],
  ),
  ["uid"],
);
add(
  "update_session",
  "study:write",
  "PATCH",
  (a) => `${user(a)}/sessions/${encodeURIComponent(a.sessionId)}`,
  s.mutation({ ...uid, sessionId: s.id }, s.sessionPatch, [
    "account",
    "session",
  ]),
  ["uid", "sessionId"],
);
add(
  "list_tickets",
  "support:read",
  "GET",
  () => "/tickets",
  z.strictObject({
    ...s.page,
    status: s.status.optional(),
    ownerUid: s.id.optional(),
  }),
);
add(
  "get_ticket",
  "support:read",
  "GET",
  (a) => `/tickets/${encodeURIComponent(a.id)}`,
  z.strictObject({ id: s.id, ...s.page }),
  ["id"],
);
add(
  "reply_ticket",
  "support:write",
  "POST",
  (a) => `/tickets/${encodeURIComponent(a.id)}/replies`,
  s.mutation(
    { id: s.id },
    z.strictObject({ text: z.string().trim().min(1).max(5000) }),
    ["ticket"],
  ),
  ["id"],
);
add(
  "set_ticket_status",
  "support:write",
  "PATCH",
  (a) => `/tickets/${encodeURIComponent(a.id)}/status`,
  s.mutation({ id: s.id }, z.strictObject({ status: s.status }), ["ticket"]),
  ["id"],
);
add(
  "get_ai_controls",
  "ai:read",
  "GET",
  () => "/ai/controls",
  z.strictObject({ uid: s.id.optional() }),
);
add(
  "get_ai_usage",
  "ai:read",
  "GET",
  (a) => `${user(a)}/ai/usage`,
  z.strictObject({ ...uid, ...s.page }),
  ["uid"],
);
add(
  "set_user_ai",
  "ai:write",
  "PATCH",
  (a) => `${user(a)}/ai`,
  s.mutation(uid, s.aiUser, ["aiAccess"]),
  ["uid"],
);
add(
  "set_global_ai",
  "ai:write",
  "PATCH",
  () => "/ai/controls",
  s.mutation({}, s.aiGlobal, ["aiConfig"]),
);
add(
  "get_platform_controls",
  "platform:read",
  "GET",
  () => "/platform/controls",
  z.strictObject({}),
);
add(
  "set_platform_controls",
  "platform:write",
  "PATCH",
  () => "/platform/controls",
  s.mutation({}, s.platform, ["platform"]),
);
add(
  "get_agent_audit",
  "audit:read",
  "GET",
  () => "/audit",
  z.strictObject({
    ...s.page,
  }),
);
// New endpoints use the same versioned mutation envelope and owner grant.
for(const name of ['subjects','workspaces']) add(`get_${name}`,'study:read','GET',()=>`/${name}`,z.strictObject({uid:s.id.optional()}));
add('get_syllabus_chapters','study:read','GET',()=>'/syllabus/chapters',z.strictObject({subject:z.enum(['physics','chemistry','maths']).optional(),class:z.enum(['11','12']).optional()}));
for(const kind of ['task','session']){
 const target=kind==='task'?{...uid,taskId:s.id}:{...uid,sessionId:s.id};
 const path=(a:any)=>`${user(a)}/${kind==='task'?'tasks':'sessions'}/${encodeURIComponent(kind==='task'?a.taskId:a.sessionId)}`;
 add(`delete_${kind}`,'study:delete','DELETE',path,s.mutation({...target,hard:z.boolean().optional()},z.strictObject({}),kind==='task'?['account']:['account','session']),[...Object.keys(target),'hard']);
 add(`restore_${kind}`,'study:delete','POST',a=>path(a)+'/restore',s.mutation(target,z.strictObject({}),['account']),Object.keys(target));
}
for(const action of ['start','stop','complete'])add(`${action}_session`,'study:write','POST',a=>`${user(a)}/sessions/${encodeURIComponent(a.sessionId)}/${action}`,s.mutation({...uid,sessionId:s.id},z.strictObject({}),['account','session']),['uid','sessionId']);
add('create_session','study:write','POST',a=>`${user(a)}/sessions`,s.mutation(uid,z.strictObject({sessionId:s.id.optional(),subjectId:s.id,startTime:z.number().int().min(0),durationSeconds:z.number().int().min(1).max(86400),notes:z.string().max(5000).optional(),jee:s.jee.optional(),workspaceId:s.id.optional()}),['account']),['uid']);
const expected=z.record(z.string(),z.string().max(1024));
add('batch_mutations','per-operation','POST',()=>'/mutations',z.strictObject({operationId:s.id,reason:z.string().trim().min(1).max(500),expectedVersions:expected,input:z.strictObject({operations:z.array(z.strictObject({method:z.enum(['POST','PATCH','DELETE']),path:z.string().min(1).max(500).regex(/^\/(?:users|tickets|ai|platform)\//),body:z.strictObject({input:z.record(z.string(),z.unknown()),expectedVersions:expected.optional()})})).min(1).max(30)})}));
add('update_user','users:write','PATCH',user,s.mutation(uid,z.strictObject({displayName:z.string().min(1).max(100).optional(),dailyGoalHours:z.number().min(0).max(24).optional(),weeklyTargetHours:z.number().min(0).max(168).optional(),timezone:s.timezone.optional()}).refine(v=>Object.keys(v).length>0),['account']),['uid']);
add('create_user','users:write','POST',()=>'/users',s.mutation({},z.strictObject({uid:s.id,displayName:z.string().min(1).max(100)}),['account']));
add('create_ticket','support:write','POST',()=>'/tickets',s.mutation({},z.strictObject({ownerUid:s.id,title:z.string().min(1).max(200),category:z.enum(['bug','feature','account','payment','other']),text:z.string().min(1).max(5000)}),['account']));
add('get_ticket_attachment','support:read','GET',a=>`/tickets/${encodeURIComponent(a.id)}/messages/${encodeURIComponent(a.messageId)}/attachment`,z.strictObject({id:s.id,messageId:s.id}),['id','messageId']);
