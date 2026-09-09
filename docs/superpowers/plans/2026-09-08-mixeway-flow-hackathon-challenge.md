# Mixeway Flow Hackathon Challenge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a pinned OWASP NodeGoat challenge with a root CycloneDX SBOM, manual Mixeway Flow workflow, and an obfuscated verifier that reveals a flag only after active SCA findings decrease.

**Architecture:** Vendor NodeGoat commit `c5cb68a7084e4ae7dcc60e6a98768720a81841e8` directly at the repository root, add a pinned SBOM-generation command, and replace upstream-facing documentation with participant instructions while retaining attribution. Build and test the verifier from an ephemeral organizer workspace so only its obfuscated executable artifact enters Git.

**Tech Stack:** Node.js 20+, npm, OWASP NodeGoat, CycloneDX npm SBOM tooling, Node.js built-in test runner, esbuild, javascript-obfuscator.

## Global Constraints

- Preserve OWASP NodeGoat's Apache License 2.0 and identify upstream commit `c5cb68a7084e4ae7dcc60e6a98768720a81841e8`.
- Keep `sbom.json` at the repository root and require manual upload to Mixeway Flow.
- The verifier command is `./script --apikey <FLOW_API_KEY> --repo_id <CODE_REPOSITORY_ID>`.
- Query `GET https://flow.mixeway.io/api/v1/coderepo/{repo_id}/findings` with `X-API-KEY`.
- Count only findings where `source === "SCA"` and `status !== "REMOVED"`.
- Reveal the flag only when the current count is strictly below the release-time baseline.
- Do not commit readable verifier source, source maps, release credentials, the plain flag, or the unobfuscated bundle.
- Treat the obfuscation as concealment, not strong anti-tamper protection.

---

### Task 1: Vendor the pinned NodeGoat snapshot

**Files:**
- Create: NodeGoat files from the pinned upstream archive at repository root
- Preserve: `docs/superpowers/specs/2026-09-08-mixeway-flow-hackathon-challenge-design.md`
- Create: `UPSTREAM.md`

**Interfaces:**
- Consumes: OWASP NodeGoat Git commit `c5cb68a7084e4ae7dcc60e6a98768720a81841e8`
- Produces: complete NodeGoat source, `package.json`, `package-lock.json`, and Apache `LICENSE`

- [ ] **Step 1: Download and inspect the pinned archive**

Run:

```bash
archive="$(mktemp)"
curl --fail --location \
  "https://github.com/OWASP/NodeGoat/archive/c5cb68a7084e4ae7dcc60e6a98768720a81841e8.tar.gz" \
  --output "$archive"
tar -tzf "$archive"
```

Expected: archive entries are rooted under `NodeGoat-c5cb68a7084e4ae7dcc60e6a98768720a81841e8/`.

- [ ] **Step 2: Extract the application without overwriting challenge docs**

Run:

```bash
staging="$(mktemp -d)"
tar -xzf "$archive" -C "$staging" --strip-components=1
rsync -a --exclude='.git' --exclude='docs/superpowers' "$staging/" ./
rm -rf "$staging" "$archive"
```

Expected: `server.js`, `app/`, `package.json`, `package-lock.json`, and `LICENSE` exist at the repository root.

- [ ] **Step 3: Add explicit upstream attribution**

Create `UPSTREAM.md`:

```markdown
# Upstream attribution

This challenge vendors [OWASP NodeGoat](https://github.com/OWASP/NodeGoat)
at commit `c5cb68a7084e4ae7dcc60e6a98768720a81841e8`.

NodeGoat is licensed under the Apache License 2.0. See `LICENSE`.
Files added or changed for the Mixeway Flow hackathon challenge are identified
by this repository's Git history.
```

- [ ] **Step 4: Verify provenance files**

Run:

```bash
test -f server.js
test -f package.json
test -f package-lock.json
test -f LICENSE
grep -F "Apache License" LICENSE
grep -F "c5cb68a7084e4ae7dcc60e6a98768720a81841e8" UPSTREAM.md
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit the vendored snapshot**

```bash
git add .
git commit -m "feat: vendor pinned OWASP NodeGoat application"
```

### Task 2: Add deterministic SBOM generation

**Files:**
- Modify: `package.json`
- Preserve unchanged: `package-lock.json`
- Create: `tools/sbom/package.json`
- Create: `tools/sbom/package-lock.json`
- Create: `test/challenge/sbom.test.js`
- Create: `sbom.json`

**Interfaces:**
- Produces: npm script `sbom` that writes CycloneDX JSON to `sbom.json`
- Produces: root document with `bomFormat === "CycloneDX"` and a non-empty `components` array

- [ ] **Step 1: Write the failing SBOM contract test**

Create `test/challenge/sbom.test.js`:

```javascript
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
```

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
node --test test/challenge/sbom.test.js
```

