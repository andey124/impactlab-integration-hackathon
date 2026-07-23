# DocuAId Backend — Design

Date: 2026-07-23
Status: Approved for implementation planning

## Context

`CONCEPT.md` describes DocuAId: an AI-driven bureaucracy navigation tool for highly
qualified migrants going through professional-qualification recognition in Germany.
The frontend (SvelteKit, `src/frontend`) is being built in parallel against a fixed
API contract already documented in `CLAUDE.md`. This spec covers the **backend**
that implements that contract.

Hackathon-required scope per `CONCEPT.md`: the document upload → processing →
suggestion pipeline. Two additional user stories (occupation matching, local office
suggestions) are included in this spec per stakeholder decision, folded into the
existing contract rather than adding new endpoints.

## Architecture

`src/backend/` — Node.js + TypeScript + Express, run locally with `npm run dev`
(a different port than the frontend dev server, e.g. `:3001`, with CORS enabled for
the frontend's dev origin). Single global demo user, no authentication — matches a
one-person live pitch demo and the contract's shape (no userId/session anywhere in
it).

Config via `.env` (`ANTHROPIC_API_KEY`, `PORT`), with `.env` added to `.gitignore`
and an `.env.example` committed.

```
src/backend/
  src/
    server.ts           Express app, route wiring, CORS
    routes/
      path.ts            GET /api/path, POST /api/path/nodes, PATCH /api/path/nodes/:id
      analyze.ts          POST /api/analyze-document
    claude.ts             Anthropic SDK client: tool-use call + 1 retry on transient failure
    db.ts                 better-sqlite3 setup + schema
    enrichment/
      occupations.ts      ESCO lookup + KldB/ISCO crosswalk + labour-market shortage lookup
      offices.ts           static Nuremberg office list + category matching
  data/                    generated JSON caches, derived from the data pack (gitignored)
  .env.example
```

## Data model

SQLite via `better-sqlite3`, single `nodes` table:

| column      | type              |
|-------------|-------------------|
| id          | text (uuid), PK   |
| title       | text              |
| status      | text              |
| translation | text              |
| next_steps  | text (JSON blob)  |
| created_at  | text (ISO)        |

`GET /api/path` returns all rows ordered by `created_at` ascending, mapped to
`PathNode`. There is no separate `path`/`user` table — one global ordered list of
nodes stands in for "the path."

## Node ordering semantics (resolving a contract ambiguity)

`CLAUDE.md` says `POST /api/path/nodes` "appends the analyzed result as a new node
... and locks any node that comes after it." Taken literally this is contradictory:
an appended node is always last, so nothing is ever "after" it.

**Decision:** nodes are strictly append-only. Nothing is pre-seeded as `'locked'`.
Every node created via `POST /api/path/nodes` is created with status `'active'`.

**Consequence:** the `'locked'` status is never produced by this backend, and
`PATCH /api/path/nodes/:id`'s `unlocked` response field is always omitted (there is
never a next locked node to unlock). This is a deliberate simplification of an
ambiguous contract clause, not an oversight — worth a one-line mention if it comes
up in the pitch, but not worth building fake placeholder future-steps to make
`'locked'` reachable.

Marking a node done (`PATCH .../nodes/:id` with `{ status: 'done' }`) only updates
that row; other nodes' statuses are untouched.

## `POST /api/analyze-document` pipeline

1. Receive `{ images: string[] (base64), targetLang }`.
2. Call **Claude Sonnet 5** (vision) with a **forced tool-use** call. The tool
   schema mirrors `{ translation: string, nextSteps: [...], detectedProfession?: string }`
   — `detectedProfession` is an extra field for internal enrichment, not part of the
   public contract. One automatic retry on transient failure (timeout/5xx) before
   giving up.
3. If `detectedProfession` is present, run occupation + office enrichment (below)
   and fold the result into `nextSteps` as an additional generated step, written in
   `targetLang` — no new fields added to the public `PathNode`/`nextSteps` contract.
4. Return `{ translation, nextSteps }`. Nothing is persisted at this stage —
   persistence only happens when the frontend later calls `POST /api/path/nodes`
   with the result.
