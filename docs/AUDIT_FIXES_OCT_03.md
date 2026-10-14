# Audit findings checked against the current code

1. **Confirmed**: broad compact-control selectors affected inputs, text areas and labels. Replaced with explicit compact-control/compact-field classes. Browser regression fixture: normal input 50px, text areas 138/106px, explicit compact select 32px; ordinary labels block, compact label inline-flex.
2. **Confirmed in legacy code**: GroupRoomView resubscribed for changing array references. App routes through LiveGroupsView, so this was not the current group UI. Stable participant UID key, removed stale badges and guarded callbacks.
3. **Confirmed**: admins could alter another member’s public identity. Role grants now use a transaction; rules allow only corresponding role/badge changes, preserve identity on grant and restrict revocation avatar changes. Emulator tests cover allowed grant and forbidden standalone/avatar substitution.
4. **Confirmed**: a later snapshot could restart the loading spinner after an error. Failure state now prevents this. Own-rank count query no longer depends on member-array snapshots.
5. **Confirmed**: group inspection could refetch unchanged membership and show older asynchronous results. Membership validated/deduplicated, stable key and latest-request guard added.
6. **Confirmed**: timer reviews repeated per-user name reads and lacked unmount guards. Cached requests, cancellation guards and document-ID identity added. Review transactions update private/public status together.
7. **Confirmed**: authenticated members could read private timer diagnostics. Introduced study_rankings with only public period totals and integrity status. Private clocks are owner/admin-only. All registered production clocks were copied with version checks; private totals were unchanged. Ranking indexes were ready before deployment.
8. **Confirmed**: strict app checks were absent and tests were outside the build. Enabled strict checks and a NodeNext test project, added explicit imports and corrected malformed test fixtures. Concurrent experimental AI demo stays outside the production application build. Runtime numeric guard prevents invalid chat usage counts.

Additional repairs: profile media rejects unsafe URL schemes and invalid internal traversal; new invite codes use more randomness. Existing short/custom invitation codes remain supported, and this change does not provide server rate limiting.

## Login-only follow-up

Removed anonymous/local account creation, guest entry points and guest UI. Restored anonymous identities cannot open the desk; Firebase anonymous provider is disabled, and rules deny anonymous reads/writes. Removed gradient presets and their setting; migrated old wallpaper IDs to palette-matched image scenes. Auth theme follows the selected landing scene. Landing timer demo remains local and does not save study records.

## Verification

- Production build includes strict application and test type checks.
- 126 scoped unit tests pass (concurrent experimental AI tests excluded from this run).
- 47 Firestore emulator tests pass, including anonymous access denial, profile grant restrictions and exact ranking projections.
- Production preview tested via actual button interactions: workspace opens sign-in; email form expands; 25/50-minute preview can run/pause/reset; selected scene colour matches sign-in.
- Desktop and iPad viewport screenshots recorded. These are browser viewport checks, not a physical iPad playback test.
- Existing authenticated owner account sign-in and cloud profile save were not exercised in this pass.

The rules enforce ownership, restricted admin transitions and exact public projection matching. They have emulator coverage; a broader security review is still appropriate before broad release.
