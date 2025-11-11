# Complete Lexicon Field Mapping

## Settings UI → Lexicon → Prompt Flow

### Field Mapping Table

| UI Field (SettingsModal) | Lexicon Property | Used in Prompt? | Prompt Location | Notes |
|--------------------------|------------------|-----------------|-----------------|-------|
| **Pattern** | `pattern` | ❌ NO | - | **ISSUE**: Stored but not used in prompt generation |
| **Common Locations** | `commonLocations` | ✅ YES | `LOC::${locations}[+custom]` | Line 94 in aiService.ts |
| **Common Subjects** | `commonSubjects` | ✅ YES | `SUB::${subjects}[+custom]` | Line 95 in aiService.ts |
| **Common Actions** | `commonActions` | ✅ YES | `ACT::${actions}[video_only]` | Line 96 in aiService.ts |
| **Word Preferences** | `wordPreferences` | ✅ YES | `MAP::${synonyms}[british_english]` | Lines 79-82, 101 in aiService.ts |
| **AI Instructions** | `aiInstructions` | ✅ YES | `RULES::${lexicon.aiInstructions}` | Lines 104-106 in aiService.ts |
| **Good Examples** | `goodExamples` | ✅ YES | `GOOD::${goodExamples}` | Lines 84, 110 in aiService.ts |
| **Bad Examples** | `badExamples` | ✅ YES | `BAD::${badExamples}` | Lines 85-87, 112 in aiService.ts |
| *(not in UI)* | `shotTypes.static` | ✅ YES | `STATIC[${staticShots}]` | Lines 76, 97, 116 in aiService.ts |
| *(not in UI)* | `shotTypes.moving` | ✅ YES | `MOVING[${movingShots}]` | Lines 77, 97 in aiService.ts |

---

## Complete Data Flow

### 1. User Input (Settings Modal)
User fills in 8 text fields:
```typescript
{
  pattern: "{location}-{subject}-{shotType}",
  commonLocations: "kitchen, bathroom, hall...",
  commonSubjects: "oven, tap, door...",
  commonActions: "cleaning, opening, demo...",
  wordPreferences: "trash → bin\nfaucet → tap",
  aiInstructions: "Generate structured name...",
  goodExamples: "kitchen-oven-CU\nbath-tap-MID",
  badExamples: "Kitchen-Oven[capitals]\nkitchen_oven[underscores]"
}
```

### 2. Conversion (lexiconConverter.ts)
UI format → Storage format:
```typescript
{
  pattern: "{location}-{subject}-{shotType}",
  commonLocations: ["kitchen", "bathroom", "hall"],
  commonSubjects: ["oven", "tap", "door"],
  commonActions: ["cleaning", "opening", "demo"],
  wordPreferences: { "trash": "bin", "faucet": "tap" },
  aiInstructions: "Generate structured name...",
  goodExamples: ["kitchen-oven-CU", "bath-tap-MID"],
  badExamples: [
    { wrong: "Kitchen-Oven", reason: "capitals" },
    { wrong: "kitchen_oven", reason: "underscores" }
  ],
  shotTypes: {
    static: ["WS", "MID", "CU", "UNDER"],
    moving: ["FP", "TRACK", "ESTAB"]
  }
}
```

### 3. Storage (config.yaml)
Saved to YAML format (same structure as above)

### 4. Prompt Generation (aiService.ts)
Lexicon data interpolated into ultra-compressed prompt:

```
TASK::{location}-{subject}-{shotType|action+shotType}

SCHEMA::PHOTO[{loc}-{sub}-{shot}]|VIDEO[{loc}-{sub}-{act}-{shot}]

VOCAB::[
  LOC::kitchen, bathroom, hall[+custom],
  SUB::oven, tap, door[+custom][controls|serial=suffix_if_focus],
  ACT::cleaning, opening, demo[video_only],
  SHOT::STATIC[WS, MID, CU, UNDER]|MOVING[FP, TRACK, ESTAB][photo=static_only]
]

MAP::trash→bin, faucet→tap[british_english]

RULES::Generate structured name as {location}-{subject}-{shotType}

IMPORTANT RULES:
- Use British English always
...

REF::[GOOD::kitchen-oven-CU, bath-tap-MID|BAD::Kitchen-Oven[capitals], kitchen_oven[underscores]]

OUT::JSON{"location":"str","subject":"str","shotType":"WS","mainName":"loc-sub-shot","metadata":["max4","brand_if_visible"]}
```

