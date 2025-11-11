# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records documenting significant architectural decisions made in the Ingest Assistant project.

## Purpose
- Document architectural decisions with context and rationale
- Capture alternatives considered and trade-offs
- Provide historical record of why decisions were made
- Enable knowledge transfer and onboarding

## ADR Format
Each ADR follows this structure:
- **Status:** PROPOSED | ACCEPTED | SUPERSEDED | DEPRECATED
- **Date:** Decision date
- **Authors/Deciders:** Decision makers
- **Tags:** Categorization
- **Context:** Problem statement and background
- **Decision:** What was decided
- **Consequences:** Positive and negative outcomes
- **Alternatives Considered:** Other options evaluated

## Current ADRs

### Security & Production Readiness
- `ADR-006-SECURITY-HARDENING-STRATEGY.md` - Security hardening strategy (ACCEPTED)
  - Status: Accepted (2025-11-06)
  - Context: Production security requirements
  - Impact: Critical vulnerabilities mitigation

### Feature Implementation
- `ADR-007-VIDEO-ANALYSIS-WORKFLOW.md` - Video analysis workflow (PROPOSED)
  - Status: Proposed (2025-01-06)
  - Context: Video metadata analysis implementation
  - Impact: Feature architecture

- `ADR-008-RESULT-TYPE-SCHEMA-VERSIONING.md` - Result type schema versioning (PROPOSED)
  - Status: Proposed (2025-11-10)
  - Context: Type-safe IPC communication and versioning
  - Impact: Type safety, IPC, Phase 0 prerequisites

## Naming Convention
- `ADR-{NUMBER}-{TITLE}.md`
- Example: `ADR-006-SECURITY-HARDENING-STRATEGY.md`
- ADR numbers are sequential and permanent (gaps may exist from deprecated ADRs)

## Reading Order
1. Start with `ADR-006-SECURITY-HARDENING-STRATEGY.md` for production readiness context
2. Review `ADR-008-RESULT-TYPE-SCHEMA-VERSIONING.md` for current type system architecture
3. Check `ADR-007-VIDEO-ANALYSIS-WORKFLOW.md` for video feature design

## Creating New ADRs
1. Use next available ADR number
2. Follow the standard format structure
3. Get review from critical-engineer and relevant stakeholders
4. Update this README when ADR is accepted
