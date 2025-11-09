# Ingest Assistant

AI-powered media file ingestion and metadata assistant for MacOS.

## Features

- **Manual Mode**: View photos/videos and add descriptive names and metadata tags
- **Auto-Rename**: Files automatically renamed to `{ID}-{kebab-case-name}.{ext}`
- **AI Assistance**: Analyze images with AI to suggest names and metadata
  - **OpenRouter** (recommended): Access to 100+ models with one API key
  - Direct APIs: OpenAI, Anthropic
- **Lexicon System**: Configure preferred/excluded terms to guide AI analysis
- **Video Support**:
  - Hardware-accelerated transcoding (ProRes, HEVC → H.264)
  - On-the-fly preview generation with VideoToolbox (macOS)
  - Disk-based caching for optimal performance
- **Security**: Defense-in-depth validation (path traversal, magic bytes, file size limits)
- **Simple Storage**: Metadata stored in JSON, easy to backup and version control

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install exiftool (Required)

Metadata is embedded directly into files using exiftool:

```bash
brew install exiftool  # macOS
```

**Why needed:** Embedded metadata is readable by Premiere Pro, Lightroom, and other professional tools.

### 3. Configure API Keys

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

### 4. Customize Lexicon (Optional - Can Also Use Settings UI)

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
2. **Configure Lexicon** (Optional): Click ⚙️ Settings button
   - Define term preferences (e.g., "bin" instead of "trash")
   - Add custom AI instructions
   - Save changes
3. **View Files**: Navigate through files using Previous/Next buttons
4. **Manual Entry**:
   - ID field is auto-populated (first 8 characters of filename)
   - Enter a Main Name (e.g., "Oven Control Panel")
   - Add metadata tags (comma-separated, e.g., "oven, control panel, kitchen")
   - Click "Save" to rename the file and store metadata
5. **AI Assistance**:
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
- **AIService**: Multi-format AI response parser (OpenAI, Anthropic, OpenRouter)
- **MetadataWriter**: Embeds metadata into files via exiftool
- **VideoTranscoder**: Hardware-accelerated video transcoding with caching
- **VideoFrameExtractor**: Generates thumbnails from video files
- **SecurityValidator**: Defense-in-depth security (path traversal, content validation, size limits)

### UI (React)

- Single-page app with image/video viewer
- Form for ID, Main Name, and Metadata
- Settings Modal for lexicon configuration (⚙️ button)
- Navigation between files
- AI assistance button

## Testing

Full TDD implementation with **100+ passing tests** covering:
- Settings Modal and lexicon management
- Multi-format AI response parsing
- Metadata storage and EXIF embedding
- File operations and configuration
- Type definitions and integration

Run tests: `npm test`

## License

MIT
