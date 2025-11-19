# CFEx Empirical Testing - Results Tracker

**Test Period:** 2025-11-19 to 2025-11-22 (3 days)
**CFEx Card:** `/Volumes/Untitled`
**Tester:** [Your Name]
**Status:** IN PROGRESS

---

## Day 1: EXIF Field Testing

### Test 1a: Photo EXIF Coverage
**Date/Time:** __________
**Card ID:** __________

```
Commands run:
cd /Volumes/Untitled/DCIM
exiftool -r -if '$DateTimeOriginal' -p '$FileName' . | wc -l
find . -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.arw" \) | wc -l
```

**Results:**
- Total photos: __________
- Photos with EXIF DateTimeOriginal: __________
- Coverage percentage: __________% (calculate: EXIF count / Total * 100)

**Missing EXIF files (if any):**
```
(list filenames)
```

**Decision:**
- [ ] ✅ Coverage ≥90% - Proceed with EXIF primary strategy
- [ ] ⚠️ Coverage <90% - Document fallback requirements
- [ ] 🚫 Coverage <50% - HALT and escalate

---

### Test 1b: Video EXIF Coverage
**Date/Time:** __________

```
Commands run:
cd /Volumes/Untitled/PRIVATE/M4ROOT/CLIP
exiftool -r -if '$DateTimeOriginal' -p '$FileName' . | wc -l
find . -type f \( -iname "*.mov" -o -iname "*.mp4" -o -iname "*.mxf" \) | wc -l
```

**Results:**
- Total videos: __________
- Videos with EXIF DateTimeOriginal: __________
- Coverage percentage: __________% (should be 100%)

**Missing EXIF files (if any):**
```
(list filenames - INVESTIGATE if any found)
```

**Decision:**
- [ ] ✅ 100% coverage - All videos have EXIF
- [ ] ⚠️ <100% coverage - Investigate missing files
- [ ] 🚫 <90% coverage - HALT and escalate

---

### Test 1c: Filesystem Fallback Accuracy
**Date/Time:** __________
**Files tested:** __________ (number of files without EXIF)

**For each file without EXIF:**

File 1: __________
- Filesystem mtime: __________ (from `stat` command)
- Expected camera time: __________ (from adjacent files)
- Match: [ ] YES [ ] NO
- Delta: ±__________ hours/days

File 2: (if applicable)
- Filesystem mtime: __________
- Expected camera time: __________
- Match: [ ] YES [ ] NO
- Delta: ±__________ hours/days

**Overall Fallback Accuracy:**
- [ ] ✅ RELIABLE - mtime matches camera time
- [ ] ⚠️ UNRELIABLE - mtime differs significantly
- [ ] 🚫 UNUSABLE - mtime completely wrong

---

### Day 1 Summary Decision

**EXIF Strategy:**
- [ ] Proceed with EXIF primary, mtime fallback (≥90% coverage + reliable fallback)
- [ ] Warn users if EXIF missing (≥90% coverage + unreliable fallback)
- [ ] Document fallback strategy prominently (<90% coverage + reliable fallback)
- [ ] HALT - Cannot guarantee I1 compliance (<90% coverage + unreliable fallback)

**D3 Blueprint Updates Needed:**
- [ ] None - assumptions validated
- [ ] Update EXIF coverage threshold
- [ ] Add manual timestamp entry UI for missing EXIF
- [ ] Other: __________

---

## Day 2: LucidLink Cache Eviction Testing

### Test 2a: Baseline Transfer
**Date/Time:** __________

**Results:**
- Files transferred: __________
- Total size: __________ GB
- Transfer duration: __________ seconds
- Success rate: __________% (should be 100%)

---

### Test 2b: Cache Eviction Reproduction

**Attempt 1:**
**Date/Time:** __________
**Eviction Method:** [ ] WiFi disabled [ ] LucidLink paused [ ] Other: __________

**Results:**
- Error message when paused: __________
- Time until error appeared: __________ seconds
- Network resumed after: __________ seconds
- Recovery time: __________ seconds (from resume to successful write)
- Files written successfully after recovery: __________
- Files lost (if any): __________ (🚫 CRITICAL if >0)

**Attempt 2:** (repeat test for consistency)
**Date/Time:** __________
**Results:**
- Error message: __________
- Recovery time: __________ seconds
- Success: [ ] YES [ ] NO

**Attempt 3:**
**Date/Time:** __________
**Results:**
- Error message: __________
- Recovery time: __________ seconds
- Success: [ ] YES [ ] NO

---

### Test 2c: Retry Timing Validation

**Strategy 1: Immediate retry (0s delay)**
**Tests run:** __________
**Successful recoveries:** __________
**Success rate:** __________% (recoveries / tests * 100)
**Average recovery time:** __________ seconds
**User experience:** [ ] Instant [ ] Acceptable [ ] Frustrating

**Strategy 2: Linear backoff (1s, 2s, 3s)**
**Tests run:** __________
**Successful recoveries:** __________
**Success rate:** __________%
**Average recovery time:** __________ seconds
**User experience:** [ ] Instant [ ] Acceptable [ ] Frustrating

**Strategy 3: Exponential backoff (1s, 2s, 4s)** ← D3 Blueprint assumption
**Tests run:** __________
**Successful recoveries:** __________
**Success rate:** __________%
**Average recovery time:** __________ seconds
**User experience:** [ ] Instant [ ] Acceptable [ ] Frustrating

---

### Day 2 Summary Decision

