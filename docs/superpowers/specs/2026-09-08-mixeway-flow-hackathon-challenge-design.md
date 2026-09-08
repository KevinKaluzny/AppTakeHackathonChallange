# Mixeway Flow Hackathon Challenge Design

## Purpose

Create a self-contained AppTake hackathon challenge that teaches participants to use Mixeway Flow for Software Composition Analysis (SCA). Participants import an intentionally vulnerable Node.js application's SBOM, remediate at least one dependency finding, upload a regenerated SBOM, and run a local verifier to obtain a flag when Flow reports fewer active SCA findings.

The challenge uses an honor-system trust model. The verifier makes casual flag extraction difficult through bundling and obfuscation, but it does not claim to prevent a determined participant from reverse engineering or modifying local code.

## Application Base

The repository vendors OWASP NodeGoat at commit `c5cb68a7084e4ae7dcc60e6a98768720a81841e8`. Vendoring the source provides a simple clone-and-run experience and ensures Mixeway sees the application and root SBOM together.

The repository preserves NodeGoat's Apache License 2.0 file and upstream attribution. Challenge documentation prominently warns that the application is intentionally vulnerable and must only be run in an isolated training environment.

## Repository Contents

The published repository contains:

- the pinned NodeGoat application source and lockfile;
- the upstream license and attribution;
- a CycloneDX `sbom.json` in the repository root;
- an `npm run sbom` command that regenerates the root SBOM from the lockfile;
- participant instructions and troubleshooting guidance;
- an executable `script` verifier containing bundled and obfuscated JavaScript;
- participant-facing smoke checks for SBOM generation and verifier invocation.

Readable verifier source, its unobfuscated bundle, source maps, the hardcoded flag, the sealed baseline value, and release credentials are organizer-only inputs. They are not included in the published challenge artifact or its Git history.

## Participant Workflow

1. Clone the challenge repository.
2. Import the committed root `sbom.json` manually into the participant's Mixeway Flow code repository.
3. Review Flow's SCA findings.
4. Upgrade or replace at least one vulnerable dependency.
5. Regenerate the SBOM with `npm run sbom`.
6. Commit and push both the dependency metadata and regenerated `sbom.json`.
7. Manually upload the new `sbom.json` into the same Mixeway Flow code repository.
8. Wait until Flow finishes processing the upload.
9. Run:

   `./script --apikey <FLOW_API_KEY> --repo_id <CODE_REPOSITORY_ID>`

10. Receive the flag if the active SCA finding count is lower than the challenge baseline.

The README explains how to locate the Flow code-repository ID and generate an API key without asking participants to store credentials in files.

## SBOM Generation

The project pins its SBOM generator as a development dependency and exposes it through `npm run sbom`. Generation reads the committed npm lockfile and writes a CycloneDX JSON document to `sbom.json` at the repository root.

The command is deterministic apart from metadata fields whose values are expected to vary between runs. Documentation tells participants to review and commit the generated file. SBOM generation never contacts Mixeway Flow and never reads the participant's API key.

## Verifier Contract

The verifier accepts exactly these participant-facing arguments:

- `--apikey <value>`: Mixeway Flow API key;
- `--repo_id <positive integer>`: participant-specific code-repository ID.

It sends:

`GET https://flow.mixeway.io/api/v1/coderepo/{repo_id}/findings`

with:

`X-API-KEY: <apikey>`

The verifier does not send the key to any other origin, does not follow redirects, does not write it to disk, and does not include it in logs or errors. It applies a finite request timeout.

The endpoint returns findings from multiple scanners. The verifier validates that the response is a JSON array and counts only entries satisfying both conditions:

- `source === "SCA"`;
- `status !== "REMOVED"`.

All other finding sources and removed SCA findings are ignored.

## Success Rule

During release preparation, the organizer obtains the initial active SCA finding count after importing the original SBOM. The organizer build takes this positive integer and a flag matching `FLAG_{...}` as required inputs and seals both into the obfuscated verifier.

The challenge succeeds only when:

`currentActiveScaCount < sealedBaselineCount`

An equal or higher count is an unsolved challenge. The rule intentionally measures the participant's Flow result rather than merely checking whether local files changed.

The verifier displays the current and baseline counts after a valid API response. It reveals the flag only on success.

## Failure Behavior

The verifier fails closed. It returns a nonzero status and does not reveal the flag when:

- required arguments are absent, duplicated, or malformed;
- the repository ID is not a positive integer;
- the API request times out or fails;
- Flow responds with a redirect or non-success HTTP status;
- the response is not valid JSON or is not an array;
- the active SCA count is equal to or greater than the sealed baseline.

Authentication and authorization failures produce actionable messages without echoing the API key. Unexpected finding fields are ignored unless they make the top-level response invalid.

Distinct exit codes separate usage errors, network/API errors, malformed responses, and an unsolved challenge so workshop facilitators can diagnose problems quickly.

## Flag Concealment and Release

The organizer maintains readable verifier source outside the published repository. A reproducible release build:

1. validates the baseline and flag inputs;
2. injects them into the verifier at build time;
3. bundles the verifier into one JavaScript artifact;
4. removes source maps and readable constants;
5. applies JavaScript obfuscation;
6. prepends a portable Node.js shebang;
7. marks the resulting `script` executable;
8. scans the published tree to ensure the plain flag, readable verifier source, source maps, and organizer secrets are absent.

This provides concealment, not cryptographic protection. The participant-facing script remains cross-platform wherever a supported Node.js runtime is installed.

## Testing and Acceptance

Readable organizer-side tests use an injected HTTP transport or local mock server before bundling. They cover:

- valid argument parsing;
- missing, duplicate, and malformed arguments;
- correct API URL and authentication header;
- filtering mixed scanner sources;
- excluding `REMOVED` SCA findings;
- timeout, network, redirect, and HTTP failures;
- malformed JSON and non-array responses;
- equal, increased, and decreased finding counts;
- non-disclosure of the API key and flag on every failure path.

Repository acceptance checks also verify:

- NodeGoat attribution and Apache license are present;
- `sbom.json` is valid CycloneDX JSON at the root;
- a clean install can regenerate an SBOM;
- the generated verifier is executable;
- the published tree contains no plain-text flag, source map, readable verifier source, or release credential;
- participant instructions describe manual initial and updated SBOM uploads.

Live acceptance requires an organizer-owned Flow test repository: import the baseline SBOM, verify failure at the original count, upload an SBOM with at least one dependency finding removed, and verify that the script prints the flag.

## Scope Boundaries

The repository does not automate Flow SBOM uploads, create participant API keys, modify participant Flow data, verify a particular Git commit, or provide strong anti-tamper enforcement. It verifies only that the selected Flow code repository currently has fewer active SCA findings than the sealed baseline.
