# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. This Repository is a Hackathon Project for the Zollhof Social Impact Event. 

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.


## 5. Open to Suggestions and Established Solutions

"If you see a clearly better approach, say so before implementing. Explain the tradeoff in 2-4 bullets. If the current request is still reasonable, proceed unless the alternativ avoids serious risk or wasted work."

## Repository Contents

This repo currently contains **only a data pack** (`zollhof-recognition-data-pack/`) — there is no
application code, build system, package manifest, linter, or test suite yet. Any of those will be
introduced by future work in this repo, not assumed from what's here now.

The data pack was assembled for the ZOLLHOF track of the Claude Impact Lab Hackathon (Nuremberg,
23 July 2026): migrants in Germany face a slow, opaque process for getting foreign professional
qualifications recognised, and this pack bundles the open data needed to build against that problem.
Full details, licences, and known gotchas per source are documented in
`zollhof-recognition-data-pack/README.md` — read it before writing code that consumes this data.
Key points worth knowing up front:

- **The join key across datasets** is `ESCO occupation --iscoGroup--> ISCO-08 --crosswalk--> KldB 2010`,
  which then links to Destatis and Bundesagentur für Arbeit (BA) labour-market data.
- **ESCO has no Ukrainian or Turkish.** Integreat content covers those languages instead; factor this
  into any language-matching pipeline early.
- **Destatis figures are independently rounded** to a multiple of 3 per cell — totals won't sum exactly;
  don't build reconciliation checks against them.
- Several rich sources (anabin, Anerkennung in Deutschland/BIBB, BAMF-NAvI) may be **called live during
  the hackathon but must not be redistributed or cached into a public repo** — see the "Call live, do
  NOT redistribute" section of the data pack README before integrating any of them.
- Handbook Germany is CC BY-NC-ND and explicitly disallows AI crawlers — do not use it as a source for
  generated/derived content.

## Frontend ↔ Backend API Contract (DocuAId)

The SvelteKit frontend (`src/frontend`) is being built against this contract. The backend does not
exist yet — implement it to match this shape so the frontend can integrate without changes.

**PathNode** (core shape, returned by the path endpoints and rendered on the frontend's path/home screen):

```ts
type PathNode = {
  id: string
  title: string              // short label, e.g. "Anmeldung bestätigen"
  status: 'locked' | 'active' | 'done'
  translation: string        // translated document text, in the user's target language
  nextSteps: {
    text: string              // translated explanation of what to do
    dueDate?: string          // ISO date, optional
    formLinks?: { label: string; url: string }[]
  }[]
  createdAt: string
}
```

**Endpoints:**

```
GET  /api/path
  → { nodes: PathNode[] }
  Fetched on load of the path screen.

POST /api/analyze-document
  body: { images: string[] (base64, one per page), targetLang: string }
  → { translation: string, nextSteps: PathNode['nextSteps'] }
  This is the Claude-API-backed call: takes one or more page images of a document from the
  Ausländerbehörde (or similar), understands it, and returns a translation plus extracted next steps,
  both in the user's target language.

POST /api/path/nodes
  body: { title: string, translation: string, nextSteps: [...] }
  → { node: PathNode }
  Appends the analyzed result as a new node (status: 'active'). In this linear MVP, nodes are only
  created from an upload's analyzed result, so there is never a pre-existing later node to lock —
  the frontend enforces "one active node at a time" itself by disabling new uploads while an active
  node exists. `locked` is reserved for a future non-linear/branching track and is not produced today.

PATCH /api/path/nodes/:id
  body: { status: 'done' }
  → { node: PathNode }
  Called when the user marks a step done. No unlocking mechanic needed today — the frontend re-enables
  new uploads once the active node is done.
```

`targetLang` is an ISO code from the frontend's curated language shortlist (e.g. `tr`, `ar`, `uk`, `ru`,
`pl`, `ro`, `en`, `fa`, `de`), chosen once at onboarding and sent with every request needing translation.
