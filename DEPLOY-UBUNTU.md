# Ubuntu Deployment Guide

## Why Deploy on Ubuntu?

**Problem:** Batch processing large video files over SMB/Thunderbolt network causes connection crashes
**Solution:** Run the app on Ubuntu server where files are stored locally (no network I/O)

**Benefits:**
- ✅ No network bottleneck (files are local on NVMe)
- ✅ 14-core CPU for faster processing
- ✅ 62GB RAM for large batches
- ✅ Same codebase as macOS (Electron is cross-platform)
- ✅ Can run headless or with GUI

---

## Prerequisites

### System Requirements
- Ubuntu 24.04 LTS (tested)
- Node.js v24.11.0+ (installed: ✓)
- npm v11.6.1+ (installed: ✓)
- 62GB RAM (available: ✓)
- 14-core CPU Intel Core Ultra 5 245K (available: ✓)

### Install System Dependencies

```bash
# Update package index
sudo apt update

# Install exiftool (for XMP metadata writing)
sudo apt install -y libimage-exiftool-perl

# Install ffmpeg (for video frame extraction)
sudo apt install -y ffmpeg

# Verify installations
which exiftool  # Should show: /usr/bin/exiftool
which ffmpeg    # Should show: /usr/bin/ffmpeg
```

---

## Build & Deploy

### Option 1: Build Locally on Ubuntu (Recommended)

```bash
# Clone repository (or copy from Mac)
cd /path/to/ingest-assistant

# Install dependencies
npm install

# Build application
npm run build

# Package for Linux (creates AppImage + .deb)
npm run package

# Find built app in:
ls -lh release/
# - ingest-assistant-1.1.0.AppImage  (portable, no install needed)
# - ingest-assistant_1.1.0_amd64.deb (installable package)
```

### Option 2: Install .deb Package

```bash
# Install the .deb package
sudo dpkg -i release/ingest-assistant_1.1.0_amd64.deb

# If missing dependencies:
sudo apt-get install -f

# Launch from applications menu or:
ingest-assistant
```

### Option 3: Run AppImage (No Installation)

```bash
# Make AppImage executable
chmod +x release/ingest-assistant-1.1.0.AppImage

# Run directly
./release/ingest-assistant-1.1.0.AppImage

# Or move to ~/Applications for convenience
mkdir -p ~/Applications
mv release/ingest-assistant-1.1.0.AppImage ~/Applications/
~/Applications/ingest-assistant-1.1.0.AppImage
```

---

## Configuration

### AI API Keys

The app needs AI provider credentials. Set them via GUI or environment:

```bash
# Option 1: Set via Settings Modal in app
# Launch app → Settings → Configure AI providers

# Option 2: Set via environment (for headless)
export OPENROUTER_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export OPENAI_API_KEY="your-key-here"

# Then launch app
./ingest-assistant-1.1.0.AppImage
```

**Note:** API keys are stored in encrypted keyring (libsecret on Linux)

---

## Usage Workflows

### Workflow 1: GUI on Ubuntu (with Display Server X11)

```bash
# You have GNOME Shell 45.0 with X11 display server
# Just launch the app normally:
./ingest-assistant-1.1.0.AppImage

# Or if installed via .deb:
ingest-assistant
```

**Use Case:** Batch processing with visual feedback

### Workflow 2: Headless (SSH/tmux)

```bash
# Install virtual display (if needed)
sudo apt install -y xvfb

# Run with virtual display
xvfb-run --auto-servernum --server-args='-screen 0 1024x768x24' \
  ./ingest-assistant-1.1.0.AppImage

# Or run in tmux session
tmux new -s ingest-batch
./ingest-assistant-1.1.0.AppImage
# Detach: Ctrl+B, D
# Reattach: tmux attach -t ingest-batch
```

**Use Case:** Long-running batches, leave running overnight

### Workflow 3: Remote GUI (VNC/RDP)

```bash
# If accessing Ubuntu GUI remotely:
# 1. Connect via VNC/RDP to Ubuntu
# 2. Launch app normally from GNOME
# 3. Process batches with full UI
```

---

## Batch Processing Workflow

### Standard Batch (Up to 100 Files)

1. **Launch App**
   ```bash
   ./ingest-assistant-1.1.0.AppImage
   ```

2. **Select Folder**
   - Click "Select Folder"
   - Navigate to `/path/to/raw/footage/` (local NVMe)
   - App scans folder and loads file list

3. **Start Batch**
   - Click "Reprocess First 100 Files" button
   - Processes ALL files (ignores processedByAI status)
   - Perfect for re-analyzing after prompt updates

4. **Monitor Progress**
   - Progress bar shows completion
   - Individual file status visible
   - Can cancel mid-batch if needed

### Large Folder Strategy (1000+ Files)

For folders with 1000+ files, process in batches of 100:

```
Folder with 1500 files:
1. First run:  Process first 100  (files 1-100)
2. Second run: Process next 100   (files 101-200)
3. Continue... until all processed
```

**Note:** The 100-file limit prevents memory exhaustion and allows progress checkpoints.

---

## Performance Comparison

### Before (Mac via SMB)
```
MacBook Pro M4 Max
└─ SMB mount → Ubuntu Server
   ├─ Network I/O bottleneck
   ├─ Thunderbolt crashes
   └─ Batch processing FAILS
```

### After (Ubuntu Local)
```
Ubuntu Server (local files)
├─ NVMe local I/O (no network)
├─ 14 cores for parallel processing
├─ 62GB RAM for large batches
└─ Batch processing RELIABLE ✅
```

**Expected Performance:**
- **Image:** ~5s per file (AI analysis time)
- **Video:** ~15s per file (5 frames × sequential analysis)
- **Batch 100 images:** ~8-10 minutes
- **Batch 100 videos:** ~25-30 minutes

---

## Troubleshooting

### App Won't Launch

```bash
# Check if exiftool installed
which exiftool
# If missing: sudo apt install libimage-exiftool-perl

# Check if ffmpeg installed
which ffmpeg
# If missing: sudo apt install ffmpeg

# Check Node.js version
node --version  # Should be v24.11.0+
```

### "exiftool not found" Error

```bash
# Install exiftool
sudo apt install libimage-exiftool-perl

# Verify installation
exiftool -ver  # Should show version number
```

### API Rate Limit Errors

The app uses sequential frame analysis (not parallel) to respect rate limits.

If still hitting limits:
1. Check your AI provider rate limits
2. Add delay between files (modify batchQueueManager.ts if needed)
3. Use different AI provider with higher limits

### GUI Display Issues

```bash
# If app window doesn't appear
export DISPLAY=:0
./ingest-assistant-1.1.0.AppImage

# If using Wayland (not X11)
export GDK_BACKEND=x11
./ingest-assistant-1.1.0.AppImage
```

### Metadata Not Writing to Files

```bash
# Check file permissions
ls -l /path/to/video/files

# App needs write permission to embed XMP metadata
# If read-only, mount with write access or change permissions
```

---

## Updating the App

```bash
# On Mac (development machine):
git pull
npm install
npm run build
npm run package

# Copy new AppImage to Ubuntu:
scp release/ingest-assistant-1.1.0.AppImage ubuntu-server:~/Applications/

# On Ubuntu:
chmod +x ~/Applications/ingest-assistant-1.1.0.AppImage
```

---

## Development on Ubuntu

You can also run in development mode:

```bash
# Install dependencies
npm install

# Run in dev mode (with hot reload)
npm run dev

# Run tests
npm test

# Run quality gates
npm run lint && npm run typecheck && npm test
```

---

## Architecture Notes

### Why This Works

**Electron** is cross-platform by design:
- macOS: Uses Cocoa (AppKit/WebKit)
- Linux: Uses GTK/X11/Wayland
- Windows: Uses Win32

**Same Codebase:**
- TypeScript/React code is platform-agnostic
- Node.js APIs work on all platforms
- exiftool available via `apt` on Ubuntu
- ffmpeg available via `apt` on Ubuntu

**Platform-Specific Code (Minimal):**
- `process.platform !== 'darwin'` check (app quit behavior)
- exiftool path detection (already supports `/usr/bin/exiftool`)
- Symlink resolution via `fs.realpath()` (works on Linux)

---

## Security Considerations

### File Access

The app validates all file paths to prevent traversal attacks. This works identically on Linux:

```typescript
// securityValidator.ts uses fs.realpath()
// Works on both macOS and Linux for symlink resolution
```

### Network Isolation

When running on Ubuntu with local files:
- No SMB mount required
- No network filesystem timeouts
- Local NVMe access only
- More secure (no network exposure)

### API Keys

Stored in system keyring:
- **macOS:** Keychain
- **Linux:** libsecret (GNOME Keyring or KWallet)

Encrypted at rest on both platforms.

---

## Next Steps

1. **Build the Linux version:**
   ```bash
   npm run build && npm run package
   ```

2. **Test on Ubuntu:**
   ```bash
   ./release/ingest-assistant-1.1.0.AppImage
   ```

3. **Process a small batch** (test with 5-10 files first)

4. **Scale to full batches** (100 files) once validated

5. **Monitor resource usage:**
   ```bash
   htop  # Watch CPU/RAM during batch processing
   ```

---

## Support

If issues arise:
1. Check logs in app (DevTools: Ctrl+Shift+I)
2. Verify exiftool/ffmpeg installed
3. Check file permissions
4. Test with small batch first

**Questions?** Check `.claude.md` for project architecture and troubleshooting.
