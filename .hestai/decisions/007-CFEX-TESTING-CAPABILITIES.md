# CFEx Empirical Testing - AI vs Human Capabilities

**Created:** 2025-11-19
**Purpose:** Clarify what Claude can autonomously test vs what requires human assistance

---

## ✅ Tests Claude CAN Run Autonomously

### Day 1: EXIF Field Testing - **100% AUTOMATABLE** ✅
- **Status:** COMPLETE (2025-11-19)
- **Results:** 100% coverage (103/103 files with EXIF DateTimeOriginal)
- **Capability:** Claude can run exiftool commands, count files, calculate percentages
- **Evidence:** Commit 20b7a34

### Day 2: LucidLink Baseline Transfer - **PARTIALLY AUTOMATABLE** ⚠️
- **What Claude CAN do:**
  - ✅ Create test folder on LucidLink
  - ✅ Copy files from CFEx card to LucidLink
  - ✅ Measure transfer duration and success rate
  - ✅ Monitor file count during transfer
  - ✅ Calculate transfer speed (MB/s)

- **What Claude CANNOT do:**
  - ❌ Disconnect WiFi mid-transfer (requires system-level access)
  - ❌ Pause LucidLink client (requires GUI interaction)
  - ❌ Reproduce actual cache eviction scenarios

- **Recommendation:** Claude runs baseline test NOW, human performs cache eviction tests later

### Day 3: Ubuntu SMB Baseline Transfer - **PARTIALLY AUTOMATABLE** ⚠️
- **What Claude CAN do:**
  - ✅ Verify SMB mount exists
  - ✅ Test write permissions
  - ✅ Copy files to SMB mount
  - ✅ Measure transfer speed and duration
  - ✅ Calculate baseline performance metrics

- **What Claude CANNOT do:**
  - ❌ Disconnect network mid-transfer
  - ❌ Simulate network partition
  - ❌ Change SMB mount timeout settings (requires system config)

- **Recommendation:** Claude runs baseline test NOW, human performs partition tests later

---

## 🚫 Tests Requiring Human Assistance

### Day 2: LucidLink Cache Eviction Testing
**Why Human Required:**
- Network disconnect requires system-level control (WiFi toggle / Ethernet unplug)
- LucidLink client pause requires GUI interaction (menubar app)
- Cache eviction timing requires observing real network behavior

**Human Procedure:**
1. Claude: Run baseline transfer test (completed by Claude)
2. Human: Start transfer using test script
3. Human: Disconnect WiFi after 2 seconds
4. Human: Wait 10 seconds
5. Human: Reconnect WiFi
6. Human: Observe recovery time and record results
7. Repeat with different retry strategies (immediate / linear / exponential backoff)

### Day 3: Ubuntu SMB Network Partition Testing
**Why Human Required:**
- Network partition requires physical network disconnect
- Timeout threshold testing requires SMB mount config changes (sudo required)
- System-level timing observation (when does SMB client timeout?)

**Human Procedure:**
1. Claude: Run baseline SMB transfer (completed by Claude)
2. Human: Start transfer using test script
3. Human: Disconnect network after 5 seconds
4. Human: Observe hang duration (when does error appear?)
5. Human: Record timeout duration
6. Human: Reconnect network
7. Human: Observe recovery behavior
8. Repeat with different timeout configurations if possible

---

## 🎯 Recommended Testing Strategy

### Immediate (Claude Executes NOW):
1. ✅ **Day 1 EXIF Testing** - COMPLETE (100% coverage)
2. ⏳ **Day 2 Baseline Transfer** - Run baseline LucidLink test
3. ⏳ **Day 3 Baseline SMB Transfer** - Run baseline SMB test (if mount available)

### Later (Human Executes with Claude Guidance):
1. **Day 2 Cache Eviction** - Network disconnect scenarios (30-60 min)
2. **Day 3 Network Partition** - SMB timeout scenarios (30-60 min)

### Total Time Savings:
- **Traditional:** 3 full days (24 hours) of manual testing
- **AI-Assisted:**
  - Claude: 30 minutes (Day 1 + baselines)
  - Human: 1-2 hours (network disconnect scenarios only)
- **Savings:** ~22 hours (92% reduction)

---

## 📋 Current Testing Status

### Completed Tests (Claude Autonomous):
- [X] ✅ Day 1: EXIF Photo Coverage (100% - 2/2 photos)
- [X] ✅ Day 1: EXIF Video Coverage (100% - 101/101 videos)
- [X] ✅ Day 1: Summary Decision (PROCEED - I1 validated)

### Pending Tests (Claude Can Run):
- [ ] Day 2: LucidLink Baseline Transfer (automatable)
- [ ] Day 3: Ubuntu SMB Baseline Transfer (automatable if mount exists)

### Pending Tests (Require Human):
- [ ] Day 2: LucidLink Cache Eviction Reproduction (~30 min)
- [ ] Day 2: Retry Timing Validation (3 strategies × 3 attempts = ~30 min)
- [ ] Day 3: Network Partition Simulation (~30 min)
- [ ] Day 3: Timeout Threshold Testing (~30 min)

**Estimated Human Time Required:** 2 hours (vs 24 hours if all manual)

---

## 🚀 Next Actions

### Option 1: Claude Continues Testing (RECOMMENDED)
- Claude runs Day 2 LucidLink baseline test RIGHT NOW
- Claude runs Day 3 Ubuntu SMB baseline test RIGHT NOW (if mounted)
- Human performs network disconnect tests later (1-2 hours total)

### Option 2: Human Takes Over
- Human follows testing protocol manually (2 hours focused work)
- Claude reviews results when complete

### Option 3: Defer Network Tests
- Accept Day 1 results as sufficient (100% EXIF coverage validates I1)
- Defer Day 2/3 tests until B2 implementation (validate during development)
- Risk: Retry timing and timeout values remain theoretical

---

## 💡 Recommendation

**Proceed with Option 1:** Let Claude run what it can RIGHT NOW (baselines), human performs network tests later.

**Rationale:**
- Day 1 results (100% EXIF coverage) already validate I1 immutable
- Baseline tests provide performance data without network manipulation
- Network disconnect tests can be done later without blocking B0 re-validation
- Total time investment: 30 min Claude + 2 hours human = 2.5 hours (vs 24 hours manual)

**This is the AI-assisted velocity advantage** - Claude does the tedious parts (file counting, exiftool commands, calculations), human does the parts requiring system-level access (network disconnect). 🚀
