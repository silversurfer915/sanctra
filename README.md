# Sanctra

Source for [sanctrastudy.live](https://sanctrastudy.live): a study desk with focus timers, planning, calendar, study history, study groups, optional JEE preparation tracking and Sanctra AI.

## Run locally

Node 24 and pnpm 12.8.1 are used in CI.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Fill the Firebase **web** configuration in `.env.local` from your Firebase project settings. Use a development project/emulators for mutation testing. The AI endpoint is configured by `VITE_AI_GATEWAY_URL`; production server credentials never belong in a VITE variable. A clean checkout builds without production credentials, but authentication and cloud features require valid configuration.

```sh
npm run build
npm run check:seo
node --test tests/agent-*.test.ts tests/personal-sessions.test.ts
npm ci --prefix integrations/hermes
npm --prefix integrations/hermes test
```

Some legacy live Firebase AI SDK tests target a retired integration and are not CI release gates. Tests under `tests/firebase` require the Firestore emulator (`npm run test:rules`). A build is not a substitute for exercising the changed UI.

## Current engineering handoff

[Hermes continuation handoff — 15 October 2026](docs/HERMES_HANDOFF_2026-10-15.md): verified deployments, session fixes, unresolved work, architecture, Linux setup and release instructions. Read this alongside AGENTS.md before continuing development.

## Agent contribution workflow

Read [AGENTS.md](AGENTS.md), [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md). Clone this private repository, create a branch, commit your work and open a PR to `main`. Checks run on PRs and main pushes. Avoid changing features outside the requested scope.

```sh
git switch -c codex/describe-your-change
git add path/to/changed-file
git commit -m "Describe the change"
git push -u origin HEAD
gh pr create --base main
```

## Deployment

The **Deploy Sanctra** GitHub Action builds and checks main, then deploys Firebase Hosting. Run it from Actions or:

```sh
gh workflow run deploy.yml --ref main
```

For server changes choose `deploy_worker=true`. That option requires a repository secret `CLOUDFLARE_API_TOKEN` with Worker deployment access. Existing server secrets remain in Cloudflare. GitHub deployment never copies the Hermes token or Gemini key.

Hosting uses `FIREBASE_HOSTING_SERVICE_ACCOUNT` (a dedicated Hosting-only identity) plus Firebase public web configuration in repository variables. Rules and indexes are a separate maintainer deployment:

```sh
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project studyapp-4137d
```

Local deployment is also supported using already authenticated Firebase/Wrangler CLIs. Never add an account's CLI refresh token to GitHub.

## API and Hermes

[API details](docs/HERMES_API.md) · [connector setup](integrations/hermes/README.md).

The public machine-readable contract is [api.sanctrastudy.live/openapi.json](https://api.sanctrastudy.live/openapi.json). It is generated from the connector's Zod tool schemas and checked against implemented server routes. Generate/check it with `npm run api:spec` / `npm run api:spec:check`.

The connector lives in `integrations/hermes` and can be built/packed independently. The remote Hermes server needs Node 24 and the owner's existing secret credential, stored outside this repository. Version 1.1 exposes 40 tools, including recoverable deletion, full reference data, atomic batches, session lifecycle, application profiles and ticket creation/attachments.

## Repository boundaries

This is a clean source snapshot of the running application. Private user archives, local debug captures, credentials and old local Git history are deliberately excluded. Licensed assets are included for Sanctra's deployment; repository access does not grant third-party redistribution rights. The original development checkout is preserved separately.
