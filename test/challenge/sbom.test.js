"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
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
  assert.ok(
    sbom.components.every(
      (component) =>
        !component.properties?.some(
          (property) =>
            property.name === "cdx:npm:package:extraneous" &&
            property.value === "true"
        )
    )
  );
  assert.ok(
    sbom.components.every(
      (component) =>
        !(
          component.group === "@cyclonedx" &&
          component.name === "cyclonedx-npm"
        )
    )
  );
});

test(
  "sbom script uses the caller npm when PATH contains an incompatible npm shim",
  { skip: !process.env.npm_execpath },
  (t) => {
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), "sbom-npm-shim-"));
    t.after(() => fs.rmSync(bin, { recursive: true, force: true }));
    const sbomPath = path.join(root, "sbom.json");
    const originalSbom = fs.readFileSync(sbomPath);

    const marker = path.join(bin, "invoked");
    fs.writeFileSync(
      path.join(bin, "npm"),
      `#!/bin/sh\n: > "$FAKE_NPM_MARKER"\nexit 97\n`
    );
    fs.chmodSync(path.join(bin, "npm"), 0o755);
    fs.writeFileSync(
      path.join(bin, "npm.cmd"),
      `@type nul > "%FAKE_NPM_MARKER%"\r\n@exit /b 97\r\n`
    );

    try {
      const result = spawnSync(
        process.execPath,
        [process.env.npm_execpath, "run", "sbom"],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            FAKE_NPM_MARKER: marker,
            PATH: `${bin}${path.delimiter}${process.env.PATH || ""}`,
          },
        }
      );

      assert.equal(
        result.status,
        0,
        `npm run sbom failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
      );
      assert.equal(
        fs.existsSync(marker),
        false,
        "the PATH npm shim was invoked"
      );
    } finally {
      fs.writeFileSync(sbomPath, originalSbom);
    }
  }
);