Expected: FAIL because `sbom.json` does not exist.

- [ ] **Step 3: Pin the generator in an isolated tool package and add scripts**

Create `tools/sbom/package.json`:

```json
{
  "name": "flow-challenge-sbom-tool",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "generate": "cyclonedx-npm ../../package-lock.json --omit dev --output-format JSON --output-file ../../sbom.json"
  },
  "dependencies": {
    "@cyclonedx/cyclonedx-npm": "4.0.3"
  }
}
```

Run:

```bash
npm install --prefix tools/sbom --ignore-scripts --package-lock-only
npm pkg set \
  'scripts.sbom=npm ci --prefix tools/sbom --ignore-scripts && npm --prefix tools/sbom run generate' \
  'scripts.test:challenge=node --test test/challenge/*.test.js'
git diff --exit-code -- package-lock.json
```

Expected: `tools/sbom/package.json` pins `@cyclonedx/cyclonedx-npm` exactly to `4.0.3`, its separate lockfile records the tool dependency graph, and NodeGoat's root `package-lock.json` remains byte-for-byte unchanged.

- [ ] **Step 4: Generate the initial SBOM**

Run:

```bash
npm run sbom
```

Expected: root `sbom.json` is created.

- [ ] **Step 5: Run the SBOM test**

Run:

```bash
npm run test:challenge
```

Expected: PASS for the CycloneDX document and Express component checks.

- [ ] **Step 6: Commit SBOM support**

```bash
git add package.json tools/sbom/package.json tools/sbom/package-lock.json sbom.json test/challenge/sbom.test.js
git commit -m "feat: add reproducible CycloneDX SBOM"
```

### Task 3: Seal the baseline and build the verifier

**Files:**
- Create temporarily: `$TMPDIR/mixeway-verifier/src/verifier.js`
- Create temporarily: `$TMPDIR/mixeway-verifier/test/verifier.test.js`
- Create temporarily: `$TMPDIR/mixeway-verifier/build.mjs`
- Create: `script`
- Test: ephemeral Node.js verifier tests

**Interfaces:**
- Consumes: organizer-provided positive integer baseline from the initial Flow import
- Consumes: organizer-provided flag matching `^FLAG_\{[^{}\r\n]+\}$`
- Produces: executable `script` accepting `--apikey` and `--repo_id`
- Exit codes: `2` usage, `3` API/network, `4` malformed response, `5` unsolved

- [ ] **Step 1: Import the initial `sbom.json` into an organizer Flow repository**

Manually upload the root `sbom.json`, wait for processing, and retrieve findings:

```bash
curl --fail --silent \
  -H "X-API-KEY: $FLOW_API_KEY" \
  "https://flow.mixeway.io/api/v1/coderepo/$FLOW_CODE_REPO_ID/findings" |
jq '[.[] | select(.source == "SCA" and .status != "REMOVED")] | length'
```

Expected: a positive integer. Export it as `CHALLENGE_BASELINE`.

- [ ] **Step 2: Write verifier tests in an ephemeral organizer workspace**

The tests must import `parseArgs`, `countActiveSca`, and `run` from `src/verifier.js`. Cover:

```javascript
assert.deepEqual(
  parseArgs(["--apikey", "secret", "--repo_id", "42"]),
  { apikey: "secret", repoId: 42 }
);
assert.equal(countActiveSca([
  { source: "SCA", status: "EXISTING" },
  { source: "SCA", status: "REMOVED" },
  { source: "SAST", status: "EXISTING" }
]), 1);
```

Add mocked-fetch cases asserting status 0 only below baseline; status 5 at equal or higher counts; status 3 for redirects, HTTP errors, timeouts, and network errors; status 4 for malformed JSON or non-array JSON; and no API key or flag in failure output.

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
node --test "$TMPDIR/mixeway-verifier/test/verifier.test.js"
```

Expected: FAIL because `src/verifier.js` does not exist.

- [ ] **Step 4: Implement the verifier**

Implement:

```javascript
const FLOW_ORIGIN = "https://flow.mixeway.io";
const TIMEOUT_MS = 10_000;

function countActiveSca(findings) {
  return findings.filter(
    (finding) => finding?.source === "SCA" && finding?.status !== "REMOVED"
  ).length;
}
```

`parseArgs(argv)` must reject unknown, missing, duplicate, or malformed options. `run(argv, dependencies)` must use `redirect: "error"`, an abort timeout, validate an array response, print counts after valid responses, and return the documented exit code. The generated CLI wrapper must set `process.exitCode` without printing stack traces.

- [ ] **Step 5: Run verifier tests**

Run:

```bash
node --test "$TMPDIR/mixeway-verifier/test/verifier.test.js"
```

Expected: all tests PASS.

- [ ] **Step 6: Build and obfuscate the participant artifact**

The build script must validate:

```javascript
if (!/^[1-9]\d*$/.test(process.env.CHALLENGE_BASELINE ?? "")) {
  throw new Error("CHALLENGE_BASELINE must be a positive integer");
}
if (!/^FLAG_\{[^{}\r\n]+\}$/.test(process.env.CHALLENGE_FLAG ?? "")) {
  throw new Error("CHALLENGE_FLAG must match FLAG_{...}");
}
```

Bundle with esbuild for Node.js 20, without source maps, then obfuscate using `javascript-obfuscator` with string-array encoding and control-flow flattening. Prepend `#!/usr/bin/env node\n`, write root `script`, and set mode `0755`.

