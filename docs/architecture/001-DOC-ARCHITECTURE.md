# Ingest Assistant - Architecture Documentation

## Purpose

PROBLEM::manual_photo/video_organization_tedious→camera_filenames[EB001537.jpg]_meaningless→searchable_metadata_requires_manual_EXIF_editing

SOLUTION::desktop_app[human_review+AI_assist]→quick_rename_with_descriptive_names+embed_searchable_metadata_directly_into_media_files

---

## Core Concept

### The Workflow

```
1. Select folder with photos/videos
2. View media file-by-file
3. Add descriptive name + metadata tags
4. File gets renamed: EB001537.jpg → EB001537-oven-control-panel.jpg
5. Metadata embedded into file (readable by Premiere Pro, other tools)
6. Optional: AI assist suggests names/tags for unlabeled files
```

### The Key Innovation

DUAL_METADATA_STORAGE::[
  EXTERNAL_JSON::{.ingest-metadata.json_in_folder}→app_working_memory+tracks_processing_state,
  EMBEDDED_EXIF/XMP/IPTC::{inside_media_file}→professional_tool_compatibility+metadata_travels_with_file
]

SYSTEM_COHERENCE::app_tracks_progress+professional_tools_search/filter_by_metadata

---

## System Architecture

### Three-Layer Electron Architecture

```
┌─────────────────────────────────────────────────────────┐
│  RENDERER PROCESS (React + Vite)                        │
│  - UI components (App.tsx, ErrorBoundary)               │
│  - User interaction handling                            │
│  - Media display (images/videos)                        │
└─────────────────┬───────────────────────────────────────┘
                  │ IPC (Context Bridge)
                  │ window.electronAPI.*
┌─────────────────┴───────────────────────────────────────┐
│  PRELOAD SCRIPT (preload.ts)                            │
│  - Security boundary (context isolation)                │
│  - Exposes safe IPC methods to renderer                 │
│  - Type-safe API surface                                │
└─────────────────┬───────────────────────────────────────┘
                  │ ipcRenderer ↔ ipcMain
┌─────────────────┴───────────────────────────────────────┐
│  MAIN PROCESS (Electron main.ts)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ IPC Handlers (file:*, ai:*)                       │  │
│  └────────────┬──────────────────────────────────────┘  │
│  ┌────────────┴──────────────────────────────────────┐  │
│  │ SERVICE LAYER                                      │  │
│  │ - FileManager: Scan folders, rename files         │  │
│  │ - MetadataStore: JSON persistence (.ingest-*.json)│  │
│  │ - ConfigManager: YAML config + lexicon loading    │  │
│  │ - AIService: OpenAI/Anthropic/OpenRouter client   │  │
│  │ - MetadataWriter: exiftool integration (EXIF/XMP) │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Component Relationships

**1. FileManager + MetadataStore → Working Memory**
```
FileManager.scanFolder() → Discovers media files (with LRU caching for performance)
                         → Extracts ID (first 8 chars)
                         ↓
MetadataStore.getFileMetadata() → Checks for existing metadata
                                → Merges with file list
                                → Returns enriched FileMetadata[]
