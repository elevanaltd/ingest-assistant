# CFEx Phase 1a - Empirical Testing Protocol

**Phase:** B0 Blocking Condition Resolution
**Purpose:** Validate 3 critical assumptions through field testing before B2 implementation
**Duration:** 3 days (1 day per test category)
**Test Data:** CFEx card at `/Volumes/Untitled` (real production media files)
**Status:** IN PROGRESS
**Started:** 2025-11-19

---

## Overview

The D3 Blueprint and B0 Decision identified 7 blocking conditions. Three of these require **empirical validation** with real CFEx media files to tune retry logic, timeout values, and fallback strategies.

**Why Empirical Testing Matters:**
- Theoretical timing values (retry delays, timeouts) require validation with actual hardware
- EXIF timestamp coverage varies by shoot (affects chronological sorting accuracy - I1 immutable)
- LucidLink cache behavior requires reproduction with actual network conditions
- Ubuntu NFS recovery timing depends on network stack + mount options

**Consequences Without Testing:**
- Wrong retry timing → user frustration (files appear lost when recoverable)
- Wrong timeout values → premature failures OR excessive wait times
- EXIF fallback inaccuracy → chronological ordering breaks (I1 violation)

---

## Test Environment Setup

### Hardware Requirements
- **CFEx Card:** `/Volumes/Untitled` (production card with real shoot files)
- **macOS:** M-series MacBook with LucidLink client installed
- **Ubuntu:** NFS-mounted network storage (if available, or use local test)
- **Network:** Stable WiFi/Ethernet connection for LucidLink testing

### Software Requirements
```bash
# Verify exiftool installed
which exiftool  # Should show /opt/homebrew/bin/exiftool

# Verify LucidLink mounted
mount | grep LucidLink

# Verify Ubuntu accessible (if testing NFS)
ping ubuntu-server.local
```

### CFEx Card Inspection
```bash
# Check card is mounted
ls -la /Volumes/Untitled

# Expected structure:
# /Volumes/Untitled/DCIM/         # Photos
# /Volumes/Untitled/PRIVATE/M4ROOT/CLIP/  # Raw video files

# Count files on card
find /Volumes/Untitled/DCIM -type f | wc -l
find /Volumes/Untitled/PRIVATE/M4ROOT/CLIP -type f | wc -l
```

---

## Day 1: EXIF Field Testing (I1 Chronological Integrity)

### Objective
Measure EXIF DateTimeOriginal coverage across real CFEx media files and validate filesystem timestamp fallback accuracy.

### Why This Matters
**I1 Immutable:** Files must sort chronologically by camera capture time (not filesystem mtime).
**Risk:** If EXIF timestamps missing → fallback to mtime → chronological ordering incorrect.

### Test Procedure

#### 1a. Photo EXIF Coverage Analysis
```bash
cd /Volumes/Untitled/DCIM

# Test 1: Count photos with EXIF DateTimeOriginal
exiftool -r -if '$DateTimeOriginal' -p '$FileName' . | wc -l

# Test 2: Count total photos
find . -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.arw" \) | wc -l

# Calculate coverage percentage
# Coverage% = (EXIF count / Total count) * 100
```

**Expected Result:** >95% coverage (based on typical Canon/Sony cameras)
**Acceptance Criteria:** ≥90% coverage required (I1 compliance threshold)

**Recording Template:**
```
EXIF Photo Coverage Test:
- Card ID: [Serial number or date]
- Total photos: [N]
- Photos with EXIF: [M]
- Coverage: [M/N * 100]%
- Missing EXIF files: [list any files without timestamps]
```

#### 1b. Video EXIF Coverage Analysis
```bash
cd /Volumes/Untitled/PRIVATE/M4ROOT/CLIP

# Test 1: Count videos with EXIF DateTimeOriginal
exiftool -r -if '$DateTimeOriginal' -p '$FileName' . | wc -l

# Test 2: Count total videos
find . -type f \( -iname "*.mov" -o -iname "*.mp4" -o -iname "*.mxf" \) | wc -l

# Calculate coverage
```

