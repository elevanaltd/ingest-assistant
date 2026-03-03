# .hestai — Project Governance

Three-tier HestAI architecture. Matches HestAI-MCP PR #264.

## Architecture

```
.hestai-sys/          # Tier 1: System governance (MCP-injected, gitignored)
.hestai/              # Tier 2: Project governance (committed, PR-controlled)
.hestai/state → symlink → .hestai-state/   # Tier 3: Working state (gitignored)
docs/                 # Developer documentation (committed, permanent)
```

## Tier 2 — Project Governance (this directory)

| Directory | Purpose |
|-----------|---------|
| `north-star/` | North Star documents — immutable requirements, decision gates |
| `decisions/` | Design decisions, CFEx phases, empirical findings |
| `rules/` | Project standards — ecosystem position, methodology |

**Rule:** Changes here require a PR. These are binding governance artifacts.

## Tier 3 — Working State (`.hestai/state/` → `.hestai-state/`)

Shared across all worktrees via symlink. Never committed.

| Directory | Purpose |
|-----------|---------|
| `context/` | PROJECT-CONTEXT, PROJECT-CHECKLIST, PROJECT-ROADMAP (living docs) |
| `sessions/` | Session handoffs, active work, logs |
| `reports/` | Audit reports, analysis, evidence |
| `research/` | Investigation notes |
| `audit/` | Anchor audit records |

## Developer Documentation (`docs/`)

See `docs/` at the repo root for:
- `docs/adr/` — Architecture Decision Records
- `docs/architecture/` — System design documents
- `docs/guides/` — Setup, implementation, testing guides

## System Governance (`.hestai-sys/`)

Injected by HestAI-MCP server at session start. Read-only. Contains:
- `constitution.md` — Immutable system laws
- `governance/rules/` — Naming, visibility, test standards
- `library/` — Agents, skills, patterns

**Migration note:** Replaces `.coord/` as of 2026-03-03.
