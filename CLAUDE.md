# Ingest Assistant - Project Guide for Claude Code

===GIT_SAFETY_PROTOCOL===

⚠️ BRANCH_PROTECTION_ACTIVE ⚠️

CONSTRAINT::[
  MAIN_BRANCH::protected[push_blocked_at_remote],
  NEVER::commit_directly_to_main,
  ALWAYS::create_feature_branch→PR→merge
]

WORKTREE_AWARENESS::[
  CHECK_FIRST::git branch --show-current,
  IF_MAIN::switch_to_feature_branch_immediately,
  RISK::worktrees_may_default_to_main→verify_before_commit,
  PATTERN::git checkout -b feat/description OR fix/description
]

BEFORE_ANY_COMMIT::[
  1::verify_branch[git branch --show-current],
  2::confirm_NOT_main,
  3::if_main→git checkout -b {appropriate_branch}
]

===END_GIT_SAFETY===

===INGEST_ASSISTANT===

IDENTITY::[
  NAME::Ingest Assistant,
  PURPOSE::AI-powered media file ingestion + metadata assistant,
  TYPE::Electron desktop application,
  PLATFORM::Cross-platform[macOS darwin + Ubuntu linux],
  PHASE::B4[v2.2.0 production baseline] + D1[CFEx Integration],
  ECOSYSTEM::EAV Operations Suite[step_6_of_10],
  PIPELINE_POSITION::Pre-tagging gateway between field capture → post-production
]

PIPELINE_CONTEXT::Step_6_of_10::[
  UPSTREAM::EAV monorepo apps[scripts→scenes→cam-op→data-entry],
  THIS_APP::CFex transfer → proxy generation → AI cataloging → JSON metadata,
  DOWNSTREAM::CEP Panel[Premiere Pro] → EAV post-production[copy-editor→library-manager→edit→vo→translations]
]

IMMUTABLES::[
  I1::CHRONOLOGICAL_ORDERING[DateTimeOriginal preserved → shot numbers sequential]→WHY[ffmpeg loses EXIF → manual preservation MANDATORY],
  I2::HUMAN_OVERSIGHT[AI suggests → human approves]→WHY[AI confidence < 1.0],
  I3::JSON_SOURCE_OF_TRUTH[.ingest-metadata.json authoritative → files minimal XMP]→WHY[corrections without file I/O],
  I4::PROXY_WORKFLOW[2560×1440 ProRes Proxy → optimal]→WHY[professional grading + smooth playback + reasonable size],
  I5::SPLIT_STORAGE[photos/proxies→LucidLink | raw→Ubuntu SMB]→WHY[fast editor access + cheap archival],
  I6::IMMUTABLE_ANCHOR[TapeName=original filename]→WHY[CEP Panel matching + rename safety],
  I7::FOLDER_LOCK[COMPLETE flag → shot numbers frozen]→WHY[prevents chronological re-sort chaos]
]

NORTH_STAR::See `.hestai/north-star/000-INGEST_ASSISTANT-D1-NORTH-STAR.md`[7 immutables + microphase structure]

TECH_STACK::[
  RUNTIME::Electron[main + renderer processes],
  FRONTEND::React 18 + TypeScript + Vite,
  TESTING::Vitest[543 tests/35 files],
  AI::OpenRouter + Anthropic + OpenAI,
  METADATA::exiftool[XMP/EXIF writing],
  DATABASE::Supabase[zbxvjyrbkycbfhwmmnmy] + media_references schema[isolated from EAV production]
]

QUALITY_GATES::MANDATORY[ALL_MUST_PASS]::[
  lint::"npm run lint"→0_errors[45 warnings acceptable],
  typecheck::"npm run typecheck"→0_errors,
  tests::"npm test"→ALL_PASS[543/543],
  PRE_COMMIT::"npm run lint && npm run typecheck && npm test"→ALL_GREEN_OR_NO_COMMIT
]

TDD::CONSTITUTIONAL_REQUIREMENT::[
  RED::Write failing test → verify fails for RIGHT reason,
  GREEN::Minimal implementation → verify passes,
  REFACTOR::Improve while green[optional],
  GIT_PATTERN::"test: failing X (RED)" → "feat: implement X (GREEN)",
  NEVER::["feat: implement X and add tests", "fix: add missing test"]→tests_after_code_FORBIDDEN
]

