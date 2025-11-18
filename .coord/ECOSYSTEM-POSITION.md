# Ingest Assistant - Ecosystem Position

**POSITION:** Step 6 of 10 in EAV Production Pipeline
**ROLE:** AI-powered footage pre-tagging → Initial metadata extraction before editing
**TYPE:** External Electron desktop application (macOS)

---

## 🎯 Where We Fit

```
EAV Production Pipeline (10 Apps):
1. Data Entry Web      → Client specs to structured data
2. Copy Builder        → Library assembly
3. Copy Editor ✅      → Creates component spine (script_components)
4. Scenes Web ✅       → Shot planning (references components)
5. Cam Op PWA          → Offline filming (marks shots complete)
6. 🎬 INGEST ASSISTANT ← YOU ARE HERE
7. CEP Panel           → Premiere Pro ingestion + metadata tagging
8. VO Web              → Voice-over generation
9. Edit Web            → Timeline assembly guidance
10. Translations Web    → Subtitle i18n

**Full Pipeline:** /Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md
```

---

## 📥 What We Receive (Inputs)

### From Upstream: Cam Op PWA (Step 5)
**Data:** Raw footage files from field filming
- **Location:** LucidLink (images) + Ubuntu Server (video)
- **Format:** Camera files (e.g., `MVI_1234.MOV`, `IMG_5678.JPG`)
- **State:** Untagged or minimally tagged (camera metadata only: date, resolution, codec)
- **Context:** Filming complete, shots marked done in Cam Op PWA

### From Filesystem: Media Files
**Video Files:**
- **Codecs:** H.264, HEVC, etc.
- **Compatibility:** May require transcoding for QuickTime Player
- **Hardware Acceleration:** H.264 transcoding available

**Image Files:**
- **Formats:** JPEG, PNG, etc.
- **EXIF Support:** Embedding metadata into image files

---

## 📤 What We Produce (Outputs)

### Primary Output: Pre-Tagged XMP Metadata
**Target:** XMP sidecar files or embedded metadata
- **Location:** AI-suggested location tag
- **Subject:** AI-identified subject (e.g., "oven", "sink", "countertop")
- **Action:** AI-detected action (e.g., "cleaning", "installing", "repairing")
- **Shot Type:** AI-classified shot type (WS, CU, MID, etc.)
- **Title:** Structured `{location}-{subject}-{action}` format

**Format:** XMP metadata written to files, readable by CEP Panel (Step 7)

### Secondary Output: Transcoded Video (If Needed)
**Purpose:** Ensure QuickTime Player compatibility
- **Target Codec:** H.264 (hardware-accelerated)
- **Trigger:** Incompatible source formats (e.g., some HEVC variants)
- **Output:** Transcoded video file with preserved metadata

### Downstream Impact: CEP Panel (Step 7)
**How CEP Panel Uses Our Output:**
- Pre-tagged XMP metadata displayed for editor review
- AI suggestions reduce manual tagging time by 60-80%
- Editor confirms or adjusts tags before Premiere Pro ingestion

---

## 🔗 Integration Points

### Current State: Standalone Tool
- **Database:** None (filesystem-based metadata only)
- **Monorepo Connection:** Not integrated (Phase 1)
- **Data Flow:** Cam Op PWA → Ingest Assistant → CEP Panel (manual handoff via filesystem)

### AI Providers Integration
- **OpenRouter:** Multi-model AI routing
- **Anthropic Claude:** Vision analysis for intelligent tagging
- **OpenAI:** Alternative AI provider for metadata generation

### Future Integration (Phase 2 - Planned)
- **Database:** Read from `shots` table in Supabase
- **Shot Context:** Load shot planning from Scenes Web to guide AI tagging
- **Validation:** Cross-check AI suggestions against planned shots
- **Two-Way Sync:** Update `shots.filmed_metadata` with AI analysis results

**Integration Point Schema (Future):**
```sql
-- Future: Ingest Assistant reads shot planning context
shots {
  id uuid
  script_component_id uuid FK → script_components.id
  location text          ← Scenes Web provides expected values
  subject text           ← Scenes Web provides expected values
  action text            ← Scenes Web provides expected values
  shot_type text         ← Scenes Web provides expected values
  filmed_metadata jsonb  ← Ingest Assistant writes AI analysis
  filename text          ← Ingest Assistant matches to planned shot
}
```

---

