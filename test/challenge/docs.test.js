"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const readmeLower = readme.toLowerCase();

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
