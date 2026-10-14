# Categorized support

Built on the existing private Firestore ticket service. Main categories: Bug report, Feature request, Account & sign-in help, Timer/session issue, Anti-cheat appeal, Other, Sanctra Plus+ purchase request. Existing legacy tickets and Plus+ entry points remain readable.

Category fields are labelled and saved together as the first immutable ticket message. Screenshot links accept HTTPS only. The ticket list and Inbox share live ticket updates. Each updated timestamp gives the inbox notice a new read marker so a later reply appears unread.

Admins can filter by category/status and select Open, In progress or Resolved. Only admins can move a ticket into In progress. Members can continue an active conversation, resolve it, or reopen a resolved conversation.

Verification:
- Production build passed.
- 6 support form/inbox tests passed.
- All 61 Firestore rules tests passed, including private categorized creation, admin progress, replies, resolve/reopen, and cross-account rejection.
- In-memory interactive preview checked submission, admin reply, status change and member conversation.
- Desktop 1280px, tablet 1024px and phone 390px checked; no horizontal overflow.
- No production tickets or reference-site messages were created.

Preview: `npx vite --config tests/support-preview.config.ts --host 127.0.0.1 --port 5191`, then `/tests/support-preview.html`. Preview transport is isolated by this configuration; it is not part of the production build. Preview data clears on reload.

Deployment: Hosting and the support Firestore rules deployed to studyapp-4137d. Follow-up FAQ spacing fix also deployed: embedded FAQs no longer receive the glass panel class, preventing a border from returning around content with zero padding. All 18 expanded-form checks passed across six categories at 390px, 1024px and 1280px; content is inset 21px on phones and 29px on larger screens. See expanded-faq-spacing.json and expanded-faq-fixed.png.

Test after deployment:
1. Support → choose a category, inspect its FAQ, complete and submit its form.
2. Inbox → Support → open the new ticket.
3. Admin → Support → filter by category, set In progress, reply.
4. Member Inbox → verify updated/unread ticket, status and reply; continue the thread.
5. Admin resolves; member verifies resolved state and can reopen when needed.

Compact support refinement: category picker precedes the FAQ; forms are centered at a maximum width of 760px, with aligned full-width fields, tighter spacing, quiet theme-aware glass, and a compact attachment area. Plus+ requests include a preferred plan, billing/renewal request and optional payment proof. All 21 expanded-form checks passed across seven categories at 390px, 1024px and 1280px. The Plus+ request was tested through the isolated admin reply and member inbox flow. Hosting deployment completed; live entry /assets/index-C0gTlD4Q.js and SupportTickets-lBn-Jh_M.js verified on sanctrastudy.live.
