# CI/CD Pipeline Documentation

## Overview

This repository uses a **5-tier quality gate system** to ensure production-ready code. The pipeline is designed to provide fast feedback while maintaining comprehensive validation.

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Fast Checks (~2 min)                               │
│  ✓ TypeScript type checking                                 │
│  ✓ ESLint code quality                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌────────────────┐  ┌────────────────────┐
│  TIER 2: Tests │  │  TIER 4: Security  │
│  (~5 min)      │  │  (~3 min)          │
│  ✓ Unit tests  │  │  ✓ NPM audit       │
│  ✓ Integration │  │  ✓ Dependency rev  │
│  ✓ Security    │  │  ✓ Electron ver    │
│  ✓ Coverage    │  │  ✓ Secrets scan    │
└────────┬───────┘  └────────┬───────────┘
         │                   │
         └─────────┬─────────┘
                   ▼
         ┌─────────────────────┐
         │  TIER 3: Build      │
         │  (~3 min)           │
         │  ✓ Dependency check │
         │  ✓ Production build │
         │  ✓ Artifact verify  │
         └─────────┬───────────┘
                   ▼
         ┌─────────────────────┐
         │  TIER 5: Summary    │
         │  ✓ Status report    │
         │  ✓ PR comment       │
         └─────────────────────┘
