# New Project Setup Guide - Ingest Assistant UXP Panel

## Overview

This guide walks you through creating a **fresh project** for the UXP panel, separate from the Electron app proof-of-concept.

**Why separate projects?**
- Clean slate (no Electron dependencies)
- Different build system (Webpack for UXP vs Vite for Electron)
- Different runtime (UXP vs Node.js)
- Allows keeping Electron app as reference

---

## Step 1: Create Project Directory

```bash
# Navigate to your projects folder
cd /Volumes/HestAI-Projects

# Create new directory
mkdir ingest-assistant-uxp
cd ingest-assistant-uxp
```

---

## Step 2: Initialize Git Repository

```bash
# Initialize Git
git init

# Create .gitignore
cat > .gitignore <<EOF
# Dependencies
node_modules/
package-lock.json

# Build outputs
dist/
build/
*.ccx

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Temporary
tmp/
temp/
EOF

# Create README placeholder
cat > README.md <<EOF
# Ingest Assistant UXP Panel

Premiere Pro panel for enriching footage metadata during editing workflow.

## Status

🚧 POC in progress - See POC-SCOPE.md for validation criteria

## Documentation

- ARCHITECTURE.md - Comprehensive technical documentation
- POC-SCOPE.md - Proof of concept scope and success criteria
- SETUP.md - Development environment setup

## Quick Start

(Instructions coming after POC validation)
EOF

# Initial commit
git add .
git commit -m "Initial commit: Project structure"
```

---

## Step 3: Copy Documentation from Electron App

```bash
# Copy architecture docs
cp /Volumes/HestAI-Projects/ingest-assistant/UXP-PANEL-ARCHITECTURE.md ./ARCHITECTURE.md
cp /Volumes/HestAI-Projects/ingest-assistant/POC-SCOPE.md ./POC-SCOPE.md

# Commit docs
git add .
git commit -m "docs: Add architecture and POC scope documentation"
```

---

## Step 4: Initialize Node.js Project

```bash
# Create package.json
npm init -y

# Edit package.json to update fields:
# - name: "ingest-assistant-uxp"
# - description: "Premiere Pro UXP panel for metadata enrichment"
# - version: "0.1.0"
# - author: "Your Name"
```

---

## Step 5: Install Dependencies

### Production Dependencies:
```bash
npm install react@^18.0.0 react-dom@^18.0.0
```

### Development Dependencies:
```bash
npm install --save-dev \
  typescript@^5.0.0 \
  @types/react@^18.0.0 \
  @types/react-dom@^18.0.0 \
  webpack@^5.0.0 \
  webpack-cli@^5.0.0 \
  ts-loader@^9.0.0 \
  html-webpack-plugin@^5.0.0 \
  copy-webpack-plugin@^11.0.0
```

---

## Step 6: Create Project Structure

```bash
# Create directories
mkdir -p src/components
mkdir -p src/services
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/utils
mkdir -p public/icons
mkdir -p config
mkdir -p tests

# Create basic files
touch src/App.tsx
touch src/index.tsx
touch public/manifest.json
touch tsconfig.json
touch webpack.config.js
```

---

## Step 7: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## Step 8: Configure Webpack for UXP

Create `webpack.config.js`:

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/icons', to: 'icons' },
      ],
    }),
  ],
  devtool: 'source-map',
};
```

---

## Step 9: Create UXP Manifest

Create `public/manifest.json`:

```json
{
  "id": "com.yourdomain.ingest-assistant",
  "name": "Ingest Assistant",
  "version": "0.1.0",
  "host": {
    "app": "PP",
    "minVersion": "22.0"
  },
  "entrypoints": [
    {
      "type": "panel",
      "id": "main-panel",
      "label": "Ingest Assistant"
    }
  ],
  "requiredPermissions": [
    "clipboard",
    "webview",
    "network"
  ],
  "icons": [
    {
      "width": 23,
      "height": 23,
      "path": "icons/icon-dark.png",
      "scale": [1, 2],
      "theme": ["darkest", "dark", "medium"]
    },
    {
      "width": 23,
      "height": 23,
      "path": "icons/icon-light.png",
      "scale": [1, 2],
      "theme": ["lightest", "light"]
    }
  ]
}
```

---

## Step 10: Create Basic Entry Point

Create `public/index.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Ingest Assistant</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

Create `src/index.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```

Create `src/App.tsx` (POC version):