MANDATORY_SKILLS::[
  BUILD_WORK::Skill(command:"build-execution")→TDD + MIP + ripple analysis,
  ERROR_WORK::Skill(command:"error-triage")→cascade prevention + systematic resolution,
  TEST_WORK::Skill(command:"test-infrastructure") + Skill(command:"supabase-test-harness")[if Supabase],
  CI_WORK::Skill(command:"ci-error-resolution") + Skill(command:"test-ci-pipeline")
]

KEY_WORKFLOWS::[
  PROXY_GENERATION::[
    photos::CFex/DCIM/ → /Volumes/videos-current/2. WORKING PROJECTS/[project]/images/,
    raw_videos::CFex/PRIVATE/M4ROOT/CLIP/ → /Volumes/EAV_Video_RAW/[project]/videos-raw/,
    proxies::ffmpeg -i raw.MOV -vf "scale=2560:1440" -c:v prores_ks -profile:v 0 -vendor apl0 -pix_fmt yuv422p10le -c:a pcm_s16le proxy.MOV,
    CRITICAL::exiftool -overwrite_original "-QuickTime:DateTimeOriginal=$ORIG_DATE" proxy.MOV→I1_COMPLIANCE,
    validation::file_count_match + DateTimeOriginal_preserved + integrity_check,
    STATUS::Not implemented yet[external app + manual workflow currently]
  ],

  AI_CATALOGING::[
    input::proxy folders[LucidLink] NOT raw files[Ubuntu],
    process::batch AI processing → location + subject + action + shotType[confidence > 0.7 auto-populates],
    sort::chronological by EXIF DateTimeOriginal → sequential shot numbers #1...#N,
    output::.ingest-metadata.json[Schema 2.0] in proxy folder → single source of truth,
    lock::COMPLETE button → shot numbers frozen + metadata read-only + JSON _completed:true,
    WHY::proxies smaller[7.8M vs 1GB] + sufficient quality + editors work here
  ],

  JSON_ARCHITECTURE::[
    AUTHORITATIVE::.ingest-metadata.json[all metadata: location, subject, action, shotType, shotNumber, keywords],
    FILE_METADATA::XMP-xmpDM:TapeName ONLY[original filename anchor] → written when toggles ON,
    CEP_INTEGRATION::reads JSON + uses filename matching[not XMP reading],
    CORRECTIONS::edit JSON only[no file I/O] → prevents divergence,
    LOCK_MECHANISM::lockedFields:[] + _completed:true/false → folder state control
  ]
]

ARCHITECTURE::[
  MAIN_PROCESS::electron/main.ts[IPC handlers + services],
  SERVICES::[aiService, metadataWriter, securityValidator, batchQueueManager, videoTranscoder, referenceLookup],
  RENDERER::React UI[virtual scrolling 1000+ files@60fps + Cmd+K palette + Cmd+S save + Cmd+I AI],
  SECURITY::spawn({shell:false}) + Zod validation + path normalization + capability tokens
]

SECURITY_CRITICAL::[
  COMMAND_INJECTION::spawn({shell:false}) NOT exec() + metacharacter validation + flag protection,
  PATH_TRAVERSAL::platform-agnostic symlink resolution + allowed path enforcement + Batch IPC Zod schemas,
  MEDIA_SERVER::32-byte capability token + token validation before path validation + cross-origin probing prevention
]

CONVENTIONS::[
  FILE_NAMING::kebab-case["kitchen-oven-cu.jpg", "kitchen-oven-cleaning-ws.mov"],
  SHOT_TYPES::[WS, MID, CU, UNDER, FP, TRACK, ESTAB],
  NAMING_PATTERN::{location}-{subject}-{shotType} OR {location}-{subject}-{action}-{shotType}
]

CONSTRAINTS::[
  BATCH_LIMIT::100 files per batch,
  RATE_LIMITING::configured per AI provider,
  VIDEO_ANALYSIS::5 frames sequential[NOT parallel → rate limit compliance],
  PLATFORMS::macOS darwin + Ubuntu linux
]

