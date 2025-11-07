# Quick Test: AI Structured Response Validation

## Setup (One-time)

1. **Ensure API key is in `.env`:**
   ```bash
   # Check if .env exists
   cat .env | grep API_KEY

   # If missing, add it:
   echo "OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE" >> .env
   echo "AI_PROVIDER=openrouter" >> .env
   echo "AI_MODEL=anthropic/claude-3.5-sonnet" >> .env
   ```

2. **Create test-images directory:**
   ```bash
   mkdir -p test-images
   ```

3. **Add 3-5 test photos** to `test-images/`
   - Kitchen scene (oven, sink, counter)
   - Bathroom (shower, toilet, mirror)
   - Bedroom (window, door)
   - Use clear photos with single subject

## Run Test

```bash
npm run test:ai-structured test-images/your-photo.jpg
```

## What to Look For

### ✅ SUCCESS (Proceed to UI):
```
Structured Components:
  Location:  kitchen
  Subject:   oven
  Shot Type: CU

Generated Name: kitchen-oven-CU

Validation:
  ✓ Structured format returned
  ✓ Name uses kebab-case pattern
  ✓ Name has 3 components
  ✓ Shot type from controlled vocabulary

✓ Test passed!
```

### ⚠️ NEEDS TUNING:
```
⚠ WARNING: AI returned legacy format

OR

✗ Shot type not in vocabulary: CLOSEUP
```

**Action:** Test with 2-3 more images. If pattern persists, we'll tune the prompts.

## Test Multiple Images

```bash
# Quick batch test
for img in test-images/*.jpg; do
  echo "Testing $img..."
  npm run test:ai-structured "$img"
  echo ""
done
```

## Expected Accuracy

- **80%+ shot type correct** (4/5 images)
- **90%+ location correct**
- **90%+ subject correct**

## Next Steps

**If tests pass:** I'll proceed with UI implementation
**If tests fail:** We'll tune prompts together

---

**Full documentation:** `docs/005-DOC-TESTING-AI-STRUCTURED.md`
