# Ingest Assistant

AI-powered media file ingestion and metadata assistant for MacOS.

## Features

- **Manual Mode**: View photos/videos and add descriptive names and metadata tags
- **Auto-Rename**: Files automatically renamed to `{ID}-{kebab-case-name}.{ext}`
- **AI Assistance**: Analyze images with AI to suggest names and metadata
  - **OpenRouter** (recommended): Access to 100+ models with one API key
  - Direct APIs: OpenAI, Anthropic
- **Lexicon System**: Configure preferred/excluded terms to guide AI analysis
- **Simple Storage**: Metadata stored in JSON, easy to backup and version control

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

Create a `.env` file from the example:

```bash
cp .env.example .env
```

**⭐ RECOMMENDED: Use OpenRouter** (one key, access to all models):

```env
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key_here
AI_MODEL=anthropic/claude-3.5-sonnet
```

Get your key from: https://openrouter.ai/keys

**Popular models:**
- `anthropic/claude-3.5-sonnet` - Best balance
- `openai/gpt-4o` - OpenAI latest
- `google/gemini-pro-vision` - Google vision
- See all: https://openrouter.ai/models

**Alternative: Direct API keys:**

```env
AI_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=your_key_here
AI_MODEL=gpt-4-vision-preview
```

**⚠️ Security Note:** API keys are stored in `.env` which is gitignored. Never commit API keys to version control!

### 3. Customize Lexicon (Optional)

Copy the example config:

```bash
cp config/config.yaml.example config/config.yaml
```

Edit the lexicon in `config/config.yaml`:

```yaml
lexicon:
  preferredTerms:
    - tap
    - sink
  excludedTerms:
    - faucet
    - basin
  synonymMapping:
    faucet: tap
```

## Development

### Run in Development Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Type Check

```bash
npm run typecheck
```

### Build for Production

```bash
npm run build
npm run package
```

## Usage

1. **Select Folder**: Click "Select Folder" to choose a directory with images/videos
2. **View Files**: Navigate through files using Previous/Next buttons
3. **Manual Entry**:
   - ID field is auto-populated (first 8 characters of filename)
   - Enter a Main Name (e.g., "Oven Control Panel")
   - Add metadata tags (comma-separated, e.g., "oven, control panel, kitchen")
   - Click "Save" to rename the file and store metadata
4. **AI Assistance**:
   - Click "AI Assist" to analyze the current file
   - Review the suggested name and metadata
   - Edit if needed, then Save

## File Naming Convention

Files are renamed to: `{ID}-{main-name}.{ext}`

Example:
- Original: `EB001537.jpg`
- After naming "Oven Control Panel": `EB001537-oven-control-panel.jpg`

## Architecture

### Core Services (Electron Main Process)

- **FileManager**: Scans folders, manages file operations, handles renaming
- **MetadataStore**: JSON-based metadata persistence
- **ConfigManager**: YAML configuration management
- **AIService**: Abstraction layer for OpenAI and Anthropic APIs

### UI (React)

- Simple single-page app with image/video viewer
- Form for ID, Main Name, and Metadata
- Navigation between files
- AI assistance button

## Testing

Full TDD implementation with 43+ passing tests covering:
- Type definitions
- Configuration management
- Metadata storage
- File operations
- AI service integration

Run tests: `npm test`

## License

MIT