CURRENT_STATUS::[
  PRODUCTION::v2.2.0[November 18, 2025] → https://github.com/elevanaltd/ingest-assistant/releases/tag/v2.2.0,
  ROLLBACK::"git checkout v2.2.0" OR download DMG[127M]/ZIP[123M],
  ACTIVE_DEV::D1 CFEx Integration[7 immutables + 3 microphases],
  MICROPHASES::[1a:transfer+integrity[2wk], 1b:proxy+DateTimeOriginal[2wk], 1c:power_features[2-3wk]],
  DEFERRED::Reference Catalog #63[after CFEx + guardrails, 3-6 months]
]

SUPABASE_INTEGRATION::[
  PROJECT::EAV Monorepo[zbxvjyrbkycbfhwmmnmy],
  SCHEMA::media_references[isolated from public.shots],
  WHY_SEPARATE::domain isolation + evolution independence + blast radius minimization,
  FUTURE::Reference Catalog #63[vector search + shot list context → improved AI accuracy]
]

CROSS_ECOSYSTEM_COORDINATION::[
  EAV_SCHEMA_CHANGES::[
    1::Check /Volumes/HestAI-Projects/eav-monorepo/.hestai/state/context/ACTIVE-WORK.md[avoid conflicts],
    2::Branch ia/{task-name},
    3::Update ACTIVE-WORK.md[status tracking],
    4::Deploy EAV first → IA second[prevents orphaned migrations],
    5::Validate ./scripts/check_cross_schema.sh[FK constraints]
  ],
  GITHUB_LABELS::["cross-ecosystem:ia"[EAV PRs], "cross-ecosystem:eav"[IA PRs]]
]

REFERENCES::[
  THIS_PROJECT::[
    CONTEXT::".hestai/state/context/PROJECT-CONTEXT.md",
    CHECKLIST::".hestai/state/context/SHARED-CHECKLIST.md",
    ROADMAP::".hestai/state/context/PROJECT-ROADMAP.md",
    NORTH_STAR::".hestai/north-star/000-INGEST_ASSISTANT-D1-NORTH-STAR.md",
    ARCHITECTURE::"docs/architecture/001-DOC-ARCHITECTURE.md",
    BATCH_PROCESSING::"docs/guides/implementation/007-DOC-BATCH-PROCESSING-IMPLEMENTATION.md",
    DEPENDENCY_ROADMAP::"docs/013-DOC-DEPENDENCY-ROADMAP.md"
  ],
  EAV_ECOSYSTEM::[
    CONTEXT::"/Volumes/HestAI-Projects/eav-monorepo/.hestai/state/context/PROJECT-CONTEXT.md",
    PIPELINE::"/Volumes/HestAI-Projects/eav-monorepo/.hestai/decisions/002-EAV-PRODUCTION-PIPELINE.md",
    ACTIVE_WORK::"/Volumes/HestAI-Projects/eav-monorepo/.hestai/state/context/ACTIVE-WORK.md",
    CROSS_WORKFLOW::"/Volumes/HestAI-Projects/eav-monorepo/.hestai/decisions/CROSS-ECOSYSTEM-WORKFLOW.md"
  ]
]

COMMANDS::[
  QG_ALL::"npm run lint && npm run typecheck && npm test",
  TEST_FILE::"npm test -- electron/__tests__/batch/batchIpcHandlers.test.ts",
  TEST_WATCH::"npm run test:watch",
  BUILD::"npm run build",
  DEV::"npm run dev"
]

CONSTITUTIONAL_REMINDERS::[
  1::Load build-execution skill BEFORE any implementation,
  2::Write failing test BEFORE any code,
  3::Run all quality gates BEFORE any commit,
  4::Provide evidence ALWAYS[no validation theater],
  5::Think systemically[local change → system ripple],
  6::Code minimally[essential > accumulative],
  7::Verify rigorously[claims require artifacts]
]

===END===

**Last Updated:** 2026-03-03 (three-tier .hestai migration)
**Maintainer:** Shaun Buswell
**Claude Code Version:** Sonnet 4.6
