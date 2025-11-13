# Continue JSON v2.0 Migration

**Copy this prompt to start a new session:**

---

I'm continuing the JSON v2.0 migration started on 2025-11-12.

**Context:** We're migrating `.ingest-metadata.json` from v1.0 to v2.0 to align with Issue #54 XMP metadata strategy and add audit trail for CEP Panel integration.

**What's been done:**
1. ✅ Updated TypeScript types (`src/types/index.ts`) - `metadata` → `keywords`, added audit fields
2. ✅ Updated `MetadataStore` with schema versioning and helper methods
3. ✅ Updated `FileManager.scanFolder()` to use new structure

**What needs to be completed:**
1. ❌ Update `electron/main.ts` IPC handlers (~10 handlers):
   - Replace `.metadata` with `.keywords`
   - Use `MetadataStore.createMetadata()` for new entries
   - Call `MetadataStore.updateAuditTrail()` for updates
   - Ensure structured fields default to empty strings (not undefined)

2. ❌ Update `src/App.tsx` React component:
   - Rename state variable `metadata` → `keywords`
   - Update all `.metadata` references to `.keywords`

3. ❌ Update `electron/preload.ts` and `electron/schemas/ipcSchemas.ts`

4. ❌ Fix all test files

**Session document:** `.coord/sessions/2025-11-12-json-v2-migration-WIP.md` has complete details including:
- New JSON structure specification
- Line-by-line changes made
- Code examples for required updates
- Testing checklist

**First step:** Run `npm run typecheck` to get full list of compilation errors, then fix systematically.

Please continue this migration following the documented plan. Use TDD discipline where appropriate for critical handlers.

---

**Quick Start Commands:**
```bash
# See what was changed
git show d4286c7

# Check compilation errors
npm run typecheck 2>&1 | head -50

# Read detailed migration guide
cat .coord/sessions/2025-11-12-json-v2-migration-WIP.md
```
