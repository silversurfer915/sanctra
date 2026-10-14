# Sanctra AI Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Structured-inspired, Sanctra-styled AI planner that proposes task creation, rescheduling and removal for explicit user review before saving.

**Architecture:** Keep the existing AI drawer and Gemini service, with a new focused planner feature containing context preparation, schema-constrained generation, runtime validation, editable timeline proposals and pure application/undo functions. App remains the only owner of persistent task changes and cloud sync. The model cannot write records directly.

**Tech Stack:** React 19, TypeScript strict, Firebase 12 AI Logic with GoogleAIBackend, existing CSS tokens, node:test; no new core runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-04-sanctra-ai-planner.md` — proposed design; read both files before execution. Photo import, voice, recurring tasks, subtasks and richer AI insights need separate plans.

## Global Constraints

- Target desktop 1440×1000 and iPad 834×1112 and 1194×834; also test a 600px content width with sidebar present.
- Use Sanctra's blue/glass tokens and the Appearance blur setting; no neon, new gradients as wallpapers, or copied branding.
- Registered accounts only; invalidate pending requests, drafts and undo on account/workspace change.
- Use existing React 19, TypeScript strict, Firebase 12 and node:test; no new runtime dependency for core planning.
- Use Firebase AI Logic with GoogleAIBackend and model `gemini-3.8-flash`; reverify model support immediately before execution.
- No Blaze upgrade or Cloud Functions is required by this design; free-tier quotas still apply and zero-cost unlimited usage is not promised.
- Production must use App Check with reCAPTCHA Enterprise; never ship a debug token or a Gemini Developer API secret to the browser.
- Generation never writes tasks; only reviewed application uses App's persistence and cloud-sync path.
- Maximum 2,000 instruction characters, 30 operations per response, 100 context tasks, and a 31-local-day planning horizon including today.
- Maximum task title 200 characters; exact valid local dates and HH:mm times; start and end are both absent or both present with end > start, no overnight slots.
- AI can create/update/remove TaskItem records only; never alter sessions, timer totals, rankings, subscriptions, exam goals or profile identity.
- No background AI calls, automatic retry loops, raw provider error display or unsupported feature claims.

## Review Focus

1. Invalid calendar dates, midnight boundaries and touching time slots must be handled in local calendar time, without inventing overnight tasks (Task 3).
2. Missing/foreign/legacy IDs, omitted context and completed tasks must never authorize edits outside the reviewed scope (Tasks 2–4).
3. Delayed responses, timeout, account/workspace switches and regeneration must leave newer drafts/data untouched (Task 5).
4. Changed tasks, repeated Apply, and later edits before Undo must not be overwritten or duplicated (Tasks 4 and 6).
5. Vague instructions, unavailable provider, refused output and truncated JSON must preserve typed input and leave tasks unchanged (Tasks 1, 3 and 5).

---

## File map and contracts

Create the feature files listed in the spec; keep validation/application importable by Node without browser/Firebase initialization. All internal imports use `.ts`/`.tsx` extensions. Existing `TaskItem`, `Subject`, `ExamGoal` come from `src/types/index.ts`.

Task 2 defines these shared contracts in `src/features/ai-planner/types.ts`:

```ts
interface PlannerIdentity { userId:string; workspaceId:string; legacySpaceId:string }
interface PlannerInput extends PlannerIdentity {
  instructions:string; now:Date; includeTasks:boolean; includeGoals:boolean;
  allowDeletes:boolean; tasks:TaskItem[]; subjects:Subject[]; goals:ExamGoal[];
}
interface PlannerContext extends PlannerIdentity {
  today:string; localTime:string; timezone:string; horizonEnd:string;
  instructions:string; includeTasks:boolean; allowDeletes:boolean;
  tasks:TaskItem[]; subjects:Pick<Subject,'id'|'name'>[];
  goals:Pick<ExamGoal,'id'|'name'|'targetDate'>[]; truncated:boolean;
}
interface TaskDraft {
  text:string; dueDate:string|null; startTime:string|null; endTime:string|null;
  subjectId:string|null; goalId:string|null;
}
interface PlannerOperation {kind:'create'|'update'|'delete';taskId:string|null;draft:TaskDraft|null}
interface PlannerEnvelope {version:1;summary:string;question:string|null;operations:PlannerOperation[]}
interface PlannerProposal extends PlannerOperation {id:string;before?:TaskItem}
interface ProposalBatch {id:string;identity:PlannerIdentity;context:PlannerContext;summary:string;question:string|null;proposals:PlannerProposal[]}
interface PlannerIssue {proposalId?:string;code:string;message:string}
type PlannerValidation = {ok:true;batch:ProposalBatch}|{ok:false;issues:PlannerIssue[]};
interface UndoChange {proposalId:string;before:TaskItem|null;after:TaskItem|null}
interface ApplyReceipt {batchId:string;identity:PlannerIdentity;changes:UndoChange[]}
type ApplyResult = {ok:true;tasks:TaskItem[];receipt:ApplyReceipt}|{ok:false;issues:PlannerIssue[]};
type UndoResult = {tasks:TaskItem[];revertedIds:string[];issues:PlannerIssue[]};
type PlannerTransport = (prompt:string)=>Promise<string>;
```

Export every type above. `now`/IDs are injected into pure functions for reproducible tests. Production receives client-generated batch/proposal IDs from crypto.randomUUID(). Model response uses only PlannerEnvelope; `before` and ownership never come from model text.

### Task 1: Make the existing Gemini transport release-safe

**Files:** Modify `src/utils/aiLogic.ts`, `src/utils/appCheck.ts`, `src/utils/firebase.ts`; Create `src/utils/appCheckConfig.ts`, `tests/aiTransport.test.ts`. Reconcile uncommitted Gemini changes; do not reset adjacent work.

**Interfaces:** Consumes current `getAIInstance():AI`, `initAppCheck(app):AppCheck|null`. Produces `selectAppCheckProvider(config:{production:boolean;siteKey:string;debugToken?:string}):'enterprise'|'debug'|'unavailable'` in appCheckConfig.ts, `plannerAvailability():{ready:boolean;reason?:'configuration'}` and `plannerErrorMessage(error:unknown):string` in `src/features/ai-planner/service.ts` (generation is added in Task 3).

- [ ] **Step 1: Write failing tests** `production_never_uses_debug_provider`, `planner_never_uses_direct_secret_key`, `provider_errors_are_safe`. Test selectAppCheckProvider: production without site key returns unavailable even when a debugToken is supplied; production with site key returns enterprise; local debug requires an environment token. Check initAppCheck follows that decision without network calls. Assert 401/auth → “Sanctra AI is temporarily unavailable.”; 429 → “AI is busy. Please try again shortly.”; unknown raw errors/API keys never appear in returned copy. No live network call in unit tests.
```ts
assert.equal(selectAppCheckProvider({production:true,siteKey:'',debugToken:'test-only'}),'unavailable');
assert.equal(plannerErrorMessage(new Error('401 secret raw body')),'Sanctra AI is temporarily unavailable.');
```

- [ ] **Step 2: Run** `node --test tests/aiTransport.test.ts`; expected FAIL for missing exports/unsafe fallback.
- [ ] **Step 3: Implement** explicit production/development provider branches; remove hardcoded/debug fallback from production and direct Gemini secret transport from browser paths. Keep Firebase public web configuration, which is different from a Gemini secret. Use the existing default Firebase app where available. Keep `getAIInstance()` and tutor interfaces compatible. Inspect `.env` key names only; never print values. Reverify the official supported model and configure App Check domains/site key without disabling enforcement.
- [ ] **Step 4: Run** the targeted tests and `npm run build`; expected PASS. Connectivity is not proven by this build: record configuration readiness separately for Task 7.
- [ ] **Step 5: Commit** only transport/helper/test files: `git commit -m "fix: secure production AI transport and errors"`.

### Task 2: Build minimal, scope-safe planning context

**Files:** Create `src/features/ai-planner/types.ts`, `context.ts`, `tests/aiPlannerContext.test.ts`; read existing workspace helpers to reuse `belongsToWorkspace`.

**Interfaces:** Consumes TaskItem/Subject/ExamGoal plus existing workspace matching. Produces `buildPlannerContext(input:PlannerInput):PlannerContext` with the contracts above.

- [ ] **Step 1: Write failing tests** `context_is_local_and_private`, `context_excludes_foreign_and_completed_tasks`, `context_respects_toggles_and_limits`. Use 4 October 2026 23:30 local as input; assert today='2026-10-04', horizonEnd='2026-11-03'. With toggles off, tasks/goals arrays are empty. With 101 eligible tasks, returned tasks.length=100 and truncated=true. Legacy unassigned records enter only the matching legacy workspace; foreign/completed records never enter. JSON of context must omit email, notes, session history and profile details even if supplied on source objects.
```ts
const context=buildPlannerContext({userId:'u',workspaceId:'w',legacySpaceId:'w',instructions:'Plan tomorrow',now:new Date(2026,9,4,23,30),includeTasks:false,includeGoals:false,allowDeletes:false,tasks:[],subjects:[],goals:[]});
assert.equal(context.today,'2026-10-04');
assert.equal(context.horizonEnd,'2026-11-03');
assert.deepEqual(context.tasks,[]);
```

- [ ] **Step 2: Run** `node --test tests/aiPlannerContext.test.ts`; expected missing module/export FAIL.
- [ ] **Step 3: Implement** `buildPlannerContext(input)` using local calendar arithmetic, exact field projection and sorting from the spec. Validate nonempty registered user/workspace IDs and instruction length 1..2000; throw a user-readable validation error before any request. Context contains projected TaskItems only, not original arbitrary object spreads. Goals are included only when requested and in scope.
- [ ] **Step 4: Run** targeted tests; expected PASS. Assert input arrays/objects remain unchanged.
- [ ] **Step 5: Commit** context/types/tests: `git commit -m "feat: prepare scoped AI planning context"`.

### Task 3: Generate and validate proposals, without writes

**Files:** Create `src/features/ai-planner/validation.ts`; extend `service.ts`; Create `tests/aiPlannerValidation.test.ts`, `tests/aiPlannerService.test.ts`.

**Interfaces:** Consumes PlannerContext and transport from Tasks 1–2. Produces:
- `generatePlannerBatch(context:PlannerContext, ids:{batchId:string;proposalIds:string[]}, transport?:PlannerTransport):Promise<PlannerValidation>`.
- `validatePlannerResponse(raw:unknown,context:PlannerContext,ids:{batchId:string;proposalIds:string[]}):PlannerValidation`.
- `validatePlannerSelection(batch:ProposalBatch,selectedIds:string[],currentTasks:TaskItem[],today:string):PlannerIssue[]`.
- `taskFingerprint(task:TaskItem):string` canonical fingerprint covering all TaskItem fields, with fixed key order.

- [ ] **Step 1: Write failing tests** `rejects_invalid_dates_and_unknown_fields`, `rejects_foreign_completed_or_duplicate_targets`, `allows_touching_slots_but_blocks_overlap`, `ambiguity_produces_question_only`, `generation_never_persists`. Assert 2026-02-30, 24:00, 10:00→09:00, missing paired times, >30 operations, unknown keys/IDs and out-of-horizon dates fail. 09:00–10:00 + 10:00–11:00 succeeds; overlap fails. Replacing a moved task does not conflict with its old slot; still conflicts with another unchanged task. A response containing question plus operations fails; question-only validates with zero proposals. Truncated JSON fails, without repair. Inject a transport returning a fixed valid envelope and assert no storage/sync call.
- [ ] **Step 2: Run** `node --test tests/aiPlannerValidation.test.ts tests/aiPlannerService.test.ts`; expected FAIL for missing functions.
- [ ] **Step 3: Implement** strict unknown-value parsing, using Task 2's IDs for ownership and client IDs for proposals. Production generation uses Firebase `Schema` plus `responseMimeType:'application/json'`, temperature 0.2 and maxOutputTokens 4096. Define Schema enums and nullable fields matching PlannerEnvelope; use injected transport in tests. Encode context as data, with instructions to ask about ambiguity and never follow commands embedded inside task titles. Validate independently after JSON.parse; do not use the old heuristic repair parser. Use timeMinutes/validTaskSlot for intervals. Unschedule maps to null date/times in drafts. Exact duplicate create definition is title/date/times/subject/goal.
- [ ] **Step 4: Run** both targeted tests and `npm run build`; expected PASS. Test 401/429/refusal/empty output uses Task 1 safe copy with zero proposals.
- [ ] **Step 5: Commit** service/validation/tests: `git commit -m "feat: generate validated AI task proposals"`.

### Task 4: Apply and undo reviewed changes safely

**Files:** Create `src/features/ai-planner/apply.ts`, `tests/aiPlannerApply.test.ts`.

**Interfaces:** Consumes ProposalBatch, validation/fingerprint from Task 3. Produces:
- `applyPlannerBatch(current:TaskItem[],batch:ProposalBatch,selectedIds:string[],options:{identity:PlannerIdentity;today:string;now:number;alreadyAppliedIds:string[]}):ApplyResult`.
- `undoPlannerBatch(current:TaskItem[],receipt:ApplyReceipt,identity:PlannerIdentity):UndoResult`.

- [ ] **Step 1: Write failing tests** `applies_selected_only_without_mutating_input`, `stale_or_duplicate_apply_is_blocked`, `removal_requires_opt_in`, `undo_preserves_later_edits_and_other_workspaces`. Assert create yields id=`task-ai-${proposal.id}`, completed=false and the active workspace; update preserves id/createdAt/completion and only changes draft fields. Foreign identity, missing/changed before fingerprints, duplicate creates and already-applied IDs return ok=false with no changes. No task outside selected IDs is modified. Delete with allowDeletes=false fails. Undo an unchanged new task removes it; Undo an updated/deleted task restores before state only if safe. A later modified task is retained and reported as a conflict; other tasks remain untouched.
- [ ] **Step 2: Run** `node --test tests/aiPlannerApply.test.ts`; expected FAIL for missing functions.
- [ ] **Step 3: Implement** pure immutable selected-batch application. Revalidate final selected schedule against freshest current tasks. Reject the complete selected group if any blocking issue exists. Preserve nondraft fields on updates, and construct client-owned fields for creates. Assign categories/dates as specified. Undo each receipt entry independently; restoring a deleted record must also pass current schedule conflict checks. Return conflicts rather than overwriting newer records.
- [ ] **Step 4: Run** targeted tests; expected PASS, including midnight/new-local-day apply revalidation and partial undo conflict behavior.
- [ ] **Step 5: Commit** apply/tests: `git commit -m "feat: apply and undo reviewed AI task changes"`.

### Task 5: Add the editable planner drawer flow

**Files:** Create `src/features/ai-planner/PlannerPanel.tsx`, `ProposalTimeline.tsx`, `requestGate.ts`, `ai-planner.css`, `tests/aiPlannerRequestGate.test.ts`; Modify `src/components/modals/AiStudyAssistantModal.tsx`, `tests/ai-helper-preview.tsx`.

**Interfaces:** Consumes Tasks 2–4. Produces `PlannerPanel({input:PlannerInput,onApply:(batch:ProposalBatch,selectedIds:string[])=>ApplyResult,onUndo:(receipt:ApplyReceipt)=>UndoResult,onOpenTasks:()=>void,generate?:typeof generatePlannerBatch})` and `ProposalTimeline({batch,selectedIds,issues,statuses,onEdit,onSelect,onDiscard})`. Define statuses `'pending'|'applied'|'dismissed'|'conflict'` and typed callbacks in the component file. `createPlannerRequestGate()` returns `{begin(identity:PlannerIdentity):number,invalidate():void,isCurrent(id:number,identity:PlannerIdentity):boolean}`.

- [ ] **Step 1: Write failing gate tests** `late_response_after_switch_is_ignored`, `regeneration_supersedes_old_request`, `invalidated_timeout_cannot_publish`. Assert begin A→begin B rejects A; invalidate rejects every prior token; owner/workspace mismatch rejects a token even when ID matches.
```ts
const gate=createPlannerRequestGate();
const owner={userId:'u',workspaceId:'w',legacySpaceId:'w'};
const old=gate.begin(owner); gate.begin(owner);
assert.equal(gate.isCurrent(old,owner),false);
gate.invalidate(); assert.equal(gate.isCurrent(old,owner),false);
```

- [ ] **Step 2: Run** `node --test tests/aiPlannerRequestGate.test.ts`; expected missing export FAIL.
- [ ] **Step 3: Implement** planner as the default drawer mode, keeping Study tutor and quiz reachable. Use 2,000-character textarea counter, visible date context, off-by-default context/deletion toggles and three suggestion chips. Request timeout is 45 seconds; disable Generate while pending; invalidate on identity switch/unmount/regenerate/timeout. Preserve instructions on failure, never show raw errors, no automatic request on opening. Proposal cards show Add/Update/Remove, before/after, per-card selection/edit/dismiss and chronological date/time groups. Newly generated create/update proposals start selected; removals always start unselected. Edits pass the same validation before applying. Apply selected calls only onApply; success exposes Open Tasks and Undo. Clarification results retain the user's original request and append the user's answer visibly before regeneration.
- [ ] **Step 4: Add preview fixtures** with injected fake generator returning creation/update/removal, clarification, malformed response, delayed response and provider error. Record a failing browser check for each before finishing its behavior. Verify generating never saves, editing persists in preview, discarded items do not apply, double Apply creates nothing twice, and delayed error preserves text. Run gate tests; expected PASS.
- [ ] **Step 5: Verify UI** in desktop/iPad/600px dimensions: no horizontal scroll, visible sticky action area, 44px touch controls, properly labelled fields, keyboard focus trap/Escape/return focus. Change Appearance blur 0→24 and verify panel surfaces inherit it. Escape/close invalidates pending results; remaining saved tasks stay unchanged. Save screenshots.
- [ ] **Step 6: Commit** only new planner UI/gate/styles and drawer/preview changes: `git commit -m "feat: add reviewed AI planning timeline"`.

### Task 6: Connect reviewed actions to App and real task dates

**Files:** Modify `src/App.tsx:1405` AI props/callback, `src/utils/taskSchedule.ts`, and existing PlannerView category/date predicates where necessary; Create `src/features/ai-planner/coordinator.ts`, `tests/aiPlannerIntegration.test.ts`; extend `tests/taskSchedule.test.ts`.

**Interfaces:** App passes tasks, subjects, goals, active/legacy workspace IDs and registered user to PlannerInput. onApply reads `dataRef.current.tasks`, calls Task 4 and, only on ok=true, updates dataRef synchronously, setTasks, persistTasks and triggerCloudSync once. onUndo similarly persists only actual reversions. onOpenTasks navigates existing planner view. App keeps applied-ID tracking/receipt per account/workspace; no AI storage event path is used.

- [ ] **Step 1: Write failing integration tests** `accepted_plan_saves_once`, `generation_error_never_saves`, `auth_change_blocks_application`, `future_task_becomes_visible_on_its_date`. Extract callback logic into a narrow injectable coordinator in `src/features/ai-planner/coordinator.ts`: `commitPlannerResult(result:ApplyResult|UndoResult,save:(tasks:TaskItem[])=>void):boolean`; App checks identity before invoking pure mutation. Assert failed Apply saves zero times; successful Apply saves once; conflicting undo with zero reversions saves zero times. Extend time tests so a task dated tomorrow becomes current tomorrow, regardless of its legacy backlog category; unscheduled/completed remain absent.
- [ ] **Step 2: Run** `node --test tests/aiPlannerIntegration.test.ts tests/taskSchedule.test.ts`; expected failing behavioral assertions.
- [ ] **Step 3: Implement** callback replacement, per-identity invalidation, coordinator and dueDate-led schedule filtering. Preserve account cache/cloud-sync semantics and ordinary non-AI task actions. On conflicting/failed sync use existing error reporting; do not show “synced” when only saved locally. Keep goals editing in Profile. Remove artificial minimum time/session/break values from current Insights; until a separate insights plan ships, display an exact local focus total/session count and “Break time isn't recorded” without automatic AI analysis or cognitive-fatigue claims.
- [ ] **Step 4: Run** targeted tests and all existing `npm test`; expected PASS. In browser fixture apply a future task, open Tasks on that date, reload, and use its Focus action. In authenticated staging verify save/sync/account switch with real App. Test another-device task edit arriving during preview causes revalidation rather than stale replacement; record any unresolved cloud merge race as a release limitation/blocker.
- [ ] **Step 5: Commit** App/coordinator/schedule/insight correction/tests: `git commit -m "feat: persist reviewed AI plans through existing tasks"`.

### Task 7: Release verification and handoff

**Files:** Create `docs/ui-repair-2026-10-04/ai-planner-validation.md` plus screenshots; Modify environment example/documentation only if new public site-key instructions are needed. Do not commit .env files or test credentials.

**Interfaces:** Consumes the completed Task 1–6 feature and its fixtures; produces release evidence and a tested production build.

- [ ] **Step 1: Run full checks** `npm run build`, `npm test`, `npm run lint`; expected no new build/test/lint failures. Run `npm run test:rules` if any rules/auth behavior changed. Confirm Node tests are deterministic and do not make live Gemini requests by default; split existing live AI tests into explicit manual smoke scripts if necessary.
- [ ] **Step 2: Check production transport** build artifact contains no debug token, Gemini secret or debug-provider execution path. Verify App Check configured on the actual domain; make one authenticated staging request with an innocuous synthetic task, verify a valid response, then apply and undo it. Mock success is not a connectivity test. Do not weaken App Check or enable billing to make it pass.
- [ ] **Step 3: Repeat acceptance flow** with 0/100+ tasks, a long title, overlapping proposals, ambiguous “Friday”, late-night input, no-context mode, rate limit, missing auth, switching account/workspace and cloud errors. Confirm recorded local figures match the displayed Insights summary.
- [ ] **Step 4: Document evidence** list commands/results, model/date, screens, context sent, deployment readiness and physical iPad Safari availability. Record unresolved provider configuration or sync races plainly; retain typed input and disable unavailable planning rather than claim completion.
- [ ] **Step 5: Commit verification artifacts** `git commit -m "docs: verify reviewed AI planner release"`.
- [ ] **Step 6: Deploy only after plan execution review** using existing Firebase Hosting workflow; verify actual domain serves the built asset hash and run one authenticated production smoke flow. Publish a concise update notice only describing verified shipped behavior, under the existing user authorization to send release notices; no notice belongs to this planning-only task.

## Self-review result

Spec first-release requirements map to Tasks 1–7. All five Review Focus items have named tests/checks. Shared types/functions are defined before use; typed task drafts never grant model ownership. No production code changed in this planning task. The four later increments are explicitly separate, avoiding a plan that silently expands task schema, paid infrastructure or browser microphone requirements.

## Execution handoff

Recommend **Native** execution because the seven tasks share one response/application contract and the existing App persistence boundary; direct implementation minimizes cross-task handoffs. Use executing-plans, checkpoint commits and one independent whole-branch review at the end. Subagent-driven execution is available if the user prefers independent review after each task. Review and choose before implementation.