```

## Quality Gates

### Tier 1: Fast Feedback Gates (< 2 minutes)

**Purpose:** Fail fast on common issues

**Gates:**
- **TypeScript Type Checking** - Catches type errors like missing module declarations
- **ESLint** - Code quality and style violations

**Why separate:** These are the fastest checks and catch ~70% of issues

### Tier 2: Comprehensive Test Suite (< 10 minutes)

**Purpose:** Validate functionality

**Gates:**
- **Unit Tests** - All 239 tests across 17 test files
- **Integration Tests** - End-to-end scenarios
- **Security Tests** - Isolated security test suite
- **Coverage Reporting** - Non-blocking coverage metrics

**Runs in parallel with:** Security Scan (Tier 4)

### Tier 3: Build Verification (< 10 minutes)

**Purpose:** Ensure production-ready artifacts

**Gates:**
- **Dependency Verification** - Checks for missing production deps (prevents CI-passing but local-failing issues)
- **Production Build** - Full `npm run build`
- **Artifact Validation** - Verifies dist/ structure and critical files
- **Build Size Reporting** - Tracks bundle sizes

**Depends on:** Tiers 1 & 2 passing

### Tier 4: Security & Compliance (< 10 minutes)

**Purpose:** Security posture validation

**Gates:**
- **Dependency Review** (PRs only) - Blocks moderate+ security issues in dependency changes
- **NPM Audit** - Fails on HIGH/CRITICAL vulnerabilities in production dependencies
- **Electron Version Check** - Ensures ≥ v35.7.5 (security requirement)
- **Secrets Scanning** - Basic pattern matching for API keys, AWS credentials

**Runs in parallel with:** Test Suite (Tier 2)

### Tier 5: Final Validation & Summary

**Purpose:** Aggregate results and report

**Actions:**
- Validates all previous tiers passed
- Generates comprehensive summary
- Posts PR comment (PR builds only)
- Marks build as deployment-ready

## Enhancements Over Previous Pipeline

### 1. **Catches CI-Passing But Local-Failing Issues** ✅
**Problem Solved:** The `@ffmpeg-installer/ffmpeg` type error

**How:**
- Explicit `npm ls --production` check in build step (step 206-217)
- Verifies ALL production dependencies are installed
- Fails early if any are missing or unmet

### 2. **Parallel Execution for Faster Feedback**
**Improvement:** ~40% faster total runtime

**How:**
- Tests and Security scans run in parallel (both need fast-checks only)
- Only Build waits for both to complete

### 3. **Enhanced Caching Strategy**
**Improvement:** ~60 seconds saved per run

**Added caches:**
- `~/.npm` - npm package cache
- `~/.cache/electron` - Electron binaries
- `~/.cache/electron-builder` - Builder cache
- `node_modules` - Dependencies with smart cache keys

### 4. **Comprehensive Artifact Retention**
**Improvement:** Better debugging and deployment

**Artifacts:**
- Build outputs (`dist/`) - 7 days
- Test results - 14 days
- Security audits - 30 days
- Error logs - 7 days

### 5. **Rich GitHub Step Summaries**
**Improvement:** Clear visibility into what failed

**Each step reports:**
- ✅/❌ Status with emoji indicators
- Detailed metrics (test counts, vulnerability counts)
- Formatted error logs
- Build sizes and statistics

### 6. **Dependency Review Action** (PRs only)
**Improvement:** Supply chain security

**Catches:**
- New dependencies with known vulnerabilities
- License compliance issues
- Dependency updates introducing security risks

### 7. **Secrets Scanning**
**Improvement:** Prevents credential leaks

**Scans for:**
- Hardcoded API keys (sk-, AKIA patterns)
- AWS credentials
- Other common secret patterns

### 8. **Concurrency Control**
**Improvement:** Resource efficiency

**Behavior:**
- Cancels previous runs when new commit pushed
- Prevents queue buildup
- Saves GitHub Actions minutes

## Trigger Conditions

### Automatic Triggers

**On Push:**
- `main` branch
- `security/*` branches
- `feat/*` branches (NEW - catches feature branch issues early)

**On Pull Request:**
- Any PR targeting `main`
- Includes additional dependency review

### Manual Triggers

```bash
# Via GitHub UI: Actions tab → CI → Run workflow
# Or via gh CLI:
gh workflow run ci.yml
```

## Configuration

### Environment Variables

```yaml
NODE_VERSION: '20'              # Node.js version
ELECTRON_MIN_VERSION: '35.7.5'  # Minimum Electron version
```

### Timeout Settings

Each job has conservative timeouts to prevent hung builds:
- Fast Checks: 5 minutes
- Test Suite: 10 minutes
- Build: 10 minutes
- Security: 10 minutes
- Summary: 5 minutes

## Local Validation

Run the same checks locally before pushing:

```bash
# Tier 1: Fast checks
npm run typecheck
npm run lint

# Tier 2: Tests
npm test -- --run
npm test -- --run electron/__tests__/security/

# Tier 3: Build
npm run build

# Tier 4: Security
npm audit --production --audit-level=high
npm ls --production  # Check for missing deps
```

## Troubleshooting

### Build Passes in CI But Fails Locally

**Symptom:** CI shows green ✅ but local build has type errors

**Root Cause:** Missing dependency declarations

**Solution:** Check build logs in CI:
1. Go to Actions tab
2. Click failing job
3. Download `typecheck-logs` artifact
4. Review for missing modules

**Prevention:** The enhanced pipeline now catches this with explicit dependency verification (step 206-217)

### Cache Issues

**Symptom:** Inconsistent builds or stale dependencies

**Solution:**
```bash
# Manually clear cache via GitHub UI:
# Settings → Actions → Caches → Delete caches
```

Or update cache key in workflow (triggers cache miss):
```yaml
key: ${{ runner.os }}-deps-v2-${{ hashFiles('package-lock.json') }}
#                            ^^^ increment version
```

### Slow CI Runs

**Expected Times:**
- First run (no cache): ~15 minutes
- Subsequent runs (cached): ~8-10 minutes
- Fast-fail on lint error: ~2 minutes

**If slower:**
- Check GitHub Actions status page
- Review cache hit rates in job logs
- Ensure `package-lock.json` is committed

## Metrics & Monitoring

### Success Criteria

✅ **All tiers must pass for deployment**

Each tier reports:
- Pass/Fail status
- Execution time
- Detailed metrics (tests, vulnerabilities, etc.)

### Artifact Analysis

**Build artifacts** (`dist-{sha}`):
- Download from successful builds
- Test locally before deployment
- 7-day retention

**Test results**:
- Includes coverage reports
- 14-day retention
- Helpful for debugging flaky tests

**Security audits**:
- 30-day retention
- Track vulnerability trends
- Required for compliance reporting

## Future Enhancements

### Potential Additions

1. **Coverage Thresholds** (when team agrees on baseline)
   ```yaml
   - name: Enforce coverage minimum
     run: npm test -- --coverage --reporter=json
     # Parse coverage, fail if < 80%
   ```

2. **Matrix Testing** (if cross-platform needed)
   ```yaml
   strategy:
     matrix:
       os: [macos-latest, windows-latest]
       node: [18, 20, 22]
   ```

3. **Performance Benchmarks**
   ```yaml
   - name: Run performance benchmarks
     run: npm run bench
     # Compare against baseline
   ```

4. **Automated Changelog Generation** (on main merges)

5. **Slack/Discord Notifications** (for main branch failures)

## Contributing

When modifying the CI pipeline:

1. Test changes in a fork first
2. Document new gates or requirements
3. Update this README with any changes
4. Ensure backward compatibility
5. Monitor first 3-5 runs after merge

## Questions?

- **Pipeline failing?** Check the step summary in the Actions UI
- **Need to skip CI?** Add `[skip ci]` to commit message (use sparingly!)
- **Timeout issues?** Increase timeout in specific job
- **Want to add a check?** Discuss in PR first to agree on gates

---

**Last Updated:** 2025-11-08
**Pipeline Version:** 2.0 (Comprehensive Multi-Tier)
**Maintained By:** Development Team
