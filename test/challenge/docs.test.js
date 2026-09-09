"use strict";

const assert = require("node:assert/strict");
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
  assert.match(readme, /\|\s*\*\*1\*\*\s*\|[^|]*unexpected internal error/i);
  assert.match(readme, /https:\/\/github\.com\/OWASP\/NodeGoat#readme/);
});

test("challenge scripts and SBOM tool metadata stay focused", () => {
  assert.equal(
    packageJson.scripts["test:challenge"],
    "node --test test/challenge"
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
  for (const relativePath of [".travis.yml", "artifacts/cert/server.key"]) {
    assert.equal(
      fs.existsSync(path.join(root, relativePath)),
      false,
      `${relativePath} must not be published`
    );
  }

  for (const relativePath of ["docs/superpowers", ".github/workflows"]) {
    const absolutePath = path.join(root, relativePath);
    const publishedFiles = fs.existsSync(absolutePath)
      ? fs
          .readdirSync(absolutePath, { recursive: true, withFileTypes: true })
          .filter((entry) => entry.isFile())
      : [];
    assert.deepEqual(publishedFiles, [], `${relativePath} must be empty`);
  }

  assert.match(gitignore, /^docs\/superpowers\/$/m);
  assert.match(gitignore, /^\.superpowers\/$/m);
  assert.match(upstream, /artifacts\/cert\/server\.key/);
  assert.match(upstream.toLowerCase(), /intentionally removed/);
});
