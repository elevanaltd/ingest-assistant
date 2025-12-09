# Agents Sync

One-way sync from global `~/.claude/agents/` to MCP server `systemprompts/clink/` with format conversion.

## Usage

```
/agents-sync [mode]
```

**Modes:**
- `audit` (default) - Show differences, validate content, detect incomplete syncs
- `update` - Sync agents/ → clink/ with OCTAVE→plaintext conversion
- `validate` - Check content parity and size validation

**Format Conversion:**
- Strip YAML frontmatter (--- ... ---)
- Convert .oct.md → .txt
- Preserve OCTAVE structure and content
- Remove HTML comments

---

## EXECUTION PROTOCOL

When this command is invoked, execute the following steps:

### Step 1: Parse Arguments & Initialize

```bash
MODE="${1:-audit}"

SOURCE_DIR="$HOME/.claude/agents"
TARGET_DIR="/Volumes/HestAI-Tools/hestai-mcp-server/systemprompts/clink"

SYNC_DIRECTION::agents/→clink/[ONE_WAY_ONLY]
FORMAT_CONVERSION::.oct.md→.txt[YAML_STRIP+OCTAVE_PRESERVE]

EXCLUDE_PATTERNS::[
  "codex_*.txt",        # CLI-specific variants
  "default*.txt",       # Default role variants
  "test-*.txt",         # Test roles
  "ethos-*.txt",        # Experimental variants
  "_*.txt"              # System files
]

CRITICAL_SECTIONS::[
  "CONSTITUTIONAL_FOUNDATION",
  "COGNITIVE_FOUNDATION",
  "OPERATIONAL_IDENTITY",
  "PROPHETIC_INTELLIGENCE",  # Tier-specific agents
  "AUTHORITY_MODEL"          # Validators/guardians
]
```

### Step 2: Discover & Categorize Files

For each `.oct.md` file in `SOURCE_DIR`:

```bash
# 1. Extract agent name (filename without .oct.md)
# 2. Determine target filename (name.txt)
# 3. Check if target exists and is protected
# 4. Categorize:

CATEGORIES:
  SYNCED          - Content matches (post-conversion)
  NEEDS_UPDATE    - Source newer or content differs >20%
  NEW_AGENT       - No target file exists (create candidate)
  PROTECTED       - Target matches exclude pattern (NEVER sync)
  SIZE_MISMATCH   - Target differs >20% from source (incomplete sync warning)
  CONTENT_MISSING - Target lacks critical sections (corruption warning)
```

### Step 3: Content Validation Protocol

For each file pair (source .oct.md → target .txt):

```bash
VALIDATION_CHECKS::[
  YAML_STRIP::verify_frontmatter_removed[---...---],
  HTML_STRIP::verify_comments_removed[<!--...-->],
  SECTION_PRESENCE::verify_critical_sections_exist,
  SIZE_VALIDATION::flag_if_size_differs>20%,
  FORMAT_INTEGRITY::verify_OCTAVE_operators_preserved[→,≠,[],::],
  LINE_STRUCTURE::verify_indentation+nesting_maintained
]

SIZE_VALIDATION_FORMULA:
  expected_target_size ≈ source_size - YAML_frontmatter - HTML_comments
  tolerance = ±20%
  IF |actual_target_size - expected_target_size| > tolerance:
    FLAG::INCOMPLETE_SYNC_WARNING
```

### Step 4: Generate Report

Output format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HESTAI AGENTS SYNC AUDIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 SOURCE: ~/.claude/agents/ (.oct.md)
📁 TARGET: /Volumes/.../systemprompts/clink/ (.txt)
🔄 DIRECTION: agents/ → clink/ [ONE-WAY]

✅ SYNCHRONIZED ({count})
   implementation-lead.oct.md → implementation-lead.txt (145KB → 142KB)
   critical-engineer.oct.md → critical-engineer.txt (89KB → 86KB)
   ...

🔄 NEEDS UPDATE ({count})
   principal-engineer.oct.md → principal-engineer.txt
     Source: 2024-12-06 10:30:00 (156KB)
     Target: 2024-11-20 08:15:00 (89KB) ⚠️ SIZE MISMATCH -43%
   edge-optimizer.oct.md → edge-optimizer.txt
     Source: 2024-12-06 09:45:00 (78KB)
     Target: 2024-12-05 14:22:00 (76KB)

✨ NEW AGENTS ({count})
   hs-agents-sync.oct.md → hs-agents-sync.txt (will create)
   complexity-guard.oct.md → complexity-guard.txt (will create)

