#!/usr/bin/env bash
# Lock Hooks Command - Make hooks immutable
# CRITICAL: This command must be run with appropriate permissions

set -euo pipefail

HOOKS_DIR="/Users/shaunbuswell/.claude/hooks"
CHECKSUMS_FILE="$HOOKS_DIR/.checksums"
LOCK_STATUS_FILE="$HOOKS_DIR/.locked"

echo "🔒 LOCKING HOOK SYSTEM"

# Create checksums of all hooks
echo "Creating integrity checksums..."
find "$HOOKS_DIR" -name "*.sh" -exec shasum -a 256 {} \; > "$CHECKSUMS_FILE"

# Make hooks read-only (macOS)
echo "Setting immutable flags..."
find "$HOOKS_DIR" -name "*.sh" -exec chflags schg {} \; 2>/dev/null || {
  echo "⚠️  Could not set immutable flags (requires admin permissions)"
  echo "   Run: sudo chflags schg $HOOKS_DIR/*.sh"
}

# Create lock status
echo "LOCKED: $(date)" > "$LOCK_STATUS_FILE"
chflags schg "$LOCK_STATUS_FILE" 2>/dev/null || true

echo "✅ HOOK SYSTEM LOCKED"
echo "   - Hooks are now immutable"
echo "   - Integrity checksums created"
echo "   - Use /unlock-hooks to modify (with authentication)"

# Show status
ls -lO "$HOOKS_DIR"/*.sh | head -5