**Recommended Retry Strategy:**
- [ ] Immediate retry (0s) - success rate __________%, recovery time __________s
- [ ] Linear backoff (1s, 2s, 3s) - success rate __________%, recovery time __________s
- [ ] Exponential backoff (1s, 2s, 4s) - success rate __________%, recovery time __________s
- [ ] Custom: __________ - success rate __________%, recovery time __________s

**Decision:**
- [ ] ✅ Proceed with recommended strategy (100% success, acceptable UX)
- [ ] ⚠️ Increase retry count to __________ attempts
- [ ] 🚫 HALT - Cannot achieve reliable recovery

**D3 Blueprint Updates Needed:**
- [ ] None - exponential backoff (1s, 2s, 4s, 3 attempts) validated
- [ ] Adjust retry delays to: __________
- [ ] Adjust retry count to: __________
- [ ] Add progress UI to improve UX during retry
- [ ] Other: __________

---

## Day 3: Ubuntu NFS Testing

### Test 3a: NFS Mount Verification
**Date/Time:** __________

**Mount command output:**
```
(paste `mount | grep nfs` output here)
```

**Write test:**
- [ ] ✅ Write successful (`touch` test passed)
- [ ] 🚫 Write failed - error: __________

---

### Test 3b: Baseline NFS Transfer
**Date/Time:** __________

**Results:**
- File size: __________ GB
- Transfer duration: __________ seconds
- Transfer speed: __________ MB/s (size / duration)
- Success: [ ] YES [ ] NO

---

### Test 3c: Network Partition Simulation

**Attempt 1:**
**Date/Time:** __________
**Partition Method:** [ ] WiFi disabled [ ] Ethernet unplugged [ ] Other: __________

**Results:**
- Transfer hung after: __________ seconds (from disconnect)
- Timeout error appeared after: __________ seconds (total hang time)
- Error message: __________
- Network reconnected after: __________ seconds
- Transfer resumed: [ ] YES [ ] NO
- Recovery time: __________ seconds (from reconnect to successful write)
- Data integrity: [ ] Files complete [ ] Files corrupt [ ] Files missing

**Attempt 2:** (repeat for consistency)
**Date/Time:** __________
**Results:**
- Hang duration: __________ seconds
- Timeout: __________ seconds
- Resume: [ ] YES [ ] NO
- Recovery time: __________ seconds

---

### Test 3d: Timeout Threshold Testing

**If NFS mount options configurable:**

**Timeout: 15 seconds**
**Tests run:** __________
**Results:**
- Partition detected in: __________ seconds
- User feedback delay: __________ seconds (when does UI indicate problem?)
- Recovery success rate: __________%
- User experience: [ ] Frustrating [ ] Acceptable [ ] Transparent

**Timeout: 30 seconds** ← D3 Blueprint assumption
**Tests run:** __________
**Results:**
- Partition detected in: __________ seconds
- User feedback delay: __________ seconds
- Recovery success rate: __________%
- User experience: [ ] Frustrating [ ] Acceptable [ ] Transparent

**Timeout: 60 seconds**
**Tests run:** __________
**Results:**
- Partition detected in: __________ seconds
- User feedback delay: __________ seconds
- Recovery success rate: __________%
- User experience: [ ] Frustrating [ ] Acceptable [ ] Transparent

---

### Day 3 Summary Decision

**Recommended Timeout:**
- [ ] 15 seconds - fast detection, may timeout on slow network
- [ ] 30 seconds - balanced UX + reliability (D3 Blueprint assumption)
- [ ] 60 seconds - most reliable, poor UX (user assumes freeze)
- [ ] Custom: __________ seconds

**Decision:**
- [ ] ✅ Proceed with 30s timeout (100% recovery, acceptable UX)
- [ ] ⚠️ Adjust timeout to: __________ seconds
- [ ] 🚫 HALT - Data corruption detected

**D3 Blueprint Updates Needed:**
- [ ] None - 30s timeout validated
- [ ] Adjust timeout to: __________ seconds
- [ ] Add progress UI showing "Waiting for network..." after 10s
- [ ] Other: __________

---

## Overall Findings Summary

### B0 Blocker Resolution Status

**Blocker 1: EXIF Field Testing**
- Status: [ ] ✅ RESOLVED [ ] ⚠️ NEEDS D3 UPDATE [ ] 🚫 BLOCKING
- Decision: __________

**Blocker 2: LucidLink Retry Timing**
- Status: [ ] ✅ RESOLVED [ ] ⚠️ NEEDS D3 UPDATE [ ] 🚫 BLOCKING
- Decision: __________

**Blocker 3: Ubuntu NFS Timeout**
- Status: [ ] ✅ RESOLVED [ ] ⚠️ NEEDS D3 UPDATE [ ] 🚫 BLOCKING
- Decision: __________

---

### Next Steps

- [ ] Create `006-CFEX-EMPIRICAL-FINDINGS-SUMMARY.md` (executive summary)
- [ ] Update D3 Blueprint with validated timing values
- [ ] Invoke critical-design-validator for B0 re-validation
- [ ] Proceed to B2 implementation if FINAL GO received

---

### Emergency Escalations (if any)

**Escalation 1:**
**Date:** __________
**Issue:** __________
**Severity:** [ ] Critical [ ] High [ ] Medium
**Action Taken:** __________
**Resolution:** __________

---

**Testing Completed:** __________ (date)
**Tested By:** __________
**Reviewed By:** __________ (holistic-orchestrator)
