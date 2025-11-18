---
name: workspace-setup
description: B1_02 phase workspace setup protocol including npm outdated, npm audit, TypeScript version validation, quality gates enforcement. Ensures dependencies current, security patches applied, and workspace ready for implementation.
allowed-tools: Read, Bash, Write
---

# Workspace Setup Skill

## Purpose

Provides B1_02 workspace-architect phase checklist for quality gate infrastructure setup BEFORE any implementation code. Enforces zero-tolerance quality policy from project start.

## When to Use This Skill

Auto-activates when:
- B1_02 workspace setup phase
- npm outdated, npm audit commands
- TypeScript version validation
- Quality gates setup (lint, typecheck, test)
- Workspace health validation

---

## ⚠️ CRITICAL: B1 QUALITY GATE CHECKLIST - MANDATORY BEFORE ANY CODE ⚠️

### THIS CHECKLIST IS NON-NEGOTIABLE - NO IMPLEMENTATION WITHOUT INFRASTRUCTURE

**ENFORCEMENT**: workspace-architect MUST complete this checklist before ANY src/ files created
**VERIFICATION**: `npm run lint && npm run typecheck && npm run test` MUST pass
**HOOK**: `.claude/hooks/enforce-workspace-setup.sh` blocks violations
**POLICY**: `/Volumes/HestAI/docs/standards/106-SYSTEM-CODE-QUALITY-ENFORCEMENT-GATES.md`

---

## 📋 REQUIRED FILES CHECKLIST (BEFORE ANY src/ CODE)

✅ **package.json** - With ALL dev dependencies and scripts (lint, typecheck, test, build)
✅ **tsconfig.json** - With `"strict": true` and proper TypeScript configuration
✅ **.eslintrc.cjs** - TypeScript parser configured and WORKING
✅ **.prettierrc** - Code formatting rules defined
✅ **vitest.config.ts** or **jest.config.js** - Test framework configured with coverage
✅ **.github/workflows/ci.yml** - ALL quality gates (lint, typecheck, test) configured
✅ **.gitignore** - Properly configured (node_modules, dist, .env, coverage)
✅ **.env.example** - Required environment variables documented

---

## 🔍 MANDATORY VERIFICATION BEFORE PROCEEDING

```bash
# THIS MUST PASS BEFORE WRITING ANY IMPLEMENTATION:
npm run lint && npm run typecheck && npm run test
```

**IF THIS FAILS**: STOP. Fix infrastructure FIRST. No exceptions.

---

## 📊 EVIDENCE REQUIREMENTS FOR B1 COMPLETION

1. **Terminal output or screenshot**: `npm run lint` ✅ passing
2. **Terminal output or screenshot**: `npm run typecheck` ✅ passing
3. **Terminal output or screenshot**: `npm run test` ✅ passing
4. **Link or screenshot**: GitHub CI green checkmark ✅

**NO PHASE TRANSITION WITHOUT EVIDENCE** - "It should work" is not acceptable.

---

## 🔄 THE CLEAN SLATE PROTOCOL

### When Technical Debt Exceeds Threshold

**TRIGGERS**:
- More than 100 lint/type errors discovered late
- Quality gates weren't actually running
- Fundamental architecture issues

**PROTOCOL**:
1. STOP immediately - assess situation
2. Calculate: `if (rebuild_time < 2 * fix_time) → REBUILD`
3. With LLM velocity, clean rebuild often faster than fixing debt
4. Document lessons learned in `/Volumes/HestAI/reports/retrospectives/`

---

## Execution Sequence

### Step 1: Create Directory Structure
```bash
mkdir -p /Volumes/HestAI-Projects/{project-name}
cd /Volumes/HestAI-Projects/{project-name}
mkdir sessions coordination dev staging production
```

### Step 2: Session Migration (if graduating from D0)
```bash
# Only if D0 graduation exists
if [ -f "/Volumes/HestAI-Projects/0-ideation/{TOPIC_NAME}/manifest.json" ]; then
  GRADUATION_STATUS=$(jq -r '.exploration_framework.graduation_readiness' \
    /Volumes/HestAI-Projects/0-ideation/{TOPIC_NAME}/manifest.json)
  if [ "$GRADUATION_STATUS" = "approved" ]; then
    cp -r /Volumes/HestAI-Projects/0-ideation/{TOPIC_NAME} ./sessions/
  fi
fi
```

### Step 3: Coordination Repository Setup
```bash
cd coordination
git init
mkdir -p workflow-docs phase-reports planning-docs

# Create mandatory documents: PROJECT-CONTEXT.md, CHARTER.md, ASSIGNMENTS.md
git add .
git commit -m "feat: initialize coordination repository"
```

