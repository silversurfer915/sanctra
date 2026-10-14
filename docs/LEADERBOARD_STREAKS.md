# Leaderboard streaks

Global leader cards and community rows now show a compact study streak. Group rows use the same dated public projection, preventing stale offline streaks. One hour of saved study per local day qualifies, matching existing profile/history streaks. Yesterday's streak remains current until today's opportunity ends. Streaks describe personal history and do not alter ranked credit or eligibility.

Existing members publish streak metadata when they next open Sanctra. Saved history changes refresh it; an open app refreshes at local midnight. No session titles or subjects are published. Clients can edit their personal history, so streak badges are not an anti-cheat credential.

Test: save history totaling one hour yesterday and today; global/group rankings should show two days. Less than an hour today preserves yesterday's streak. A missed full day resets the display to zero, even while the member is offline. Verify mobile rows retain readable time and names.

Verified: 10 focused tests, 59 Firestore rules tests, production build. Browser preview was unavailable because the local Vite process did not remain reachable; visual acceptance still needs an in-app check.
