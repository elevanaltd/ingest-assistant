#!/usr/bin/env bash
# Unlock Hooks Command - Remove immutable protection
# CRITICAL: This command requires authentication

set -euo pipefail

HOOKS_DIR="/Users/shaunbuswell/.claude/hooks"
LOCK_STATUS_FILE="$HOOKS_DIR/.locked"
AUTH_LOG="/Users/shaunbuswell/.claude/logs/hook-modifications.log"

# Require reason
reason="$*"
if [[ -z "$reason" ]]; then
  echo "❌ AUTHENTICATION REQUIRED"
  echo "Usage: /unlock-hooks <reason-for-modification>"
  echo "Example: /unlock-hooks 'Adding new North Star governance hook'"
  exit 1
fi

echo "🔓 UNLOCKING HOOK SYSTEM"
echo "Reason: $reason"

# Verify current user (additional security)
if [[ "${USER:-}" != "shaunbuswell" ]]; then
  echo "❌ UNAUTHORIZED: Only shaunbuswell can unlock hooks"
  exit 1
fi

# Require confirmation
echo "⚠️  This will allow hook modifications."
echo "Type 'CONFIRM' to proceed:"
read -r confirmation
if [[ "$confirmation" != "CONFIRM" ]]; then
  echo "❌ Operation cancelled"
  exit 1
fi

# Remove immutable flags (macOS)
echo "Removing immutable flags..."
find "$HOOKS_DIR" -name "*.sh" -exec chflags noschg {} \; 2>/dev/null || {
  echo "⚠️  Could not remove immutable flags (may require admin permissions)"
  echo "   Run: sudo chflags noschg $HOOKS_DIR/*.sh"
}

# Remove lock status
chflags noschg "$LOCK_STATUS_FILE" 2>/dev/null || true
rm -f "$LOCK_STATUS_FILE"

# Log the unlock
mkdir -p "$(dirname "$AUTH_LOG")"
echo "[$(date)] USER:${USER:-unknown} UNLOCK REASON:$reason PWD:$(pwd)" >> "$AUTH_LOG"

echo "✅ HOOK SYSTEM UNLOCKED"
echo "   - Hooks can now be modified"
echo "   - Action logged to audit trail"
echo "   - Remember to run /lock-hooks when finished"

# Show warning
cat <<EOF

⚠️  SECURITY WARNING:
   Hooks are now modifiable. This state should be temporary.
   Always run /lock-hooks after making necessary changes.
   
   Current unlock reason: $reason
   
EOF