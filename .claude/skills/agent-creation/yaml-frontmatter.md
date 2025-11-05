# YAML Frontmatter Requirements

## MANDATORY Structure
Every agent MUST include YAML frontmatter at the top of the file:

```yaml
---
name: agent-name
description: Single-line description with keywords for discovery
---
```

## Required Fields
- **name**: lowercase-with-hyphens, max 64 chars
- **description**: max 1024 chars, must include trigger patterns and key capabilities

## Discovery Optimization
Description should include:
- What the agent does (capabilities)
- When to use it (triggers)
- Key domain keywords
- Common invocation patterns

## Syntax Requirements
- MUST use triple-dash delimiters (`---`) on separate lines
- MUST appear at very top of file (line 1)
- MUST use proper YAML syntax (key: value)
- MUST be followed by blank line before agent content

## Character Limits
- **name**: Maximum 64 characters
- **description**: Maximum 1024 characters
- Both fields are REQUIRED (no defaults)

## Example
```yaml
---
name: code-review-specialist
description: Code quality enforcer responsible for CODE_REVIEW_STANDARDS domain. Expert assessment of security, architecture, performance with immediate TTL for review integrity. Prevents validation theater through evidence-based review.
---
```

## Common Mistakes
- ❌ Missing frontmatter entirely (like skills-expert)
- ❌ Wrong delimiters (must be `---` on separate lines, not `===`)
- ❌ Generic descriptions without triggers
- ❌ Exceeding character limits
- ❌ Placing frontmatter after content starts
- ❌ Using wrong syntax (e.g., `name::value` instead of `name: value`)

## Why This Matters
YAML frontmatter enables:
- **Discovery**: Claude Code can find agents by name/description
- **Invocation**: Agents can be activated via `/role agent-name`
- **Documentation**: Capability lookup tools parse frontmatter
- **Validation**: Automated tools verify agent structure

## Validation Checklist
- [ ] YAML frontmatter present at line 1
- [ ] Triple-dash delimiters on separate lines
- [ ] `name` field present with lowercase-with-hyphens format
- [ ] `description` field present with trigger keywords
- [ ] Character limits not exceeded
- [ ] Blank line after closing `---`
- [ ] Agent content starts with `===AGENT_NAME===`

## Bug Prevention
The skills-expert agent was created WITHOUT this frontmatter, breaking discovery. This skill exists to prevent that pattern from recurring.

**ALWAYS validate frontmatter before deploying any agent.**
