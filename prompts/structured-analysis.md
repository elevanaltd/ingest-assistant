# AI Prompt Template: Structured Analysis

This prompt template is used for analyzing images/videos and generating structured metadata.

**Format:** `{location}-{subject}-{shotType}`

**Variables available:**
- `{{locations}}` - Comma-separated list of common locations
- `{{subjects}}` - Comma-separated list of common subjects
- `{{staticShots}}` - Comma-separated list of static shot types
- `{{movingShots}}` - Comma-separated list of moving shot types
- `{{wordPreferences}}` - Synonym mappings (e.g., "faucet" -> "tap")
- `{{aiInstructions}}` - Custom instructions from lexicon config

---

## Prompt (Edit Below)

Analyze this image and generate structured metadata following this pattern:
**{location}-{subject}-{shotType}**

### LOCATION
Identify where the shot takes place.

**Common locations:** {{locations}}

You can use custom locations not in this list if more appropriate.

### SUBJECT
Identify the main object or feature being captured.

**Common subjects:** {{subjects}}

You can use custom subjects not in this list if more appropriate.

### SHOT TYPE
Determine the framing category.

**For static shots (no camera movement):** {{staticShots}}
- **WS** = Wide shot (shows full scene/context)
- **MID** = Midshot (partial scene, main subject visible)
- **CU** = Close up (detail focus)
- **UNDER** = Underneath angle (shot from below)

**For shots with camera movement:** {{movingShots}}
- **FP** = Focus pull (rack focus effect)
- **TRACK** = Tracking (following subject with gimbal/camera movement)
- **ESTAB** = Establishing (scene reveal via pan/tilt/slider)

**Note:** For photos, always use static shot types (WS, MID, CU, UNDER).

---

### Word Preferences
Use these terms consistently:
{{wordPreferences}}

---

### Additional Instructions
{{aiInstructions}}

---

## Response Format

**CRITICAL:** Return ONLY valid JSON in this exact format (no markdown, no explanation):

```json
{
  "location": "location-name",
  "subject": "subject-name",
  "shotType": "SHOT_TYPE",
  "mainName": "location-subject-SHOT_TYPE",
  "metadata": ["tag1", "tag2"]
}
```

### Example Response
```json
{
  "location": "kitchen",
  "subject": "oven",
  "shotType": "CU",
  "mainName": "kitchen-oven-CU",
  "metadata": ["appliance", "control-panel", "interior"]
}
```

---

## Prompt Engineering Notes

**Tips for optimization:**
- Emphasize structured format in opening lines
- Use bold/caps for critical requirements
- Provide concrete examples
- Keep vocabulary lists comprehensive but not overwhelming
- Balance guidance with flexibility

**Testing approach:**
```bash
# Test with this prompt
npm run test:ai-structured test-images/your-image.jpg

# If accuracy < 80%, try adjusting:
# 1. Emphasis on structured format (add more "CRITICAL" markers)
# 2. Example clarity (add more examples)
# 3. Shot type definitions (more descriptive)
# 4. Response format (different JSON structure emphasis)
```

**Version history:**
- v1.0 (2025-11-07): Initial structured prompt with location/subject/shotType
