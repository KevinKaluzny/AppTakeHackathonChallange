"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const scriptPath = path.join(root, "script");

test("bare verifier invocation exits 2 without flag-like output", () => {
  const command = process.platform === "win32" ? process.execPath : scriptPath;
  const args = process.platform === "win32" ? [scriptPath] : [];

  if (process.platform !== "win32") {
    const mode = require("node:fs").statSync(scriptPath).mode;
    assert.notEqual(mode & 0o111, 0, "script must remain executable on POSIX");
  }

  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
  });
  const output = `${result.stdout}${result.stderr}`;

  assert.equal(result.status, 2, output);
  assert.doesNotMatch(output, /FLAG_\{[^{}\r\n]*\}/);
});

test("requiring the verifier exposes no callable injection surface", () => {
  const verifier = require(scriptPath);

  assert.notEqual(typeof verifier, "function");
  assert.deepEqual(Reflect.ownKeys(verifier), []);
});