## 🎬 Our Critical Role in Pipeline

### Problem We Solve
**Before Ingest Assistant:**
- Hours of manual metadata tagging per project
- No AI assistance (editors tag every clip manually)
- Inconsistent naming conventions
- Slow ingestion workflow (bottleneck before editing)

**After Ingest Assistant:**
- AI pre-tags 80% of clips correctly (reduces manual work)
- Consistent metadata format (structured naming)
- Fast ingestion workflow (editors review vs. tag from scratch)
- CEP Panel gets high-quality starting point

### Why We're Essential
1. **AI Acceleration:** Reduces metadata tagging time from hours to minutes
2. **Pre-Editing Preparation:** Footage ready for Premiere Pro ingestion (CEP Panel)
3. **Quality Control:** Human-in-the-loop review before downstream tools
4. **Transcoding Gateway:** Ensures video compatibility for editing software

---

## 🔄 Workflow (Current State)

### Step-by-Step Process
1. **Raw footage arrives** → Stored in LucidLink (images) + Ubuntu Server (video)
2. **User launches Ingest Assistant** → Electron desktop app (macOS)
3. **User selects files** → Choose clips/images for metadata tagging
4. **Manual or AI Mode:**
   - **Manual Mode:** User types metadata fields directly
   - **AI Mode:** AI analyzes footage, suggests metadata
5. **AI analyzes footage** → Computer vision identifies location, subject, action, shot type
6. **User reviews AI suggestions** → Confirm or adjust tags
7. **Metadata written to XMP** → Embedded or sidecar files
8. **Video transcoding (if needed)** → H.264 conversion for compatibility
9. **Result** → Pre-tagged footage ready for CEP Panel (Step 7)

---

## 🏗️ Architecture Boundaries

### What We Own (Responsibilities)
- AI-powered metadata analysis (vision, NLP)
- XMP metadata writing (sidecar + embedded)
- Video transcoding (H.264 hardware acceleration)
- macOS desktop UI (Electron + React)
- Multi-AI provider routing (OpenRouter, Anthropic, OpenAI)

### What We Don't Own (Out of Scope)
- ❌ Script component creation (Copy Editor owns `script_components` table)
- ❌ Shot planning (Scenes Web owns `shots` table - until Phase 2 integration)
- ❌ Premiere Pro ingestion (CEP Panel handles in-app metadata)
- ❌ Timeline assembly (Edit Web + Adobe Premiere Pro)
- ❌ Footage storage infrastructure (LucidLink + Ubuntu Server)

### Dependencies
- **Upstream:** Cam Op PWA (filmed footage marked complete)
- **Platform:** macOS (Electron), Node.js runtime
- **AI Providers:** OpenRouter, Anthropic Claude, OpenAI APIs
- **Future:** Supabase (Phase 2 database integration)
- **Future:** EAV Monorepo shared types (Phase 2)

---

## 📊 Key Metrics & Success Criteria

### Performance
- AI analysis time: <5 seconds per clip (video)
- AI analysis time: <2 seconds per image
- Transcoding throughput: Real-time or faster (hardware acceleration)
- UI responsiveness: 60fps during AI processing (background threads)

### Quality
- AI accuracy: 80%+ correct tags (location, subject, action)
- Shot type classification: 90%+ accuracy (WS, CU, MID, etc.)
- Zero data loss: Metadata always persists to XMP
- Transcoding quality: Lossless or near-lossless

### User Experience
- Batch processing: Handle 100+ clips without freezing
- Manual override: Always allow user to correct AI suggestions
- Error handling: Clear, actionable error messages
- Progress feedback: Real-time status during AI analysis

---

## 🚀 Future Vision (Phase 2+)

### Phase 2: Supabase Integration
- **Read from `shots` table** → Load expected metadata from Scenes Web shot planning
- **Validate AI suggestions** → Cross-check against planned shots ("Did we film this?")
- **Write to `shots.filmed_metadata`** → Store AI analysis results in database
- **Match filename to shot** → Link raw footage to planned shot IDs

### Phase 3: Advanced AI Features
- **Multi-frame analysis** → Analyze multiple frames for better accuracy
- **Confidence scoring** → Show AI confidence levels for each tag
- **Learning from corrections** → Improve AI accuracy based on user edits
- **Lexicon support** → Project-specific vocabularies (medical, construction, etc.)

