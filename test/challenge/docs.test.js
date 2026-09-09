"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const readmeLower = readme.toLowerCase();
const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
const upstream = fs.readFileSync(path.join(root, "UPSTREAM.md"), "utf8");
const packageJson = require(path.join(root, "package.json"));
const sbomPackageJson = require(path.join(root, "tools/sbom/package.json"));
const sbomPackageLock = require(path.join(
  root,
  "tools/sbom/package-lock.json"
));

const requiredPhrases = [
  "intentionally vulnerable",
  "flow.mixeway.io",
  "npm run sbom",
  "manually upload",
  "./script --apikey",
  "--repo_id",
  "OWASP NodeGoat",
];

test("README documents the Mixeway Flow challenge workflow", () => {
  for (const phrase of requiredPhrases) {
    const haystack = phrase === "OWASP NodeGoat" ? readme : readmeLower;
    const needle = phrase === "OWASP NodeGoat" ? phrase : phrase.toLowerCase();
    assert.ok(
      haystack.includes(needle),
      `README.md must include "${phrase}"`
    );
  }
});

test("README documents a lockfile-only remediation and portable commands", () => {
  assert.doesNotMatch(readme, /^\s*npm install\s*$/m);
  assert.match(
    readme,
    /npm install <package>@<safe-version> --save --package-lock-only --ignore-scripts/
  );
  assert.match(readmeLower, /large lockfile-format diff/);
  assert.match(readmeLower, /pinned tooling/);
  assert.match(readmeLower, /npm registry access/);
  assert.match(readme, /node script --apikey/);
  assert.match(
    readme,
    /Run `\.\/script` \(POSIX\) or `node script` \(Windows\) with no arguments/
  );
  assert.match(readme, /\|\s*\*\*1\*\*\s*\|[^|]*unexpected internal error/i);
  assert.match(readme, /https:\/\/github\.com\/OWASP\/NodeGoat#readme/);
});

test("challenge scripts and SBOM tool metadata stay focused", () => {
  assert.equal(
    packageJson.scripts["test:challenge"],
    "node --test test/challenge/docs.test.js test/challenge/sbom.test.js test/challenge/verifier.test.js"
  );
  assert.equal(sbomPackageJson.scripts, undefined);
  assert.equal(
    sbomPackageLock.packages[""].name,
    sbomPackageJson.name
  );
  assert.equal(
    sbomPackageLock.packages[""].version,
    sbomPackageJson.version
  );
  assert.deepEqual(
    sbomPackageLock.packages[""].dependencies,
    sbomPackageJson.dependencies
  );
});

test("published challenge excludes organizer and obsolete upstream files", () => {
  const forbiddenTrackedPaths = [
    "docs/superpowers/**",
    ".superpowers/**",
    ".github/workflows/**",
    ".travis.yml",
    "artifacts/cert/server.key",
  ];
  const result = spawnSync(
    "git",
    ["ls-files", "--", ...forbiddenTrackedPaths],
    { cwd: root, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "", `release-only paths tracked:\n${result.stdout}`);

  assert.match(gitignore, /^docs\/superpowers\/$/m);
  assert.match(gitignore, /^\.superpowers\/$/m);
  assert.match(upstream, /artifacts\/cert\/server\.key/);
  assert.match(upstream.toLowerCase(), /intentionally removed/);
});
