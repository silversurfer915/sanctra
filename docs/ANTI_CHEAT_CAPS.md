# Batch 5: study credit caps

- Live ranking credit: 3 hours per uninterrupted active stretch. Pause/resume starts a new stretch; heartbeat, midnight and a changed timer/device ID do not. Existing server clock/lease and impossible-elapsed safeguards remain in force.
- Manual AI-approved credit: 6 hours per UTC day, shared across all newly validated entries. Crossing midnight splits the allowance. The server reads and updates day ledgers in the same version-checked transaction as the verdict, clock and ranking projection.
- Full actual durations remain in personal history. A capped live session gets a history note; manual verdicts show the credited minutes when capped. The timer displays a notice once its verified live stretch reaches the limit.
- Revalidation is idempotent. Removing an entry does not refund its daily manual allowance. Previously approved credit is preserved; the new daily ledger applies to new validations.
- Clients cannot write daily manual ledgers or reset an active live stretch. New builds migrate legacy clocks on their next verified tick. Old open builds should refresh after this rules deployment.

## Test

1. Sanctra AI → Log session: save a plausible 7-hour past study entry on a single UTC day. Check history retains 7 hours and validation shows 360 credited minutes with a cap note.
2. Log another distinct session on that same day. It stays in history but earns zero additional ranking credit. Retry validation: no duplicate credit.
3. Run a live session past 3 hours without pausing: ranking credit stops and the notice appears. Save it and check the capped label in history.
4. Pause/resume to start another stretch. Check new ranking time accrues. Reloading, midnight and device take-over must not reset a still-active stretch's allowance.

Automated checks cover elapsed caps, period boundaries, pause/resume, atomic daily allowance allocation, rules enforcement, strict-mode behavior and ranking deletion.
