# AI Prompt Templates

This directory contains editable prompt templates for AI-powered analysis.

## Quick Start

**Edit the prompt:** Open `structured-analysis.md` and modify the text under `## Prompt (Edit Below)`

**Test your changes:**
```bash
npm run test:ai-structured test-images/your-image.jpg
```

The test script will automatically load your updated prompt from the file.

---

## How It Works

### Template System

1. **AIService** tries to load prompts from this directory first
2. If file exists → Uses your custom prompt
3. If file missing → Falls back to hardcoded prompt (failsafe)

### Variables

Templates support these variables that get replaced automatically:

| Variable | Source | Example |
|----------|--------|---------|
| `{{locations}}` | `config.yaml` commonLocations | "kitchen, bathroom, bedroom" |
| `{{subjects}}` | `config.yaml` commonSubjects | "oven, sink, tap, window" |
| `{{staticShots}}` | `config.yaml` shotTypes.static | "WS, MID, CU, UNDER" |
| `{{movingShots}}` | `config.yaml` shotTypes.moving | "FP, TRACK, ESTAB" |
| `{{wordPreferences}}` | `config.yaml` wordPreferences | '"faucet" -> "tap"' |
| `{{aiInstructions}}` | `config.yaml` aiInstructions | Custom instructions |

**Example:**
```markdown
Common locations: {{locations}}
```

**Becomes:**
```
Common locations: kitchen, bathroom, bedroom, living-room, garage...
```

---

## Prompt Engineering Tips

### Testing Workflow

```bash
# 1. Edit structured-analysis.md
# 2. Test with sample image
npm run test:ai-structured test-images/kitchen-oven.jpg

# 3. Check results:
#    - Location correct?
#    - Subject correct?
#    - Shot type from vocabulary?

# 4. Iterate until 80%+ accuracy across 5 images
```

### Common Adjustments

**If AI ignores structured format:**
- Add more "CRITICAL" / "IMPORTANT" emphasis
- Move JSON format requirements to the top
- Add more examples

**If shot types are wrong:**
- Make definitions more descriptive
- Add visual examples ("full room visible" vs "detail focus")
- Simplify vocabulary (remove ambiguous types)

**If location/subject inaccurate:**
- Expand common lists in `config.yaml`
- Add contextual hints ("kitchen appliances", "bathroom fixtures")
- Provide negative examples ("not X, but Y")

### Emphasis Techniques

```markdown
**Bold** - Moderate emphasis
**CAPS BOLD** - Strong emphasis
🔴 CRITICAL: - Maximum emphasis
```

### Example Structure

Good prompts typically follow this pattern:

1. **Opening:** Clear task statement
2. **Format:** Expected output structure (early!)
3. **Guidance:** Location/subject/shot type definitions
4. **Examples:** 2-3 concrete examples
5. **Constraints:** Word preferences, exclusions
6. **Response Format:** JSON structure (repeated for emphasis)

---

## File Structure

```
prompts/
├── README.md                    # This file
└── structured-analysis.md       # Main prompt template (EDIT THIS)
```

### Template Sections

**structured-analysis.md** has these sections:

1. **Header** - Documentation (ignored by AI)
2. **## Prompt (Edit Below)** - The actual prompt sent to AI
3. **## Response Format** - JSON structure requirements
4. **## Prompt Engineering Notes** - Tips and version history

**Only edit between the markers!**

---

## Advanced: Multiple Prompt Variants

You can test different prompt approaches:

### Option 1: Manual Backup/Restore

```bash
# Save current version
cp structured-analysis.md structured-analysis-v1.md

# Edit and test new version
vim structured-analysis.md
npm run test:ai-structured test-images/sample.jpg

# Restore if worse
mv structured-analysis-v1.md structured-analysis.md
```

###Option 2: Git Branches

```bash
# Create branch for prompt experiment
git checkout -b prompt-experiment

# Edit and test
vim prompts/structured-analysis.md
npm run test:ai-structured test-images/sample.jpg

# Merge if better, discard if worse
git checkout main
git merge prompt-experiment  # or: git branch -D prompt-experiment
```

---

## Fallback Behavior

**If template file is missing or unreadable:**
- AIService automatically uses hardcoded prompt
- No errors or crashes
- Logs message: "Prompt template not found, will use hardcoded prompt"

**This means:**
- Safe to delete file temporarily (will use hardcoded)
- Safe to experiment (worst case: fallback to hardcoded)
- Production-safe (no dependency on file existing)

---

## Best Practices

### 1. Version Your Prompts

Add version notes at the bottom of `structured-analysis.md`:

```markdown
**Version history:**
- v1.0 (2025-11-07): Initial structured prompt
- v1.1 (2025-11-08): Added emphasis on JSON format
- v1.2 (2025-11-09): Simplified shot type definitions
```

### 2. Document Your Changes

When making significant changes, note:
- What changed
- Why (what problem were you solving)
- Results (accuracy before/after)

### 3. Test Systematically

```bash
# Before changes
npm run test:ai-structured test-images/*.jpg > results-before.txt

# After changes
npm run test:ai-structured test-images/*.jpg > results-after.txt

# Compare
diff results-before.txt results-after.txt
```

### 4. Keep It Simple

- Shorter prompts often work better
- Clear > Clever
- Examples > Explanations

---

## Troubleshooting

**Template not loading?**
```bash
# Check file exists
ls -la prompts/structured-analysis.md

# Check file permissions
chmod 644 prompts/structured-analysis.md

# Check for parsing errors
grep "## Prompt (Edit Below)" prompts/structured-analysis.md
```

**Variables not replaced?**
- Check spelling: `{{locations}}` not `{{location}}`
- Check config.yaml has the values
- Check you're using new structured lexicon format

**Prompt working in test but not in app?**
- Restart the Electron app (prompts are cached)
- Check working directory is correct
- Verify `.env` API keys are set

---

## Questions?

See full documentation: `docs/005-DOC-TESTING-AI-STRUCTURED.md`

**Quick reference:**
- Edit: `prompts/structured-analysis.md`
- Test: `npm run test:ai-structured <image>`
- Config: `config/config.yaml`
- Code: `electron/services/aiService.ts`
