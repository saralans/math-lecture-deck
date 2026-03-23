# Math Lecture Deck Generator — Product Roadmap

**Product:** Math Lecture Deck Generator
**Stack:** Vite + React, Supabase Auth, Cloudflare Workers AI (llama-3.3-70b), Vercel Serverless
**Current State:** Single-user MVP. Generates structured lecture decks (10 slide types, 20 math subjects), KaTeX rendering, in-browser edit mode, localStorage library, URL hash sharing, export to txt/md/tex/PDF/JSON.

---

## Dependency Map (read before phasing)

```
Caching (Phase 1)
  └── required before: scaling, free tier economics, cost control

Supabase DB + User Profiles (Phase 1)
  └── required before: cloud library sync, roles, institution platform,
                        group folders, homework upload, exam generation

Rate Limiting + Usage Tracking (Phase 1)
  └── required before: pricing tiers, paid plan enforcement

Server-side Deck Storage (Phase 2)
  └── required before: group resource folders, institution platform, cross-device access

Auth Roles: Teacher / Student / Admin (Phase 3)
  └── required before: institution platform, homework correction, class management

Proof Builder (Phase 2)
  └── required before: proof-to-LaTeX export (same feature, two outputs)

PowerPoint / Google Slides Export (Phase 2)
  └── required before: Canva export (reused SVG pipeline)
```

---

## Phase 1: MVP+ — Durability & Economics
**Goal:** Make the free tier sustainable. Add caching and the database layer that everything else depends on. Ship the pricing model.
**Timeline:** 6–10 weeks

---

### 1.1 Server-Side Caching of AI-Generated Decks

**What:** Store generated deck JSON in Supabase, keyed by `(subject, concept_normalized)`. On subsequent requests for the same pair, return the cached deck instantly rather than calling Cloudflare AI.

**Why:** Cloudflare charges per token and enforces daily rate limits. A cache eliminates the dominant cost driver and removes the rate limit wall free users hit. Latency drops from ~8–15s to <200ms for popular concepts.

