# AI Prompt Template: Ultra-Compressed Structured Analysis

This ultra-compressed prompt template achieves ~75% token reduction while maintaining 100% decision-logic fidelity.

**Format:**
- Photos: `{location}-{subject}-{shotType}` (3 parts)
- Videos: `{location}-{subject}-{action}-{shotType}` (4 parts)

**Variables available:**
- `{{locations}}` - Comma-separated list of common locations
- `{{subjects}}` - Comma-separated list of common subjects
- `{{actions}}` - Comma-separated list of common actions (videos only)
- `{{staticShots}}` - Comma-separated list of static shot types
- `{{movingShots}}` - Comma-separated list of moving shot types
- `{{wordPreferences}}` - Synonym mappings (e.g., "faucet → tap")
- `{{aiInstructions}}` - Custom instructions from lexicon config
- `{{goodExamples}}` - Good example filenames
- `{{badExamples}}` - Bad example filenames with reasons

---

## Prompt (Edit Below)

TASK::{location}-{subject}-{shotType|action+shotType}

SCHEMA::PHOTO[{loc}-{sub}-{shot}]|VIDEO[{loc}-{sub}-{act}-{shot}]

VOCAB::[
  LOC::{{locations}}[+custom],
  SUB::{{subjects}}[+custom][controls|serial=suffix_if_focus],
  ACT::{{actions}}[video_only],
  SHOT::STATIC[{{staticShots}}]|MOVING[{{movingShots}}][photo=static_only]
]

MAP::{{wordPreferences}}[british_english]

RULES::{{aiInstructions}}

REF::[GOOD::{{goodExamples}}|BAD::{{badExamples}}]

OUT::JSON{"location":"str","subject":"str","action":"str[video_only|optional]","shotType":"WS","mainName":"loc-sub-shot|loc-sub-act-shot[if_video_with_action]","metadata":["max4","brand_if_visible"]}

---

## Response Format

The AI will return JSON matching the OUT:: schema above.
