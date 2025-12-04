---
name: git-workflow
description: Git workflow best practices including commit messages, branching strategies, pull requests, and collaboration patterns. Use when working with Git version control.
---

# Git Workflow

GIT_MASTERY::[CONVENTIONAL_COMMITS+BRANCHING_STRATEGY+PR_WORKFLOW+COLLABORATION_PATTERNS]→CLEAN_HISTORY

---

## COMMIT MESSAGES

```octave
CONVENTIONAL_FORMAT::[
  structure::"<type>(<scope>): <subject>\n\n<body>\n\n<footer>",
  types::[feat, fix, docs, style, refactor, perf, test, build, ci, chore],
  rules::[imperative_mood, subject<50_chars, capitalize, no_period, body_wrap@72_chars]
]

EXAMPLE_FEAT::
  """
  feat(auth): add OAuth2 authentication support

  Implement OAuth2 authentication flow using authorization
  code grant type. Supports Google and GitHub providers.

  Closes #123
  """

STRUCTURE_RULES::[
  subject::what[imperative]≠how[implementation_details],
  body::why+context[optional_but_recommended],
  footer::issues+breaking_changes[Closes_#123, BREAKING_CHANGE:]
]
```

---

## BRANCHING STRATEGY

```octave
BRANCH_NAMING::[
  format::"<type>/<issue>-<description>",
  examples::[feature/123-oauth-auth, fix/456-null-crash, docs/789-api-docs, hotfix/999-security]
]

GIT_FLOW_MODEL::[
  main::production_ready[never_break],
  develop::integration_branch[feature_merges],
  feature/*::new_features[branch_from_develop],
  fix/*::bug_fixes[branch_from_develop],
  release/*::release_preparation[version_tagging],
  hotfix/*::critical_production_fixes[branch_from_main]
]

BRANCH_LIFECYCLE::[
  create::"git checkout develop && git pull && git checkout -b feature/123-new",
  update::"git fetch origin develop && git rebase origin/develop",
  merge::"git checkout develop && git merge --no-ff feature/123-new",
  cleanup::"git branch -d feature/123-new && git push origin --delete feature/123-new"
]
```

---

## PULL REQUESTS

```octave
PR_TEMPLATE::[
  summary::what+why[brief_description],
  changes::bulleted_list[specific_modifications],
  testing::checklist[unit+integration+manual],
  issues::references[Closes_#123, Relates_to_#456],
  checklist::[style_followed, self_reviewed, docs_updated, tests_added, all_passing]
]

PR_BEST_PRACTICES::[
  size::small+focused[one_feature_per_PR],
  description::clear[what+why+how],
  self_review::before_requesting[catch_obvious_issues],
  tests::always_include[relevant_coverage],
  documentation::keep_in_sync[update_with_code],
  feedback::respond_promptly[address_comments_quickly]
]
```

---

## COMMON OPERATIONS

```octave
AMEND_COMMIT::[
  add_changes::"git add . && git commit --amend --no-edit",
  update_message::"git commit --amend -m 'Updated message'",
  WARNING::only_amend_unpushed_commits
]

INTERACTIVE_REBASE::[
  command::"git rebase -i HEAD~3",
  actions::[pick→keep, reword→change_msg, squash→combine, fixup→squash_no_msg, drop→remove]
]

STASH::[
  save::"git stash push -m 'WIP: feature'",
  list::"git stash list",
  apply_latest::"git stash pop",
  apply_specific::"git stash apply stash@{0}"
]

UNDO_CHANGES::[
  unstaged::"git restore <file>",
  staged::"git restore --staged <file>",
  last_commit_keep_changes::"git reset --soft HEAD~1",
  last_commit_unstage::"git reset HEAD~1",
  last_commit_discard::"git reset --hard HEAD~1",
  safe_revert::"git revert <hash>"  # Creates new commit, safe for shared branches
]
```

---

## COLLABORATION

```octave
FORK_SYNC::[
  setup::"git remote add upstream <original-repo-url>",
  update::"git fetch upstream && git checkout main && git merge upstream/main && git push"
]

MERGE_CONFLICTS::[
  workflow::[
    1→start::"git merge develop OR git rebase develop",
    2→resolve::edit_conflict_markers_in_files,
    3→mark_resolved::"git add <file>",
    4→complete::"git commit OR git rebase --continue"
  ]
]
```

---

## CONFIGURATION

```octave
ESSENTIAL_CONFIG::[
  user::"git config --global user.name 'Name' && git config --global user.email 'email'",
  defaults::[
    init.defaultBranch→main,
    pull.rebase→true,
    commit.gpgsign→true[if_signing]
  ]
]

USEFUL_ALIASES::[
  shortcuts::[st→status, ci→commit, co→checkout, br→branch],
  undo::"reset --soft HEAD~1",
  cleanup::"!git branch --merged | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d",
  lg::"log --graph --pretty=format:'%h -%d %s (%cr) <%an>' --abbrev-commit"
]
```

---

## SECURITY

```octave
SECRETS_PREVENTION::[
  NEVER::commit[api_keys, passwords, tokens, credentials],
  USE::[.gitignore, environment_variables, git-secrets_tool],
  SCAN::"git secrets --scan-history"
]

GITIGNORE_ESSENTIALS::[
  os::[.DS_Store, Thumbs.db],
  ide::[.vscode/, .idea/, *.swp],
  deps::[node_modules/, __pycache__/, *.pyc],
  build::[dist/, build/, target/],
  env::[.env, .env.local, venv/, env/],
  logs::[*.log, logs/],
  temp::[*.tmp, .cache/]
]
```
