# AI Prompt Template: Structured Analysis (OCTAVE Compressed)

This prompt template uses OCTAVE semantic compression for optimal token efficiency.

**Format:**
- Photos: `{location}-{subject}-{shotType}` (3 parts)
- Videos: `{location}-{subject}-{action}-{shotType}` (4 parts)

**Variables available:**
- `{{locations}}` - Comma-separated list of common locations
- `{{subjects}}` - Comma-separated list of common subjects
- `{{actions}}` - Comma-separated list of common actions (videos only)
- `{{staticShots}}` - Comma-separated list of static shot types
- `{{movingShots}}` - Comma-separated list of moving shot types
- `{{wordPreferences}}` - Synonym mappings (e.g., "faucet" -> "tap")
- `{{aiInstructions}}` - Custom instructions from lexicon config
- `{{goodExamples}}` - Good example filenames
- `{{badExamples}}` - Bad example filenames with reasons

---

## Prompt (Edit Below)

TASK::IMAGE/VIDEO_METADATA_EXTRACTION→STRUCTURED_NAMING

PATTERN::[
  PHOTO::{location}-{subject}-{shotType}[3_parts],
  VIDEO::{location}-{subject}-{action}-{shotType}[4_parts]
]

COMPONENT_RULES::[
  LOCATION::where_shot_taken[COMMON::{{locations}}, FLEXIBILITY::custom_allowed],
  SUBJECT::main_object[COMMON::{{subjects}}, FLEXIBILITY::custom_allowed],
  ACTION::video_only[COMMON::{{actions}}, CRITICAL::omit_for_photos],
  SHOT_TYPE::[
    STATIC[no_movement]::{{staticShots}}[WS=wide[full_scene], MID=mid[partial], CU=closeup[detail], UNDER=underneath[below]],
    MOVING[camera_movement]::{{movingShots}}[FP=focus_pull[rack], TRACK=tracking[follow], ESTAB=establishing[reveal]],
    CONSTRAINT::photos_use_static_only
  ]
]

WORD_PREFERENCES::{{wordPreferences}}

CUSTOM_INSTRUCTIONS::{{aiInstructions}}

EXAMPLES::[
  GOOD::{{goodExamples}},
  BAD::{{badExamples}}
]

---

## Response Format

OUTPUT::JSON_ONLY[no_markdown,no_explanation]

PHOTO_SCHEMA::{
  "location": "location-name",
  "subject": "subject-name",
  "shotType": "SHOT_TYPE",
  "mainName": "location-subject-SHOT_TYPE",
  "metadata": ["tag1", "tag2"]
}

VIDEO_SCHEMA::{
  "location": "location-name",
  "subject": "subject-name",
  "action": "action-verb",
  "shotType": "SHOT_TYPE",
  "mainName": "location-subject-action-SHOT_TYPE",
  "metadata": ["tag1", "tag2"]
}

EXAMPLE::{
  "location": "kitchen",
  "subject": "oven",
  "shotType": "CU",
  "mainName": "kitchen-oven-CU",
  "metadata": ["appliance", "control-panel", "interior"]
}