### Phase 4: Workflow Automation
- **Auto-watch directories** → Monitor LucidLink/Ubuntu Server for new footage
- **Auto-trigger analysis** → Batch process new clips automatically
- **Notification system** → Alert editors when ingestion complete
- **Integration with CEP Panel** → Direct handoff (no manual file selection)

---

## 🔍 Quick Reference

### Our Position Summary
| Aspect | Details |
|--------|---------|
| **Pipeline Step** | 6 of 10 |
| **Upstream** | Cam Op PWA (filmed footage) |
| **Downstream** | CEP Panel (Premiere Pro ingestion) |
| **Platform** | Electron desktop app (macOS) |
| **Current State** | Standalone tool (no database) |
| **Future State** | Supabase integration (Phase 2) |
| **Critical Role** | AI pre-tagging gateway (raw footage → structured metadata) |

### Integration Status
| Feature | Current | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| AI Metadata Analysis | ✅ Yes | ✅ Yes | ✅ Enhanced |
| XMP Metadata Writing | ✅ Yes | ✅ Yes | ✅ Yes |
| Video Transcoding | ✅ Yes | ✅ Yes | ✅ Yes |
| Supabase `shots` Read | ❌ No | ✅ Yes | ✅ Yes |
| Supabase `shots` Write | ❌ No | ✅ Yes | ✅ Yes |
| Multi-Frame Analysis | ❌ No | ❌ No | ✅ Yes |
| Auto-Watch Directories | ❌ No | ❌ No | ✅ Yes |

---

## 🛠️ Technical Capabilities

### Supported Video Codecs
- **H.264:** Native support (QuickTime compatible)
- **HEVC:** Detection + transcoding if incompatible
- **Others:** Extensible codec detection framework

### AI Provider Support
- **Primary:** Anthropic Claude (vision analysis)
- **Alternative:** OpenAI (vision models)
- **Router:** OpenRouter (multi-model routing)

### Security Features
- **Path Traversal Protection:** Validates all file paths
- **macOS Symlink Resolution:** Prevents symlink attacks
- **Sandboxed AI Calls:** Rate limiting + error handling

### Quality Gates (Current State)
- **Lint:** ✅ PASS (0 errors, 0 warnings in production code)
- **Typecheck:** ✅ PASS (0 errors)
- **Tests:** ✅ PASS (446/446 passing across 28 test files)
  - **Validated:** 2025-11-11 (test script fixed, all quality gates green)

---

## 📚 Related Documentation

**EAV Monorepo (Main Pipeline):**
- **Complete Pipeline:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- **North Star:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`
- **Project Context:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md`

**External Tools:**
- **CEP Panel:** `/Volumes/HestAI-Projects/eav-cep-assist/.coord/ECOSYSTEM-POSITION.md`

**This Project:**
- **Project Context:** `.coord/PROJECT-CONTEXT.md`
- **Roadmap:** `.coord/PROJECT-ROADMAP.md`
- **Checklist:** `.coord/SHARED-CHECKLIST.md`

---

## 💡 Critical Insights for Development

### For Developers
- **AI First:** Always provide AI suggestions before manual entry (UX optimization)
- **Human Validation:** Never skip human review gate (quality control)
- **Performance:** AI analysis must be <5s/clip (user patience threshold)
- **Consistency:** Structured naming format must match CEP Panel expectations

### For AI Integration
- **Vision Models:** Prefer Anthropic Claude for detailed scene analysis
- **Prompt Engineering:** "Describe location, subject, action in video" format
- **Error Handling:** Graceful fallback to manual mode if AI fails
- **Rate Limiting:** Respect AI provider rate limits (avoid throttling)

### For Phase 2 Planning
- **Database Schema:** Align with monorepo `shots` table structure
- **Auth Strategy:** Supabase RLS policies (same as monorepo apps)
- **Deployment:** Consider Electron app update mechanism for database integration
- **Backwards Compatibility:** Phase 1 (standalone) must still work in Phase 2

---

**CRITICAL INSIGHT:** We are the **AI pre-tagging gateway** that transforms hours of manual metadata work into minutes of AI-assisted review. Without us, editors face tedious manual tagging. With us, CEP Panel (Step 7) gets high-quality starting metadata, and the entire pipeline accelerates.

**LAST UPDATED:** 2025-11-11 (Quality gates validated - all tests passing)
**PATTERN:** Ecosystem positioning + AI integration strategy + Future vision
