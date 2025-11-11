# CRITICAL SECURITY VERDICT – INGEST ASSISTANT

**[VERDICT] BLOCKED** – Two security-critical defects (unsafe ffmpeg/ffprobe invocation and unauthenticated localhost media server) leave the desktop app open to command execution and cross-origin data exfiltration. Production release cannot proceed.

---

## EVIDENCE

- `npm run typecheck`, `npm run lint`, `npm run build` – all pass locally.
- `CI=1 npm test -- --run --reporter=dot` – full Vitest suite passes once forced into run mode.
- `npm audit --production --audit-level=high` – blocked by restricted network (getaddrinfo ENOTFOUND registry.npmjs.org), so third-party vulnerability status remains unverified.
- Repository inspection across `electron/main.ts`, `electron/services/videoFrameExtractor.ts`, `electron/services/aiService.ts`, `electron/services/metadataStore.ts`, and `package.json`.

---

## REASONING

Even with compile/tests clean, the identified security defects allow:
- Malicious input (crafted filenames) to escape the sandbox
- Remote web origins to read user-selected media
- Additional operational gaps (non-atomic metadata store, runaway temporary files, non-terminating npm test script, missing security audit evidence) further erode production readiness

These must be resolved before approving shipment.

---

## VIOLATIONS & FIXES

### [VIOLATION – Security | BLOCKING] Command Injection in ffmpeg/ffprobe Calls

**Location:** `electron/services/videoFrameExtractor.ts:57-105`

**Issue:** Shell-based ffmpeg/ffprobe calls are built via `exec()` with user-controlled `videoPath` injected directly into the command string. Quoting does not neutralize embedded `"` or shell metacharacters in filenames.

**Attack Example:** A crafted media file `my-video.mp4"; rm -rf ~/Library` leads to command injection under the user account.

**Fix:**
- Replace `exec` with `spawn`/`execFile`
- Pass arguments as arrays
- Reject filenames containing quotes before invoking external tools
- Applies to both `extractSingleFrame` and `getVideoDuration`/`getVideoCodec`

**Priority:** BLOCKING (Security domain, IMMEDIATE escalation)

---

### [VIOLATION – Security | BLOCKING] Unauthenticated localhost Media Server

**Location:** `electron/main.ts:140-205`

**Issue:** The embedded HTTP media server exposes any file inside the selected folder (or cache directories) to any origin on the local machine. Every response advertises `Access-Control-Allow-Origin: '*'` with no capability token.

**Attack Example:** A malicious website opened in Chrome/Safari can probe `http://localhost:8765/?path=...` and read files as soon as the user selects a folder in the Electron app, bypassing the renderer sandbox.

**Fix:**
- Bind the server to a random high-numbered loopback port with per-session secret (e.g., capability token or origin filter)
- Return `Access-Control-Allow-Origin` only for the Electron app's custom scheme
- Or proxy media through `protocol.registerFileProtocol` instead of HTTP

**Priority:** BLOCKING (Security domain, IMMEDIATE)

---

### [VIOLATION – Reliability | HIGH] Temporary File Cleanup

**Location:** `electron/services/aiService.ts:455-496`

**Issue:** Video frame extraction never cleans up temporary JPEGs if any step fails. The catch block returns without deleting `framePaths`. Users processing thousands of clips will accumulate PII-rich frame dumps under `/tmp`, bloating disks and leaking data long after the operation.

**Fix:** Wrap cleanup in `finally` to unlink whatever files exist, even when extraction or AI analysis throws.

**Priority:** HIGH (Performance/Security, 72h)

---

### [VIOLATION – Data Integrity | HIGH] Non-atomic Metadata Writes

**Location:** `electron/services/metadataStore.ts:47-63`

**Issue:** Metadata persistence writes directly to `.ingest-metadata.json` via `fs.writeFile` without atomic swap or backup. Power loss or process crash mid-write corrupts the JSON file and loses the user's annotations.

**Fix:**
- Write to `metadata.tmp`, fsync, then rename to the target
- Or use a journaling/SQLite store
- Consider versioned checkpoints for recovery

**Priority:** HIGH (DB_MIGRATIONS/Implementation, 72h)

---

### [VIOLATION – Test Infrastructure | HIGH] Non-terminating Test Script

**Location:** `package.json:14`

**Issue:** `npm test` maps to bare `vitest`, which enters watch mode and never exits. Local runs hang indefinitely unless developers remember to add `--run`/`CI=1`. This breaks fast-feedback and contradicts the repo's own Tier-1/Tier-2 CI requirements.

**Fix:** Change the script to `vitest run` (or set `NODE_ENV=ci vitest`) so a single `npm test` terminates deterministically. Document watch mode separately (e.g., `test:watch`).

**Priority:** HIGH (Test Infrastructure, 72h)

---

### [MISSING_EVIDENCE – Security | CRITICAL] npm audit Gap

**Issue:** Could not complete `npm audit --production --audit-level=high` because this environment blocks outbound requests (getaddrinfo ENOTFOUND registry.npmjs.org). Current third-party dependency risk is therefore unknown.

**Action:** Rerun the audit in a network-enabled context (Security Scanning domain) and attach the report to restore compliance.

---

## ADDITIONAL NOTES

- Media server logging prints absolute file paths to stdout; once a capability token is added, consider scrubbing or downgrading path verbosity to avoid leaking folder names into shared logs.
- VideoFrameExtractor currently spawns five concurrent AI calls (one per frame). Depending on provider rate limits, you may need throttling to avoid 429s during batch processing; monitor once the security fixes land.

---

## DOMAIN ASSESSMENT

| Field | Value |
|-------|-------|
| **Verdict** | BLOCKED |
| **Artifacts Verified** | npm run typecheck, npm run lint, npm run build, CI=1 npm test -- --run --reporter=dot |
| **Accountability Action** | Security + Implementation owners must harden ffmpeg invocations and local media server before release; Test Infra to fix npm test script |
| **Escalation Status** | IMMEDIATE |

---

## RECOMMENDATIONS

### Must Fix
1. Replace exec-based ffmpeg/ffprobe calls with spawn + input validation
2. Add capability token/origin restrictions to localhost media server
3. Ensure frame extraction cleans up temporary files on all paths
4. Switch metadata writes to atomic temp-file+rename strategy
5. Update npm test script to run in single-pass mode
6. Rerun npm audit with network access and attach report

### Should Improve
- Add periodic cleanup for transcoder cache and tmp frames
- Expand coverage reporting to include electron/ sources
- Document incident response when metadata store becomes corrupt

### Consider
- Evaluate per-frame AI throttling to control API spend
- Automate secret scanning locally via pre-commit to match CI

---

## CONSULTATION EVIDENCE

**Trigger Type:** Production validation

**Comment Format:** `// Critical-Engineer: consulted for Architecture pattern selection`

**Placement Guidance:** Implementation files near IPC/media server boundaries

**Requirement:** MANDATORY for TRACED compliance when fixes are applied