### Step 4: Dev Repository Setup
```bash
cd ../dev
git init

# Create .gitignore
# Create directories: src tests docs reports
# Create basic README.md

git add .
git commit -m "feat: initialize dev repository"
```

### Step 5: Create Deployment Repositories
```bash
cd ..
git clone dev staging
git clone dev production
```

### Step 6: Symlink Coordination Context
```bash
cd dev
ln -s ../coordination .coord
git add .coord
git commit -m "feat: add coordination context symlink"
```

---

## Quality Gate Configuration

### package.json Scripts (REQUIRED)
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "build": "tsc"
  }
}
```

### tsconfig.json (REQUIRED)
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### .eslintrc.cjs (REQUIRED)
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'error'
  }
};
```

### vitest.config.ts (REQUIRED)
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    }
  }
});
```

### .github/workflows/ci.yml (REQUIRED)
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Test
        run: npm run test

      - name: Build
        run: npm run build
```

---

## Dependency Validation Commands

### npm outdated
```bash
# Check for outdated dependencies
npm outdated

# Update within semver range
npm update

# Update to latest (major versions)
npm install <package>@latest
```

### npm audit
```bash
# Check for security vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

### TypeScript Version Validation
```bash
# Check TypeScript version
npx tsc --version

# Ensure @typescript-eslint versions match
npm ls @typescript-eslint/parser
npm ls @typescript-eslint/eslint-plugin

# Version must match: both should be same major version
```

---

## Quality Gate Verification Protocol

### Step-by-Step Verification
```bash
# 1. Install dependencies
npm install

# 2. Verify lint passes
npm run lint
# Expected: ✓ No errors

# 3. Verify typecheck passes
npm run typecheck
# Expected: ✓ No errors

# 4. Verify tests pass
npm run test
# Expected: ✓ All tests passing

# 5. Verify build passes
npm run build
# Expected: ✓ Build successful

# 6. Verify CI configured
git push origin feature-branch
# Check: GitHub Actions show green checkmark
```

### Failure Response Protocol
```bash
# IF ANY STEP FAILS:
# 1. Do NOT proceed with implementation
# 2. Fix infrastructure issue
# 3. Re-run verification
# 4. Document fix in phase-reports/

# NEVER write src/ code with failing quality gates
```

---

## Common Patterns

### Pattern 1: New Project Setup
```bash
# Complete B1_02 workspace setup
cd /Volumes/HestAI-Projects/my-project/dev

# Install dependencies
npm init -y
npm install --save-dev typescript @types/node
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev vitest @vitest/coverage-v8
npm install --save-dev prettier

# Create configuration files
# (tsconfig.json, .eslintrc.cjs, vitest.config.ts, .prettierrc)

# Verify quality gates
npm run lint && npm run typecheck && npm run test

# Evidence gathered → Phase transition approved
```

### Pattern 2: Dependency Audit Workflow
```bash
# Monthly dependency maintenance
npm outdated
npm audit

# Update dependencies
npm update
npm audit fix

# Re-verify quality gates
npm run lint && npm run typecheck && npm run test

# Commit updates
git add package.json package-lock.json
git commit -m "chore: update dependencies and fix audit issues"
```

### Pattern 3: TypeScript Version Sync
```bash
# Check version mismatch
npm ls typescript
npm ls @typescript-eslint/parser

# Fix mismatch
npm install --save-dev @typescript-eslint/parser@latest @typescript-eslint/eslint-plugin@latest

# Verify compatibility
npm run lint && npm run typecheck
```

---

## Anti-Patterns to Avoid

❌ **Creating src/ files before quality gates pass**
✅ Setup infrastructure FIRST, then implement

❌ **"We'll add tests later"**
✅ Test framework configured and working BEFORE implementation

❌ **Skipping npm audit because "it's just warnings"**
✅ Zero security vulnerabilities tolerated

❌ **Different lint/typecheck commands between local and CI**
✅ Exact same commands in package.json and .github/workflows/ci.yml

❌ **Suppressions without inline justification**
✅ Every @ts-ignore or eslint-disable must have comment explaining why

---

## Key Takeaways

1. **Quality gates before code**: ALL infrastructure setup BEFORE src/ files
2. **Zero-tolerance policy**: No warnings, no errors, no exceptions
3. **Evidence required**: Terminal output showing green checkmarks
4. **Clean slate option**: Rebuild if technical debt exceeds threshold
5. **Dependency discipline**: npm outdated + npm audit monthly
6. **TypeScript version sync**: Parser and plugin versions must match
7. **CI mirrors local**: Same commands in workflows and package.json
8. **Phase gate enforcement**: No B1→B2 transition without evidence
