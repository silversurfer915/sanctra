# Original User Request

## 2026-10-02T14:12:19Z

This is a single self-contained fix; keep it small and focused.
Fix the AuthModal background and interactive styling so it dynamically reflects the active wallpaper theme (Sand, Blue Mist, Lavender, Rose, Charcoal, Sage), and eliminate local cache leakage so guest accounts start completely clean after logging out of an existing account.

Working directory: /Users/ponhareeshn/Documents/StudyTimer
Integrity mode: development

## Requirements

### R1. Dynamic Theme Color Adaptation for Authentication Modal
Ensure the authentication modal background, ambient radial glow, border, and interactive controls derive their colors from the currently active wallpaper theme palette instead of fixed default green fallbacks. When opened from the logged-out landing stage or from within the application, the modal must match the user's active theme.

### R2. Guest Account Cache Isolation on Logout
When a signed-in user logs out, securely persist their active data to their dedicated account cache and reset the shared device state and timer drafts. A subsequently launched guest account must start with a clean slate (zero inherited sessions, tasks, exam targets, or custom settings from the logged-out account). When the original account signs back in, all of their previous records must be restored seamlessly without data loss.

### R3. Automated Verification & Deployment
Verify all unit tests pass (`pnpm test`), confirm a clean TypeScript compilation and Vite build (`pnpm build`), and deploy the verified changes live to Firebase Hosting (`https://sanctrastudy.live/`).

## Acceptance Criteria

### Theme Consistency
- [ ] Authentication modal background, border, glow, and button styles dynamically match the active theme palette across all preset themes.
- [ ] No unwanted default green accents appear when viewing the authentication modal under non-green themes.

### Cache Isolation
- [ ] Logging out of an authenticated account purges shared device sessions, tasks, exam targets, and timer drafts.
- [ ] A new guest session created after logout starts with clean default subjects and empty sessions, tasks, and exam goals.
- [ ] Logging back into the authenticated account restores their complete profile, sessions, subjects, and tasks.

### Automated Testing & Live Deployment
- [ ] All unit tests pass with zero regressions (`pnpm test`).
- [ ] Production build succeeds with zero errors (`pnpm build`).
- [ ] Changes deployed and verified live at `https://sanctrastudy.live/`.
