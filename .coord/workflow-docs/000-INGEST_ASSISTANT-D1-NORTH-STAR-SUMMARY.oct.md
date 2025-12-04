# Ingest Assistant - North Star Summary

**AUTHORITY:** D1 Phase Deliverable | Project-Level Immutables
**CREATED:** 2025-11-18 | **APPROVAL:** ✅ Approved (2025-12-02)
**GOVERNANCE:** All features (Core IA v2.2.0, CFEx Integration, Reference Catalog #63)
**FULL_DOCUMENT:** 000-INGEST_ASSISTANT-D1-NORTH-STAR.md
**POSITION:** Step 6 of 10 in EAV production pipeline (field capture → post-production gateway)

---

## MISSION

Transform raw media files into cataloged assets through AI-augmented metadata creation, maintaining temporal integrity + human oversight while feeding structured metadata to downstream production tools.

---

## IMMUTABLES (7 Total)

```octave
I1::CHRONOLOGICAL_TEMPORAL_ORDERING::[
  PRINCIPLE::media_assets_ordered_by_capture_timestamp→immutable_temporal_sequence,
  WHY_IMMUTABLE::shot_numbers_derive_meaning_from_chronology[if_sequence_changes→downstream_breaks→project_restarts],
  VALIDATION::files_sortable_by_capture_timestamp+warn_if_missing+fallback_mechanism[EXIF→filesystem→manual],
  STATUS::🟢_PROVEN[EXIF_DateTimeOriginal_validation_operational]
]

I2::HUMAN_OVERSIGHT_AUTHORITY::[
  PRINCIPLE::human_judgment_final_authority→AI_augmentation_tools≠autonomous_decision_makers,
  WHY_IMMUTABLE::production_media_has_legal_contractual_implications[AI_errors_propagating_creates_liability],
  VALIDATION::AI_suggestions_provisional_until_human_approval+humans_edit_any_field+audit_trail_captures_corrections,
  STATUS::🟢_PROVEN[manual_edit_always_available+AI_suggestions_never_locked]
]

I3::SINGLE_SOURCE_OF_TRUTH::[
  PRINCIPLE::each_metadata_attribute_has_exactly_one_authoritative_source,
  WHY_IMMUTABLE::metadata_duplication[file_XMP+JSON+database]→conflicts_inevitable→downstream_workflows_break,
  CURRENT::.ingest-metadata.json[single_source_all_cataloging_metadata],
  LOCATION::JSON_co-located_with_analyzed_files[videos→proxy_folder|photos→image_folder],
  FILE_METADATA::TapeName_written_ONLY_when_file_modification_enabled[metadata_write_toggle_OR_filename_rename_toggle],
  CEP_CONTRACT::reads_JSON_from_proxy_folder[videos]_or_image_folder[photos]+uses_filename_as_immutable_reference,
  STATUS::🟢_PROVEN[JSON_Schema_v2.0_established_as_source_of_truth]
]

I4::ZERO_DATA_LOSS_GUARANTEE::[
  PRINCIPLE::no_media_file_content_or_metadata_lost_corrupted_degraded_during_any_system_operation,
  WHY_IMMUTABLE::media_files_represent_field_capture_investment[crew_time+location_access+talent_cost]→losing_files_renders_project_incomplete,
  VALIDATION::integrity_checks_before_transfer_complete[file_count+sizes+checksums]+atomic_metadata_updates+error_reporting_halts_workflow,
  STATUS::🟡_PARTIAL[lacks_comprehensive_integrity_validation_for_CFex_workflow]
]

I5::ECOSYSTEM_CONTRACT_COHERENCE::[
  PRINCIPLE::metadata_format_content_contracts_with_downstream_systems_remain_stable_backwards-compatible,
  WHY_IMMUTABLE::IA_is_Step_6_of_10→CEP_Panel[Step_7]_expects_specific_JSON_schema→breaking_contract_halts_entire_production_workflow,
  VALIDATION::document_contract_specifications[JSON_Schema_v2.0]+JSON_location_contract[proxy_folder_videos+image_folder_photos]+filename_immutability[camera_ID_unique_ref_preserved]+version_changes_with_migration_paths+integration_tests,
  STATUS::🟢_PROVEN[Schema_v2.0_established+CEP_Panel_compatibility_tested]
]

I6::COMMITTED_IDENTIFIER_IMMUTABILITY::[
  PRINCIPLE::once_identifiers_externally_referenced[committed_state]→never_change→preserves_referential_integrity,
  WHY_IMMUTABLE::shot_#25_referenced_in[CEP_Panel+Premiere_Pro_timeline+EAV_production_tracking]→if_IA_renumbers_after_commitment→all_downstream_references_break,
  VALIDATION::define_commitment_boundary[COMPLETE_folder_state]+prevent_identifier_mutation_after_commitment[UI_disabled+API_rejects]+warn_before_commitment,
  STATUS::🟢_PROVEN[COMPLETE_folder_locking_prevents_re-sorting]
]

I7::HUMAN_PRIMACY_OVER_AUTOMATION::[
  PRINCIPLE::automation_optimizes_human_workflows≠replaces_human_judgment→preserves_user_agency,
  WHY_IMMUTABLE::Ingest_Assistant_name_reflects_philosophy[AI_assists_humans≠replaces]→removing_human_agency_creates_black_box_error_propagation,
  VALIDATION::all_automation_provides_manual_override+users_can_disable_automation_without_breaking_workflow+automated_decisions_visible_reviewable,
  STATUS::🟢_PROVEN[manual_workflow_fully_supported+AI_optional]
]
```

---

## CONSTRAINED VARIABLES

```octave
METADATA_STORAGE_FORMAT::[
  IMMUTABLE::single_source_of_truth[I3]+downstream_contract_coherence[I5],
  FLEXIBLE::JSON→Protocol_Buffers|database_records|embedded_metadata,
  NEGOTIABLE::field_names|nesting_structure|serialization_format
]

AI_PROVIDER_INTEGRATION::[
  IMMUTABLE::human_oversight_authority[I2]+human_primacy[I7],
  FLEXIBLE::multi-provider[OpenRouter+Anthropic+OpenAI]|confidence_thresholds|sequential_vs_parallel,
  NEGOTIABLE::specific_models[Claude+GPT+Gemini]|prompt_engineering|frame_sampling
]

CHRONOLOGICAL_ORDERING_MECHANISM::[
  IMMUTABLE::temporal_ordering_principle[I1]+committed_identifier_immutability[I6],
  FLEXIBLE::EXIF_DateTimeOriginal→filesystem_timestamps→manual_timestamps|fallback_hierarchy|timezone_handling,
  NEGOTIABLE::timestamp_format_parsing|missing_timestamp_UX|manual_override_mechanisms
]

PLATFORM_SUPPORT::[
  IMMUTABLE::zero_data_loss[I4]_cross-platform|ecosystem_contracts[I5]_platform-independent,
  FLEXIBLE::macOS+Ubuntu[current]|Windows+Linux_variants[future]|platform-specific_optimizations,
  NEGOTIABLE::hardware_acceleration|filesystem_conventions|UI_framework_choices
]

TRANSFER_INTEGRITY_VALIDATION::[
  IMMUTABLE::zero_data_loss_guarantee[I4],
  FLEXIBLE::checksum_algorithms[MD5+SHA256+xxHash]|validation_depth|error_recovery_strategies,
  NEGOTIABLE::progress_reporting_UX|retry_logic|background_vs_foreground_validation
]

FILE_METADATA_WRITING_STRATEGY::[
  IMMUTABLE::single_source_of_truth[I3]→JSON_always_authoritative,
  FLEXIBLE::optional_file_metadata_writing[toggles:write_metadata_ON/OFF+rename_file_ON/OFF],
  NEGOTIABLE::which_fields_to_write|TapeName_inclusion_logic|XMP_tag_selection,
  RULE::TapeName_written_when_file_modification_enabled[metadata_write_toggle_OR_filename_rename_toggle],
  DEFAULT::JSON-only_workflow[no_file_modification+TapeName_not_written]
]

PROXY_GENERATION_STRATEGY::[
  IMMUTABLE::proxies_preserve_DateTimeOriginal_for_chronological_ordering[I1]|proxies_analyzable_by_AI[visual_quality_sufficient],
  FLEXIBLE::2560×1440_ProRes_Proxy[recommended_sweet_spot]|1080p_ProRes_Proxy[smaller_files]|4K_ProRes_Proxy[maximum_quality],
  NEGOTIABLE::resolution[2K_vs_1080p_vs_4K]|codec[ProRes_Proxy_vs_H.264]|storage_location[LucidLink_vs_Ubuntu],
  VALIDATED::2560×1440_ProRes_Proxy_achieves[10-bit_4:2:2_color+low_CPU_decode+~6_MB/sec+timeline_performance_smooth_M-series_Macs],
  MANDATORY::post-transcode_EXIF_copy[exiftool_-overwrite_original_"-QuickTime:DateTimeOriginal=$ORIG_DATE"_proxy.MOV]
]
```

---

## CRITICAL ASSUMPTIONS (Must Validate)

```octave
A1✅::EXIF_TIMESTAMPS_RELIABLE[85%_confidence]→RESOLVED[production_validated]
A2✅::CEP_PANEL_CONTRACT_STABILITY[90%_confidence]→RESOLVED[integration_tests+contract_spec_docs]
A3⚠️::AI_PRE_ANALYSIS_ACCURACY_SUFFICIENT[70%_confidence]→VALIDATE[pilot_testing_5+_shoots+measure_correction_time_vs_manual]_BEFORE_B2
A4⚠️::PARALLEL_IO_AI_SAVES_TIME[75%_confidence]→VALIDATE[benchmark_sequential_vs_parallel+monitor_file_integrity]_DURING_B1
A5⚠️::REFERENCE_CATALOG_IMPROVES_ACCURACY[60%_confidence]→VALIDATE[A/B_testing_zero-shot_vs_reference-augmented]_BEFORE_B0_Reference_Catalog
A6⚠️::CROSS_SCHEMA_FK_INTEGRITY_MAINTAINABLE[80%_confidence]→VALIDATE[contract_specs_EAV_CONTRACT_v1+compatibility_test_suite]_BEFORE_B0_Reference_Catalog
A7⚠️::WARM_AI_MODEL_REUSE_VIABLE[70%_confidence]→VALIDATE[API_response_time_testing_cold_vs_warm]_DURING_B1
A8✅::PROXY_GENERATION_EXIF_PRESERVATION[100%_confidence]→VALIDATED[empirically_tested_9_proxy_variants+2560×1440_ProRes_Proxy_optimal]
```

---

## SCOPE BOUNDARIES

```octave
WHAT_THIS_APP_IS::[
  IDENTITY::AI-Augmented_Cataloging_Tool[humans_drive+AI_suggests]+Production_Pipeline_Gateway[Step_6_of_10:field_capture→post-production]+Temporal_Integrity_Guardian[chronological_ordering_camera→downstream]+Cross-Platform_Media_Assistant[macOS_editors+Ubuntu_video_servers]
]

FUNCTIONAL_SCOPE::[
  media_file_transfer[CFEx_cards→raw_storage+proxy_generation],
  proxy_generation[2560×1440_ProRes_Proxy+DateTimeOriginal_preservation],
  AI_metadata_generation[multi-provider:location+subject+action+shotType],
  sequential_shot_numbering[chronological_assignment+immutability_after_COMPLETE],
  metadata_storage[.ingest-metadata.json_single_source→CEP_Panel+located_in_proxy_folder],
  human_QC_workflow[review+correct+approve_AI_suggestions_before_commitment],
  ecosystem_integration[coordinated_contracts:CEP_Panel_downstream+EAV_authoritative]
]

FEATURE_INVENTORY::[
  1✅::Core_IA[v2.2.0_baseline]→manual_AI_metadata+COMPLETE_workflow+JSON_Schema_v2.0,
  2🚧::CFEx_Integration[Microphases_immediate]→Phase_1a[Transfer+Integrity_2_weeks]+Phase_1b[Proxy_Generation_2_weeks]+Phase_1c[Power_Features_2-3_weeks],
  3📋::Reference_Catalog[Issue_#63_deferred_3-6_months]→vector_search_learning_from_EAV-corrected_metadata
]

WHAT_THIS_APP_IS_NOT::[
  ❌::video_editor[playback_preview_only≠editing_trimming_effects],
  ❌::DAM_system[cataloging_feeds_production_pipeline≠long-term_archival],
  ❌::Premiere_Pro_replacement[integration_via_CEP_Panel≠standalone_NLE],
  ❌::client_deliverable_tool[production_workflow≠client-facing],
  ❌::batch_rename_utility[metadata_in_JSON≠filename-based],
  ❌::cloud_storage_manager[local_network_filesystems_LucidLink+Ubuntu_mounts≠cloud_sync]
]
```

---

## TRIGGER PATTERNS (Load Full North Star When...)

```octave
LOAD_FULL_NORTH_STAR_IF::[
  IMMUTABLE_CONFLICT::"violates I1|I2|I3|I4|I5|I6|I7",
  CONTRACT_CHANGE::JSON_schema_evolution_requested+CEP_Panel_integration_revision,
  ASSUMPTION_VALIDATION::A1-A8_evidence_review+validation_plan_implementation,
  INTEGRATION_DESIGN::CEP_Panel_contract_definition+proxy_generation_strategy,
  DECISION_GATE::D1_04_validation_gate+B0_critical_engineer_reality_check,
  ARCHITECTURE_QUESTION::metadata_storage_format+AI_provider_selection+chronological_ordering_mechanism,
  FEATURE_PLANNING::CFEx_Phase_1a_1b_1c_design+Reference_Catalog_Issue_#63_architecture
]

AGENT_ESCALATION::[
  requirements-steward::North_Star_violation_detected+immutable_change_requested+D1_04_completeness_check,
  critical-engineer::B0_validation+production_codebase_reality_check+assumption_validation_oversight,
  implementation-lead::CFEx_microphase_planning+assumption_validation_execution[A3+A4+A7],
  principal-engineer::Reference_Catalog_A/B_testing_design[A5]+long-term_architecture_strategic_review
]
```

---

## PROTECTION CLAUSE

```octave
MISALIGNMENT_PROTOCOL::[
  IF::agent_detects_work_contradicting_North_Star[D2-B5],
  THEN::[
    1→STOP_current_work_immediately,
    2→CITE_specific_North_Star_requirement_violated[I1-I7],
    3→ESCALATE_to_requirements-steward_for_resolution
  ]
]

RESOLUTION_OPTIONS::[
  CONFORM[typical]::modify_work_to_align_with_North_Star,
  AMEND[rare]::user_formally_amends_North_Star_via_requirements-steward[requires_re-approval],
  ABANDON[blocked]::incompatible_path_abandoned+alternative_approach_required
]

AUTHORITY_CHAIN::[
  North_Star[this_document] > Feature_designs[D2/D3] > Implementation_code[B0-B5],
  Immutables_override_all_downstream_decisions,
  Changes_to_immutables_require_re-execution_of_approval_process
]

ESCALATION_FORMAT::"NORTH_STAR_VIOLATION: Current work [description] violates [I#] because [evidence] → requirements-steward"
```

---

**APPROVAL:** ✅ Approved (2025-12-02 by user confirmation)
**POST_APPROVAL_STATUS:** North Star gains binding authority | Requirements Steward validates completeness at D1_04 gate | Critical Engineer validates against production codebase reality | CFEx Phase 1 design (D2) inherits these immutables | Reference Catalog design (D2 - deferred) inherits these immutables

**DOCUMENT_VERSION:** 2.0-OCTAVE-SUMMARY (Project-Level Consolidation)
**COMPRESSION:** 380→155 lines (59% reduction, 2.5:1 ratio)
**FIDELITY:** 100% decision logic + 7 immutables + 8 assumptions + validation triggers preserved
**FULL_DETAILS:** See 000-INGEST_ASSISTANT-D1-NORTH-STAR.md (380 lines with detailed justifications, assumption register, scope boundaries, protection clause)
