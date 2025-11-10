# AI Structured Response Validation Testing

## Purpose

Before implementing UI changes for the new structured naming pattern `{location}-{subject}-{shotType}`, we need to validate that AI models correctly generate structured responses.

This test script validates:
1. AI follows structured prompt instructions
2. AI returns JSON with `location`, `subject`, `shotType` fields
3. AI selects shot types from controlled vocabulary
4. Generated names follow `location-subject-shotType` pattern

---

## Prerequisites

### 1. Configure API Keys

Ensure you have an AI provider API key configured in your `.env` file:

```bash
# Option 1: OpenRouter (recommended - access to multiple models)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-...
AI_MODEL=anthropic/claude-3.5-sonnet

# Option 2: OpenAI direct
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o

# Option 3: Anthropic direct
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-3-5-sonnet-20241022
```

### 2. Prepare Test Images

Create a `test-images/` directory with sample photos:

```bash
mkdir -p test-images
```

**Good test images:**
- Kitchen scenes (oven, sink, counter)
- Bathroom fixtures (shower, toilet, mirror)
- Clear framing (close-up, midshot, wide shot)
- Good lighting
- Single clear subject

**Example test set:**
```
test-images/
├── kitchen-oven-closeup.jpg       # Close up of oven controls
├── bathroom-shower-midshot.jpg    # Midshot of shower area
├── bedroom-window-wide.jpg        # Wide shot including window
└── garage-door-under.jpg          # Underneath angle of garage door
```

### 3. Configure Lexicon (Optional)

Copy the example config to customize locations/subjects:

```bash
cp config/config.yaml.example config/config.yaml
```

Edit `config/config.yaml` to add your specific locations/subjects if needed.

---

## Running the Test

### Basic Usage

```bash
npm run test:ai-structured test-images/kitchen-oven-closeup.jpg
```

### Expected Output

The script will display:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                  AI Structured Response Validation Test                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Configuration Loaded:
  Config Path: /path/to/config/config.yaml
  Format: Structured
  Locations: 12 defined
  Subjects: 13 defined
  Shot Types: WS, MID, CU, UNDER, FP, TRACK, ESTAB

AI Configuration:
  Provider: openrouter
  Model: anthropic/claude-3.5-sonnet
  API Key: sk-or-v1-...

Generated Prompt:
────────────────────────────────────────────────────────────────────────────────
Analyze this image and generate structured metadata following this pattern:
{location}-{subject}-{shotType}

LOCATION: Identify where the shot takes place
Common locations: kitchen, bathroom, bedroom, ...
(You can use custom locations not in this list if more appropriate)

SUBJECT: Identify the main object or feature being captured
Common subjects: oven, sink, tap, shower, ...
(You can use custom subjects not in this list if more appropriate)

SHOT TYPE: Determine the framing category
For static shots (no camera movement): WS, MID, CU, UNDER
  - WS = Wide shot (shows full scene/context)
  - MID = Midshot (partial scene, main subject visible)
  - CU = Close up (detail focus)
  - UNDER = Underneath angle (shot from below)
...
────────────────────────────────────────────────────────────────────────────────

Analyzing image...

================================================================================
Image: test-images/kitchen-oven-closeup.jpg
================================================================================
✓ SUCCESS

Structured Components:
  Location:  kitchen
  Subject:   oven
  Shot Type: CU

Generated Name: kitchen-oven-CU

Metadata Tags:
  • appliance
  • controls
  • interior

Confidence: 0.80

Validation:
  ✓ Structured format returned
  ✓ Name uses kebab-case pattern
  ✓ Name has 3 components (location-subject-shotType)
  ✓ Shot type from controlled vocabulary

================================================================================

✓ Test passed! AI correctly generated structured response.

Ready to proceed with UI implementation.
```

---

## Interpreting Results

### Success Indicators ✅

- **Structured format returned**: AI provided `location`, `subject`, `shotType` fields
- **Kebab-case pattern**: Name uses hyphens correctly
- **3 components**: `location-subject-shotType` structure maintained
- **Controlled vocabulary**: Shot type is one of: WS, MID, CU, UNDER, FP, TRACK, ESTAB

### Warning Signs ⚠️

**Legacy format returned:**
```
⚠ WARNING: AI returned legacy format instead of structured format.

