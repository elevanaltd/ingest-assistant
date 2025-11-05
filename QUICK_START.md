# Quick Start Guide

## Getting Started in 3 Steps

### 1. Add API Key

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

**⭐ RECOMMENDED: OpenRouter** (One key, access to all models):

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=YOUR_KEY_HERE
AI_MODEL=anthropic/claude-3.5-sonnet
```

**Get OpenRouter Key:** https://openrouter.ai/keys

**Popular Models:**
- `anthropic/claude-3.5-sonnet` - Best quality/price balance
- `openai/gpt-4o` - OpenAI's latest vision model
- `google/gemini-pro-vision` - Google's vision model
- `anthropic/claude-3-opus` - Highest quality (expensive)
- See full list: https://openrouter.ai/models

**Alternative: Direct API Keys** (OpenAI or Anthropic):

```env
AI_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=YOUR_KEY_HERE
AI_MODEL=gpt-4-vision-preview
```

- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys

**⚠️ Security:** `.env` is gitignored and will NEVER be committed. Your API keys stay safe!

### 2. Run the App

```bash
npm run dev
```

This will:
- Start Vite dev server (React UI)
- Start Electron app (opens window)

### 3. Use the App

1. Click **"Select Folder"** → Choose a folder with images/videos
2. You'll see the first file with:
   - **ID**: Auto-filled (first 8 chars of filename)
   - **Main Name**: Empty (you fill this in)
   - **Metadata**: Empty (you fill this in)
3. Fill in the name and metadata, click **"Save"**
4. File is renamed: `EB001537.jpg` → `EB001537-oven-control-panel.jpg`
5. Click **"Next"** to move to the next file

## AI Assistance

If you added an API key:

1. View a file
2. Click **"AI Assist"**
3. AI suggests name and metadata
4. Review/edit suggestions
5. Click **"Save"**

## File Naming Rules

- Original: `EB001537.jpg`
- You name it: "Oven Control Panel"
- Result: `EB001537-oven-control-panel.jpg`

**The app automatically:**
- Keeps first 8 characters as ID
- Converts your name to kebab-case
- Preserves file extension

## Customizing the Lexicon

Copy the example config and edit it:

```bash
cp config/config.yaml.example config/config.yaml
```

Edit `config/config.yaml` to guide AI suggestions:

```yaml
lexicon:
  preferredTerms:
    - tap          # AI will use "tap"
    - sink         # AI will use "sink"

  excludedTerms:
    - faucet       # AI will avoid "faucet"
    - basin        # AI will avoid "basin"

  synonymMapping:
    faucet: tap    # If AI sees "faucet", replace with "tap"
    basin: sink    # If AI sees "basin", replace with "sink"
```

## Where is Data Stored?

### Metadata
- **Location**: `~/Library/Application Support/ingest-assistant/metadata.json`
- **Format**: JSON file mapping file IDs to metadata
- **Backup**: Just copy this file

### Config
- **Lexicon**: `config/config.yaml` (safe to commit)
- **API Keys**: `.env` file in project root (NEVER commit - gitignored!)
- **Contains**: Lexicon settings in YAML, API keys in .env

### Files
- **Location**: Wherever you selected (not moved)
- **Changes**: Only renamed in-place

## Building for Production

```bash
# Build the app
npm run build

# Package as MacOS app
npm run package

# Find the app in:
# ./release/mac/Ingest Assistant.app
```

## Troubleshooting

### "AI Assist" button not showing
→ Add your API key to `.env` file
→ Restart the app after adding the key

### "Failed to analyze image"
→ Check API key is valid
→ Check internet connection
→ Check API provider status

### Files not showing
→ Only .jpg, .png, .mp4, .mov, .avi files are supported
→ Check folder permissions

### App won't start
→ Run `npm install` first
→ Check Node.js version (need 18+)

## Development Commands

```bash
npm run dev          # Development mode
npm test             # Run tests (47 tests)
npm run typecheck    # TypeScript validation
npm run lint         # ESLint
npm run build        # Production build
npm run package      # Create .app bundle
```

## Next Steps

1. **Test with sample files**: Drop some images in a test folder
2. **Customize lexicon**: Add terms specific to your workflow
3. **Try AI assistance**: Let AI suggest names
4. **Batch process**: Process 10-20 files to get comfortable
5. **Build and deploy**: Create production app when ready

## Need Help?

- Check `README.md` for full documentation
- Review test files to understand how services work
- Open DevTools in app: `View` → `Toggle Developer Tools`