Run:

```bash
CHALLENGE_BASELINE="$CHALLENGE_BASELINE" \
CHALLENGE_FLAG="$CHALLENGE_FLAG" \
node "$TMPDIR/mixeway-verifier/build.mjs"
```

Expected: executable root `script` exists and contains neither plain input value.

- [ ] **Step 7: Smoke-test failure without credentials**

Run:

```bash
./script
test "$?" -eq 2
```

Expected: usage text, no flag, and exit 2.

- [ ] **Step 8: Remove ephemeral organizer sources and commit only the artifact**

Run:

```bash
rm -rf "$TMPDIR/mixeway-verifier"
git add script
git commit -m "feat: add sealed Mixeway Flow verifier"
```

Expected: `git ls-files` includes `script` but no verifier source, source map, organizer key, or release environment file.

### Task 4: Replace documentation with participant instructions

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`
- Test: `test/challenge/docs.test.js`

**Interfaces:**
- Produces: complete manual Flow and remediation workflow
- Produces: prominent intentional-vulnerability warning and API-key safety guidance

- [ ] **Step 1: Write documentation contract tests**

Create `test/challenge/docs.test.js` with assertions that `README.md` contains:

```javascript
[
  "intentionally vulnerable",
  "flow.mixeway.io",
  "npm run sbom",
  "manually upload",
  "./script --apikey",
  "--repo_id",
  "OWASP NodeGoat"
]
```

The test reads README text case-insensitively where appropriate.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm run test:challenge
```

Expected: documentation contract FAILS against the upstream README.

- [ ] **Step 3: Write challenge README**

Document prerequisites, the intentional-vulnerability warning, initial manual SBOM upload, SCA review, dependency upgrade, `npm run sbom`, Git commit and push, second manual SBOM upload, processing wait, API-key generation, repository-ID lookup, verifier command, exit-code troubleshooting, credential safety, and upstream attribution.

- [ ] **Step 4: Add release artifacts and secrets to `.gitignore`**

Append:

```gitignore
.env
.env.*
*.map
.release-work/
organizer/
```

- [ ] **Step 5: Run challenge tests**

Run:

```bash
npm run test:challenge
```

Expected: all SBOM and documentation tests PASS.

- [ ] **Step 6: Commit participant documentation**

```bash
git add README.md .gitignore test/challenge/docs.test.js
git commit -m "docs: add Mixeway Flow challenge walkthrough"
```

### Task 5: Verify the published repository

**Files:**
- Inspect: all tracked files
- Modify only if an acceptance check exposes a defect

**Interfaces:**
- Produces: a clean, publishable challenge repository

- [ ] **Step 1: Verify tracked-file safety**

Run:

```bash
git ls-files | grep -Ev '(^|/)(node_modules|organizer|\.release-work)(/|$)'
test -z "$(git ls-files '*.map')"
test -z "$(git grep -lF "$CHALLENGE_FLAG" -- . ':!docs/superpowers/**' || true)"
test -z "$(git grep -lF "$FLOW_API_KEY" -- . || true)"
```

Expected: no tracked organizer source, source map, plain flag, or API key.

- [ ] **Step 2: Verify repository-owned tests**

Run:

```bash
npm run test:challenge
```

Expected: all tests PASS.

- [ ] **Step 3: Verify SBOM regeneration**

Run:

```bash
cp sbom.json "$TMPDIR/sbom.before.json"
npm run sbom
node --test test/challenge/sbom.test.js
```

Expected: generation exits 0 and the SBOM contract test passes.

- [ ] **Step 4: Verify CLI argument behavior**

Run:

```bash
set +e
./script >/tmp/mixeway-script.out 2>&1
status=$?
set -e
test "$status" -eq 2
test -z "$(grep -F "$CHALLENGE_FLAG" /tmp/mixeway-script.out || true)"
```

Expected: exit 2 and no flag.

- [ ] **Step 5: Perform live Flow acceptance**

Using an organizer test repository, verify the original SBOM returns the sealed count and the verifier exits 5. Upgrade one vulnerable dependency, regenerate and manually upload the SBOM, wait for processing, then verify the script exits 0 and prints the flag.

- [ ] **Step 6: Confirm clean Git state**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and no unintended changes.