```typescript
import React, { useState } from 'react';

export function App() {
  const [message, setMessage] = useState('Hello UXP Panel!');

  return (
    <div style={{ padding: 16 }}>
      <h1>Ingest Assistant</h1>
      <p>{message}</p>
      <button onClick={() => setMessage('Panel is working!')}>
        Test Button
      </button>
    </div>
  );
}
```

---

## Step 11: Add NPM Scripts

Edit `package.json`, add scripts section:

```json
{
  "scripts": {
    "build": "webpack",
    "watch": "webpack --watch",
    "clean": "rm -rf dist",
    "rebuild": "npm run clean && npm run build"
  }
}
```

---

## Step 12: Build and Test

```bash
# Build the panel
npm run build

# Verify dist/ folder created
ls -la dist/

# Expected contents:
# - bundle.js
# - index.html
# - manifest.json
# - icons/
```

---

## Step 13: Load in Premiere Pro

### Install UXP Developer Tool:
1. Download from: https://developer.adobe.com/photoshop/uxp/devtool/
2. Install and launch

### Load Panel:
1. Open UXP Developer Tool
2. Click "Add Plugin"
3. Navigate to `ingest-assistant-uxp/dist/`
4. Select `manifest.json`
5. Click "Load"
6. Launch Premiere Pro
7. Panel should appear in Window → Extensions → Ingest Assistant

---

## Step 14: Connect to GitHub

```bash
# Create repository on GitHub first (github.com/new)
# Name: ingest-assistant-uxp
# Description: Premiere Pro UXP panel for metadata enrichment
# Private/Public: Your choice

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/ingest-assistant-uxp.git

# Push initial commit
git branch -M main
git push -u origin main
```

---

## Step 15: Create Development Workflow

Create `.github/workflows/test.yml` (optional, for CI):

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm test (when tests added)
```

---

## Project Structure Summary

After setup, your project should look like:

```
ingest-assistant-uxp/
├── .git/
├── .gitignore
├── README.md
├── ARCHITECTURE.md
├── POC-SCOPE.md
├── package.json
├── tsconfig.json
├── webpack.config.js
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── icons/
│       ├── icon-dark.png
│       └── icon-light.png
├── src/
│   ├── index.tsx
│   ├── App.tsx
│   ├── components/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── utils/
├── config/
│   └── lexicon.example.yaml
├── tests/
└── dist/ (generated by build)
```

---

## Next Steps After Setup

### 1. Validate Basic Panel Works:
- [ ] Build succeeds without errors
- [ ] Panel loads in UXP Developer Tool
- [ ] Panel appears in PP Extensions menu
- [ ] UI renders (Hello message shows)
- [ ] Button click updates message

### 2. Start POC Implementation:
- [ ] Follow POC-SCOPE.md checklist
- [ ] Implement clip selection detection
- [ ] Add metadata read/write
- [ ] Test searchability

### 3. Document Progress:
- [ ] Update README with setup instructions
- [ ] Screenshot working panel
- [ ] Document any issues encountered

---

## Troubleshooting

### Build fails with TypeScript errors:
```bash
# Check TypeScript version
npm list typescript

# Reinstall if needed
npm install --save-dev typescript@^5.0.0
```

### Panel doesn't appear in PP:
- Check UXP Developer Tool console for errors
- Verify manifest.json `host.app` is "PP" (not "PS")
- Ensure PP version >= 22.0

### React doesn't render:
- Check browser console (UXP Developer Tool → Debug)
- Verify ReactDOM.render is called
- Check if #root element exists

### Manifest validation fails:
- Use Adobe's manifest validator: https://developer.adobe.com/
- Check JSON syntax
- Verify all required fields present

---

## Resources

### Official Documentation:
- UXP Developer Tool: https://developer.adobe.com/photoshop/uxp/devtool/
- Premiere Pro UXP: https://ppro-scripting.docsforadobe.dev/
- UXP Guides: https://developer.adobe.com/photoshop/uxp/guides/

### Community:
- Adobe Forums: https://community.adobe.com/t5/premiere-pro/ct-p/ct-premiere-pro
- Discord: (check Adobe developer site)

### Sample Projects:
- Adobe UXP Samples: https://github.com/AdobeDocs/uxp-photoshop-plugin-samples

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-06
**Author:** Holistic Orchestrator (Claude Code)
**Purpose:** Fresh project initialization guide
