import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
test("packed artifact installs and serves all tools without the frontend checkout", () => {
  const directory = mkdtempSync(join(tmpdir(), "sanctra-packed-"));
  try {
    const packResult = JSON.parse(
      execFileSync("npm", ["pack", "--json"], { encoding: "utf8" }),
    );
    const pack = Array.isArray(packResult)
      ? packResult[0]
      : Object.values(packResult)[0];
    execFileSync(
      "npm",
      ["install", "--prefix", directory, "--omit=dev", resolve(pack.filename)],
      { stdio: "pipe" },
    );
    const installed = join(directory, "node_modules/@sanctra/hermes-mcp");
    for (const file of [
      "dist/index.js",
      "skill/SKILL.md",
      "README.md",
      "examples/hermes.config.yaml",
    ])
      assert.equal(existsSync(join(installed, file)), true);
    // Copy tests and official client dependencies; fixture imports only the installed compiled package.
    cpSync("tests", join(directory, "tests"), { recursive: true });
    execFileSync(
      "npm",
      [
        "install",
        "--prefix",
        directory,
        "--save-dev",
        "@modelcontextprotocol/client@2.3.1",
      ],
      { stdio: "pipe" },
    );
    const result = spawnSync(
      process.execPath,
      ["--test", join(directory, "tests/protocol.test.mjs")],
      {
        cwd: directory,
        env: { ...process.env, SANCTRA_TEST_PACKAGE: installed + "/dist" },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const startup = spawnSync(
      process.execPath,
      [join(installed, "dist/index.js")],
      {
        env: { PATH: process.env.PATH, SANCTRA_AGENT_TOKEN: "PLACEHOLDER" },
        encoding: "utf8",
      },
    );
    assert.equal(startup.status, 1);
    assert.equal(startup.stdout, "");
    assert.equal(startup.stderr.includes("PLACEHOLDER"), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
