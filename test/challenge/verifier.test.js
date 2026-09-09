"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const scriptPath = path.join(root, "script");

test("bare verifier invocation exits 2 without flag-like output", () => {
  const result = spawnSync(scriptPath, [], {
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
