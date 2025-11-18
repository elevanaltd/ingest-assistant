#!/bin/bash
# SessionStart Hook - Install hook dependencies automatically
# This ensures skill activation hooks have their dependencies available

set -e

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Check if dependencies are already installed
if [ -d "$HOOKS_DIR/node_modules" ] && [ -n "$(ls -A "$HOOKS_DIR/node_modules" 2>/dev/null)" ]; then
  echo "[SessionStart] ✓ Hook dependencies already installed"
  exit 0
fi

# Install dependencies
echo "[SessionStart] Installing hook dependencies..."
cd "$HOOKS_DIR" && npm install --silent > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "[SessionStart] ✓ Hook dependencies installed successfully"
else
  echo "[SessionStart] ✗ Failed to install dependencies - hooks may not work"
  exit 1
fi