🔒 PROTECTED ({count}) [never sync]
   codex_codereviewer.txt (CLI-specific)
   default.txt (system default)
   test-baseline-role.txt (experimental)

⚠️ VALIDATION WARNINGS ({count})
   principal-engineer.txt
     ❌ SIZE_MISMATCH: Expected ~150KB, found 89KB (-43%)
     ❌ MISSING_SECTION: PROPHETIC_INTELLIGENCE not found
     → Possible incomplete sync or corruption

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTENT VALIDATION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

implementation-lead.txt ✅
  ✓ CONSTITUTIONAL_FOUNDATION present
  ✓ COGNITIVE_FOUNDATION present
  ✓ OPERATIONAL_IDENTITY present
  ✓ Size within tolerance (145KB → 142KB, -2.1%)

principal-engineer.txt ⚠️
  ✓ CONSTITUTIONAL_FOUNDATION present
  ✓ COGNITIVE_FOUNDATION present
  ✓ OPERATIONAL_IDENTITY present
  ❌ PROPHETIC_INTELLIGENCE missing (Tier1 agent)
  ❌ Size mismatch: -43% (expected ~150KB, found 89KB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total agents: {N}
Synchronized: {N} ✅
Needs update: {N} 🔄
New agents: {N} ✨
Protected: {N} 🔒
Validation warnings: {N} ⚠️

Recommended actions:
- Run `/agents-sync update` to sync {N} updated agents
- Review {N} validation warnings before syncing
- {N} new agents will be created in clink/
- {N} protected files will be preserved

Format conversion applied:
- YAML frontmatter stripped (--- ... ---)
- HTML comments removed (<!-- ... -->)
- .oct.md → .txt extension
- OCTAVE structure preserved
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 5: Execute Sync (if mode = update)

**For `update` mode:**

```bash
SYNC_PROTOCOL::[
  1::CONFIRM_USER_APPROVAL["Show full list, require explicit confirmation"],
  2::BACKUP_TARGETS["Create .bak copies of files being updated"],
  3::PROCESS_EACH_FILE::[
       READ_SOURCE→STRIP_YAML_FRONTMATTER→REMOVE_HTML_COMMENTS→PRESERVE_OCTAVE→WRITE_TARGET
     ],
  4::VALIDATE_POST_SYNC["Re-run validation, verify no corruption"],
  5::REPORT_CHANGES["Show before/after sizes, validation results"]
]

FORMAT_CONVERSION_STEPS::[
  STEP_1::read_source_file[agents/name.oct.md],
  STEP_2::detect_YAML_frontmatter[---\nkey: value\n---],
  STEP_3::strip_frontmatter[remove_lines_between_---],
  STEP_4::detect_HTML_comments[<!--...-->],
  STEP_5::strip_HTML_comments[remove_comment_blocks],
  STEP_6::preserve_OCTAVE_structure[operators+nesting+indentation],
  STEP_7::write_target_file[clink/name.txt],
  STEP_8::validate_conversion[size+sections+structure]
]

SAFETY_GATES::[
  NEVER_OVERWRITE::[codex_*.txt, default*.txt, test-*.txt, ethos-*.txt, _*.txt],
  REQUIRE_CONFIRMATION::user_must_approve_before_writing,
  BACKUP_FIRST::create_{filename}.bak_before_overwriting,
  VALIDATE_AFTER::run_content_validation_post_sync,
  ROLLBACK_ON_ERROR::restore_from_backup_if_validation_fails
]
```

**For `validate` mode:**

```bash
VALIDATION_PROTOCOL::[
  1::CHECK_CONTENT_PARITY["Verify critical sections exist in target"],
  2::SIZE_VALIDATION["Flag files differing >20% from expected"],
  3::STRUCTURE_VALIDATION["Verify OCTAVE operators preserved"],
  4::SECTION_COMPLETENESS["Check all critical sections present"],
  5::CORRUPTION_DETECTION["Identify truncated or malformed files"]
]

VALIDATION_REPORT::[
  SHOW::file_by_file_validation_status,
  HIGHLIGHT::files_with_warnings_or_errors,
  RECOMMEND::files_needing_resync,
  EVIDENCE::specific_missing_sections_or_size_deltas
]
```

### Step 6: Post-Sync Actions

After any sync:

```bash
POST_SYNC_PROTOCOL::[
  1::SHOW_CHANGES_SUMMARY["Files created, updated, preserved"],
  2::VALIDATE_ALL_TARGETS["Run full validation suite"],
  3::REPORT_VALIDATION_RESULTS["Any warnings or errors"],
  4::BACKUP_MANIFEST["List of .bak files created"],
  5::ROLLBACK_INSTRUCTIONS["How to restore from backup if needed"],
  6::MCP_RESTART_REMINDER["Changes require MCP server restart"]
]

CHANGE_SUMMARY_FORMAT::[
  CREATED::[list_new_files_with_sizes],
  UPDATED::[list_modified_files_with_before/after_sizes],
  PROTECTED::[list_preserved_files],
  VALIDATED::[pass/warn/fail_status_per_file]
]
```

---

## AGENT DISTRIBUTION RULES

Not all agents should sync to clink/. Use this matrix:

```
SYNC_TO_CLINK (MCP-compatible agents - ~40 agents):
  Core Workflow:
    - implementation-lead, task-decomposer, task-decomposer-validator
    - design-architect, visual-architect, north-star-architect
    - ideator, synthesizer, surveyor, research-analyst
    - technical-architect

  Quality & Validation:
    - critical-engineer, critical-implementation-validator, critical-design-validator
    - code-review-specialist, validator, edge-optimizer
    - principal-engineer, requirements-steward

  Testing:
    - universal-test-engineer, test-methodology-guardian, test-infrastructure-steward

  Error & Security:
    - error-architect, error-architect-surface, security-specialist

  System & Documentation:
    - octave-specialist
    - subagent-creator

  Orchestration:
    - holistic-orchestrator, ho-liaison, quality-observer

  Tools & Integrations:
    - smartsuite-expert, supabase-expert, vibe-coder

  Project-Specific (conditional):
    - eav-coherence-oracle (EAV projects only)
    - coherence-oracle (HestAI governance only)

NEVER_SYNC_TO_CLINK:
  Local Infrastructure (stay in agents/ only):
    - system-steward (Claude Code infrastructure)
    - directory-curator (local filesystem operations)
    - sessions-manager (local session management)
    - workspace-architect (local workspace setup)
    - completion-architect (local artifact management)
    - solution-steward (local coordination)
    - build-plan-checker (local validation)
    - workflow-scope-calibrator (local scoping)
    - complexity-guard (local complexity analysis)
    - semantic-optimizer (local documentation)
    - documentation-compressor (local compression)
    - idea-clarifier (local brainstorming)
    - ideator-catalyst (local ideation)
    - session-briefer (HestAI-only)
    - skills-expert (HestAI-only)
    - octave-validator (HestAI-only)
    - compression-fidelity-validator (HestAI-only)
    - eav-admin (EAV-only)

  Protected CLI Variants (manually maintained):
    - codex_codereviewer.txt
    - default.txt, default_codereviewer.txt, default_planner.txt
    - test-baseline-role.txt, test-control-role.txt, test-ethos-role*.txt
    - ethos-*.txt (experimental variants)

DECISION_MATRIX::IF[agent_can_operate_via_CLI_delegation]→SYNC,ELSE→LOCAL_ONLY
```

---

## FORMAT CONVERSION SPECIFICATION

```
INPUT_FORMAT (.oct.md):
  ---
  name: agent-name
  description: Agent description for discovery
  ---

  <!-- SUBAGENT_AUTHORITY: creator timestamp -->

  ===AGENT_NAME===

  ## 1. CONSTITUTIONAL_FOUNDATION ##
  [OCTAVE content...]

OUTPUT_FORMAT (.txt):
  ## 1. CONSTITUTIONAL_FOUNDATION ##
  [OCTAVE content...]

TRANSFORMATION_RULES::[
  STRIP::YAML_frontmatter[lines_between_---],
  STRIP::HTML_comments[<!--...-->],
  PRESERVE::OCTAVE_operators[→,≠,[],::,//],
  PRESERVE::section_headers[##,###],
  PRESERVE::indentation_and_nesting,
  PRESERVE::code_blocks_and_examples,
  CONVERT::extension[.oct.md→.txt],
  MAINTAIN::UTF-8_encoding,
  MAINTAIN::line_endings[LF]
]

VALIDATION_CHECKSUM::[
  VERIFY::no_YAML_frontmatter_in_output,
  VERIFY::no_HTML_comments_in_output,
  VERIFY::OCTAVE_operators_present,
  VERIFY::critical_sections_exist,
  VERIFY::size_within_tolerance[±20%],
  VERIFY::valid_UTF-8_encoding
]
```

---

## SIZE VALIDATION SPECIFICATION

```
SIZE_VALIDATION_PROTOCOL::[
  PURPOSE::"Detect incomplete syncs like principal-engineer (156KB→89KB)",

  CALCULATION::[
    source_size::stat_source_file[bytes],
    expected_overhead::YAML_frontmatter+HTML_comments[~3-5KB],
    expected_target::source_size-expected_overhead,
    tolerance::±20%,
    actual_target::stat_target_file[bytes]
  ],

  THRESHOLD::[
    delta::abs(actual_target-expected_target)/expected_target,
    IF[delta>0.20]→FLAG::SIZE_MISMATCH_WARNING
  ],

  REPORTING::[
    SHOW::source_size+target_size+delta_percentage,
    EXAMPLE::"156KB→89KB (-43%) ⚠️ SIZE MISMATCH",
    RECOMMEND::resync_if_delta>20%
  ]
]

CONTENT_VALIDATION_PROTOCOL::[
  PURPOSE::"Verify critical sections present post-conversion",

  CRITICAL_SECTIONS::[
    UNIVERSAL::["CONSTITUTIONAL_FOUNDATION","COGNITIVE_FOUNDATION","OPERATIONAL_IDENTITY"],
    TIER_SPECIFIC::["PROPHETIC_INTELLIGENCE","AUTHORITY_MODEL"],
    OPTIONAL::["OUTPUT_CONFIGURATION","VERIFICATION_PROTOCOL"]
  ],

  VALIDATION::[
    FOR_EACH[section_in_critical_sections]:
      IF[NOT_FOUND_in_target]→FLAG::MISSING_SECTION_WARNING
  ],

  REPORTING::[
    SHOW::section_presence_checklist,
    EXAMPLE::"❌ PROPHETIC_INTELLIGENCE missing (Tier1 agent)",
    RECOMMEND::resync_if_critical_section_missing
  ]
]
```

---

## EXAMPLE INVOCATIONS

```bash
# Audit sync status (default)
/agents-sync

# Explicit audit with validation
/agents-sync audit

# Perform sync after reviewing audit
/agents-sync update

# Validate content parity and detect corruption
/agents-sync validate
```

---

## EXPECTED OUTPUT EXAMPLES

**Audit Mode (healthy sync):**
```
✅ SYNCHRONIZED (38)
   implementation-lead.oct.md → implementation-lead.txt (145KB → 142KB) ✓
   critical-engineer.oct.md → critical-engineer.txt (89KB → 86KB) ✓

🔒 PROTECTED (8)
   codex_codereviewer.txt (CLI-specific)
   default.txt (system default)

SUMMARY: 38 synced, 0 updates needed, 0 warnings
```

**Audit Mode (needs sync):**
```
🔄 NEEDS UPDATE (2)
   principal-engineer.oct.md → principal-engineer.txt
     Source: 156KB (2024-12-06)
     Target: 89KB (2024-11-20) ⚠️ SIZE MISMATCH -43%

   edge-optimizer.oct.md → edge-optimizer.txt
     Source: 78KB (2024-12-06)
     Target: 76KB (2024-12-05)

⚠️ VALIDATION WARNINGS (1)
   principal-engineer.txt
     ❌ SIZE_MISMATCH: -43% (expected ~150KB, found 89KB)
     ❌ MISSING_SECTION: PROPHETIC_INTELLIGENCE

RECOMMENDATION: Run `/agents-sync update` to resync 2 agents
```

**Update Mode:**
```
🔄 SYNCING 2 AGENTS
   Backing up existing files...
   ✓ principal-engineer.txt → principal-engineer.txt.bak
   ✓ edge-optimizer.txt → edge-optimizer.txt.bak

   Converting agents/principal-engineer.oct.md...
     - Stripped YAML frontmatter (5 lines)
     - Removed HTML comments (1 block)
     - Preserved OCTAVE structure
     ✓ Written to clink/principal-engineer.txt (156KB)

   Converting agents/edge-optimizer.oct.md...
     - Stripped YAML frontmatter (4 lines)
     - Removed HTML comments (1 block)
     - Preserved OCTAVE structure
     ✓ Written to clink/edge-optimizer.txt (78KB)

   Validating post-sync...
   ✅ principal-engineer.txt: All sections present, size valid
   ✅ edge-optimizer.txt: All sections present, size valid

✅ SYNC COMPLETE
   Updated: 2 files
   Backed up: 2 files (.bak)
   Validation: PASSED

⚠️ MCP SERVER RESTART REQUIRED
   Changes will not take effect until MCP server restarts
```
