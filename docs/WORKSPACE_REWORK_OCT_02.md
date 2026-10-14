# Focus spaces

Sanctra now holds several personal focus spaces in one account: exam preparation, learning, work and mindfulness. The user can switch spaces without changing their public profile or losing records.

- Each space has its own subjects/projects/practices, tasks, deadlines, daily and weekly goals, and session history.
- Timer sessions retain their starting space. Switching with unsaved focus opens the save flow first.
- Analytics defaults to the active space and can include all spaces. The consistency streak remains shared and is labelled explicitly.
- Exam rankings are optional and enabled only for exam spaces. Exam dates are user-managed; the app no longer invents dates from a profile selection.
- Tasks can link to a deadline or milestone. Planner and saved-session attribution use the same space identity.
- Existing unassigned data belongs to the original space. It is not duplicated into new spaces or rewritten. Archived spaces retain their data and can be restored.
- Guest-to-account transfers remap space, subject and goal references to avoid collisions with an existing account.
- The old forced intention prompt is removed. Profile directs users to Manage spaces.

Validation: 72 automated tests passed; production TypeScript/Vite build passed. Local guest creation, switching and refresh persistence were exercised. Responsive phone and tablet timer views were inspected. VIP and checkout remain a later release.
