import { createServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
const root = process.env.SANCTRA_TEST_PACKAGE ?? "../dist";
const { createSanctraMcpServer } = await import(root + "/server.js");
const { createSanctraClient } = await import(root + "/http-client.js");
let requests = 0;
const server = createServer(async (req, res) => {
  requests++;
  let body = "";
  for await (const chunk of req) body += chunk;
  res.setHeader("Content-Type", "application/json");
  const mode = process.env.SANCTRA_FIXTURE_ERROR;
  if (mode === "malformed") {
    res.end("bad");
    return;
  }
  if (mode === "oversized") {
    res.end("x".repeat(1048577));
    return;
  }
  if (mode === "redirect") {
    res.writeHead(302, { Location: "https://evil.test" });
    res.end();
    return;
  }
  if (mode === "timeout") return;
  if (mode) {
    res.statusCode =
      {
        unauthenticated: 401,
        forbidden: 403,
        expired: 401,
        conflict: 409,
        unavailable: 503,
      }[mode] ?? 503;
    res.end(
      JSON.stringify({
        apiVersion: "1",
        error: {
          code: mode,
          message: process.env.SANCTRA_AGENT_TOKEN,
          retryable: false,
        },
      }),
    );
    return;
  }
  res.end(
    JSON.stringify({
      apiVersion: "1",
      data: {
        requests,
        method: req.method,
        path: req.url,
        body: body ? JSON.parse(body) : null,
      },
    }),
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const client = createSanctraClient({
  token: process.env.SANCTRA_AGENT_TOKEN,
  baseUrl: `http://127.0.0.1:${server.address().port}/v1/agent`,
  fetchImpl: fetch,
  timeoutMs: process.env.SANCTRA_FIXTURE_ERROR === "timeout" ? 30 : 15000,
});
const mcp = createSanctraMcpServer(client);
await mcp.connect(new StdioServerTransport());
process.stdin.on("end", () => server.close());