```

**Performance: LRU Cache for Folder Scans**
```
FileManager maintains 5-folder LRU cache for scanFolder() results
→ Cache hit: <50ms (meets Issue #19 requirements)
→ Cache miss: Full directory scan

Cache invalidation triggers:
- FileManager.renameFile() → Automatic cache clear for parent directory
- FileManager.invalidateCache(path) → Manual cache invalidation
- Prevents stale filename display after file operations
```

**2. User Edits → Dual Persistence**
```
User saves → Main Process receives IPC call
           ↓
           FileManager.renameFile() → Physical file rename on disk
           ↓
           MetadataStore.updateFileMetadata() → Update .ingest-metadata.json
           ↓
           MetadataWriter.writeMetadataToFile() → Embed EXIF/XMP via exiftool
```

**3. AI Assistance → Lexicon-Guided Analysis**
```
User clicks "AI Assist" → AIService.analyzeImage()
                        ↓
                        ConfigManager.getLexicon() → Loads rules (preferred/excluded terms)
                        ↓
                        Build prompt with lexicon constraints
                        ↓
                        OpenAI/Anthropic vision API → Returns { mainName, metadata, confidence }
                        ↓
                        UI populates fields (user can edit before saving)
```

EMERGENT_PROPERTY::progressive_enhancement→manual_first+AI_assisted_optionally+always_human_review_before_commit

---

## Key Technical Decisions

### 1. Electron + React (vs. Native macOS)

DECISION::Electron_with_Vite+React

RATIONALE::[
  cross_platform_foundation[macOS_first→Windows/Linux_possible],
  rapid_UI_development[React_ecosystem],
  Vite_fast_dev_experience,
  Node.js_access[file_ops+AI_SDK_integration]
]

TRADE_OFF::larger_bundle≠native→acceptable_productivity_tool

---

### 2. File ID = First 8 Characters (Immutable Reference)

DECISION::extract_camera_prefix[EB001537]_as_permanent_ID

RATIONALE::[
  cameras_use_consistent_prefixes[file_sequences],
  immutable_reference_survives_renames,
  enables_metadata_lookup_after_moves/renames
]

IMPLEMENTATION::
```typescript
// fileManager.ts:getFileId()
const nameWithoutExt = path.basename(filePath, ext);
const fileId = nameWithoutExt.substring(0, 8);
```

TRADE_OFF::assumes_8_char_camera_prefixes[most_cameras→might_need_config_others]

---

### 3. Dual Metadata Storage (JSON + Embedded EXIF)

DECISION::store_metadata_BOTH[.ingest-metadata.json+embedded_files]

RATIONALE::[
  JSON::fast_lookup+tracks_AI_state+app_specific_metadata,
  EXIF/XMP::professional_tool_compatibility[Premiere_Pro+Lightroom]
]

WHY_BOTH::
```
JSON alone → Fast but doesn't travel with file
EXIF alone → No processing state, slower to query en masse
Both together → Best of both worlds
```

IMPLEMENTATION::MetadataWriter_uses_exiftool_writes::[
  Title/XMP:Title/IPTC:ObjectName→main_descriptive_name,
  Keywords/XMP:Subject/IPTC:Keywords→comma_separated_tags,
  Description→combined_searchable_text
]

---

### 4. exiftool Dependency (External Binary)

DECISION::exiftool_via_child_process≠pure_JS_EXIF_library

RATIONALE::[
  exiftool_industry_standard[comprehensive_format_support],
  handles_edge_cases[video_metadata+XMP_namespaces+IPTC],
  reliable_metadata_preservation
]

TRADE_OFF::requires_exiftool_installation_user_system[documented_setup]

---

### 5. AI Provider Abstraction (OpenAI | Anthropic | OpenRouter)

DECISION::single_AIService_class_with_provider_switching

RATIONALE::[
  future_proof::easy_add_new_providers[YOLOv8_mentioned_original_brief],
  cost_optimization::switch_providers_based_pricing,
  vendor_independence
]

CONFIGURATION::
```typescript
// Environment variables or config.yaml
AI_PROVIDER=openrouter
AI_MODEL=anthropic/claude-3.5-sonnet
AI_API_KEY=sk-...
```

WHY_OPENROUTER::unified_API_multiple_models[Anthropic+OpenAI+others]_via_single_key

---

### 6. Lexicon-Based AI Guidance (YAML Config)

DECISION::user_editable_YAML[preferred/excluded_terms+synonym_mapping]

RATIONALE::[
  domain_specific_vocabulary_control[tap≠faucet],
  consistent_naming_across_large_batches,
  learning::user_refines_lexicon_over_time_based_AI_suggestions
]

EXAMPLE::
```yaml
lexicon:
  preferredTerms: [tap, sink, oven]
  excludedTerms: [faucet, basin]
  synonymMapping:
    faucet: tap
    basin: sink
```

---

### 7. TypeScript Throughout (Strict Mode)

DECISION::full_TypeScript_with_strict_compiler_options

RATIONALE::[
  type_safety_across_IPC_boundaries[main↔renderer],
  catch_errors_compile_time,
  self_documenting_interfaces[FileMetadata+AIAnalysisResult]
]

IPC_TYPE_SAFETY::
```typescript
// src/types/electron.d.ts
interface ElectronAPI {
  selectFolder(): Promise<string | null>;
  loadFiles(folderPath: string): Promise<FileMetadata[]>;
  renameFile(id: string, name: string, path: string): Promise<boolean>;
  // ... fully typed
}
```

---

## Data Flow

### Initial Folder Load
```
User clicks "Select Folder"
  ↓
dialog.showOpenDialog() → Returns folder path
  ↓
FileManager.scanFolder() → Reads directory
  ↓
  Filter: .jpg, .jpeg, .png, .gif, .webp, .mp4, .mov, .avi, .webm
  ↓
  For each file:
    - Extract ID (first 8 chars)
    - Get file stats (size, mtime)
    - Create FileMetadata object
  ↓
MetadataStore.getFileMetadata(id) → Load existing metadata if any
  ↓
Merge: File system data + Stored metadata
  ↓
Return FileMetadata[] to renderer
  ↓
Renderer displays: Media viewer + Form fields
```

### Save Workflow
```
User edits "Main Name" + "Metadata" → Clicks Save
  ↓
IPC: file:rename + file:update-metadata
  ↓
1. FileManager.renameFile()
   - Build new filename: [id]-[kebab-case-name].[ext]
   - fs.rename() on disk
   - Invalidate LRU cache for parent directory (prevents stale UI)
  ↓
2. MetadataStore.updateFileMetadata()
   - Update JSON object in memory
   - Write to .ingest-metadata.json
  ↓
3. MetadataWriter.writeMetadataToFile()
   - Build exiftool command with -Title, -Keywords, -Description
   - exec() exiftool with metadata flags
   - Embedded metadata now in file
  ↓
Reload file list (to reflect new filename)
  ↓
Update UI with success message
```

### AI Assist Workflow
```
User clicks "AI Assist"
  ↓
ConfigManager.getLexicon() → Load rules from config.yaml
  ↓
AIService.buildPrompt(lexicon) → Construct system prompt:
  "Preferred terms: X, Y, Z"
  "Excluded terms: A, B"
  "Return JSON: { mainName, metadata }"
  ↓
fs.readFile(imagePath) → Read image as buffer
  ↓
buffer.toString('base64') → Encode for API
  ↓
API call (OpenAI/Anthropic):
  {
    messages: [{
      role: 'user',
      content: [prompt, base64_image]
    }]
  }
  ↓
Parse JSON response → { mainName, metadata, confidence }
  ↓
Populate UI fields (NOT saved automatically)
  ↓
User reviews → Edits if needed → Clicks Save (triggers Save Workflow)
```

---

## Technology Stack

### Core Framework
CORE::[
  Electron_28::desktop_app[macOS_first+cross_platform_capable],
  React_18::UI_rendering_with_hooks,
  TypeScript_5.3::strict_type_safety,
  Vite_5::fast_dev_server+production_builds
]

### Main Process (Node.js)
MAIN_PROCESS::[
  fs/promises::async_file_operations,
  child_process::exiftool_integration,
  js_yaml::config_file_parsing,
  OpenAI_SDK::OpenAI/OpenRouter_API_client,
  Anthropic_SDK::Claude_API_client
]

### Testing & Quality
TESTING::[
  Vitest::unit_testing[Jest_compatible+Vite_native],
  @testing_library/react::component_testing,
  ESLint::code_linting[@typescript_eslint],
  GitHub_Actions::CI/CD_pipeline[typecheck→lint→test→build]
]

### Build & Packaging
BUILD::[
  electron_builder::macOS_packaging[DMG/ZIP],
  concurrently::parallel_dev_server+electron_process,
  Vite::renderer_build_optimization
]

---

## Project Structure

```
ingest-assistant/
├── electron/                  # Main process code
│   ├── services/              # Business logic layer
│   │   ├── fileManager.ts     # File operations, scanning, renaming
│   │   ├── metadataStore.ts   # JSON persistence layer
│   │   ├── configManager.ts   # YAML config + lexicon loading
│   │   ├── aiService.ts       # AI provider abstraction
│   │   └── metadataWriter.ts  # exiftool integration (EXIF/XMP)
│   ├── main.ts                # Electron entry point + IPC handlers
│   └── preload.ts             # Context bridge (security boundary)
├── src/                       # Renderer process (React)
│   ├── components/
│   │   └── ErrorBoundary.tsx  # React error handling
│   ├── types/
│   │   ├── index.ts           # Shared type definitions
│   │   └── electron.d.ts      # IPC API types
│   ├── App.tsx                # Main application component
│   └── main.tsx               # React entry point
├── config/
│   └── config.yaml.example    # Lexicon configuration template
├── .github/workflows/
│   └── ci.yml                 # Quality gates (typecheck, lint, test, build)
├── package.json               # Dependencies + scripts
├── vite.config.ts             # Renderer build config
├── vitest.config.ts           # Test configuration
└── ARCHITECTURE.md            # This file
```

---

## Known Trade-offs & Design Constraints

TRADE_OFFS::[
  1::exiftool_dependency→requires_external_binary_install[documented_README→could_bundle_future]→acceptable_industry_standard_tool,

  2::App.tsx_component_size[~270_lines]→single_large≠decomposed_smaller→FUTURE_extract[MediaViewer+MetadataForm+Navigation]→acceptable_v1_rapid_dev,

  3::security_hardening_needed→CURRENT_basic_context_isolation→MISSING[input_validation_IPC+path_traversal+file_size_limits+sanitized_errors]→CRITICAL_before_production,

  4::batch_AI_processing→code_exists[aiService.ts]≠UI_exposed→WHY_focus_manual_first_validate_single_before_scaling→FUTURE_batch_mode_UI,

  5::no_undo/redo→file_renames_immediate_irreversible→MITIGATION_could_add_rename_history/trash→acceptable_manual_review_before_save,

  6::single_folder_at_time→simple_mental_model≠power_user_efficiency→FUTURE_folder_queue+recursive_subfolder
]

---

## Future Considerations

### Near-term Enhancements (3-6 months)
NEAR_TERM::[
  1::batch_AI_processing_UI[progress_indicator],
  2::keyboard_shortcuts[arrows_next/prev+Cmd+S_save+Cmd+I_AI],
  3::component_decomposition[extract_MediaViewer+MetadataForm+Navigation],
  4::security_hardening[input_validation+path_traversal+file_size_limits],
  5::error_handling[user_friendly_messages+recovery_guidance]
]

### Medium-term Features (6-12 months)
MEDIUM_TERM::[
  1::undo/redo[rename_history+rollback],
  2::drag_and_drop[drop_folder_onto_window],
  3::preview_caching[cache_thumbnails_faster_navigation],
  4::export_report[CSV/JSON_export_all_metadata],
  5::custom_lexicon_UI[in_app_editor≠manual_YAML]
]

### Long-term Vision (12+ months)
LONG_TERM::[
  1::YOLOv8_integration[local_object_detection_mentioned_original_brief],
  2::plugin_system[community_lexicons+custom_AI_models],
  3::cloud_sync[optional_metadata_backup],
  4::collaborative_workflows[multi_user_metadata_review],
  5::video_frame_analysis[AI_specific_frames≠thumbnails]
]

### Technology Evolution
TECH_EVOLUTION::[
  Electron_updates::stay_current_security_patches,
  AI_model_improvements::leverage_better_vision_models,
  TypeScript::migrate_TS_5.x_features_ecosystem_stabilizes,
  Testing::increase_coverage_80%+E2E_tests[Playwright]
]

---

## Testing Strategy

CURRENT_COVERAGE::[
  unit_tests::service_layer[fileManager+metadataStore+configManager+aiService],
  component_tests::ErrorBoundary.tsx,
  CI_pipeline::typecheck→lint→test→build[every_push]
]

TEST_PHILOSOPHY::[
  service_layer::high_coverage[business_logic_critical],
  React_components::focus_user_facing_behavior≠implementation_details,
  integration_tests::validate_IPC_communication[main↔renderer],
  E2E_tests::planned[full_user_workflows]
]

QUALITY_GATES_CI_ENFORCEMENT::
```bash
npm run typecheck  # TypeScript compilation check (0 errors)
npm run lint       # ESLint code quality (0 errors)
npm test           # Vitest unit tests (all passing)
npm run build      # Production build (must succeed)
```

PHILOSOPHY::all_gates_MUST_pass_before_merge→NO_exceptions

---

## Configuration & Setup

ENVIRONMENT_VARIABLES[optional]::
```bash
# AI provider config (overrides config.yaml)
AI_PROVIDER=openrouter
AI_MODEL=anthropic/claude-3.5-sonnet
AI_API_KEY=sk-or-v1-...
```

CONFIG_FILE[recommended]::
```yaml
# ~/Library/Application Support/ingest-assistant/config.yaml
lexicon:
  preferredTerms: [tap, sink, oven, counter, cabinet]
  excludedTerms: [faucet, basin]
  synonymMapping:
    faucet: tap
    basin: sink
  categories:
    kitchen: [oven, sink, tap, counter, cabinet]
    bathroom: [shower, toilet, mirror, bath]
```

EXTERNAL_DEPENDENCIES::
```bash
brew install exiftool  # macOS
```

---

## Security Model

CURRENT_IMPLEMENTATION::[
  ✅_context_isolation_enabled[renderer≠Node.js_APIs_directly],
  ✅_Node_integration_disabled[renderer_sandboxed],
  ✅_preload_script_sandboxed[whitelisted_IPC_methods_only],
  ✅_no_remote_content_loading[fully_local]
]

CRITICAL_IMPROVEMENTS_BEFORE_PRODUCTION::[
  ❌_input_validation_IPC_handlers[prevent_malicious_file_paths],
  ❌_path_traversal_protection[restrict_access_selected_folder],
  ❌_file_type_validation[verify_extensions_match_content],
  ❌_file_size_limits[prevent_memory_exhaustion],
  ❌_API_key_protection[secure_storage≠config_files],
  ❌_error_message_sanitization[dont_leak_file_paths_UI]
]

REFERENCE::REPO_REVIEW.md[detailed_security_checklist]

---

## Deployment

DEVELOPMENT::
```bash
npm run dev          # Start Vite dev server + Electron
npm test             # Run unit tests
npm run typecheck    # Verify TypeScript
npm run lint         # Check code quality
```

PRODUCTION_BUILD::
```bash
npm run build        # Compile TypeScript + Vite build
npm run package      # Create macOS DMG/ZIP (electron-builder)
```

DISTRIBUTION::[
  output::release/_directory[DMG+ZIP],
  signing::not_yet_configured[required_macOS_Gatekeeper_bypass],
  updates::manual_download[auto_update≠implemented]
]

---

## Changelog

### v1.0.0 (Current - January 2025)
V1_0_0::[
  ✅_core_manual_workflow[view+rename+tag+save],
  ✅_dual_metadata_storage[JSON+embedded_EXIF],
  ✅_AI_assist[single_file+OpenAI/Anthropic/OpenRouter],
  ✅_lexicon_based_AI_guidance,
  ✅_error_boundary_UI_resilience,
  ✅_CI/CD_pipeline_quality_gates
]

### Recent Enhancements (November 2025)
NOVEMBER_2025::[
  ✅_settings_modal[in_app_lexicon_editor+table_based_term_mapping],
  ✅_robust_AI_parsing[handles_JSON+markdown+prose],
  ✅_dotenv_integration[automatic_.env_loading_API_keys],
  ✅_custom_AI_instructions[free_form_guidance_field_lexicon],
  ✅_test_coverage[increased_43→518_passing_tests],
  ✅_LRU_cache_invalidation[fixed_file_rename_reversion_bug],
  ✅_multi_select_batch_operations[Process_Selected_button],
  ✅_keyboard_shortcuts[Cmd+K_palette+Cmd+S_save+Cmd+I_AI_assist],
  ✅_virtual_scrolling[60fps_performance_1000+_files]
]

INITIAL_RELEASE_FIXES::[
  fixed_critical_console_error[window.electronAPI_undefined],
  added_ErrorBoundary[graceful_error_handling],
  fixed_package.json_main_entry_point,
  comprehensive_repo_review_security_assessment
]

---

## Architectural Evolution & Strategic Exploration

### November 2025: Concurrent Development Paths

CURRENT_STATUS[2025-11-11]::Electron_App_ACTIVE_Production_Path

ACTIVE_DEVELOPMENT_EVIDENCE::[
  recent_commits_through_2025-11-11[action_field+keyboard_shortcuts+virtual_scrolling],
  Phase_0_prerequisites_completed[Issues_18+19+20],
  Tier_2-3_features_implemented[Issues_22+23],
  version_1.1.0_release[November_2025],
  quality_improvements_ongoing[TypeScript_strict+ESLint_v9]
]

### Strategic Alternative Explored: UXP Panel

CRITICAL_DISCOVERY::Premiere_Pro_Workflow_Integration[2025-11-06]

DISCOVERY::Premiere_Pro_displays_master_file_metadata_ONLY_when_proxies_attached→metadata_written_proxy_files_INVISIBLE_editing_workflow

IMPLICATIONS::[
  1::metadata_MUST_write_RAW_files[stored_restricted_NAS],
  2::editors_work_offline/proxy_files[accessible_LucidLink],
  3::file_system_access_creates_organizational_boundary_conflicts
]

WORKFLOW_REALITY_CHECK::
```
ASSUMED WORKFLOW (Tool designed for):
Camera Cards → Ingest Assistant → Renamed files → Import to PP

ACTUAL WORKFLOW (How editors work):
Camera Cards → Copy to NAS → Import to PP → Edit with proxies (offline RAW files)
```

UXP_PANEL_ADVANTAGES[if_pursued]::[
  1::access_boundary[editors_work_PP_offline_files→PP_metadata≠requires_file_access],
  2::search_integration[PP_project_metadata_immediately_searchable_bins≠relink_needed],
  3::workflow_integration[editors_never_leave_PP→zero_tool_switching_friction],
  4::AI_advantage[analyze_exact_frame_editor_viewing≠blind_file_analysis],
  5::simplicity[no_file_access_choreography+no_server_infrastructure+no_queue_systems]
]

CODE_REUSABILITY_FROM_ELECTRON[if_UXP_pursued]::60-70%[
  React_components[UI_layout+forms+state_management],
  AIService[HTTP_API_calls_work_identically],
  ConfigManager[lexicon_loading_adaptable],
  Type_definitions[interfaces_remain_valid]
]

ELECTRON_APP_STATUS::ACTIVE→production_development_continues

CURRENT_STATE::[
  production_grade_application_v1.1.0,
  Phase_0_architectural_prerequisites_completed[security+pagination+schemas],
  major_UX_improvements[keyboard_shortcuts+command_palette+virtual_scrolling],
  quality_gates_strengthened[TypeScript_strict+comprehensive_tests]
]

VALUE_DELIVERED::full_featured_standalone_application_file_ingestion_workflows
USE_CASE::ingest_time_metadata_tagging+batch_processing+pre_import_organization

RELATIONSHIP_BETWEEN_APPROACHES::complementary_workflows::[
  Electron_App[ACTIVE]::pre_import_file_organization+batch_ingestion+standalone_metadata_tagging,
  UXP_Panel[EXPLORED]::post_import_in_editing_metadata_enhancement+editor_centric_workflow
]

DECISION_STATUS::[
  Electron_app_development_continues_primary_production_path,
  UXP_panel_remains_strategic_option_future_evaluation,
  both_approaches_distinct_value_propositions_different_workflow_stages
]

REFERENCES::[
  UXP_Panel_Exploration::.coord/docs/000-DOC-CRITICAL-DISCOVERY-PP-METADATA-BEHAVIOR.md,
  UXP_Panel_Architecture::.coord/docs/004-DOC-UXP-PANEL-ARCHITECTURE.md,
  Strategic_Analysis_Session::2025-11-06[Holistic_Orchestrator_review]
]

---

DOCUMENT_VERSION::1.2.0
LAST_UPDATED::2025-11-11
AUTHOR::Holistic_Orchestrator[Claude_Code]
STATUS::living_document→Electron_app_active_production_path+architectural_options_documented_strategic_planning
