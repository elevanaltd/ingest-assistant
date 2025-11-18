#!/bin/bash
# Skill Activation Hook - Local Project Version
# Executes the TypeScript skill activation system via npx tsx
#
# Key responsibilities:
# 1. Loads .env file to make ANTHROPIC_API_KEY available
# 2. Runs skill-activation-prompt.ts from parent hooks directory

# Get the hooks directory (parent of user_prompt_submit)
HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Get the project root (grandparent of user_prompt_submit, parent of .claude)
PROJECT_DIR="$(cd "$HOOKS_DIR/../.." && pwd)"

# Export project directory so TypeScript knows where to find .claude/skills, .claude/config, etc.
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Load .env file to export ANTHROPIC_API_KEY and other variables
ENV_FILE="$HOOKS_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  # Read and export ANTHROPIC_API_KEY from .env
  export ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' "$ENV_FILE" | cut -d '=' -f2-)
  export CLAUDE_SKILLS_MODEL=$(grep '^CLAUDE_SKILLS_MODEL=' "$ENV_FILE" | cut -d '=' -f2-)
fi

# Log wrapper invocation for debugging
{
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Skill hook invoked"
  echo "PROJECT_DIR: $PROJECT_DIR"
  echo "HOOKS_DIR: $HOOKS_DIR"
  echo "API_KEY_LOADED: $([ -n "$ANTHROPIC_API_KEY" ] && echo 'yes' || echo 'no')"
} >> "$HOOKS_DIR/hook-execution.log" 2>&1

# Run from the hooks directory (where node_modules are installed)
cd "$HOOKS_DIR" || exit 1

# Execute the skill activation TypeScript file
# stdin from Claude Code is automatically passed through
npx tsx skill-activation-prompt.ts 2>&1
EXIT_CODE=$?

# Log the exit code
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Exit code: $EXIT_CODE" >> "$HOOKS_DIR/hook-execution.log" 2>&1

exit $EXIT_CODE
