#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { createSanctraClient } from "./http-client.js";
import { createSanctraMcpServer } from "./server.js";
try {
  const client = createSanctraClient({
    token: process.env.SANCTRA_AGENT_TOKEN ?? "",
  });
  await createSanctraMcpServer(client).connect(new StdioServerTransport());
} catch {
  process.stderr.write(
    "Sanctra connector could not start. Check the private SANCTRA_AGENT_TOKEN environment and installation.\n",
  );
  process.exitCode = 1;
}
