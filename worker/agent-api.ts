import {
  AGENT_SCOPES,
  AgentError,
  authenticateAgent,
  requireAdmin,
  issueAgentToken,
  grantSummary,
  hash,
  canonical,
  object,
  id,
  textValue,
  invalid,
} from "./agent-auth.ts";
import type { AgentScope, AgentGrant } from "./agent-auth.ts";
import { createFirestoreAgentStore, committedVersion } from "./agent-store.ts";
import type { AgentStore, AgentTransaction, Data } from "./agent-store.ts";
import { verifyFirebaseIdentity } from "./personal-auth.ts";
import type { OwnerIdentity } from "./personal-auth.ts";
import type { PersonalEnv } from "./personal-api.ts";
import { serverAccess } from "./manual-validation.ts";
import {
  readOptions,
  cursorContext,
  pageQuery,
  accountProjection,
  studyRead,
} from "./agent-projections.ts";
import {
  pick,
  checkVersion,
  controlsProjection,
  changeControls,
} from "./agent-controls.ts";
import {
  ticketProjection,
  messageProjection,
  changeTicket,
} from "./agent-support.ts";
import {validImageAttachment} from "../src/utils/imageAttachments.ts";
import { bufferTransaction } from "./agent-buffer.ts";
import { deleteStudy, restoreStudy, sessionLifecycle, changeUser, createTicket } from "./agent-extended.ts";
import { CANONICAL_JEE_SYLLABUS } from "../src/utils/jeetrackData.ts";
import { committedVersion as versionAfter } from "./agent-store.ts";
import { changeStudy } from "./agent-study.ts";
export interface AgentDependencies {
  store: AgentStore;
  now?: () => number;
  verifyIdentity?: (token: string, project: string) => Promise<OwnerIdentity>;
  rateLimit?: (grantId: string) => Promise<boolean>;
}
const envelope = (value: Data) => ({ apiVersion: "1", ...value });
export function routeFor(
  method: string,
  route: string,
): {
  tool: string;
  scope: AgentScope | null;
  uid?: string;
  item?: string;
  kind?: string;
} {
  if (method === "POST" && route === "mutations") return {tool:"batch_mutations",scope:null};
  if (method === "POST" && route === "users") return {tool:"create_user",scope:"users:write"};
  if (method === "PATCH" && /^users\/[^/]+$/.test(route)) return {tool:"update_user",scope:"users:write",uid:id(route.split('/')[1])};
  if (method === "POST" && route === "tickets") return {tool:"create_ticket",scope:"support:write"};
  let extra=/^tickets\/([^/]+)\/messages\/([^/]+)\/attachment$/.exec(route);
  if (method === "GET" && extra) return {tool:"get_ticket_attachment",scope:"support:read",item:id(extra[1]),kind:id(extra[2])};
  if (method === "GET" && ['subjects','workspaces','syllabus/chapters'].includes(route)) return {tool:route==='syllabus/chapters'?'get_syllabus_chapters':`get_${route}`,scope:"study:read",kind:route};
  extra=/^users\/([^/]+)\/(subjects|workspaces)$/.exec(route);
  if(method==='GET'&&extra)return {tool:`get_${extra[2]}`,scope:'study:read',uid:id(extra[1]),kind:extra[2]};
  extra=/^users\/([^/]+)\/(tasks|sessions)\/([^/]+)(?:\/(restore|start|stop|complete))?$/.exec(route);
  if(extra && (method==='DELETE'&&!extra[4]||method==='POST'&&extra[4]&&(extra[4]==='restore'||extra[2]==='sessions'))){const kind=extra[2]==='tasks'?'task':'session';return {tool:method==='DELETE'?`delete_${kind}`:extra[4]==='restore'?`restore_${kind}`:`${extra[4]}_session`,scope:method==='DELETE'||extra[4]==='restore'?'study:delete':'study:write',uid:id(extra[1]),item:id(extra[3])};}
  extra=/^users\/([^/]+)\/sessions$/.exec(route);
  if(method==='POST'&&extra)return {tool:'create_session',scope:'study:write',uid:id(extra[1])};
  if (method === "GET" && route === "connection")
    return { tool: "connection_status", scope: null };
  if (method === "GET" && route === "users")
    return { tool: "list_users", scope: "users:read" };
  let m =
    /^users\/([^/]+)(?:\/(analytics|sessions|tasks|calendar|jee|ai\/usage))?$/.exec(
      route,
    );
  if (method === "GET" && m) {
    id(m[1]);
    return {
      tool: m[2] ? "get_" + m[2].replace("/", "_") : "get_user",
      scope:
        m[2] === "ai/usage" ? "ai:read" : m[2] ? "study:read" : "users:read",
      uid: m[1],
      kind: m[2],
    };
  }
  m = /^users\/([^/]+)\/tasks(?:\/([^/]+)(\/complete)?)?$/.exec(route);
  if (
    m &&
    ((method === "POST" && (!m[2] || m[3])) ||
      (method === "PATCH" && m[2] && !m[3]))
  ) {
    id(m[1]);
    if (m[2]) id(m[2]);
    return {
      tool: m[3] ? "complete_task" : m[2] ? "update_task" : "create_tasks",
      scope: "study:write",
      uid: m[1],
      item: m[2],
    };
  }
  m = /^users\/([^/]+)\/sessions\/([^/]+)$/.exec(route);
  if (m && (method === "PATCH" || (method === "POST" && m[2] === "schedule")))
    return {
      tool: method === "POST" ? "schedule_sessions" : "update_session",
      scope: "study:write",
      uid: id(m[1]),
      item: method === "PATCH" ? id(m[2]) : undefined,
    };
  if (method === "GET" && route === "tickets")
    return { tool: "list_tickets", scope: "support:read" };
  m = /^tickets\/([^/]+)(?:\/(replies|status))?$/.exec(route);
  if (
    m &&
    ((method === "GET" && !m[2]) ||
      (method === "POST" && m[2] === "replies") ||
      (method === "PATCH" && m[2] === "status"))
  )
    return {
      tool:
        m[2] === "replies"
          ? "reply_ticket"
          : m[2] === "status"
            ? "set_ticket_status"
            : "get_ticket",
      scope: method === "GET" ? "support:read" : "support:write",
      item: id(m[1]),
      kind: m[2],
    };
  if (route === "ai/controls" && ["GET", "PATCH"].includes(method))
    return {
      tool: method === "GET" ? "get_ai_controls" : "set_global_ai",
      scope: method === "GET" ? "ai:read" : "ai:write",
    };
  m = /^users\/([^/]+)\/ai$/.exec(route);
  if (m && method === "PATCH")
    return { tool: "set_user_ai", scope: "ai:write", uid: id(m[1]) };
  if (route === "platform/controls" && ["GET", "PATCH"].includes(method))
    return {
      tool:
        method === "GET" ? "get_platform_controls" : "set_platform_controls",
      scope: method === "GET" ? "platform:read" : "platform:write",
    };
  if (route === "audit" && method === "GET")
    return { tool: "get_agent_audit", scope: "audit:read" };
  throw new AgentError("missing", "Unknown endpoint or method.", 404);
}
async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) invalid("A JSON body is required.");
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader!.read();
    if (done) break;
    size += value.length;
    if (size > 262144) {
      await reader!.cancel();
      throw new AgentError("validation", "Request is too large.", 413);
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let pos = 0;
  for (const part of parts) {
    bytes.set(part, pos);
    pos += part.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    invalid("Invalid JSON.");
  }
}
function managementInput(body: unknown, action: string) {
  const p = object(
    body,
    action === "revoke"
      ? ["operationId", "reason", "expectedVersions"]
      : ["operationId", "reason", "expectedVersions", "label", "scopes"],
  );
  id(p.operationId);
  textValue(p.reason, 500, 1);
  if (action !== "revoke") {
    if (action === "create" || p.label !== undefined)
      textValue(p.label, 100, 1);
    if (action === "create" || p.scopes !== undefined) {
      if (
        !Array.isArray(p.scopes) ||
        !p.scopes.length ||
        p.scopes.length > AGENT_SCOPES.length ||
        p.scopes.some((s: any) => !AGENT_SCOPES.includes(s)) ||
        new Set(p.scopes).size !== p.scopes.length
      )
        invalid("Select explicit approved scopes.");
      p.scopes = [...p.scopes].sort();
    }
  }
  if (action !== "create") object(p.expectedVersions, ["grant"]);
  return p;
}
async function management(
  tx: AgentTransaction,
  request: Request,
  url: URL,
  route: string,
  body: unknown,
  identity: OwnerIdentity,
  now: number,
) {
  await requireAdmin(tx, identity.uid);
  if (request.method === "GET" && route === "grants") {
    const p = readOptions(url, []),
      page = await pageQuery(
        tx,
        {
          collection: "agent_grants",
          filters: [{ field: "creatorUid", value: identity.uid }],
        },
        p,
        cursorContext(route + identity.uid, p),
        (d) => grantSummary(d as AgentGrant, ""),
      );
    tx.create(
      `agent_audit/${crypto.randomUUID()}`,
      {
        actorUid: identity.uid,
        grantId: null,
        tool: "grant_list",
        outcome: "success",
      },
      ["createdAt"],
    );
    return {
      data: { grants: page.data.items },
      ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
    };
  }
  const match = /^grants(?:\/([A-Za-z0-9_-]{1,128})\/(revoke|rotate))?$/.exec(
    route,
  );
  if (!match || request.method !== "POST")
    throw new AgentError("missing", "Unknown grant endpoint.", 404);
  const action = match[2] || "create";
  if (
    action !== "revoke" &&
    (now / 1000 - identity.authTime > 300 ||
      identity.authTime > now / 1000 + 60)
  )
    throw new AgentError(
      "reauthentication_required",
      "Sign in again before issuing a credential.",
      401,
    );
  const p = managementInput(body, action),
    payloadHash = await hash(canonical({ route, input: p })),
    receiptPath = `agent_management/${identity.uid}/receipts/${p.operationId}`,
    prior = await tx.read(receiptPath);
  if (prior.data) {
    if (prior.data.payloadHash !== payloadHash)
      throw new AgentError(
        "conflict",
        "Operation ID was already used for different input.",
        409,
      );
    const current = await tx.read(`agent_grants/${prior.data.grantId}`);
    return {
      data: {
        grant: grantSummary(current.data as AgentGrant, current.version),
        ...(action === "revoke" ? {} : { secretUnavailable: true }),
      },
      receipt: { operationId: p.operationId, replayed: true },
    };
  }
  const slotPath = `agent_owner_slots/${identity.uid}`,
    slot = await tx.read(slotPath);
  let old: AgentGrant | undefined;
  if (match[1]) {
    const doc = await tx.read(`agent_grants/${match[1]}`);
    if (!doc.data || doc.data.creatorUid !== identity.uid)
      throw new AgentError("missing", "Grant not found.", 404);
    checkVersion(doc.version, p.expectedVersions, "grant");
    old = doc.data as AgentGrant;
  }
  if (action === "create" && slot.data?.grantId) {
    const active = await tx.read(`agent_grants/${slot.data.grantId}`);
    if (active.data && !active.data.revokedAt)
      throw new AgentError(
        "conflict",
        "Revoke or rotate the existing Hermes connection first.",
        409,
      );
  }
  if (action === "rotate" && (old!.revokedAt || slot.data?.grantId !== old!.id))
    throw new AgentError(
      "conflict",
      "Only the active Hermes connection can be rotated.",
      409,
    );
  let grant = old!,
    token: string | undefined;
  if (action !== "revoke") {
    const issued = await issueAgentToken(
      identity.uid,
      p.label ?? old?.label,
      p.scopes ?? old?.scopes,
      null,
      now,
    );
    grant = issued.record;
    token = issued.token;
    tx.create(`agent_grants/${grant.id}`, grant);
    tx.patch(slotPath, { grantId: grant.id }, ["updatedAt"]);
  }
  if (old) {
    tx.patch(`agent_grants/${old.id}`, {
      revokedAt: new Date(now).toISOString(),
    });
    if (action === "revoke") {
      grant = { ...old, revokedAt: new Date(now).toISOString() };
      if (slot.data?.grantId === old.id)
        tx.patch(slotPath, { grantId: null }, ["updatedAt"]);
    }
  }
  tx.create(receiptPath, { payloadHash, grantId: grant.id, action }, [
    "createdAt",
  ]);
  tx.create(
    `agent_audit/${crypto.randomUUID()}`,
    {
      actorUid: identity.uid,
      grantId: grant.id,
      tool: `grant_${action}`,
      outcome: "success",
      changed: ["grant"],
    },
    ["createdAt"],
  );
  return {
    data: {
      grant: grantSummary(grant, committedVersion(`agent_grants/${grant.id}`)),
      ...(token ? { token } : {}),
    },
    receipt: { operationId: p.operationId, replayed: false },
  };
}
export function createAgentApi(deps: AgentDependencies) {
  return async (request: Request, env: PersonalEnv): Promise<Response> => {
    const origin = request.headers.get("origin") || "",
      headers = {
        "content-type": "application/json",
        "cache-control": "no-store",
        vary: "Origin",
        ...(origin === env.ALLOWED_ORIGIN
          ? { "access-control-allow-origin": origin }
          : {}),
      };
    const reply = (status: number, value: unknown) =>
      new Response(JSON.stringify(value), { status, headers });
    try {
      if (origin && origin !== env.ALLOWED_ORIGIN)
        throw new AgentError("forbidden", "Origin is not allowed.", 403);
      if (request.method === "OPTIONS")
        return new Response(null, {
          status: 204,
          headers: {
            ...headers,
            "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
            "access-control-allow-headers": "Authorization,Content-Type",
          },
        });
      const url = new URL(request.url),
        route = url.pathname.replace(/^\/v1\/agent\/?/, ""),
        token = (request.headers.get("authorization") || "").replace(
          /^Bearer /,
          "",
        );
      if (
        !request.headers.get("authorization")?.startsWith("Bearer ") ||
        token.length > 8192
      )
        throw new AgentError(
          "unauthenticated",
          "Bearer authentication is required.",
          401,
        );
      const now = (deps.now || Date.now)(),
        isManagement = route === "grants" || route.startsWith("grants/"),
        body =
          request.method === "GET" ? undefined : await boundedBody(request);
      let result: Data,
        status = 200;
      if (isManagement) {
        if (origin !== env.ALLOWED_ORIGIN)
          throw new AgentError(
            "forbidden",
            "Use the Sanctra owner sign-in screen.",
            403,
          );
        let identity: OwnerIdentity;
        try {
          identity = await (deps.verifyIdentity || verifyFirebaseIdentity)(
            token,
            env.FIREBASE_PROJECT_ID,
          );
        } catch {
          throw new AgentError(
            "unauthenticated",
            "A verified Firebase sign-in is required.",
            401,
          );
        }
        if (!env.PERSONAL_OWNER_UID || identity.uid !== env.PERSONAL_OWNER_UID)
          throw new AgentError(
            "forbidden",
            "Only the Sanctra owner can manage Hermes.",
            403,
          );
        result = await deps.store.transact((tx) =>
          management(tx, request, url, route, body, identity, now),
        );
        if (result.data.token) status = 201;
      } else {
        const r = routeFor(request.method, route),
          write = request.method !== "GET";
        let normalized: Data | undefined;
        if (write) {
          const rawBody=body as Data;
          const wrapped=r.tool==='batch_mutations'&&rawBody?.operations ? {...rawBody,input:{operations:rawBody.operations}} : rawBody;
          if(wrapped?.operations)delete wrapped.operations;
          normalized = object(wrapped, [
            "operationId",
            "reason",
            "expectedVersions",
            "input",
          ]);
          id(normalized.operationId);
          textValue(normalized.reason, 500, 1);
          object(normalized.expectedVersions, [
            "account",
            "session",
            "jeeChapter",
            "ticket",
            "aiAccess",
            "aiConfig",
            "platform",
          ]);
          object(normalized.input, Object.keys(normalized.input || {}));
          if (url.search && !(request.method==='DELETE' && url.search==='?hard=true')) invalid("Only DELETE accepts ?hard=true.");
        }
        const payloadHash = write
          ? await hash(
              canonical({ method: request.method, route, query:url.search, body: normalized }),
            )
          : "";
        const operationKey = write
          ? await hash(`${token.split(".")[0]}:${normalized!.operationId}`)
          : crypto.randomUUID();
        let limited = false;
        result = await deps.store.transact(async (tx) => {
          const { grant: g } = await authenticateAgent(
            tx,
            token,
            r.scope,
            (deps.now || Date.now)(),
          );
          if (g.creatorUid !== env.PERSONAL_OWNER_UID)
            throw new AgentError(
              "forbidden",
              "This connection is not owned by the Sanctra owner.",
              403,
            );
          if (!limited) {
            if (deps.rateLimit && !(await deps.rateLimit(g.id)))
              throw new AgentError(
                "rate_limited",
                "Wait before retrying.",
                429,
                true,
              );
            limited = true;
          }
          const ratePath = `agent_rate_limits/${g.id}`,
            rate = await tx.read(ratePath),
            window = Math.floor(now / 60000),
            count =
              rate.data?.window === window ? Number(rate.data.count) || 0 : 0;
          if (count >= 60)
            throw new AgentError(
              "rate_limited",
              "Wait before retrying.",
              429,
              true,
            );
          tx.patch(ratePath, { window, count: count + 1 });
          const receiptPath = `agent_operations/${g.id}/receipts/${normalized?.operationId}`;
          if (write) {
            const previous = await tx.read(receiptPath);
            if (previous.data) {
              if (previous.data.payloadHash !== payloadHash)
                throw new AgentError(
                  "conflict",
                  "Operation ID was already used for different input.",
                  409,
                );
              return {
                ...previous.data.result,
                receipt: {
                  operationId: normalized!.operationId,
                  replayed: true,
                },
              };
            }
          }
          let outcome: Data;
          if (write) {
            const n = normalized!;
            const buffered=bufferTransaction(tx);
            if(r.tool==='batch_mutations'){
              const batch=object(n.input,['operations']);
              if(!Array.isArray(batch.operations)||!batch.operations.length||batch.operations.length>30)invalid('Supply 1–30 operations.');
              const items=[];const changed=new Set<string>();const versions:Data={};
              for(const [i,raw] of batch.operations.entries()){
                const op=object(raw,['method','path','body']);
                if(!['POST','PATCH','DELETE'].includes(op.method)||typeof op.path!=='string'||!op.path.startsWith('/')||op.path.includes('..'))invalid('Invalid batch route.');
                const targetUrl=new URL('https://agent.test'+op.path);
                if(targetUrl.search&&!(op.method==='DELETE'&&targetUrl.search==='?hard=true'))invalid('Invalid batch query.');
                const targetRoute=targetUrl.pathname.replace(/^\/v1\/agent\/?/,'').replace(/^\//,'');
                const target=routeFor(op.method,targetRoute);
                if(target.tool==='batch_mutations'||!target.scope)invalid('Nested batches are not allowed.');
                if(!g.scopes.includes(target.scope!))throw new AgentError('forbidden','A batch operation is outside this grant.',403);
                const b=object(op.body,['input','expectedVersions']);
                const expected=object(b.expectedVersions||n.expectedVersions,['account','session','jeeChapter','ticket','aiAccess','aiConfig','platform']);
                const result=await executeMutation(buffered.tx,target,b.input||{},expected,g,`${operationKey}-${i}`,now,targetUrl.search==='?hard=true');
                items.push({path:op.path,data:result.data,versions:result.versions||{}});for(const c of result.changed||[])changed.add(c);
                if(target.uid&&['study:write','study:delete','users:write'].includes(target.scope!))versions[target.uid]={account:versionAfter(`users/${target.uid}`)};
              }
              outcome={data:{items},versions,changed:[...changed]};
            }else outcome=await executeMutation(buffered.tx,r,n.input,n.expectedVersions,g,operationKey,now,url.search==='?hard=true');
            buffered.flush();
          } else outcome = await readRoute(tx, url, route, r, g, now);
          const { changed, controlBefore, controlAfter, ...publicOutcome } =
            outcome;
          if (
            new TextEncoder().encode(JSON.stringify(envelope(publicOutcome)))
              .length > 1048000
          )
            throw new AgentError(
              "validation",
              "Response is too large. Request a smaller page.",
              413,
            );
          tx.create(
            `agent_audit/${operationKey}`,
            {
              actorUid: g.creatorUid,
              grantId: g.id,
              tool: r.tool,
              targetUid: r.uid || null,
              ticketId: r.scope?.startsWith("support:") ? r.item || null : null,
              outcome: "success",
              ...(changed ? { changed } : {}),
              ...(controlBefore
                ? { before: controlBefore, after: controlAfter }
                : {}),
            },
            ["createdAt"],
          );
          if (write) {
            tx.create(receiptPath, { payloadHash, result: publicOutcome }, [
              "createdAt",
            ]);
            return {
              ...publicOutcome,
              receipt: {
                operationId: normalized!.operationId,
                replayed: false,
              },
            };
          }
          return publicOutcome;
        });
      }
      return reply(status, envelope(result));
    } catch (error) {
      const e =
        error instanceof AgentError
          ? error
          : new AgentError(
              "unavailable",
              "The operation could not be completed. Reload before retrying.",
              503,
              true,
            );
      return reply(
        e.status,
        envelope({
          error: { code: e.code, message: e.message, retryable: e.retryable },
        }),
      );
    }
  };
}
async function executeMutation(tx:AgentTransaction,r:ReturnType<typeof routeFor>,input:Data,expected:Data,g:AgentGrant,key:string,now:number,hard=false):Promise<Data>{
 if(r.tool.startsWith('delete_'))return deleteStudy(tx,r.uid!,r.tool,r.item!,input,expected,now,hard);
 if(r.tool.startsWith('restore_'))return restoreStudy(tx,r.uid!,r.tool,r.item!,input,expected,now);
 if(['create_session','start_session','stop_session','complete_session'].includes(r.tool))return sessionLifecycle(tx,r.uid!,r.tool,r.item,input,expected,key,now);
 if(r.scope==='users:write')return changeUser(tx,r.uid,input,expected,now);
 if(r.tool==='create_ticket')return createTicket(tx,input,expected,key,now,g.creatorUid,g.id);
 if(r.scope==='study:write'){const result=await changeStudy(tx,r.uid!,r.tool,r.item,input,expected,g.creatorUid,g.id,key,now);const cp=`users/${r.uid}/personal_sessions/${r.item}`;const canonical=r.item&&r.tool==='update_session'?await tx.read(cp):null;return {...result,versions:{account:versionAfter(`users/${r.uid}`),...(canonical?{session:canonical.data?versionAfter(cp):''}:{})}};}
 if(r.scope==='support:write')return changeTicket(tx,r.item!,r.kind!,input,expected,g.creatorUid,g.id,key);
 const kind=r.tool==='set_user_ai'?'aiAccess':r.tool==='set_global_ai'?'aiConfig':'platform';
 return changeControls(tx,kind,kind==='aiAccess'?`ai_access/${r.uid}`:kind==='aiConfig'?'ai_config/global':'platform/controls',input,expected,g.creatorUid,now,key);
}
async function readRoute(
  tx: AgentTransaction,
  url: URL,
  route: string,
  r: ReturnType<typeof routeFor>,
  grant: AgentGrant,
  now: number,
): Promise<Data> {
  if(['get_subjects','get_workspaces','get_syllabus_chapters'].includes(r.tool)){
    const p=readOptions(url,r.kind==='syllabus/chapters'?['subject','class']:r.uid?[]:['uid']);
    if(r.kind==='syllabus/chapters'){
      if(p.subject&&!['physics','chemistry','maths'].includes(p.subject))invalid('Invalid JEE subject.');if(p.class&&!['11','12'].includes(p.class))invalid('Use class 11 or 12.');
      const items=Object.entries(CANONICAL_JEE_SYLLABUS).flatMap(([subject,chapters])=>chapters.map((c:Data)=>({...c,subject}))).filter(c=>(!p.subject||c.subject===p.subject)&&(!p.class||c.class===p.class));
      return {data:{items},catalogue:'full',nextCursor:null};
    }
    const uid=r.uid||p.uid||grant.creatorUid,a=await tx.read(`users/${uid}`);if(!a.data)throw new AgentError('missing','Account not found.',404);
    return {data:{items:r.kind==='subjects'?(a.data.subjects||[]).map((d:Data)=>pick(d,['id','name','color','workspaceId'])):(a.data.settings?.workspaces||a.data.workspaces||[{id:'original-space',name:'Your desk'}]).map((d:Data)=>pick(d,['id','name']))},versions:{account:a.version}};
  }
  if(r.tool==='get_ticket_attachment'){
    readOptions(url,[]);const ticket=await tx.read(`support_tickets/${r.item}`);if(!ticket.data)throw new AgentError('missing','Ticket not found.',404);const m=await tx.read(`support_tickets/${r.item}/messages/${r.kind}`);if(!m.data?.image)throw new AgentError('missing','Attachment not found.',404);const image=m.data.image;if(!validImageAttachment(image))throw new AgentError('validation','Attachment requires the Sanctra support viewer.',413);return {data:{ticketId:r.item,messageId:r.kind,image},versions:{ticket:ticket.version}};
  }
  if (r.tool === "connection_status") {
    readOptions(url, []);
    return {
      data: {
        creatorUid: grant.creatorUid,
        grantId: grant.id,
        label: grant.label,
        scopes: grant.scopes,
        expiresAt: grant.expiresAt,
      },
    };
  }
  if (r.tool === "get_user") {
    readOptions(url, []);
    return accountProjection(tx, r.uid!);
  }
  if (r.tool === "list_users") {
    const p = readOptions(url, ["search"]);
    const page = await pageQuery(
      tx,
      { collection: "platform_users" },
      p,
      cursorContext(route, p),
      (d) =>
        pick(d, [
          "uid",
          "displayName",
          "email",
          "isGuest",
          "lastSeen",
          "createdAt",
        ]),
    );
    if (p.search)
      page.data.items = page.data.items.filter((d) =>
        `${d.displayName || ""} ${d.email || ""} ${d.id}`
          .toLowerCase()
          .includes(p.search.toLowerCase()),
      );
    page.data.items = await Promise.all(
      page.data.items.map(async (d) => {
        const detail = await accountProjection(tx, id(d.id));
        return { ...d, ...detail.data, versions: detail.versions };
      }),
    );
    return {
      ...page,
      ...(p.search ? { searchScope: "current-directory-page" } : {}),
    };
  }
  if (r.scope === "study:read") {
    const allowed =
      r.kind === "jee"
        ? ["kind"]
        : [
            "from",
            "to",
            "timezone",
            ...(r.kind === "tasks"
              ? ["completed"]
              : r.kind === "sessions"
                ? ["status"]
                : r.kind === "calendar"
                  ? ["source"]
                  : []),
          ];
    const p = readOptions(url, allowed);
    if (
      p.status &&
      !["planned", "active", "completed", "abandoned"].includes(p.status)
    )
      invalid("Invalid session status.");
    if (p.source && !["planner", "jee"].includes(p.source))
      invalid("Invalid calendar source.");
    return studyRead(tx, r.uid!, r.kind!, p, route, now);
  }
  if (r.tool === "list_tickets") {
    const p = readOptions(url, ["status", "ownerUid"]);
    if (p.status && !["open", "in_progress", "resolved"].includes(p.status))
      invalid("Invalid ticket status.");
    return pageQuery(
      tx,
      {
        collection: "support_tickets",
        filters: ["status", "ownerUid"]
          .filter((k) => p[k])
          .map((field) => ({ field, value: p[field] })),
      },
      p,
      cursorContext(route, p),
      ticketProjection,
    );
  }
  if (r.tool === "get_ticket") {
    const p = readOptions(url, [], 50),
      ticket = await tx.read(`support_tickets/${r.item}`);
    if (!ticket.data) throw new AgentError("missing", "Ticket not found.", 404);
    const page = await pageQuery(
      tx,
      { collection: `support_tickets/${r.item}/messages` },
      p,
      cursorContext(route, p),
      messageProjection,
    );
    return {
      ...page,
      data: {
        ticket: { id: r.item, ...ticketProjection(ticket.data) },
        items: page.data.items,
      },
      versions: { ticket: ticket.version },
    };
  }
  if (r.tool === "get_ai_controls") {
    const p = readOptions(url, ["uid"]),
      config = await tx.read("ai_config/global"),
      access = p.uid ? await tx.read(`ai_access/${p.uid}`) : null;
    return {
      data: {
        config: controlsProjection("aiConfig", config.data, now),
        ...(access
          ? { access: controlsProjection("aiAccess", access.data, now) }
          : {}),
      },
      versions: {
        aiConfig: config.version,
        ...(access ? { aiAccess: access.version } : {}),
      },
    };
  }
  if (r.tool === "get_ai_usage") {
    const p = readOptions(url, []);
    return pageQuery(
      tx,
      { collection: `ai_usage_events/${r.uid}/requests` },
      p,
      cursorContext(route, p),
      (d) =>
        pick(d, [
          "model",
          "requests",
          "completed",
          "failed",
          "inputTokens",
          "outputTokens",
          "costMicros",
          "createdAt",
        ]),
    );
  }
  if (r.tool === "get_platform_controls") {
    readOptions(url, []);
    const d = await tx.read("platform/controls");
    return {
      data: controlsProjection("platform", d.data, now),
      versions: { platform: d.version },
    };
  }
  const p = readOptions(url, []);
  return pageQuery(
    tx,
    {
      collection: "agent_audit",
      filters: [{ field: "actorUid", value: grant.creatorUid }],
    },
    p,
    cursorContext(route, p),
    (d) => ({
      ...pick(d, [
        "actorUid",
        "grantId",
        "tool",
        "targetUid",
        "ticketId",
        "outcome",
        "createdAt",
      ]),
      ...(Array.isArray(d.changed)
        ? {
            changed: d.changed
              .filter((v: unknown) => typeof v === "string")
              .slice(0, 30),
          }
        : {}),
      ...(d.before
        ? {
            before: pick(d.before, Object.keys(d.before)),
            after: pick(d.after || {}, Object.keys(d.after || {})),
          }
        : {}),
    }),
  );
}
export async function handleAgentApi(
  request: Request,
  env: PersonalEnv,
): Promise<Response> {
  try {
    if (!env.FIREBASE_SERVICE_ACCOUNT) throw Error();
    const access = await serverAccess(env.FIREBASE_SERVICE_ACCOUNT),
      base = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
    return createAgentApi({
      store: createFirestoreAgentStore(base, access),
      rateLimit: async (key) =>
        env.PERSONAL_RATE_LIMIT
          ? (await env.PERSONAL_RATE_LIMIT.limit({ key: "agent:" + key }))
              .success
          : true,
    })(request, env);
  } catch {
    return new Response(
      JSON.stringify(
        envelope({
          error: {
            code: "unavailable",
            message: "Agent API is unavailable.",
            retryable: true,
          },
        }),
      ),
      {
        status: 503,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      },
    );
  }
}
