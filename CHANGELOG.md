# Changelog

All notable changes to the Ingest Assistant project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-02-10

Major release introducing the complete Context Architecture, IPC handler decomposition,
proxy generation pipeline with TapeName preservation, and significant dependency upgrades
including Electron 39, React 19, Vite 7, and Vitest 4.

### Added

**Context Architecture (Issue #102)**
- Implement `AppProviders` component scaffold with `renderWithProviders` test utility
- Add `IngestSettingsContext` for centralized settings state management
- Add `BatchQueueContext` provider for batch operation state
- Add `CfexTransferContext` with tab-safe state management
- Add `FileListContext` with file state and handler management
- Add `MetadataFormContext` for metadata form state
- Migrate `App.tsx`, `BatchOperationsPanel`, `CfexTransferWindow`, and `SettingsModal` to consume context providers
- Integrate `AppProviders` at application root

**IPC Handler Decomposition (Issue #117)**
- Extract file IPC handlers from monolithic `main.ts` to `fileHandlers` module
- Extract AI handlers to dedicated `aiHandlers.ts` module
- Extract batch handlers to `batchHandlers.ts` module
- Extract config handlers to `configHandlers.ts` module
- Extract `RateLimiter` class and timestamp utilities to shared `utils` module

**Proxy Generation Enhancements**
- Add TapeName (XMP-xmpDM) preservation to proxy generation workflow for CEP Panel compatibility
- Wire `proxyPresetId` through the full UI, IPC, Orchestrator, and Generator chain
- Propagate CFEx proxy settings through the complete IPC chain
- Add `faststart` flag to proxy generation for Premiere Pro compatibility
- Implement CFEx transfer cancellation at IPC level with cancel button wiring
- Add `useProxyProgress` hook for centralized proxy progress listening
- Add New Transfer button to CFEx complete and error states

**AI Processing**
- Add AI failure validation gate to prevent silent failures during batch processing
- Remove confidence threshold -- write all AI results to support QC-first workflow
- Reset all counters correctly in `cancelTransfer` and `startTransfer`

**ExifPreserver Reliability**
- Implement concurrency limiting in `ExifPreserver.writeBatch()` to prevent resource exhaustion
- Switch to `Promise.allSettled` to fix fail-fast bug (partial batches no longer lost)
- Preserve per-file `DateTimeOriginal` in batch writes (I1 compliance)

**Security and Audit**
- Redact capability tokens from media server log output
- Add global flag to token redaction covering renderer leak site
- Replace realistic hex tokens in tests with obvious dummy values
- Include `electron/` directory in Vitest coverage reporting

### Changed

**Component Decomposition**
- Decompose `SettingsModal` into individual tab components (Phase 7)
- Decompose `CfexTransferWindow` into focused sub-components (Phase 8a)
- Extract `BatchActionButtons`, `BatchProgressDetails`, and `ProxyProgressCard` from `BatchOperationsPanel`
- Extract `isAIFailure` to shared module for reuse
- Extract `reconcileMetadata` helper from pagination handler
- Centralize proxy progress listener via `useProxyProgress` hook
- Remove stale warning banner about cancel limitations

**Batch Operations**
- Migrate all batch operations to use `BatchQueueContext`
- Allow ampersand character in metadata keywords (safe with `execFile`)

**Proxy Filename Resolution**
- Update `currentFilename` when disk filename differs from stored metadata
- Return updated flag from `reconcileMetadata` to enable persistence

### Fixed

- Resolve React 19 checkbox timing issues in SettingsModal tests
- Add `@types/react-window` stub for TypeScript compatibility
- Use direct `ffprobe` package instead of fragile path string manipulation
- Fix flaky rate limiter token assertion with `toBeCloseTo`
- Add `removeHandler` guards to prevent IPC re-registration crash
- Add missing error sanitization to `lexicon:load` handler
- Resolve code review blocking issues (aiService state management, error sanitization)
- Forward `proxyPresetId` correctly to trigger proxy generation (Issue #112)
- Align SettingsModal test assertions with async context loading
- Prevent stale media from rendering on rapid file navigation
- Re-throw folder lock/unlock errors for proper UI feedback
- Move `AppProviders` to `main.tsx` to fix blocking provider issue
- Update transfer state on `startTransfer` completion
- Show EXIF verification failures in proxy result message
- Use `path` module for cross-platform proxy matching
- Set `percentComplete` to 100 on successful transfer completion
- Add `transferredFiles` tracking to `TransferResult` for proxy generation
- Include index/total in `transcode_progress` events for accurate UI progress
- Preserve file timestamps during CFEx transfer

### Security

- Upgrade React 19.0.0 to 19.2.1 (security patch for CVEs in React DOM)
- Redact capability tokens from all log output (main process and renderer)

### Dependencies

- Upgrade Electron 33 to Electron 39 with electron-builder 26
- Upgrade React 18 to React 19 (19.2.1)
- Upgrade Vite 6 to Vite 7 with Vitest 4
- Upgrade TypeScript tooling and type definitions
- Upgrade Anthropic SDK to v0.71
- Upgrade OpenAI SDK to v6
- Update `ELECTRON_MIN_VERSION` CI check to 39.2.5

---

## [2.3.0] - 2025-11-29

Phase 1b and 1c release introducing the complete CFEx transfer system, proxy generation
pipeline, power features, and R1.1 schema alignment.

### Added

**CFEx Transfer System**
- Implement full CFEx transfer pipeline: source scanning, integrity validation, streaming file transfer
- Add CFEx auto-detection service with async I/O for memory card discovery
- Add CFEx Settings tab with folder creation and browse functionality
- Add destination enable/disable checkboxes with `enabledDestinations` filtering
- Implement error handler with classification and exponential backoff retry strategy
- Integrate integrity validation into the transfer pipeline
- Add CFEx preload bridge with full type definitions
- Add tab navigation and UX improvements to CFEx Transfer UI
- Add 10-second timeout protection to Browse buttons

**Proxy Generation Pipeline**
- Implement `ProxyGenerator` with ffmpeg stderr progress parsing
- Implement `ExifPreserver` 3-phase workflow (read, transcode, verify)
- Implement `ProxyOrchestrator` with fail-log-continue error strategy
- Implement preflight validation and cleanup logic
- Register proxy generation IPC handlers in main process
- Add proxy button in BatchPanel with selection-aware behavior
- Add proxy destination UI and folder path wiring
- Implement configurable proxy format presets with Settings UI dropdown
- Add proxy progress UI in `BatchOperationsPanel` and `CfexTransferWindow`

**Power Features (Phase 1c)**
- Implement `FilenameTemplateParser` with security validation for static text
- Implement `MetadataToggleService` for field-level toggle persistence
- Add CFEx power features toggle UI with persistence
- Integrate AI auto-analyze with CFEx transfer flow
- Add File Ingestion tab in Settings for power feature toggles
- Implement optional field handling in filename template parser
- Implement batch toggle integration for filename rewrite
- Implement file rename safety system with stable file ID lookup via `cameraId`

**UI Improvements**
- Sidebar improvements: select all, checkbox alignment, full-width layout
- Rename batch buttons with AI prefix for clarity
- Add `selectFolder` default path support

**Schema**
- Complete R1.1 schema alignment for metadata format

### Fixed

- Fix R1.1 post-merge regressions (legacy hydration and `lockedFields` handling)
- Reset `filenameRewrite` on app startup (I7 compliance)
- Lift `filenameRewrite` state to `App.tsx` for `BatchOperationsPanel` access
- Nullify metadata store on load failure (defensive hardening)
- Route config load errors to correct Settings tab
- Validate template static text for security vulnerabilities
- Disable Start button during auto-detection to prevent race conditions
- Add path validation for CFEx settings
- Prevent unhandled rejection and preserve EACCES error code
- Fix DST timezone issue in `batchLogCommentReprocess` test
- Eliminate race condition in cache directory registration
- Add error boundary for cache directory registration

### Security

- Run `npm audit fix` for known vulnerabilities

---

## [2.2.0] - 2025-11-18

Production baseline release. AI-powered media file ingestion and metadata assistant with
keyboard shortcuts, virtual scrolling for 1000+ files at 60fps, enhanced security
(spawn-based command execution, Zod validation, capability tokens), and Supabase integration
for the media references schema.

This release established the 7 immutables governing the application architecture and
served as the stable foundation for the CFEx Integration development phase.

---

[3.0.0]: https://github.com/elevanaltd/ingest-assistant/compare/v2.3.0...v3.0.0
[2.3.0]: https://github.com/elevanaltd/ingest-assistant/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/elevanaltd/ingest-assistant/releases/tag/v2.2.0
