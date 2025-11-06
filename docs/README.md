# Ingest Assistant Documentation Index

## Reading Order (Recommended)

### **Start Here:**

1. **`000-DOC-CRITICAL-DISCOVERY-PP-METADATA-BEHAVIOR.md`** ⭐ **READ THIS FIRST**
   - The empirical testing that drove all architectural decisions
   - Why file-based metadata failed
   - Why UXP panel is the solution
   - **Without reading this, other docs won't make sense**

### **Context (Electron App POC):**

2. **`001-DOC-ARCHITECTURE.md`**
   - Original Electron app architecture
   - Proof-of-concept that validated UI/UX concepts
   - Lessons learned
   - Architectural pivot decision (at end)

3. **`002-REPORT-PHASE-1-COMPLETION.md`**
   - Electron app completion status
   - What was built and tested
   - Historical reference

### **New Direction (UXP Panel):**

4. **`004-DOC-UXP-PANEL-ARCHITECTURE.md`** 📘 **MAIN ARCHITECTURE DOC**
   - Comprehensive UXP panel design
   - Technical decisions explained
   - Development phases (POC → Full build)
   - Code reusability from Electron app (60-70%)

5. **`003-DOC-POC-SCOPE.md`** 🎯 **POC VALIDATION PLAN**
   - Minimal feature set for validation
   - GO/NO-GO criteria
   - Testing checklist
   - 1-2 day timeline

6. **`NEW-PROJECT-SETUP-GUIDE.md`** 🚀 **SETUP INSTRUCTIONS**
   - Step-by-step project creation
   - npm/Webpack/TypeScript configuration
   - UXP manifest setup
   - GitHub repository connection

### **Additional Context:**

7. **`REPO_REVIEW.md`**
   - Electron app code review
   - Security assessment
   - Quality analysis

8. **`001-DOC-ADR-006-SECURITY-HARDENING-STRATEGY.md`**
   - Security considerations (Electron app context)
   - Some principles applicable to UXP panel

---

## Quick Navigation by Topic

### **"Why are we doing this?"**
→ `000-DOC-CRITICAL-DISCOVERY-PP-METADATA-BEHAVIOR.md`

### **"What are we building?"**
→ `004-DOC-UXP-PANEL-ARCHITECTURE.md`

### **"How do I start the POC?"**
→ `003-DOC-POC-SCOPE.md` + `NEW-PROJECT-SETUP-GUIDE.md`

### **"What happened to the Electron app?"**
→ `001-DOC-ARCHITECTURE.md` (see "Architectural Evolution & Pivot Decision" section)

### **"What code can we reuse?"**
→ `004-DOC-UXP-PANEL-ARCHITECTURE.md` (section: "Code Reusability from Electron App")

---

## Document Status

### Current Project Status:
🚧 **POC Phase** - UXP panel proof-of-concept pending

### Decisions Made:
- ✅ Architectural pivot: Electron app → UXP panel
- ✅ Approach: PP project metadata (not file metadata)
- ✅ POC scope defined (1-2 days)
- ⏳ POC not yet started

### Next Steps:
1. Create new project: `ingest-assistant-uxp`
2. Follow `NEW-PROJECT-SETUP-GUIDE.md`
3. Execute POC validation per `003-DOC-POC-SCOPE.md`
4. Make GO/NO-GO decision

---

## Key Findings Summary

### What We Learned:

**Premiere Pro Metadata Behavior (Empirically Tested):**
1. PP displays **master file metadata only** (ignores proxy metadata)
2. Metadata **disappears when RAW files offline** (except XMP-dc:Description)
3. Post-import metadata changes **require relink** (not automatic)
4. PP project metadata **works with offline files** ✓
5. PP project metadata **immediately searchable** ✓

**Organizational Constraints:**
- RAW files on restricted Ubuntu NAS (limited access)
- Editors work with proxies on LucidLink (accessible)
- Editors work in Premiere Pro 90% of time
- Archive search via old project files (acceptable)

**Conclusion:** File-based metadata fails due to offline files + access barriers → PP project metadata solves both.

---

## Timeline

### November 2025:
- **Nov 6:** Critical discovery testing performed
- **Nov 6:** Architectural pivot decision
- **Nov 6:** Documentation created (this index)
- **Next:** POC validation (1-2 days)

### January 2025:
- Electron app v1.0.0 completed
- Initial architecture validated
- UI/UX concepts proven
- AI integration working

---

## References

### External Links:
- **UXP Documentation:** https://developer.adobe.com/photoshop/uxp/
- **Premiere Pro API:** https://ppro-scripting.docsforadobe.dev/
- **OpenRouter API:** https://openrouter.ai/docs

### Test Files:
- RAW: `/Volumes/EAV_Video_RAW/Berkeley/EAV014 - KV2 Podium Houses/shoot1-20251024/test.MOV`
- Proxy: `/Volumes/videos-current/2. WORKING PROJECTS/Berkeley/.../test_Proxy.mov`

---

## Document Maintenance

### How to Keep This Updated:

**When POC completes:**
- Update "Document Status" section above
- Add POC results to `003-DOC-POC-SCOPE.md`
- Update "Next Steps" based on GO/NO-GO decision

**When architecture changes:**
- Update `004-DOC-UXP-PANEL-ARCHITECTURE.md`
- Document decision rationale
- Update this index if navigation changes

**When new discoveries happen:**
- Create new `00X-DOC-DISCOVERY-*.md`
- Add to "Reading Order" above
- Reference in related docs

---

**Index Version:** 1.0.0
**Last Updated:** 2025-11-06
**Maintainer:** Project team
**Purpose:** Navigation and context for all project documentation
