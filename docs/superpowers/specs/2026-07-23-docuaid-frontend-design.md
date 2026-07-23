# DocuAId Frontend Design

**Date:** 2026-07-23
**Context:** ZOLLHOF track, Claude Impact Lab Hackathon (Nuremberg). Frontend-only scope — backend is a
separate teammate's responsibility, built in parallel against the API contract documented in
[`CLAUDE.md`](../../../CLAUDE.md#frontend--backend-api-contract-docuaid).

## Goal

DocuAId helps immigrants in Germany deal with official letters (from the Ausländerbehörde and similar):
they photograph a document, get it translated and explained (next steps) via the Claude API, and see
their bureaucratic journey laid out as a Duolingo-style path. A second track for using existing
qualifications to apply for jobs/work permits is part of the long-term vision but explicitly out of
scope for today's build — see "Out of scope" below.

Primary constraint: must be usable by tech-illiterate and elderly users. Every design decision below is
weighed against minimal taps and plain language over completeness or polish.

## Scope for today

Priority order, in case time runs out partway through:
1. Document capture → analyze → translated node on the path (this is the demo).
2. The path UI itself (even a single node proves the concept).
3. Anything else (job/qualification track, broader language list, richer error states) is a stretch
   goal, not a requirement.

## Routes & Screens

```
/onboarding        first-run only: language auto-detect + one-tap confirm/change
/                  the path (home) — linear list of nodes, tap one to expand it in place
/upload            capture wizard: camera/file, add pages, review, submit
```

- `/onboarding` runs once (flag stored in `userLocale.confirmed`); returning users land straight on `/`.
- `/` is a vertical winding path (Skeleton UI styled into circles), each node `locked` / `active` /
  `done`. Tapping a `done` or `active` node expands a bottom-sheet overlay **in place** — no navigation
  — showing that node's translation and next steps. `locked` nodes are greyed and non-interactive.
- `/upload` is reached via a `+ Add a letter` button on `/`, enabled only when no node is currently
  `active` (one un-done node at a time). Self-contained wizard: capture → optionally add more pages →
  submit → redirect back to `/` with the new node auto-expanded.
- Deliberately no `/node/[id]` route: node detail is state on `/`, preserving the "tap and it opens
  right there" feel that makes a path UI (rather than a plain list) worth building.

## Data Model & API Contract

Full contract lives in CLAUDE.md (shared with the backend teammate). Summary of the shape the frontend
is built against:

- `PathNode { id, title, status: 'locked'|'active'|'done', translation, nextSteps: [{ text, dueDate?,
  formLinks? }], createdAt }`
- `GET /api/path` → `{ nodes: PathNode[] }`
- `POST /api/analyze-document` `{ images: string[], targetLang }` → `{ translation, nextSteps }`
  (the Claude-API-backed call)
- `POST /api/path/nodes` `{ title, translation, nextSteps }` → `{ node }` (always `status: 'active'`;
  nodes only exist once created from an upload, so there's nothing to lock ahead of time — the
  frontend enforces one active node at a time by disabling new uploads until it's marked done)
- `PATCH /api/path/nodes/:id` `{ status: 'done' }` → `{ node }` (no unlock mechanic needed today)

`targetLang` is an ISO code from the frontend's curated shortlist (`tr`, `ar`, `uk`, `ru`, `pl`, `ro`,
`en`, `fa`, `de`), set once at onboarding and sent with every translation-dependent request.

## Components & State

**Stores** (`src/lib/state/`, Svelte 5 runes):
- `pathState` — hydrated from `GET /api/path` in `/`'s `load` function; holds `PathNode[]`. Mutated
  locally after node-create/update calls so the UI reflects changes immediately without a refetch.
- `uploadDraft` — ephemeral, exists only while `/upload` is open: `{ pages: string[], status:
  'capturing' | 'submitting' }`. Discarded on submit or navigate-away.
- `userLocale` — the one piece of client-only persisted state (`localStorage`): `{ lang, confirmed }`.
  Everything else is server-backed via the API; this is a local preference, not path data.

**Components** (`src/lib/components/`):
- `LanguagePicker.svelte` — curated-shortlist grid; used at onboarding and for later language changes.
- `PathView.svelte` — renders the path from `pathState`; one `PathNodeCircle` per node; wires tap →
  expand.
- `PathNodeCircle.svelte` — visual circle/badge, colored by status.
- `NodeDetailSheet.svelte` — bottom-sheet overlay: translation, next-steps list, "Mark done" button
  (enabled only for `active` nodes) that calls the `PATCH` endpoint and updates `pathState`.
- `UploadWizard.svelte` — orchestrates `CameraCapture.svelte` (device camera via `<input capture>` /
  `getUserMedia`, falling back to file picker) + `PagePreviewStrip.svelte` (thumbnails, "add another
  page" / "submit").
- `HelpOverlay.svelte` — a small, always-present "?" button per screen, opening one paragraph of
  plain-language help for that screen only (never a multi-step tour).

Component boundary rule: each component reads at most one store directly and talks to others only
through store methods or events — e.g. `UploadWizard` calls `pathState.addNode(...)` after a successful
submit but never reaches into `pathState`'s internals.

## End-to-End User Journey

1. **First visit** → `/onboarding`. Browser locale matched against the curated shortlist (nearest
   match, defaulting to English); "We think you speak **[Language]** — is that right?" with a large
   confirm button and a one-tap "choose a different language" fallback. On confirm, `userLocale` saves
   and the user lands on `/`.
2. **Empty path** → `/` with no nodes shows one prompt where the first node would be: "Add your first
   letter to get started" plus the `+ Add a letter` button. No separate empty-state screen.
3. **Upload** → `+ Add a letter` opens `/upload`. Big camera button (or file picker) captures page 1,
   shown as a thumbnail; user can add another page (multi-page letters) or submit.
4. **Submit** → `uploadDraft.status = 'submitting'`, plain-language loading message ("Reading your
   letter..."), calls `POST /api/analyze-document` with all pages + `userLocale.lang`, then
   `POST /api/path/nodes` with the result.
5. **Return to path** → redirect to `/`; new node appears `active`; its `NodeDetailSheet` auto-expands
   once so the translation/next-steps are visible without an extra tap.
6. **Mark done** → user taps "Mark done" in the sheet → `PATCH` → node flips to `done`. The path now
   ends at this `done` node; `+ Add a letter` (disabled while a node was `active`) becomes available
   again, ready to create the next real node once the user uploads the next letter.

## Error Handling

Always plain-language — no stack traces or error codes surfaced.

- **Upload/analyze failure** (network error or non-2xx): "That didn't work — let's try again" with a
  single retry button that resubmits the same captured pages (no re-capture needed).
- **Unreadable image**: if the backend/Claude response flags the image as unreadable, show "We
  couldn't read that clearly — try taking the photo again in better light" and return to the capture
  step with pages cleared.
- **Backend unreachable**: if `GET /api/path` fails, show "We're having trouble connecting" on `/` with
  a retry button — never a silent blank screen. Relevant today specifically because the backend is
  being built in parallel and may not be up yet at any given moment.
- **Unsupported language**: not applicable — the curated shortlist is the full set offered, so there's
  no out-of-list input to handle.

## Accessibility / Minimal-Steps Specifics

(The two priorities selected for today: ultra-minimal steps and an onboarding/help overlay. Large
text/contrast and audio playback are not dedicated work items today, though Skeleton UI's defaults are
reasonably legible out of the box.)

- Exactly one obvious primary action per screen, sized large, with no competing secondary/tertiary
  buttons.
- No confirmation dialogs on non-destructive actions: capture → preview → submit → loading, each step
  flowing directly into the next. The only multi-option moment is "add another page or submit," shown
  as two large buttons, not a form.
- `HelpOverlay.svelte` is the same "?" icon in the same corner on every screen, opening one paragraph of
  plain-language help scoped to that screen only.

## Testing (hackathon-scoped)

Working software to demo is the priority over coverage:

- TypeScript strict mode on, so the `PathNode` contract and API client are checked end-to-end —
  catches contract mismatches against the backend for free.
- A handful of unit tests for path-state transitions (`addNode` locks the right node, `markDone`
  unlocks the right next node) — the one piece of real logic where a silent bug would be embarrassing
  mid-demo.
- No component/e2e suite today. Verify manually in the browser preview as each piece lands. If time
  remains, this is the first thing to expand, not the last thing to cut.

## Out of scope (today)

- Qualification-to-job/work-permit matching track (second parallel path lane) — the path UI should not
  preclude adding this later, but no work on it happens today.
- Full/searchable world-language list — shortlist only.
- Audio/text-to-speech playback of translations.
- Any test suite beyond the light unit tests noted above.
- Multi-device/account sync beyond what the backend's `GET /api/path` already provides per session.
