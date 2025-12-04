---
description: Create a GitHub issue in the current repository
---

Create a GitHub issue in the current repository using the `gh` CLI tool.

WORKFLOW:
1. If the user provided issue details after `/gitissue`, use those details
2. Otherwise, ask the user for:
   - Issue title (required)
   - Issue body/description (optional but recommended)
   - Labels (optional, comma-separated)
   - Assignees (optional, comma-separated GitHub usernames)
   - Milestone (optional)

3. Before creating the issue:
   - Verify we're in a git repository
   - Verify the repository has a GitHub remote
   - Show the user a preview of what will be created

4. Create the issue using `gh issue create` with the provided details

5. After creation, display the issue URL and number

IMPORTANT:
- Use the `gh` CLI tool (GitHub's official CLI)
- The command format is: `gh issue create --title "TITLE" --body "BODY" [--label LABELS] [--assignee ASSIGNEES] [--milestone MILESTONE]`
- For multi-line bodies, use a heredoc or the `--body-file` option
- Always show the user the issue URL after creation
