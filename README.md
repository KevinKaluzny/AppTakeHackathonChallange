# Mixeway Flow Hackathon Challenge

This repository is a **Mixeway Flow Software Composition Analysis (SCA) challenge** built on top of [OWASP NodeGoat](https://github.com/OWASP/NodeGoat). Your goal is to fork and import the repository into Mixeway Flow, review SCA findings from the automatic initial scan, remediate at least one vulnerable dependency, regenerate and manually upload the updated SBOM, and verify your progress with the local checker script.

## Important safety warning

**This application is intentionally vulnerable.** It exists solely for security training and SCA practice. Do **not** deploy it to production, expose it to the public internet, or run it outside an isolated lab environment. Use disposable credentials and treat all data in this application as untrusted.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 20 or later** and **npm**
- A **Mixeway Flow account** with access to [flow.mixeway.io](https://flow.mixeway.io)
- A **Git client** for committing and pushing your changes
- (Optional) **MongoDB** if you want to run the NodeGoat application locally — see the [upstream NodeGoat README](https://github.com/OWASP/NodeGoat#readme) for setup instructions

You do **not** need to run the application to complete this challenge. The SCA workflow uses the committed `sbom.json` and your dependency changes.

## Challenge overview

1. Fork this repository to your GitHub account.
2. Sign in to Mixeway Flow with GitHub and import your fork as a **Single Repository**.
3. Wait for the automatic initial scan; do not upload the original SBOM manually.
4. Review the SCA findings Flow reports.
5. Upgrade or replace at least one vulnerable dependency.
6. Regenerate the SBOM with `npm run sbom`, then commit and push your changes.
7. After the scan throttle expires, manually upload the new `sbom.json`.
8. Wait until Flow finishes processing the updated SBOM.
9. Run the verifier script with your Flow API key and repository ID.
10. Receive the flag when Flow reports fewer active SCA findings than the challenge baseline.

## Step-by-step workflow

### 1. Fork and clone this repository

Open the challenge repository on GitHub and select **Fork**. Create the fork
under your own GitHub account; Mixeway Flow must scan your fork so that you
can push the dependency fix.

Clone your fork, not the original challenge repository:

```bash
git clone https://github.com/<your-username>/<fork-name>.git
cd <repo-directory>
```

Do not run a full root `npm install`; completing the challenge does not require installing the intentionally vulnerable application.

### 2. Sign in to Mixeway Flow

Open [flow.mixeway.io](https://flow.mixeway.io) and choose **Sign in with GitHub**.
Use the same GitHub account that owns your fork.

### 3. Create a GitHub personal access token

In GitHub, create a **fine-grained personal access token** for Flow:

1. Open **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens**.
2. Create a token restricted to your fork.
3. Grant repository **Contents: Read-only** access. GitHub grants metadata
   access automatically.
4. Copy the token when GitHub displays it; you will enter it into Flow once.

Use a workshop-only token with the shortest practical expiration. Never commit
it, paste it into the repository, or share it in screenshots. Revoke it after
the workshop.

### 4. Import your fork into Flow

On the Flow dashboard:

1. Select **Single Repository**.
2. For the Git provider/repository type, select **GitHub**.
3. In **Repository URL**, enter the full URL of your fork, for example
   `https://github.com/<your-username>/<fork-name>`.
4. In **Access Token**, enter the fine-grained GitHub token from the previous
   step.
5. In **Team**, select the only available personal team. Its name contains
   your username.
6. Confirm the import.

The GitHub personal access token authenticates Flow when it reads your fork.
It is different from the Flow API key used by the verifier later.

### 5. Wait for the automatic initial scan

Importing the repository **automatically starts the initial scan**. The
committed root `sbom.json` is processed during that scan, so do not manually
upload the original SBOM.

The scan normally takes several minutes. On the repository list, select the
**magnifying-glass** action beside your imported repository, then open
**Scan Info** to monitor scan history and status. Continue only after the
initial scan has completed and the SCA findings are visible.

### 6. Review SCA findings

In Flow, open your code repository and review the **SCA** (Software Composition Analysis) findings. Note which dependencies are flagged and what versions are recommended.

The verifier counts only findings where `source === "SCA"` and `status !== "REMOVED"`. Remediated findings that Flow marks as removed will not count toward your total.

### 7. Remediate at least one dependency

Use npm's lockfile-only mode to upgrade or replace at least one dependency that contributes to an active SCA finding:

```bash
npm install <package>@<safe-version> --save --package-lock-only --ignore-scripts
```

This updates `package.json` and `package-lock.json` without installing the application or running package scripts. Modern npm versions may produce a large lockfile-format diff in this old project; review that diff along with the intended dependency change. Choose a remediation that Flow will recognize after you upload a fresh SBOM.

### 8. Regenerate and push the SBOM

After changing dependencies, regenerate the CycloneDX SBOM at the repository root:

```bash
npm run sbom
```

This generator installs its pinned tooling under `tools/sbom` and therefore needs npm registry access. It does not perform a full root dependency install.

Review the updated `sbom.json`, then commit both your dependency changes and the regenerated file:

```bash
git add package.json package-lock.json sbom.json
git commit -m "fix: remediate vulnerable dependency"
git push
```

### 9. Upload the regenerated SBOM manually

Flow prevents another scan of the same repository for **10 minutes after a
scan starts**. Before uploading, ensure the automatic initial scan has
finished and at least 10 minutes have elapsed since the repository import
started it. Uploading sooner may be rejected as throttled.

In the imported repository:

1. Open the **Scan** menu.
2. Choose **Upload SBOM (SCA only)**.
3. Select the regenerated `sbom.json`.
4. Select the repository branch that contains your fix.
5. Choose **Upload & scan**.

This starts an SCA-only scan. Wait for processing to finish and use **Scan
Info** to monitor its status. If the verifier reports that your finding count
has not decreased, confirm that:

- The upload completed successfully in the Flow UI.
- Processing has finished (refresh the findings view).
- Your dependency change actually reduced active SCA findings.

### 10. Generate a Flow API key

In the Mixeway Flow UI, create an **API key** for your account. You will pass this value to the verifier script.

**Credential safety:**

- Pass the API key only on the command line or in your shell session — **never** commit it to Git, write it to `.env` files in this repository, or share it in chat or screenshots.
- The verifier sends the key only to `https://flow.mixeway.io` and does not write it to disk or include it in error messages.
- Revoke and regenerate the key if you accidentally expose it.

### 11. Find your code repository ID

Each Flow code repository has a numeric **repository ID**. You can find it in the Flow UI (typically in the repository URL or details panel). The verifier expects a positive integer, for example `42`.

The verifier queries:

```
GET https://flow.mixeway.io/api/v1/coderepo/{repo_id}/findings
```

with the header `X-API-KEY: <your-api-key>`.

### 12. Run the verifier

From the repository root, run:

```bash
./script --apikey <FLOW_API_KEY> --repo_id <CODE_REPOSITORY_ID>
```

On Windows, invoke the verifier through Node:

```powershell
node script --apikey <FLOW_API_KEY> --repo_id <CODE_REPOSITORY_ID>
```

Replace `<FLOW_API_KEY>` with your API key and `<CODE_REPOSITORY_ID>` with your Flow code repository ID.

On success, the script prints the current and baseline SCA counts and reveals the challenge flag.

## Verifier exit codes

Use these exit codes to troubleshoot problems:

| Exit code | Meaning | What to check |
|-----------|---------|---------------|
| **0** | Success — active SCA count is below the baseline; flag displayed | — |
| **1** | Unexpected internal error | Retry once; if it persists, contact the challenge organizers |
| **2** | Usage error — missing, duplicate, or malformed arguments | Provide both `--apikey` and `--repo_id` exactly once |
| **3** | API or network error — timeout, connection failure, HTTP error, or redirect | Verify API key, network access, and that `flow.mixeway.io` is reachable |
| **4** | Malformed response — Flow returned invalid JSON or a non-array body | Retry after Flow finishes processing; contact organizers if it persists |
| **5** | Unsolved — active SCA count is equal to or higher than the baseline | Confirm you remediated a dependency, regenerated and uploaded the new SBOM, and waited for processing |

Run `./script` (POSIX) or `node script` (Windows) with no arguments to see usage help (exit code 2).

## Local smoke checks

Verify the SBOM tooling works in your environment:

```bash
npm run sbom
npm run test:challenge
```

These commands do not contact Mixeway Flow and do not require an API key. `npm run sbom` does contact the npm registry to install its pinned generator tooling.

## Upstream attribution

This challenge vendors **OWASP NodeGoat** at commit `c5cb68a7084e4ae7dcc60e6a98768720a81841e8`. NodeGoat is licensed under the Apache License 2.0 — see [LICENSE](LICENSE) and [UPSTREAM.md](UPSTREAM.md).

Challenge-specific files (SBOM tooling, verifier script, and this documentation) are identified by this repository's Git history.
