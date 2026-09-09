"use strict";

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const npmExecPath = process.env.npm_execpath;

if (!npmExecPath) {
  throw new Error("npm_execpath is required; run this helper through npm");
}

function runNode(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
}

runNode(npmExecPath, ["ci", "--prefix", "tools/sbom", "--ignore-scripts"]);
runNode(
  path.join(
    __dirname,
    "node_modules",
    "@cyclonedx",
    "cyclonedx-npm",
    "bin",
    "cyclonedx-npm-cli.js"
  ),
  [
    path.join(root, "package-lock.json"),
    "--package-lock-only",
    "--omit",
    "dev",
    "--output-format",
    "JSON",
    "--output-file",
    path.join(root, "sbom.json"),
  ]
);
