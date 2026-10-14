# Sanctra connector for Hermes

Standalone Node 24 stdio MCP connector exposing 40 approved Sanctra tools. Production requests go only to `https://api.sanctrastudy.live/v1/agent`. No frontend checkout, browser session or Firebase server credential is needed. No grant is created by installation.

## Build and verify locally

```sh
npm ci
npm test
npm pack
```

The tarball contains compiled files, this guide, the Hermes skill and example configuration. Dependencies are exact released versions: official MCP server/client 2.3.1, Zod 4.6.7, TypeScript 7.0.2. The client SDK/compiler are development-only.

## Remote Linux host installation

Install Node 24 using your host's supported Node installation method, then check `node --version` and `npm --version`. Transfer `sanctra-hermes-mcp-1.1.0.tgz` to the machine that runs Hermes. On that host:

```sh
mkdir -p ~/.local/share/sanctra-hermes
npm install --prefix ~/.local/share/sanctra-hermes --omit=dev /absolute/path/sanctra-hermes-mcp-1.1.0.tgz
```

These same steps work on macOS with Node 24. Ensure Node is in the environment used to launch Hermes, including any gateway service. If needed, use its absolute Node executable with the installed package's `dist/index.js` in `args`.

In Sanctra, sign in freshly as the owner, open Admin → Integrations, select the intended scopes and issue the single owner Hermes connection. It does not expire automatically (`expiresAt: null`); owner revocation/rotation or a disabled/removed administrator stops access. Save the displayed credential privately into the active Hermes profile's `.env` as `SANCTRA_AGENT_TOKEN`; do not paste it into chat, shell history or this repository. Restrict that file to its owner. Credential issuance and host entry are owner steps; this package does not retrieve them.

Back up the existing Hermes config and merge the `sanctra` entry from `examples/hermes.config.yaml` into its existing `mcp_servers` mapping. Keep all other entries. The explicit environment mapping is necessary because Hermes filters the environment passed to stdio servers. Run `/reload-mcp`, inspect the MCP connection status/tool list, discover the tool whose native name is `sanctra_connection_status`, and call it. Confirm your identity, expected scopes and `expiresAt: null`. The UI grant alone does not prove the remote connection works.

Copy `skill/SKILL.md` into an appropriate Sanctra skill directory in your Hermes installation and enable it through your usual skill workflow. Hermes setup behavior follows the [official MCP guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/) and [configuration reference](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference/), checked 13 October 2026. Installed Hermes versions may differ; inspect your actual tool discovery and status.

## Operational behavior

Tool schemas reject unsupported fields and caller URLs. Every write requires reason, operationId and observed semantic versions. The client uses a 15-second timeout, refuses redirects, bounds requests to 256 KiB and streamed responses to 1 MiB, does not send Origin, and never automatically retries. Upstream error messages are replaced with safe fixed messages. Tool responses contain JSON text and structuredContent; controlled failures set isError. Stdout contains SDK protocol messages only; startup errors on stderr never include credentials.

Calendar reads accept optional `source: planner | jee`, defaulting to planner. To obtain the complete saved calendar, request both sources separately and follow each source's cursor. JEE pages include saved upcoming tests and backlogs; no browser-only data is invented.

After conflict, reload and use the new version. After an uncertain write, preserve the exact operation ID/payload for a deliberate retry. Expired, revoked or forbidden grants must be resolved in Admin Integrations. Rotate/revoke there and replace the private host credential, then reload MCP. Do not share this credential with browser clients.

## Verification limits

Package tests use an injected loopback API and the official SDK client over stdio, including installation from the packed artifact. Production has no configurable origin or test-mode environment variable. Live Hermes installation, private credential entry and actual connection require the owner-controlled host; they are not performed by these tests.

## Version 1.1

Includes full syllabus/subject/workspace references, delete/restore (study:delete), atomic batch mutations, timer lifecycle, direct session recording, application profile management (users:write), ticket creation and image reads. The existing owner connection remains non-expiring. New tool schemas are available after updating the connector package and restarting Hermes; installation does not rotate the credential. See the repository docs/HERMES_API.md and https://api.sanctrastudy.live/openapi.json for examples and limits.