**Expected Result:** 100% coverage (professional cameras write EXIF to video files)
**Acceptance Criteria:** 100% required (video chronology critical for multi-camera shoots)

**Recording Template:**
```
EXIF Video Coverage Test:
- Card ID: [Same as photos]
- Total videos: [N]
- Videos with EXIF: [M]
- Coverage: [M/N * 100]%
- Missing EXIF files: [list any - INVESTIGATE if any found]
```

#### 1c. Filesystem Fallback Accuracy Test
For files missing EXIF (if any), test mtime accuracy:

```bash
# Extract filesystem mtime for file without EXIF
stat -f "%Sm" -t "%Y%m%d%H%M%S" [FILENAME]

# Compare to actual shoot date (known from other files)
# QUESTION: Does mtime match camera capture time?
```

**Expected Result:** mtime = camera time (if card not modified after capture)
**Risk Indicator:** mtime ≠ camera time → filesystem fallback unreliable → I1 risk

**Recording Template:**
```
Filesystem Fallback Accuracy:
- Files tested: [N files without EXIF]
- mtime matches camera time: [Y/N]
- mtime delta: [±N hours/days from expected]
- Conclusion: [RELIABLE / UNRELIABLE / NEEDS_MANUAL_REVIEW]
```

### Decision Matrix

| Coverage | Fallback Accuracy | Decision |
|----------|------------------|----------|
| ≥90% | RELIABLE | ✅ Proceed (EXIF primary, mtime backup acceptable) |
| ≥90% | UNRELIABLE | ⚠️ Warn user if EXIF missing (manual timestamp entry) |
| <90% | RELIABLE | ⚠️ Document fallback strategy, warn users |
| <90% | UNRELIABLE | 🚫 HALT - Cannot guarantee I1 compliance |

### Deliverable
- **Document:** `EXIF-COVERAGE-REPORT.md` with actual percentages
- **D3 Blueprint Update:** Confirm EXIF strategy OR add manual timestamp UI

---

## Day 2: LucidLink Cache Eviction Testing

### Objective
Reproduce LucidLink cache eviction scenario and measure optimal retry timing to prevent "file not found" false positives.

### Why This Matters
**I4 Immutable:** Zero data loss (files must never appear lost when recoverable).
**Risk:** Cache eviction → ENOENT error → user thinks file transfer failed → data loss perception.

### Test Procedure

#### 2a. Baseline Transfer Test (No Eviction)
```bash
# Create test folder on LucidLink
mkdir -p /LucidLink/TEST/cfex-baseline-test

# Transfer 10 photos from CFEx card
cp /Volumes/Untitled/DCIM/*.JPG /LucidLink/TEST/cfex-baseline-test/ &

# Monitor copy process
watch -n 1 "ls -lh /LucidLink/TEST/cfex-baseline-test | wc -l"

# Measure: Time to complete transfer
# Record: File count, transfer duration
```

**Recording Template:**
```
Baseline Transfer (No Eviction):
- Files transferred: [N]
- Total size: [X GB]
- Duration: [T seconds]
- Success rate: [100% expected]
```

#### 2b. Cache Eviction Reproduction
```bash
# Disconnect from network mid-transfer
# Method 1: Disable WiFi via System Preferences
# Method 2: Pause LucidLink client

# Start transfer
cp /Volumes/Untitled/DCIM/*.JPG /LucidLink/TEST/cfex-eviction-test/ &

# After 2 seconds: PAUSE network/LucidLink
# Wait 10 seconds
# RESUME network/LucidLink

# Monitor: Does transfer resume or fail?
# Record: Error messages, recovery time
```

**Observations to Record:**
- Error message when network paused: [ENOENT / timeout / other]
- Recovery time after network resumed: [N seconds]
- Files successfully written after recovery: [N]
- Files lost (if any): [N - CRITICAL if >0]