5. `formLinks` is omitted (left empty) for the hackathon build. **Fast-follow, not
   built now:** a small hand-curated `{ profession/topic → official form URL }`
   lookup table, to avoid Claude hallucinating URLs to real government sites live
   during a demo.
6. **PII handling is out of scope for this pass.** Uploaded images are never
   persisted to disk or DB — they're sent to Claude and discarded; only the derived
   translation/next-steps text is ever stored. No dedicated PII-detection/redaction
   step is implemented. This is a known gap, noted for the pitch slide rather than
   built.

## Occupation matching + office enrichment

Folded into step 3 above — no new API endpoints.

- At startup, load into memory:
  - `esco-occupations-multilingual.json` (label → `iscoGroup`)
  - the KldB 2010 ↔ ISCO-08 crosswalk (converted once from `.xlsx` to a cached JSON
    under `data/`)
  - BA shortage-occupation data (`labour-market/ba/`)
  - `regprof-german-professions.json` (regulated yes/no)
- Match `detectedProfession` by case-insensitive substring match against ESCO
  `preferredLabel`/`alternativeLabel` for `targetLang`, falling back to `de` then
  `en` if no match (covers ESCO's missing Ukrainian/Turkish locales, since Claude
  has already translated the profession name during extraction). No fuzzy-matching
  library — plain substring matching is sufficient for a handful of demo documents.
- From the matched `iscoGroup`: look up KldB code → shortage-occupation status via
  the crosswalk, and regulated/non-regulated status via the EU regulated
  professions list.
- Office suggestion: a small **hand-authored** static list in
  `enrichment/offices.ts` (~15–20 Nuremberg rows — IHK FOSA, HWK Mittelfranken,
  Regierung von Mittelfranken, BLÄK, etc. — per the data pack README's own
  suggested starting set), matched by ISCO major-group category (health / trade /
  commercial / other). This is original content authored for this project, not
  copied from anabin, so it's safe to commit to git.
- Derived data caches (converted crosswalk/shortage JSON) live under
  `src/backend/data/`, gitignored — consistent with the data pack folder itself
  already being excluded from version control.

## Error handling

- Claude API failure/timeout: one retry, then a clean `502` with a short JSON error
  body (`{ error: string }`). No further retries, no circuit breaker.
- Malformed/missing request fields: `400` with a short JSON error body.
- No error handling is built for scenarios that can't occur given the fixed
  single-user, no-auth, local-demo scope (e.g. no concurrent-write handling, no
  rate limiting).

## Out of scope for this pass (explicitly deferred)

- PII detection/redaction
- `formLinks` population (hand-curated table noted as fast-follow)
- Authentication / multi-user support
- Hosting/deployment (demo runs locally)
- Fuzzy/NLP-based occupation matching (substring matching only)

## Milestones

**Required for hackathon pitch/demo:**

1. Backend scaffold (Express + TS) running locally with a health check.
2. SQLite schema + `GET /api/path`, `POST /api/path/nodes`,
   `PATCH /api/path/nodes/:id` implemented and matching the `PathNode` contract.
3. `POST /api/analyze-document`: Claude Sonnet 5 vision call with forced tool-use,
   returns `{ translation, nextSteps }` for a real sample document image.
4. End-to-end flow verified: upload → analyze → append node → mark node done
   (confirming `unlocked` is correctly omitted under append-only semantics) —
   exercised against the real frontend if it's ready, otherwise via curl/Postman.
5. Basic error handling on the Claude call (`502` on failure, `400` on bad input,
   one retry).

**Optional / stretch, time-permitting:**

6. Occupation-matching enrichment (ESCO + crosswalk + labour-market) folded into
   `nextSteps` text.
7. Office-suggestion enrichment (hand-curated Nuremberg office list) folded into
   `nextSteps` text.
8. `formLinks` lookup table (explicitly deferred beyond the hackathon).
9. PII redaction (explicitly deferred beyond the hackathon).
10. Multi-language demo coverage across the frontend's full language shortlist
    (`tr ar uk ru pl ro en fa de`) — at minimum one non-German language should be
    demoed end to end; covering all nine is stretch.
