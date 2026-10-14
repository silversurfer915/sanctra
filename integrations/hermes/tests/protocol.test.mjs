import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
const token = "sanctra_agent_" + "a".repeat(22) + "." + "b".repeat(43);
const entry =
  process.env.SANCTRA_TEST_ENTRY ??
  fileURLToPath(new URL("./fixture-api.mjs", import.meta.url));
test("SDK stdio discovers 40 strict tools and calls every route with structured results", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry],
    env: { ...process.env, SANCTRA_AGENT_TOKEN: token },
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (chunk) => (stderr += chunk));
  const client = new Client({ name: "protocol-test", version: "1" });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    assert.equal(tools.length, 40);
    for (const tool of tools) {
      assert.equal(tool.inputSchema.additionalProperties, false);
      const suffix = tool.name.replace("sanctra_", "");
      const input = sample(suffix);
      const result = await client.callTool({
        name: tool.name,
        arguments: input,
      });
      assert.notEqual(result.isError, true, JSON.stringify(result));
      assert.equal(result.structuredContent.apiVersion, "1");
      assert.equal(
        result.structuredContent.data.method,
        tool.annotations.readOnlyHint
          ? "GET"
          : suffix === "update_task" ||
              suffix === "update_session" ||
              suffix === "update_user" || suffix.startsWith("set_")
            ? "PATCH"
            : suffix.startsWith("delete_") ? "DELETE" : "POST",
      );
      assert.equal(JSON.stringify(result).includes(token), false);
    }
    const before = await client.callTool({
      name: "sanctra_connection_status",
      arguments: {},
    });
    const invalid = await client.callTool({
      name: "sanctra_create_tasks",
      arguments: { ...sample("create_tasks"), url: "https://evil.test" },
    });
    assert.equal(invalid.isError, true);
    const after = await client.callTool({
      name: "sanctra_connection_status",
      arguments: {},
    });
    assert.equal(
      after.structuredContent.data.requests,
      before.structuredContent.data.requests + 1,
      "Invalid input must not reach HTTP",
    );
    assert.equal(stderr, "");
    for (const [name, expectedPath] of [
      ["create_tasks", "/v1/agent/users/owner/tasks"],
      ["reply_ticket", "/v1/agent/tickets/ticket/replies"],
      ["get_user", "/v1/agent/users/owner"],
    ]) {
      const args = sample(name);
      const result = await client.callTool({
        name: "sanctra_" + name,
        arguments: args,
      });
      assert.equal(result.structuredContent.data.path, expectedPath);
      if (args.input)
        assert.deepEqual(result.structuredContent.data.body, {
          operationId: args.operationId,
          reason: args.reason,
          expectedVersions: args.expectedVersions,
          input: args.input,
        });
    }
  } finally {
    await client.close();
  }
});
test("protocol preserves controlled errors for auth, conflict, upstream and transport failures", async () => {
  for (const mode of [
    "unauthenticated",
    "forbidden",
    "expired",
    "conflict",
    "unavailable",
    "malformed",
    "oversized",
    "redirect",
    "timeout",
  ]) {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      env: {
        ...process.env,
        SANCTRA_AGENT_TOKEN: token,
        SANCTRA_FIXTURE_ERROR: mode,
      },
      stderr: "pipe",
    });
    const client = new Client({ name: "error-test", version: "1" });
    await client.connect(transport);
    try {
      const result = await client.callTool({
        name: "sanctra_connection_status",
        arguments: {},
      });
      assert.equal(result.isError, true, mode);
      assert.equal(JSON.stringify(result).includes(token), false);
      assert.equal(
        result.structuredContent.error.code,
        ["malformed", "oversized", "redirect", "timeout"].includes(mode)
          ? "unavailable"
          : mode,
      );
    } finally {
      await client.close();
    }
  }
});
export function sample(name) {
  const envelope = {
    operationId: "operation_1",
    reason: "Owner requested change",
    expectedVersions: { account: "v1" },
    input: {},
  };
  const reads = {
    get_subjects:{uid:"owner"},
    get_workspaces:{uid:"owner"},
    get_syllabus_chapters:{subject:"maths",class:"12"},
    get_ticket_attachment:{id:"ticket",messageId:"message"},
    connection_status: {},
    list_users: { limit: 25, search: "A /+" },
    get_user: { uid: "owner" },
    list_tickets: { status: "open" },
    get_ticket: { id: "ticket" },
    get_ai_controls: { uid: "owner" },
    get_platform_controls: {},
    get_agent_audit: { limit: 25 },
  };
  if (reads[name]) return reads[name];
  if (name === "get_jee" || name === "get_ai_usage")
    return { uid: "owner", limit: 25 };
  if (name.startsWith("get_"))
    return {
      uid: "owner",
      from: "2026-10-13",
      to: "2026-10-14",
      timezone: "Asia/Kolkata",
    };
  const writes = {
    delete_task:{uid:"owner",taskId:"task"},
    delete_session:{uid:"owner",sessionId:"session",expectedVersions:{account:"v1",session:"v1"}},
    restore_task:{uid:"owner",taskId:"task"},
    restore_session:{uid:"owner",sessionId:"session"},
    start_session:{uid:"owner",sessionId:"session",expectedVersions:{account:"v1",session:"v1"}},
    stop_session:{uid:"owner",sessionId:"session",expectedVersions:{account:"v1",session:"v1"}},
    complete_session:{uid:"owner",sessionId:"session",expectedVersions:{account:"v1",session:"v1"}},
    create_session:{uid:"owner",input:{subjectId:"physics",startTime:1000,durationSeconds:600}},
    update_user:{uid:"owner",input:{displayName:"Owner"}},
    create_user:{input:{uid:"user",displayName:"Member"}},
    create_ticket:{input:{ownerUid:"owner",title:"Help",category:"bug",text:"Details"}},
    batch_mutations:{input:{operations:[{method:"PATCH",path:"/users/owner/tasks/task",body:{input:{text:"Updated"},expectedVersions:{account:"v1"}}}]}},
    create_tasks: {
      uid: "owner",
      input: { tasks: [{ text: "Read", dueDate: "2026-10-13" }] },
    },
    update_task: {
      uid: "owner",
      taskId: "task",
      input: { text: "Read again" },
    },
    complete_task: { uid: "owner", taskId: "task", input: { completed: true } },
    schedule_sessions: {
      uid: "owner",
      input: {
        sessions: [
          {
            subjectId: "physics",
            date: "2026-10-13",
            startTime: "10:00",
            plannedDurationSeconds: 1800,
          },
        ],
      },
    },
    update_session: {
      uid: "owner",
      sessionId: "session",
      expectedVersions: { account: "v1", session: "" },
      input: { notes: "Owner note" },
    },
    reply_ticket: {
      id: "ticket",
      expectedVersions: { ticket: "v1" },
      input: { text: "Reply" },
    },
    set_ticket_status: {
      id: "ticket",
      expectedVersions: { ticket: "v1" },
      input: { status: "resolved" },
    },
    set_user_ai: {
      uid: "owner",
      expectedVersions: { aiAccess: "v1" },
      input: { enabled: false },
    },
    set_global_ai: {
      expectedVersions: { aiConfig: "v1" },
      input: { enabled: false },
    },
    set_platform_controls: {
      expectedVersions: { platform: "v1" },
      input: { sitePaused: false },
    },
  };
  return { ...envelope, ...writes[name] };
}
