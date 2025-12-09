---
name: vercel-preview
description: Vercel preview deployment access patterns including automation bypass, protected preview authentication, CI integration, and Playwright/Chrome DevTools configuration. Use when accessing protected Vercel previews, configuring CI for preview testing, or setting up UI validation agents. Triggers on vercel preview, preview deployment, automation bypass, protected preview, preview authentication, UI validation CI.
allowed-tools: [Read, Bash, WebFetch]
---

# Vercel Preview Access Skill

VERCEL_PREVIEW_MASTERY::[AUTOMATION_BYPASS+CI_INTEGRATION+UI_VALIDATION+PROTECTED_ACCESS]→SEAMLESS_PREVIEW_TESTING

## PURPOSE

Enable automated access to Vercel protected preview deployments for:
- CI/CD integration tests
- UI validation agents (ui-validator, playwright scripts)
- Chrome DevTools MCP automation
- E2E testing workflows

## PROTECTION_BYPASS_PATTERN

```octave
METHOD::Protection_Bypass_for_Automation

SECRET_NAME::VERCEL_AUTOMATION_BYPASS_SECRET

SECRET_LOCATIONS::[
  vercel_dashboard::"Project Settings → Deployment Protection → Auto-injected",
  github_secrets::"Repository Settings → Secrets → Actions",
  local_dev::".env.local[GITIGNORED]"
]

ACCESS_METHODS::[
  HTTP_HEADER::"x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}",
  QUERY_PARAM::"?x-vercel-protection-bypass=${VERCEL_AUTOMATION_BYPASS_SECRET}"
]
```

## CI_WORKFLOW_INTEGRATION

### GitHub Actions Pattern

```yaml
# .github/workflows/ci.yml
jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for Vercel Preview
        uses: patrickedqvist/wait-for-vercel-preview@v1.3.1
        id: vercel
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          max_timeout: 300

      - name: Run E2E Tests
        env:
          VERCEL_PREVIEW_URL: ${{ steps.vercel.outputs.url }}
          VERCEL_AUTOMATION_BYPASS_SECRET: ${{ secrets.VERCEL_AUTOMATION_BYPASS_SECRET }}
        run: npm run test:e2e
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.VERCEL_PREVIEW_URL,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '',
    },
  },
});
```

### Chrome DevTools MCP Access

```octave
CHROME_DEVTOOLS_PATTERN::[
  // Navigate with bypass query param
  mcp__chrome-devtools__navigate_page(
    url: "${VERCEL_PREVIEW_URL}?x-vercel-protection-bypass=${SECRET}"
  ),

  // OR set header via evaluate_script before navigation
  mcp__chrome-devtools__evaluate_script(
    function: "() => { /* custom fetch with header */ }"
  )
]
```

## SETUP_CHECKLIST

```octave
PREREQUISITES::[
  1::vercel_pro_plan_or_higher[automation_bypass_is_paid_feature],
  2::deployment_protection_enabled[Project_Settings→Deployment_Protection],
  3::automation_bypass_generated[generates_VERCEL_AUTOMATION_BYPASS_SECRET]
]

CONFIGURATION::[
  1::add_to_github_secrets[repository_settings→secrets→actions],
  2::add_to_local_env[.env.local_for_local_testing],
  3::update_ci_workflow[pass_secret_to_test_steps],
  4::configure_playwright[extraHTTPHeaders_or_query_param],
  5::verify_access[curl_with_header_returns_200]
]

VERIFICATION_COMMAND::
  curl -I -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" \
    https://your-preview-url.vercel.app
  # Should return 200, not 401/403
```

## SECURITY_CONSIDERATIONS

```octave
NEVER::[
  commit_secret_to_git,
  log_secret_in_CI_output,
  share_secret_in_documentation,
  use_secret_in_client_side_code
]

ALWAYS::[
  use_github_secrets_for_CI,
  use_gitignored_.env.local_for_local,
  rotate_if_exposed,
  limit_to_preview_deployments[not_production]
]

ROTATION::[
  location::"Vercel Dashboard → Project → Settings → Deployment Protection",
  action::"Regenerate secret",
  update::"GitHub Secrets + local .env.local"
]
```

## TROUBLESHOOTING

```octave
ISSUE::401_Unauthorized_despite_bypass[
  CHECK::[
    secret_correct_and_not_stale,
    header_name_exact["x-vercel-protection-bypass"],
    secret_passed_to_env_in_CI,
    not_trying_production_URL[bypass_for_previews_only]
  ]
]

ISSUE::Preview_not_found[
  CHECK::[
    PR_created_and_pushed,
    vercel_integration_enabled,
    wait_for_deployment_complete[use_wait-for-vercel-preview_action]
  ]
]

ISSUE::Bypass_not_available[
  CHECK::[
    vercel_plan[Pro_or_higher_required],
    deployment_protection_enabled_first,
    feature_may_require_team_admin
  ]
]
```

## AGENT_INTEGRATION

```octave
UI_VALIDATOR_USAGE::[
  RECEIVES::[preview_url, acceptance_criteria],
  ACCESSES::preview_via_bypass_header,
  VALIDATES::visual+functional_requirements,
  RETURNS::PASS/FAIL+evidence
]

CI_PIPELINE_USAGE::[
  TIER_1::quality_gates[no_preview_needed],
  TIER_2::preview_integration[uses_bypass_for_E2E],
  PATTERN::wait_for_preview→export_url→run_tests_with_bypass
]
```

## RELATED_SKILLS

CONSULT::[
  test-ci-pipeline::"CI workflow configuration patterns",
  test-infrastructure::"Playwright/Vitest setup",
  supabase-test-harness::"When preview connects to Supabase"
]

## REFERENCES

DOCUMENTATION::[
  "https://vercel.com/docs/deployment-protection",
  "https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection",
  "https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions"
]
