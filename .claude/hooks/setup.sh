#!/bin/bash
# Setup script for skill activation system in eav-monorepo

set -e

echo "Installing dependencies..."
npm install

echo ""
echo "✓ Installation complete!"
echo ""
echo "Dependencies installed:"
npm list --depth=0

echo ""
echo "Next steps:"
echo "1. Verify .env has ANTHROPIC_API_KEY"
echo "2. Create the wrapper script in user_prompt_submit/"
echo "3. Update settings.json"
