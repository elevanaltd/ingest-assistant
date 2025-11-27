#!/bin/bash
# SessionStart Hook - Install hook dependencies with git-based worktree detection
# Ensures dependencies are available for all worktrees through shared node_modules

set -e

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Use git to detect if we're in a worktree (more reliable than symlink detection)
GIT_DIR="$(git rev-parse --git-dir 2>/dev/null)"
GIT_COMMON_DIR="$(git rev-parse --git-common-dir 2>/dev/null)"

# Normalize paths for comparison (resolve any symlinks/relative paths)
GIT_DIR_RESOLVED="$(cd "$GIT_DIR" 2>/dev/null && pwd)"
GIT_COMMON_DIR_RESOLVED="$(cd "$GIT_COMMON_DIR" 2>/dev/null && pwd)"

if [ "$GIT_DIR_RESOLVED" != "$GIT_COMMON_DIR_RESOLVED" ]; then
  # We're in a worktree - GIT_COMMON_DIR points to main repo's .git
  MAIN_REPO="$(cd "$GIT_COMMON_DIR_RESOLVED/.." && pwd)"
  INSTALL_DIR="$MAIN_REPO/.claude/hooks"
  echo "[SessionStart] Detected worktree - using main repo dependencies at $INSTALL_DIR"
else
  # We're in main repo - install here
  INSTALL_DIR="$HOOKS_DIR"
  echo "[SessionStart] Main repo detected - installing dependencies locally"
fi

# Check if dependencies are already installed
if [ -d "$INSTALL_DIR/node_modules" ] && [ -n "$(ls -A "$INSTALL_DIR/node_modules" 2>/dev/null)" ]; then
  echo "[SessionStart] ✓ Dependencies already installed"

  # If in worktree, ensure symlink exists
  if [ "$INSTALL_DIR" != "$HOOKS_DIR" ]; then
    if [ ! -e "$HOOKS_DIR/node_modules" ]; then
      echo "[SessionStart] Creating symlink to main repo node_modules"
      ln -sfn "$INSTALL_DIR/node_modules" "$HOOKS_DIR/node_modules"
    fi
  fi

  exit 0
fi

# Clean up broken symlinks or non-directory files at node_modules
if [ -e "$INSTALL_DIR/node_modules" ] || [ -L "$INSTALL_DIR/node_modules" ]; then
  if [ ! -d "$INSTALL_DIR/node_modules" ]; then
    echo "[SessionStart] Cleaning up corrupted node_modules (non-directory file or broken symlink)"
    rm -f "$INSTALL_DIR/node_modules"
  fi
fi

# Install dependencies
echo "[SessionStart] Running npm install..."
cd "$INSTALL_DIR" && npm install --silent > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "[SessionStart] ✓ Hook dependencies installed successfully"

  # If in worktree, create symlink to main repo's node_modules
  if [ "$INSTALL_DIR" != "$HOOKS_DIR" ]; then
    echo "[SessionStart] Creating symlink to main repo node_modules"
    ln -sfn "$INSTALL_DIR/node_modules" "$HOOKS_DIR/node_modules"
    echo "[SessionStart] ✓ Worktree symlink created"
  fi
else
  echo "[SessionStart] ✗ Failed to install dependencies - hooks may not work"
  exit 1
fi
