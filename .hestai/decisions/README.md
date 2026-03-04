# .hestai/decisions — Meta-Governance Only

Per HestAI visibility-rules v1.7, this directory is reserved for **meta-governance artifacts only**.

## What belongs here

- Constitutional amendments
- System-level governance decisions that change how the `.hestai/` structure itself operates
- Formal ratifications of debate outcomes that alter project governance

## What does NOT belong here

| Artifact Type | Correct Location |
|---------------|-----------------|
| D2 design docs, D3 blueprints | `.hestai/rules/specs/` |
| B1 build plans, phase plans | `.hestai/rules/specs/` |
| B0–B3 gate evidence, test results | `.hestai/state/reports/` (gitignored) |
| Architecture Decision Records (ADRs) | `docs/adr/adr-NNNN-kebab-case.md` |
| Developer guides and documentation | `docs/` |

## History

- **v1.6**: This directory held phase design decisions and empirical findings
- **v1.7**: Scope narrowed to meta-governance only; phase artifacts migrated to
  `.hestai/rules/specs/` and `.hestai/state/reports/`