**Implementation:**
- Supabase table: `decks_cache (id, subject, concept_slug, deck_json, created_at, hit_count)`
- Normalize concept key: lowercase, trim, strip punctuation (`cauchy_sequences` not `Cauchy Sequences!`)
- Cache TTL: 30 days (theorems don't change). Admin "invalidate" button.
- Context field bypasses cache — personalized decks are not cached.
- `api/generate.js` queries Supabase before calling Cloudflare. On miss, insert after generation.

**Risk:** LOW

---

### 1.2 Usage Tracking and Rate Limiting

**What:** Track decks generated per user per billing period. Enforce per-tier limits server-side.

**Why:** Without usage tracking, a single free user can exhaust your Cloudflare quota. Required gating mechanism for monetization.

**Implementation:**
- Supabase table: `usage_events (user_id, subject, concept, cached, created_at)`
- Server-side JWT validation in `api/generate.js` via Supabase service-role key
- `callAPI()` in `prompt.js` passes Supabase auth token in request header
- Rate limit response: 429 (already handled in `api/generate.js`)

**Risk:** MEDIUM — requires server-side JWT validation; service-role key must never reach the browser bundle.

---

### 1.3 Cloud Library Sync

**What:** Migrate the deck library from localStorage (`math_deck_library`) to a Supabase `user_decks` table. localStorage becomes offline fallback only.

**Why:** localStorage is per-browser, per-device, capped at ~5 MB. Users lose their library when they clear cookies or switch devices.

**Implementation:**
- Table: `user_decks (id, user_id, subject, concept, deck_json, created_at, updated_at)`
- `library.js` functions become async Supabase calls
- RLS policy: `user_id = auth.uid()`
- Migration: on first login after launch, sync localStorage → Supabase, then clear localStorage

**Risk:** LOW

---

### 1.4 Pricing Launch

See Section 6: Pricing Model.

---

## Phase 2: Growth — Core Feature Expansion
**Goal:** Add high-value features that deepen engagement. Unlock the Creator tier.
**Timeline:** 3–5 months after Phase 1

---

### 2.1 Drag-and-Drop Proof Builder

**What:** A block-based editor where users assemble a mathematical proof by dragging typed blocks (Given, Assumption, Case, Step, QED) into sequence. Each block has a KaTeX math field and optional notes.

**Why:** Proof-writing is the hardest skill in undergraduate math and the most time-consuming for instructors to demonstrate. A visual builder lowers the barrier for students experimenting with proof structure.

**Implementation:**
- Library: `@dnd-kit/core` (lightweight, React-native; `react-beautiful-dnd` is deprecated)
- Each block: `{ id, type, label, math, notes }` — ordered array
- Reuse existing `MathBlock`/`MathText` components from `slideRenderers.jsx` for rendering
- Save to `user_proofs` Supabase table (Phase 1 DB required)
- v1: flat/linear proof only — no nested sub-proofs

**Risk:** MEDIUM — DnD is fiddly for nested structures; keep data model flat.

---

### 2.2 Proof Builder → LaTeX Export

**What:** One-click `.tex` export from the Proof Builder using the `amsthm` proof environment.

**Why:** The target audience lives in LaTeX. An AI-assisted → visual proof → compilable `.tex` pipeline removes hours of formatting work.

**Implementation:**
- Extend `buildLatex()` in `SlideshowScreen.jsx` — `safeTex` escaping is already production-tested
- Block type → LaTeX mapping: `Given` → `\textbf{Given:}`, `Step` → numbered item in `proof`, `QED` → `\end{proof}`
- Offer standalone `.tex` or Beamer frame output

**Risk:** LOW — pure string generation.

---

### 2.3 Export to PowerPoint (.pptx)

**What:** Generate a `.pptx` where each slide maps to a PowerPoint slide, math is rendered as SVG images, and the navy/gold color scheme is preserved.

**Why:** Instructors upload to LMS platforms (Canvas, Blackboard, Moodle) which expect `.pptx`. Zero-friction path to classroom use.

**Implementation:**
- Library: `pptxgenjs` (MIT, browser-compatible)
- Math: `katex.renderToString(..., { output: 'svg' })` → embed as image in slide
- Speaker notes: `speaker_script` → PowerPoint notes pane (native in pptxgenjs)
- Ship before Google Slides — pptx is the universal intermediary

**Risk:** HIGH for math rendering fidelity. SVG embedding is tested but complex symbols may have edge cases.

---

### 2.4 Export to Google Slides

**What:** Create a Google Slides presentation via the Google Slides API.

**Why:** Many universities are Google Workspace schools. One-click path to a shareable, editable Google Slides deck.

**Implementation:**
- Requires Google OAuth scope (`presentations` write) — separate from Supabase OAuth
- Backend call via Vercel serverless `api/create-slides.js` (not client-side)
- Math: reuse SVG pipeline from pptx export — upload SVGs to Drive, insert as images
- Dependency: pptx export must ship first

**Risk:** HIGH — Google OAuth + Slides API is a significant new auth surface.

---

### 2.5 Practice Exam Generator

**What:** Given a subject and concept list (or an existing deck), generate a practice exam with problems at multiple difficulty levels (computational, conceptual, proof-based) plus full solutions and grading rubrics.

**Why:** Exam prep is the highest-stakes moment for students and most labor-intensive for instructors.

**Implementation:**
- New prompt template: `buildExamPrompt()` → JSON schema with `{ title, subject, concepts[], problems: [{ number, type, difficulty, statement, parts[], solution, grading_rubric }] }`
- New renderer: `ExamProblemCard` — reuses `MathBlock`, color tokens from `styles.js`
- Export: PDF (existing print pattern), LaTeX (`exam` document class), JSON
- "Generate Practice Exam" button on deck summary → prefills concept list
- Store in `user_exams` Supabase table
- Rate limit: counts as 2 deck credits (more token-intensive)

**Risk:** MEDIUM — prompt engineering for well-calibrated difficulty is non-trivial. Start with one difficulty level.

---

### 2.6 Targeted Slide Re-Roll

**What:** "Re-generate this slide" button on any individual slide in edit mode. Sends only that slide's type and context back to the AI for a fresh version.

**Why:** Most common frustration: "the example wasn't quite right." Currently requires full deck regeneration. Targeted re-roll reduces frustration and AI cost (~10% tokens vs full deck).

**Implementation:**
- `regenerateSlide(slideIndex, slideType, concept, subject)` in `prompt.js`
- New prompt template that outputs a single slide JSON object of the specified type

**Risk:** LOW

---

## Phase 3: Platform — Multi-User & Collaboration
**Goal:** Build the institutional layer. B2B revenue unlock.
**Timeline:** 6–9 months after Phase 2

**Hard prerequisite:** Phase 1 DB layer must be fully in production.

---

### 3.1 Auth Roles: Student / Teacher / Institution Admin

**What:** Extend Supabase user profiles with `role` (`student`, `teacher`, `admin`) and `institution_id`. Teachers manage classes; students join classes; admins manage seats and billing.

**Why:** Required before any Phase 3 features. Everything institutional depends on roles.

**Implementation:**
- RLS policies become role-aware (teacher can read/write all decks in their `class_id`; students read-only)
- `src/auth.js` `onAuthChange` extended to include `role` and `institution_id` from `user_profiles` table
- Students join via class invite code; teachers self-select during onboarding; admins provisioned by institution
- v1: three roles only — no custom permission matrices

**Risk:** MEDIUM — RLS complexity grows fast with roles. Test all role combinations with pgTAP before deployment.

---

### 3.2 Institution & Teacher/Student Platform

**What:** Teacher creates a class (e.g., "Math 312 Real Analysis, Spring 2026"). They share decks, assign exams, see student access analytics. Students see a class feed with due dates. Institution admin manages seats and billing.

**Why:** Individual subscriptions cap at $29/month. An institution deal is $5,000–$50,000/year.

**Implementation:**
- Tables: `institutions`, `classes`, `class_memberships`, `class_assignments`
- Teachers: "Classes" tab on setup screen
- Students: "My Classes" view replaces (or supplements) personal library
- Invite codes: short alphanumeric per class
- LMS integration (Canvas/Moodle LTI): Phase 4

**Risk:** MEDIUM-HIGH — significant UI surface area expansion. Ship role infrastructure first.

---

### 3.3 Group Resource Folders

**What:** Shared folders where study groups or classes collectively save decks, proofs, and exams. Any member can add; teacher/owner can curate.

**Why:** Students form study groups organically. A shared space within the tool increases daily engagement and word-of-mouth.

**Implementation:**
- Tables: `resource_folders (id, name, owner_id, class_id nullable)`, `folder_items (folder_id, resource_type, resource_id, added_by, added_at)`
- Folder types: personal, group, class (teacher-curated)
- Library tab becomes tabbed: "My Decks" / "My Groups" / "Class Resources"
- Real-time updates via Supabase Realtime

**Risk:** LOW-MEDIUM

---

### 3.4 Homework Correction & Personalized Learning (Beta)

**What:** Student uploads a photo or PDF of their homework. AI identifies errors and generates a targeted mini-deck addressing their specific mistakes.

**Why:** Personalized feedback is the most labor-intensive part of teaching. An AI first-pass that catches structural errors and generates remediation content saves time for both students and instructors.

**Implementation:**
- File upload: Supabase Storage private bucket, max 10 MB, PDF or image
- Vision model: GPT-4o or Claude claude-sonnet-4-6 vision (Cloudflare has no suitable math OCR model — new vendor dependency)
- Output: deck JSON with a `feedback` slide type: `{ type: 'feedback', error_found, incorrect_work, correction, explanation }`
- Privacy: no caching of homework. Auto-delete submissions after 30 days. Document in privacy policy.
- Launch as a beta gated behind a waitlist

**Risk:** HIGH — multi-modal AI, OCR quality on handwriting, new vendor, PII handling.

---

## Phase 4: Advanced — AI-Native Differentiation
**Goal:** Features no competitor can easily replicate.
**Timeline:** 9–18 months out

---

### 4.1 Podcast Generator

**What:** Take a deck (or set of decks) and generate a conversational audio explainer (~10 minutes) where a host walks through the material naturally, not reading bullet points. Output as `.mp3` with a personal RSS feed.

**Why:** Audio is underserved in math education. Commute time and review sessions are untapped use cases. A personal math podcast feed is highly shareable.

**Implementation:**
- Script: extend `buildPrompt` to output long-form conversational transcript from `speaker_script` fields (already "conversational but mathematically precise")
- Math-to-speech: script generation step must convert all LaTeX to spoken English ("epsilon delta" not `$\epsilon - \delta$`)
- TTS: Cloudflare Workers AI (`@cf/myshell-ai/melotts`) or ElevenLabs for higher quality
- Storage: `.mp3` in Supabase Storage, linked to source deck
- RSS: personal feed URL for paid users (Apple Podcasts / Spotify compatible)

**Risk:** HIGH — math-to-spoken-English quality is unpredictable. Budget for ElevenLabs as fallback.

---

### 4.2 Interactive Concept Maps

**What:** AI-generated visual graph showing how concepts in a subject relate. Nodes = concepts; edges = labeled relationships ("required for", "generalized by", "used in proof of"). Clicking a node opens or generates its deck.

**Why:** Students struggle to understand where they are in a subject and what to learn next. The existing summary slide has a "Connections" field — this makes it visual and navigable.

**Implementation:**
- New prompt: `buildConceptMapPrompt(subject)` → `{ nodes: [{id, label, difficulty}], edges: [{from, to, relationship}] }`
- Renderer: `react-flow` (better React integration than d3-force)
- Cache per subject in Supabase (concept maps change rarely)
- Node click: if in library → open directly; else → "Generate this deck" button

**Risk:** MEDIUM — graph layout can be fiddly; use `react-flow` to avoid implementing force-directed layout from scratch.

---

### 4.3 Presenter Mode with Student QR View

**What:** Full-screen zero-chrome presentation mode with keyboard navigation. Generates a QR code that opens a "student view" URL — read-only, mirrors the current slide in real time as the presenter advances.

**Why:** Makes the app usable in an actual classroom without switching to PowerPoint. The student QR view is a differentiator no competitor currently offers.

**Implementation:**
- Full-screen: browser native Fullscreen API
- Student view: Supabase Realtime channel broadcasting current slide index
- QR code: `qrcode` npm package, client-side generation

**Risk:** LOW-MEDIUM

---

### 4.4 Canva Export

**What:** Generate a Canva design via the Canva Connect API applying the navy/gold design tokens.

**Why:** Canva is dominant for non-academic audiences. Instructors sharing math content outside university settings live here.

**Implementation:**
- Canva Connect API (developer preview as of 2025)
- Reuse SVG math rendering pipeline from pptx export
- Lower priority than pptx and Google Slides

**Risk:** MEDIUM — API availability and rate limits outside your control.

---

## Additional Recommended Features

These were not in the original list but have high signal-to-noise for this market:

| Feature | What & Why | Effort |
|---|---|---|
| **Textbook Upload** | Upload a PDF chapter → decks that match its exact notation and problem numbering. Your `textbook_ref` field is architecturally ready for this. | HIGH |
| **Spaced Repetition** | Flashcard review from existing `definition.term`, `theorem.statement`, `exercise.problem` fields. Near-zero new content — pure UI + SM-2 scheduling. | MEDIUM |
| **Course Module Generator** | Batch 4–8 related concepts into a cohesive unit with cross-deck "Recall" references. Teachers think in modules, not individual concepts. | MEDIUM |
| **LaTeX Source Editor** | Split-pane view: raw `.tex` on left, compiled preview on right. Power users want direct access. `buildLatex()` already generates correct Beamer. | MEDIUM |
| **Version History** | Snapshot before each edit session. Rolling back makes edit mode safe to use aggressively. Store in `user_deck_versions` table. | LOW |
| **Subject Voting Board** | Public upvote board for new subject/concept requests. Community signal for `data.js` additions and `systemPromptHint` tuning. | LOW |

---

## Pricing Model

### Free — "Chalk"
**$0/month**
- 5 AI-generated decks per month (cached results don't count)
- Local library only — no cloud sync
- All export formats (txt, md, tex, PDF, JSON)
- No exam generation, no proof builder

*Rationale: 5 decks/month ≈ one concept per week — enough to demonstrate full value, not enough for regular academic use.*

---

### Pro — "Theorem"
**$12/month · $96/year ($8/month)**
- 60 AI-generated decks/month
- All 20 subjects, unlimited
- Cloud library sync across devices
- Practice exam generation (10/month)
- Proof builder + LaTeX export
- PowerPoint + Google Slides export
- Targeted slide re-roll
- Version history (last 10 versions per deck)
- Spaced repetition review mode

*Rationale: Below the psychological threshold for a student who uses it weekly. Annual plan creates retention.*

---

### Creator — "Manifold"
**$29/month · $228/year ($19/month)**
- Unlimited AI-generated decks
- Unlimited exam generation
- Course module generator (multi-concept batch)
- Presenter mode with student QR view
- LaTeX source editor
- Podcast generation (5 episodes/month)
- Textbook upload + syllabus integration
- Priority generation (queue bypass)
- Dedicated support

*Rationale: Instructors replacing hours of prep work. $29/month is trivial. "Unlimited" removes cognitive overhead.*

---

### Institution — "Campus"
**Starting at $499/month (up to 50 seats), custom pricing above**
- All Creator features for all seats
- Institution admin dashboard
- Class management, teacher/student roles
- Group resource folders
- Homework correction (beta)
- SSO / LMS integration (Canvas, Moodle) — Phase 4
- Usage analytics per instructor and class
- Annual contract, invoicing, NET-30 terms

*Rationale: $10/seat/month — well below comparable ed-tech tools (Gradescope, Wolfram Alpha Pro). One tool covers lecture prep, exam generation, and student review.*

**14-day free trial of Pro for all new signups. No credit card required.**

---

## Technical Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Cloudflare AI rate limits hit under load | HIGH | Phase 1 cache is primary mitigation. Add exponential backoff + user-facing queue position. |
| Math rendering in pptx/Google Slides | HIGH | SVG approach is reliable — test edge cases: display math, aligned environments, fraction stacks. Plain-text fallback. |
| Homework vision AI cost and quality | HIGH | Gate behind waitlist. Use GPT-4o for OCR (10–20x more expensive). Establish monthly spend caps. |
| Supabase RLS policy misconfiguration exposing data | HIGH | Write automated RLS policy tests with pgTAP. Never deploy schema changes without testing all role combinations. |
| LaTeX backslash escaping in AI output | MEDIUM | Already patched in `api/generate.js`. Monitor for new failure modes with complex symbols. |
| localStorage library lost on browser clear | MEDIUM | Phase 1 cloud sync eliminates this. Until then, add "Export library as JSON" to the Library tab. |
| Podcast math-to-speech quality | MEDIUM | Speaker scripts already avoid heavy LaTeX — use these as audio script seed rather than formal fields. |
| Google OAuth scope creep | LOW | Request only `presentations` write scope. Never request Drive access or profile data beyond what Supabase holds. |
| Canva API availability (developer preview) | MEDIUM | Treat as lower priority. Don't block other export formats on it. |

---

## Phase Summary

| Phase | Timeline | Key Deliverables | Revenue Unlock |
|---|---|---|---|
| 1: MVP+ | 6–10 weeks | Caching, cloud library, usage tracking, pricing | Free tier sustainable, paid conversion |
| 2: Growth | 3–5 months | Proof builder, pptx export, practice exams, slide re-roll | Creator tier, instructor adoption |
| 3: Platform | 6–9 months | Auth roles, institution platform, group folders, homework correction | Campus tier, B2B revenue |
| 4: Advanced | 9–18 months | Podcast, concept maps, presenter mode, course modules, Canva | Market differentiation, viral loops |