This could mean:
  1. The AI model ignored the structured format instructions
  2. The prompt needs tuning to emphasize structured response
  3. The model prefers different instruction phrasing
```

**Actions:**
1. Try with a different image (simpler subject)
2. Review generated prompt for clarity
3. Adjust `aiInstructions` in `config/config.yaml`
4. Try a different AI model (some models follow instructions better)

**Wrong shot type vocabulary:**
```
✗ Shot type not in vocabulary: CLOSEUP
```

**Actions:**
1. AI is hallucinating shot types not in the list
2. Prompt needs stronger emphasis on controlled vocabulary
3. Add examples to `aiInstructions` in config

---

## Testing Strategy

### Phase 1: Static Shots (Photos)

Test with 3-5 photos covering different scenarios:

```bash
# Test 1: Kitchen close-up
npm run test:ai-structured test-images/kitchen-oven-cu.jpg

# Test 2: Bathroom midshot
npm run test:ai-structured test-images/bathroom-shower-mid.jpg

# Test 3: Bedroom wide shot
npm run test:ai-structured test-images/bedroom-window-ws.jpg

# Test 4: Underneath angle
npm run test:ai-structured test-images/garage-door-under.jpg
```

**Success Criteria:**
- ✅ 80%+ accuracy on shot type classification (4/5 correct)
- ✅ 90%+ accuracy on location identification
- ✅ 90%+ accuracy on subject identification
- ✅ 100% adherence to structured format

### Phase 2: Edge Cases (Optional)

```bash
# Ambiguous location
npm run test:ai-structured test-images/hallway-light-mid.jpg

# Multiple subjects
npm run test:ai-structured test-images/kitchen-multiple-appliances.jpg

# Unusual angle
npm run test:ai-structured test-images/bathroom-mirror-reflection.jpg
```

---

## Common Issues & Solutions

### Issue: "No API key found"

```
Error: No API key found. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY environment variable.
```

**Solution:** Add API key to `.env` file at project root.

### Issue: AI returns legacy format consistently

**Symptoms:**
- No `location`, `subject`, `shotType` fields
- Just `mainName` and `metadata`

**Solutions:**
1. **Strengthen prompt emphasis:**
   Edit `config/config.yaml`:
   ```yaml
   aiInstructions: |
     CRITICAL: You MUST return structured JSON with location, subject, and shotType fields.
     Generate structured name as {location}-{subject}-{shotType}
     Example: {"location": "kitchen", "subject": "oven", "shotType": "CU", "mainName": "kitchen-oven-CU", "metadata": [...]}
   ```

2. **Try different AI model:**
   Some models follow structured instructions better than others:
   - `anthropic/claude-3.5-sonnet` (excellent instruction following)
   - `openai/gpt-4o` (very good)
   - `google/gemini-2.5-pro` (good with vision)

### Issue: Shot type classification errors

**Symptoms:**
- AI consistently picks wrong shot type
- Uses shot types not in vocabulary

**Solutions:**
1. **Add visual examples to prompt:**
   Edit `config/config.yaml`:
   ```yaml
   aiInstructions: |
     Shot type examples:
     - WS (Wide shot): Full room visible, shows context
     - MID (Midshot): Partial scene, main subject clearly visible
     - CU (Close up): Detail focus on specific feature (e.g., oven controls)
     - UNDER: Shot from below looking up
   ```

2. **Simplify vocabulary:**
   Remove ambiguous shot types temporarily to test core functionality

---

## Next Steps

Once validation passes (80%+ accuracy):

1. ✅ **Proceed to UI implementation**
   - Update `App.tsx` with location/subject text fields
   - Add shot type dropdown
   - Update file naming logic

2. ✅ **Update tests**
   - ConfigManager tests
   - AIService tests
   - Integration tests

3. ✅ **End-to-end testing**
   - Test complete photo workflow
   - Validate file renaming
   - Test metadata persistence

---

## Questions?

If test results are unclear or you need guidance on next steps, document the issues and we can:
- Tune prompts for better accuracy
- Adjust lexicon structure
- Try alternative AI models
- Simplify shot type vocabulary

The goal is 85%+ accuracy before UI work to avoid rework.
