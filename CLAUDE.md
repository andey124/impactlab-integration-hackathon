# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