---

## Current config.yaml Values (Updated)

```yaml
lexicon:
  commonLocations:
    - kitchen
    - bathroom
    - bedroom
    - living-room
    - dining-room
    - hallway
    - laundry
    - garage
    - office
    - utility-room
    - pantry
    - exterior

  commonSubjects:
    - bin
    - oven
    - hob
    - microwave
    - refrigerator
    - dishwasher
    - wine-cooler
    - sink
    - tap
    - counter
    - cabinet
    - drawer
    - plug-socket
    - media-plate
    - spur-switches
    - toilet
    - shower
    - bath
    - mirror
    - controls
    - window
    - door
    - light
    - switch
    - serial
    - label

  commonActions:
    - cleaning
    - moving
    - turning-on
    - opening
    - demo
    - installing
    - replacing
    - inspecting
    - removing
    - adjusting

  wordPreferences:
    trash: bin
    cooker: oven
    stove: hob
    electrical-socket: plug-socket
    multimedia-wall-plate: media-plate
    appliance switches: spur-switches
    wine fridge: wine-cooler
    faucet: tap

  shotTypes:
    static:
      - WS
      - MID
      - CU
      - UNDER
    moving:
      - FP
      - TRACK
      - ESTAB

  aiInstructions: |
    Generate structured name as {location}-{subject}-{shotType}

    IMPORTANT RULES:
    - Use British English always
    - Add manufacturer/brand to metadata if visible
    - Location should be room type
    - Subject should be main object
    - Shot type MUST be from controlled vocabulary

    NAMING CONVENTIONS:
    - If appliance controls: "[type]-controls"
    - If serial label: "[type]-serial"
    - Keep subject concise, 1-3 words, kebab-case

    METADATA RULES:
    - Maximum 4 tags
    - Include manufacturer if visible
    - Use British English terms

  goodExamples:
    - kitchen-oven-CU
    - bath-shower-MID
    - kitchen-dishwasher-cleaning-MID
    - hall-door-opening-WS
    - utility-spur-switches-CU

  badExamples:
    - wrong: Kitchen-Oven-CU
      reason: mixed case
    - wrong: kitchen_oven_CU
      reason: underscores
    - wrong: kitchen-fridge freezer-CU
      reason: missing hyphen
```

---

## Issues Identified & Resolved

### ✅ FIXED: Missing `commonActions` in config.yaml
**Problem**: Field existed in UI but not in example config
**Solution**: Added `commonActions` array with real-world actions from shotlists

### ✅ FIXED: Outdated subjects/locations
**Problem**: Generic placeholder values
**Solution**: Updated with actual production vocabulary from your shotlists

### ✅ FIXED: Missing examples
**Problem**: No `goodExamples`/`badExamples` in config.yaml
**Solution**: Added real production examples

### ✅ FIXED: Incomplete word preferences
**Problem**: Only 3 mappings, some with typos ("hobp")
**Solution**: Added 8 complete British English mappings

### ⚠️ OUTSTANDING: `pattern` field not used
**Problem**: The `pattern` field in UI stores value but prompt generation doesn't use it
**Impact**: Low - pattern is hardcoded in prompt as `{location}-{subject}-{shotType|action+shotType}`
**Options**:
1. Remove from UI (simplify interface)
2. Use it to dynamically generate prompt pattern
3. Keep for future flexibility (current approach)

### ⚠️ OUTSTANDING: `shotTypes` not editable in UI
**Problem**: Shot types defined in config.yaml but no UI to edit them
**Impact**: Medium - users must manually edit YAML to change shot types
**Options**:
1. Add shot type editor to SettingsModal
2. Keep as YAML-only (power user feature)
3. Document in user guide

---

## Verification Checklist

✅ **All UI fields map to lexicon properties**
✅ **All lexicon properties used in prompt** (except `pattern`)
✅ **config.yaml updated with production values**
✅ **Real-world examples from shotlists integrated**
✅ **British English word preferences complete**
✅ **Actions for video analysis included**
✅ **Good/bad examples provided for AI learning**

## Testing the Flow

1. **Open Settings** → Lexicon tab
2. **Verify values loaded** from config.yaml
3. **Modify a field** (e.g., add location "balcony")
4. **Save** → Check console shows config saved
5. **Process an image** → Check console shows prompt with "balcony" in LOC::
6. **Verify AI output** uses new vocabulary

Everything is now properly mapped and synchronized!
