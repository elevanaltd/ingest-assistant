# ADR-006: Security Hardening Strategy

**Status:** Accepted
**Date:** 2025-11-06
**Deciders:** security-specialist, critical-engineer, holistic-orchestrator
**Tags:** security, architecture, production-readiness

---

## Context

Ingest Assistant desktop app processes user-provided metadata and file operations, creating multiple security attack surfaces:
- User input → OS commands (exiftool integration)
- File paths → filesystem operations
- File content → external API uploads (AI services)
- IPC messages → trust boundary between renderer and main process

Security assessment identified 9 CRITICAL vulnerabilities requiring systematic mitigation before production deployment.

---

## Decision

Implement **defense-in-depth security architecture** with three validation layers:

### 1. IPC Boundary Validation
- Schema validation (Zod) for all IPC messages
- Trusted source only for security boundaries (dialog.showOpenDialog)
- No renderer-controlled security parameters

### 2. Service Layer Validation (SecurityValidator)
- Path traversal protection (realpath + relative path checking)
- File content validation (magic number verification)
- File size limits (100MB maximum)
- Input sanitization (shell metacharacters rejected)

### 3. External Process Security
- execFile() instead of exec() (no shell expansion)
- Argument arrays (NOT string concatenation)
- Timeout limits (30s)
- MaxBuffer limits (10MB)

---

## Rationale

### Why SecurityValidator Pattern?
**Decision:** Centralized validation service with dependency injection

**Alternatives Considered:**
1. Inline validation in IPC handlers
   - ❌ Rejected: Code duplication, no defense-in-depth
2. Static utility functions
   - ❌ Rejected: Hard to test, no state management
3. **Dependency injection service (CHOSEN)**
   - ✅ Testable (mockable dependencies)
   - ✅ Single source of truth
   - ✅ Defense-in-depth via multiple integration points

**Trade-off:** Additional abstraction layer vs security robustness
**Decision:** Security robustness justifies abstraction

### Why execFile() Over exec()?
**Decision:** Use execFile() for all external process calls

**Security Impact:**
```typescript
// VULNERABLE (exec with shell):
exec(`exiftool -Title="${userInput}" "${filePath}"`);
// Exploit: userInput = '"; curl attacker.com; echo "'

// SECURE (execFile without shell):
execFile('exiftool', ['-Title=' + userInput, filePath]);
// Exploit: userInput treated as literal string, no command execution
```

**Trade-off:** Slightly more verbose code vs complete command injection prevention
**Decision:** Verbosity acceptable for security

### Why Path Traversal Protection at Multiple Layers?
**Decision:** Validate at IPC boundary AND service layer

**Rationale:**
- **IPC Boundary:** First line of defense (reject malicious renderer)
- **Service Layer:** Defense-in-depth (protect against internal mistakes)
- **realpath() + relative():** Symlink protection + containment verification

**Known Bypass Prevented:**
```typescript
// Vulnerable: startsWith() bypass
allowedPath = "/Users/alice/ingest"
maliciousPath = "/Users/alice/ingest-backup/secret.txt"
maliciousPath.startsWith(allowedPath) → TRUE (BYPASS!)

// Secure: path.relative() containment
relativePath = path.relative(allowedPath, maliciousPath)
relativePath.startsWith('..') → TRUE (BLOCKED!)
```

### Why API Keys in .env (Not OS Keychain)?
**Decision:** Accept `.env` plaintext storage for v1.0

**Rationale:**
- Desktop app threat model: User controls device
- OS keychain integration: High complexity, cross-platform challenges
- `.gitignore` protection: Prevents accidental commit
- File permissions: User can set 600 (owner-only read)

**Trade-off:** Plaintext on disk vs development velocity
**Decision:** Acceptable for v1.0, defer keychain to v2.0

**Future Migration Path:** Add OS keychain support (keytar/safeStorage) in maintenance release

### Why Electron 35.7.5 Specifically?
**Decision:** Upgrade from 28.0.0 → 35.7.5

**Vulnerability:** ASAR integrity bypass (CVE-2024-XXXXX) in Electron <35.7.5
**Impact:** Post-installation tampering of app.asar without signature failure
**Risk:** Supply chain attack vector

**Breaking Changes Review:**
- Versions 29-35 reviewed
- No breaking changes affecting codebase
- APIs used (BrowserWindow, ipcMain, dialog) unchanged

**Trade-off:** Major version jump risk vs known CVE mitigation
**Decision:** CVE mitigation outweighs upgrade risk

---

## Consequences

### Positive
- ✅ **9 CRITICAL vulnerabilities mitigated** (command injection, path traversal, file content, etc.)
- ✅ **Defense-in-depth architecture** (multiple validation layers)
- ✅ **Automated CI security gates** (npm audit, Electron version, security tests)
- ✅ **41 security tests** (exploit-driven, regression prevention)
- ✅ **Production-ready security posture** (photos workflow deployable)

### Negative
- ⚠️ **Added complexity:** SecurityValidator abstraction layer
- ⚠️ **Increased bundle size:** Zod dependency (~50KB), Electron upgrade
- ⚠️ **Development overhead:** Security tests required for all file operations

### Neutral
- 📊 **API keys in plaintext:** Acceptable for v1.0, documented for future improvement
- 📊 **Video magic number validation:** Enhanced but adds processing overhead
- 📊 **CI pipeline duration:** +30s for security scans (acceptable)

---

## Validation

### Security Posture
```bash
# Before Phase 1:
- 9 CRITICAL vulnerabilities
- 0 security tests
- No input validation
- No CI security gates

# After Phase 1:
- 0 CRITICAL vulnerabilities (9/9 mitigated)
- 41 security tests (100% passing)
- Defense-in-depth validation
- Automated CI security scanning
```

### Quality Metrics
```
Test Coverage:   161 tests (100% passing)
Security Tests:  41 tests across 4 categories
Lint Errors:     0
Type Errors:     0
Build Status:    ✅ Success
CI Security:     ✅ All gates passing
```

### Production Readiness
- ✅ Photos workflow: Production-ready
- ✅ Security hardening: Complete
- ✅ CI/CD pipeline: Enforcing security
- ✅ Documentation: ADR, test suite README, ARCHITECTURE.md

---

## References

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-434: Unrestricted File Upload](https://cwe.mitre.org/data/definitions/434.html)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- Security-specialist report (Phase 1 security analysis)
- Critical-engineer report (tactical validation)
- Code-review-specialist report (Day 2 regression findings)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-06 | Initial ADR created | implementation-lead |
| 2025-11-06 | Reviewed and approved | critical-engineer, security-specialist |
