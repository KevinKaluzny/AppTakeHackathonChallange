"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

test("root sbom is a populated CycloneDX document", () => {
  const sbom = JSON.parse(fs.readFileSync(path.join(root, "sbom.json"), "utf8"));
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.match(sbom.specVersion, /^1\.[4-6]$/);
  assert.ok(Array.isArray(sbom.components));
  assert.ok(sbom.components.length > 0);
  assert.ok(sbom.components.some((component) => component.name === "express"));
});
