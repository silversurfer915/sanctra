# Sanctra contributor instructions

Read PRODUCT.md and DESIGN.md before changing product UI or behavior. Sanctra is a React/Vite/TypeScript app with Firebase Auth, Firestore, Firebase Hosting and a Cloudflare API Worker. Retired Flocus redesigns are not the current direction.

Preserve real data and existing flows. Never introduce fabricated progress, users or exam results. JEE Track is optional and shares the study history, planner and AI systems. Never send production messages or mutate production study records during tests.

Use Node 24 and pnpm 12.8.1. Install with `pnpm install --frozen-lockfile`; install the connector with `npm ci --prefix integrations/hermes`. Run `npm run build` and checks appropriate to the changed feature. For API changes run `node --test tests/agent-*.test.ts tests/personal-sessions.test.ts` and `npm --prefix integrations/hermes test`. Update the generated OpenAPI with `npm run api:spec`; confirm `npm run api:spec:check`.

Use branches prefixed `codex/` or another agent's descriptive prefix. Open a PR to main. Do not force-push main. Do not stage unrelated changes or reset another agent's work. Deploy approved main through the Deploy Sanctra GitHub Action; choose the API Worker option only for server changes. Firestore rules/index deployment is intentionally separate and requires rules tests plus an authorized maintainer.

Never commit `.env*` except `.env.example`, service-account keys, authentication tokens, user exports, private archives, browser screenshots or local agent state. Firebase web configuration is public client configuration; server credentials are secrets. The Hermes credential remains on the owner's remote server and must never appear in source, issue text, logs or URLs.

API mutations use explicit scopes, observed versions, operationId, reason, atomic audit and receipts. Retry a lost response with the same operation ID and exact input. Reload after 409. Never grant ranking credit to unverified agent-entered study. Default deletion is recoverable; hard deletion is explicit.
