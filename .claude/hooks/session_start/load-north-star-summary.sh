#!/bin/bash
# SessionStart Hook - North Star Summary Auto-Loading
# Based on Issue #7: https://github.com/elevanaltd/hestai/issues/7
#
# Loads compressed North Star Summary (~100-130 lines) instead of full document (~300+ lines)
# Saves ~2.5k tokens at startup while maintaining 100% decision-logic fidelity

set -e

# Get project directory from environment or current working directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# ANSI colors
BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
BOLD='\033[1m'
RESET='\033[0m'

# Check for .hestai three-tier structure (new) or .coord (legacy fallback)
HESTAI_NORTH_STAR="$PROJECT_DIR/.hestai/north-star"
COORD_PATH="$PROJECT_DIR/.coord"

if [ -d "$HESTAI_NORTH_STAR" ]; then
  SEARCH_PATH="$HESTAI_NORTH_STAR"
elif [ -e "$COORD_PATH" ] && ([ -L "$COORD_PATH" ] || [ -d "$COORD_PATH" ]); then
  SEARCH_PATH="$COORD_PATH/workflow-docs"
else
  # No coordination - silent exit (this is expected for many projects)
  exit 0
fi

if [ ! -d "$SEARCH_PATH" ]; then
  exit 0
fi

# Find North Star Summary file (pattern: *NORTH-STAR-SUMMARY*.md)
SUMMARY_FILE=$(find "$SEARCH_PATH" -maxdepth 1 -name "*NORTH-STAR-SUMMARY*.md" -type f 2>/dev/null | head -1)

if [ -z "$SUMMARY_FILE" ]; then
  # No summary found - silent exit
  exit 0
fi

# Verify file is readable and non-empty
if [ ! -r "$SUMMARY_FILE" ] || [ ! -s "$SUMMARY_FILE" ]; then
  echo -e "${YELLOW}⚠️  North Star Summary found but could not be loaded${RESET}"
  exit 0
fi

# Calculate relative path for display
RELATIVE_PATH="${SUMMARY_FILE#$PROJECT_DIR/}"

# Output formatted banner
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}📋 NORTH STAR SUMMARY${RESET}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# Output file contents
cat "$SUMMARY_FILE"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "${GREEN}✓ North Star Summary loaded from coordination${RESET}"
echo -e "${BLUE}  Location: $RELATIVE_PATH${RESET}"
echo -e "${BLUE}  Use '/ns-summary-create' to regenerate summary${RESET}"
echo ""
