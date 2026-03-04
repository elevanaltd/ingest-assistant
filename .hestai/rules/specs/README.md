# .hestai/rules/specs — Phase Specifications

Per HestAI visibility-rules v1.7, this directory holds **active, mutable phase specs**.

## What belongs here

| Phase | Artifact |
|-------|----------|
| D2 | Ideas, constraints, design documents |
| D3 | Blueprints, mockups → migrates to `docs/` at B1 gate |
| B0 | Empirical testing protocols |
| B1 | Build plans, task breakdowns |
| B2 | UI designs, implementation specs |

## Lifecycle: Spec → Report → Doc

Specs here are the **plan**. Once executed:
- Evidence/outcomes → `.hestai/state/reports/` (gitignored working state)
- Permanent graduated artifacts → `docs/` (committed, developer-facing)