#### 2c. Retry Timing Validation
Test different retry strategies:

```javascript
// Strategy 1: Immediate retry (0s delay)
// Strategy 2: Linear backoff (1s, 2s, 3s)
// Strategy 3: Exponential backoff (1s, 2s, 4s) ← D3 Blueprint assumption

// For each strategy:
// 1. Trigger cache eviction
// 2. Apply retry strategy
// 3. Measure: Success rate, total recovery time
```

**Recording Template (per strategy):**
```
Retry Strategy: [immediate / linear / exponential]
- Eviction test runs: [N]
- Successful recoveries: [M]
- Success rate: [M/N * 100]%
- Average recovery time: [T seconds]
- User experience: [instant / acceptable / frustrating]
```

### Decision Matrix

| Success Rate | Recovery Time | Decision |
|--------------|---------------|----------|
| 100% | <5s | ✅ Use this strategy |
| 100% | 5-15s | ⚠️ Acceptable with progress UI |
| <100% | Any | 🚫 Insufficient - adjust retry count |

**Target:** 3 retries with exponential backoff (1s, 2s, 4s) should achieve 100% recovery.

### Deliverable
- **Document:** `LUCIDLINK-RETRY-REPORT.md` with timing data
- **D3 Blueprint Update:** Confirm retry strategy (attempts + delays)

---

## Day 3: Ubuntu NFS Testing

### Objective
Validate NFS mount timeout assumptions and measure recovery windows for network partitions.

### Why This Matters
**I4 Immutable:** Zero data loss during raw video transfer to Ubuntu NFS storage.
**Risk:** Timeout too short → premature failure | Timeout too long → excessive wait.

### Test Procedure

#### 3a. NFS Mount Verification
```bash
# Check Ubuntu NFS mount
mount | grep nfs

# Expected output:
# ubuntu-server:/export/videos on /Volumes/Ubuntu type nfs (rw,bg,hard,intr,tcp)

# Verify write access
touch /Volumes/Ubuntu/test-write && rm /Volumes/Ubuntu/test-write
```

**If NFS not available:** Document local testing approach (simulated delay acceptable).

#### 3b. Baseline NFS Transfer
```bash
# Create test folder
mkdir -p /Volumes/Ubuntu/cfex-nfs-test

# Transfer large video file
cp /Volumes/Untitled/PRIVATE/M4ROOT/CLIP/*.MOV /Volumes/Ubuntu/cfex-nfs-test/ &

# Monitor transfer
watch -n 1 "ls -lh /Volumes/Ubuntu/cfex-nfs-test"

# Record: Transfer speed, duration
```

**Recording Template:**
```
Baseline NFS Transfer:
- File size: [X GB]
- Transfer duration: [T seconds]
- Transfer speed: [X MB/s]
- Success: [Y/N]
```

#### 3c. Network Partition Simulation
```bash
# Start transfer
cp /Volumes/Untitled/PRIVATE/M4ROOT/CLIP/*.MOV /Volumes/Ubuntu/cfex-nfs-partition-test/ &

# After 5 seconds: Disconnect network
# (WiFi off OR unplug Ethernet)

# Observe behavior:
# - Does write hang? (expected with hard mount)
# - Error message? (ETIMEDOUT expected)
# - How long until timeout? (measure)

# Reconnect network after 30 seconds
# - Does write resume? (expected with hard mount + intr)
# - Recovery time? (measure)
```

**Observations to Record:**
- Hang duration before timeout: [N seconds]
- Timeout error message: [exact error text]
- Recovery after reconnect: [Y/N + time]
- Data integrity: [files complete? checksum match?]

#### 3d. Timeout Threshold Testing
Test different timeout values if NFS mount configurable:

```bash
# Mount with short timeout (15s)
sudo mount -o nfs,timeo=150 ubuntu-server:/export/videos /mnt/test-15s

# Mount with medium timeout (30s) ← D3 Blueprint assumption
sudo mount -o nfs,timeo=300 ubuntu-server:/export/videos /mnt/test-30s

# Mount with long timeout (60s)
sudo mount -o nfs,timeo=600 ubuntu-server:/export/videos /mnt/test-60s

# For each: Simulate partition, measure user experience
```

**Recording Template (per timeout):**
```
Timeout Value: [N seconds]
- Partition detected in: [T seconds]
- User feedback shown: [T seconds] (when does UI indicate problem?)
- Recovery after reconnect: [T seconds]
- User experience: [frustrating / acceptable / transparent]
```

### Decision Matrix

| Timeout | User Feedback Delay | Recovery Success | Decision |
|---------|---------------------|------------------|----------|
| 15s | Good (<20s) | 100% | ⚠️ May timeout during normal slow network |
| 30s | Acceptable (<40s) | 100% | ✅ Recommended (balances UX + reliability) |
| 60s | Poor (>60s) | 100% | ⚠️ Too long - user assumes freeze |

**Target:** 30s timeout with progress UI showing "Waiting for network..." after 10s.

### Deliverable
- **Document:** `NFS-TIMEOUT-REPORT.md` with timing data
- **D3 Blueprint Update:** Confirm 30s timeout OR adjust based on findings

---

## Testing Sprint Completion Checklist

After all 3 days of testing:

- [ ] All test reports completed (EXIF, LucidLink, NFS)
- [ ] Decision matrix outcomes documented
- [ ] D3 Blueprint updates identified (timing values, strategy adjustments)
- [ ] Findings summary created (1-page executive summary)
- [ ] B0 re-validation ready (empirical data supports GO decision)

---

## Findings Summary Template

Create `006-CFEX-EMPIRICAL-FINDINGS-SUMMARY.md` after all testing complete:

```markdown
# CFEx Empirical Testing - Findings Summary

## EXIF Coverage (Day 1)
- Photos: [X]% coverage | Decision: [strategy]
- Videos: [X]% coverage | Decision: [strategy]
- Fallback: [RELIABLE/UNRELIABLE] | Impact: [I1 compliance status]

## LucidLink Retry (Day 2)
- Recommended strategy: [3 retries, exponential backoff: 1s, 2s, 4s]
- Success rate: [X]%
- Recovery time: [avg Ts]
- User experience: [acceptable/needs UI improvement]

## Ubuntu NFS Timeout (Day 3)
- Recommended timeout: [30s]
- Partition detection: [Ts]
- Recovery success: [X]%
- User experience: [acceptable with progress UI]

## B0 Blocker Resolution
- Blocker 1 (EXIF): [RESOLVED / NEEDS D3 UPDATE]
- Blocker 2 (LucidLink): [RESOLVED / NEEDS D3 UPDATE]
- Blocker 3 (NFS): [RESOLVED / NEEDS D3 UPDATE]

## Next Steps
1. Update D3 Blueprint with validated timing values
2. Invoke critical-design-validator for B0 re-validation
3. Proceed to B2 implementation if FINAL GO received
```

---

## Emergency Escalation Criteria

**HALT testing and escalate if:**
1. EXIF coverage <50% (I1 immutable at severe risk)
2. LucidLink retry strategy achieves <80% recovery (I4 immutable at risk)
3. NFS timeout causes data corruption (integrity failure)
4. Any test reveals fundamental architectural flaw

**Escalation Path:**
1. Document failure mode in detail
2. Invoke critical-design-validator immediately (emergency review)
3. Consult holistic-orchestrator for architectural decision
4. User approval required before proceeding to B2

---

**Protocol Version:** 1.0
**Created:** 2025-11-19
**Owner:** holistic-orchestrator (constitutional authority for system coherence)
**Testing Performer:** User (with test-infrastructure-steward guidance available)
