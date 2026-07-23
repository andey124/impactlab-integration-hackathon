# DocuAId Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Node/TypeScript backend in `src/backend/` that implements the DocuAId API contract in `CLAUDE.md`, so the SvelteKit frontend can integrate without changes.

**Architecture:** A single Express 5 app with two route modules (`path`, `analyze`), a SQLite store, and one Claude vision call using forced tool use. Single global demo user, no auth. Nodes are strictly append-only — `'locked'` is never produced and `unlocked` is never returned.

**Tech Stack:** Node.js 24 + TypeScript (run directly, no build step) + Express 5 + `@anthropic-ai/sdk`. Storage is `node:sqlite`. Tests are `node:test`.

## Global Constraints

- **Node 24+ is required.** `engines.node: ">=24"`. Verified on this machine: `v24.16.0`.
- **Do not add a bundler, transpiler, or test framework.** Node 24 runs `.ts` files natively via type stripping. `node --test`, `node:sqlite`, `node --watch`, and `node --env-file` replace `tsx`/`ts-node`, `jest`/`vitest`, `better-sqlite3`, `nodemon`, and `dotenv` respectively. All five were verified working before this plan was written.
- **Runtime dependencies are exactly two:** `express`, `@anthropic-ai/sdk`. Dev dependencies are exactly three: `typescript`, `@types/node`, `@types/express` (editor/typecheck only — never executed).
- **Relative imports MUST include the `.ts` extension** (`import { db } from './db.ts'`). Node's type stripper does not resolve extensionless relative specifiers. This is why `tsconfig.json` sets `allowImportingTsExtensions` and `noEmit`.
- **No TypeScript syntax that cannot be erased.** No `enum`, no `namespace`, no parameter properties (`constructor(private x: string)`), no `declare` fields. `erasableSyntaxOnly: true` in `tsconfig.json` enforces this.
- **Model ID is exactly `claude-sonnet-5`** (per spec §"`POST /api/analyze-document` pipeline" step 2). Do not substitute another model.
- **`PathNode` shape is fixed by `CLAUDE.md` and must not gain public fields.** `detectedProfession` is internal to `analyze-document` and is never returned to the frontend.
- **Every node created via `POST /api/path/nodes` gets `status: 'active'`.** Nothing is ever `'locked'`. `PATCH` never returns `unlocked`. This is the deliberate resolution of the contract ambiguity documented in the spec.
- **Uploaded images are never written to disk or DB.** Only derived translation/next-steps text is stored.
- **`formLinks` is never populated** in this pass.
- **JSON body limit is `25mb`.** Express's 100kb default rejects multi-page base64 scans.
- **Every task ends with `npm test` green** and a commit.

## Files

| File | Responsibility |
|---|---|
| `src/backend/package.json` | Scripts, deps, `engines`, `"type": "module"` |
| `src/backend/tsconfig.json` | Editor/typecheck only, `noEmit` |
| `src/backend/.env.example` | Committed template for `ANTHROPIC_API_KEY`, `PORT` |
| `src/backend/src/app.ts` | Express app: CORS, JSON parsing, route wiring, `/health`. Exports `app`, does not listen. |
| `src/backend/src/server.ts` | Listens on `PORT`. The `npm run dev` / `npm start` entrypoint. |
| `src/backend/src/db.ts` | `node:sqlite` schema + `listNodes` / `createNode` / `markDone` + row↔`PathNode` mapping. Owns the `PathNode` and `NextStep` types. |
| `src/backend/src/routes/path.ts` | `GET /api/path`, `POST /api/path/nodes`, `PATCH /api/path/nodes/:id` |
| `src/backend/src/routes/analyze.ts` | `POST /api/analyze-document` |
| `src/backend/src/claude.ts` | Anthropic client, forced tool-use vision call, short translation helper |
| `src/backend/src/enrichment/occupations.ts` | *(stretch)* ESCO label → ISCO → KldB shortage + regulated lookup |
| `src/backend/src/enrichment/offices.ts` | *(stretch)* Hand-authored Nuremberg office list + ISCO category match |
| `src/backend/scripts/build-data-cache.py` | *(stretch)* One-time `.xlsx`/`.json` → `data/enrichment.json` |
| `src/backend/scripts/smoke.ts` | Manual end-to-end walkthrough against a running server |
| `src/backend/test/helpers.ts` | `serve(app)` — starts the app on an ephemeral port |
| `src/backend/test/*.test.ts` | One test file per route module + `db` |
| `src/backend/data/` | *(stretch)* Generated JSON cache. Gitignored. |

**Two deviations from the spec's file list, both deliberate:**
1. The spec lists a single `server.ts`. This plan splits it into `app.ts` (exports the app) and `server.ts` (listens), because tests need to bind the app to an ephemeral port without the module also grabbing `PORT`. `server.ts` is 5 lines.
2. The spec says regulated status comes from `regprof-german-professions.json`. **That file has no ISCO codes** (verified: its records carry `name`, `country`, `region`, `directive`, `qualification`, `qualification_level`, `id`, `id_country`), so it cannot be joined from `iscoGroup` as the spec describes. Task 6 instead derives the regulated set from `regprof-decisions-germany.json`, which *is* ISCO-coded (`Isco code 1`) — every profession in that Directive 2005/36/EC dataset is by definition regulated. Caveat to state on the pitch slide: that gives 79 professions (EU/EEA-origin decisions only), not the full 175-profession German list.

---

## Task 1: Scaffold, CORS, health check

**Files:**
- Create: `src/backend/package.json`
- Create: `src/backend/tsconfig.json`
- Create: `src/backend/.env.example`
- Create: `src/backend/src/app.ts`
- Create: `src/backend/src/server.ts`
- Create: `src/backend/test/helpers.ts`
- Test: `src/backend/test/health.test.ts`
- Modify: `.gitignore` (repo root)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `app.ts` exports `const app: express.Express` — an Express 5 app with CORS, `express.json({ limit: '25mb' })`, and `GET /health`. Later tasks mount routers on it under `/api`.
  - `test/helpers.ts` exports `serve(app: Express): Promise<{ url: string; close: () => Promise<unknown> }>`.

- [ ] **Step 1: Create the package manifest**

`src/backend/package.json`:

```json
{
  "name": "docuaid-backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "node --watch --env-file=.env src/server.ts",
    "start": "node --env-file=.env src/server.ts",
    "test": "node --test",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run from `src/backend/`:

```bash
npm install express @anthropic-ai/sdk
npm install --save-dev typescript @types/node @types/express
```

Expected: `node_modules/` and `package-lock.json` are created; `express` resolves to `^5.x` (5.2.1 at time of writing).

- [ ] **Step 3: Create the TypeScript config**

This file is never used at runtime — Node strips types without consulting it. It exists so the editor and `npm run typecheck` agree with what Node accepts.

`src/backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "lib": ["esnext"],
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "rewriteRelativeImportExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.ts"]
}
```

- [ ] **Step 4: Create the env template**

`src/backend/.env.example`:

```
# Copy to .env and fill in. .env is gitignored.
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

- [ ] **Step 5: Update the root .gitignore**

The root `.gitignore` currently contains exactly two lines (`zollhof-recognition-data-pack` and `Data`, with no trailing newline). Append:

```
node_modules/
.env
src/backend/data/
*.db
```

- [ ] **Step 6: Write the failing test**

`src/backend/test/helpers.ts`:

```ts
import type { Express } from 'express'

/** Binds the app to an ephemeral port so tests never collide with a running dev server. */
export async function serve(app: Express) {
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address() as { port: number }
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve(null))),
  }
}
```

`src/backend/test/health.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serve } from './helpers.ts'
import { app } from '../src/app.ts'

test('GET /health returns ok', async () => {
  const s = await serve(app)
  const res = await fetch(`${s.url}/health`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
  await s.close()
})

test('CORS preflight is answered', async () => {
  const s = await serve(app)
  const res = await fetch(`${s.url}/api/path`, { method: 'OPTIONS' })
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('access-control-allow-origin'), '*')
  await s.close()
})
```

> Note: Node's test runner treats every file under `test/` as a test file, so `helpers.ts` is loaded and reported as a passing file with zero tests. That is expected and keeps `npm test` green.

- [ ] **Step 7: Run the test to verify it fails**

Run from `src/backend/`: `npm test`

Expected: FAIL — `Cannot find module '.../src/app.ts'`.

- [ ] **Step 8: Write the app**

`src/backend/src/app.ts`:

```ts
import express from 'express'

export const app = express()

// Single-user local demo, no cookies or auth headers — a wildcard origin is
// sufficient and avoids hard-coding the frontend's dev port.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

// Multi-page base64 scans blow past Express's 100kb default.
app.use(express.json({ limit: '25mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})
```

- [ ] **Step 9: Write the server entrypoint**

`src/backend/src/server.ts`:

```ts
import { app } from './app.ts'

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`DocuAId backend listening on http://localhost:${port}`)
})
```

- [ ] **Step 10: Run the test to verify it passes**

Run from `src/backend/`: `npm test`

Expected: PASS — `pass 3` (two tests plus the zero-test helpers file), `fail 0`.

- [ ] **Step 11: Verify the dev server starts**

```bash
cp .env.example .env
npm run dev
```

Expected: `DocuAId backend listening on http://localhost:3001`. In another shell:

```bash
curl -s http://localhost:3001/health
```

Expected: `{"ok":true}`. Stop the server with Ctrl-C.

- [ ] **Step 12: Commit**

```bash
git add .gitignore src/backend
git commit -m "feat(backend): scaffold Express app with CORS and health check"
```

---

## Task 2: SQLite store and PathNode mapping

**Files:**
- Create: `src/backend/src/db.ts`
- Test: `src/backend/test/db.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (Task 3 and Task 4 depend on these exact names and signatures):
  - `type NextStep = { text: string; dueDate?: string; formLinks?: { label: string; url: string }[] }`
  - `type PathNode = { id: string; title: string; status: 'locked' | 'active' | 'done'; translation: string; nextSteps: NextStep[]; createdAt: string }`
  - `listNodes(): PathNode[]` — ascending by `createdAt`, then insertion order.
  - `createNode(input: { title: string; translation: string; nextSteps: NextStep[] }): PathNode` — always `status: 'active'`.
  - `markDone(id: string): PathNode | null` — `null` when the id does not exist.

- [ ] **Step 1: Write the failing test**

`src/backend/test/db.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'

// Must be set before db.ts is evaluated, hence the dynamic import.
process.env.DB_PATH = ':memory:'
const { listNodes, createNode, markDone } = await import('../src/db.ts')

test('a fresh path is empty', () => {
  assert.deepEqual(listNodes(), [])
})

test('createNode appends an active node and returns it', () => {
  const node = createNode({
    title: 'Anmeldung bestätigen',
    translation: 'Please confirm your registration.',
    nextSteps: [{ text: 'Call the office', dueDate: '2026-08-01' }],
  })
  assert.equal(node.status, 'active')
  assert.equal(node.title, 'Anmeldung bestätigen')
  assert.deepEqual(node.nextSteps, [{ text: 'Call the office', dueDate: '2026-08-01' }])
  assert.match(node.id, /^[0-9a-f-]{36}$/)
  assert.match(node.createdAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(listNodes(), [node])
})

test('nodes are returned in insertion order even within the same millisecond', () => {
  const a = createNode({ title: 'A', translation: 'a', nextSteps: [] })
  const b = createNode({ title: 'B', translation: 'b', nextSteps: [] })
  const titles = listNodes().map((n) => n.title)
  assert.deepEqual(titles.slice(-2), [a.title, b.title])
})

test('markDone flips status and leaves other nodes untouched', () => {
  const target = createNode({ title: 'Target', translation: 't', nextSteps: [] })
  const other = createNode({ title: 'Other', translation: 'o', nextSteps: [] })
  const updated = markDone(target.id)
  assert.equal(updated?.status, 'done')
  const stored = listNodes()
  assert.equal(stored.find((n) => n.id === target.id)?.status, 'done')
  assert.equal(stored.find((n) => n.id === other.id)?.status, 'active')
})

test('markDone returns null for an unknown id', () => {
  assert.equal(markDone('00000000-0000-0000-0000-000000000000'), null)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `src/backend/`: `npm test`

Expected: FAIL — `Cannot find module '.../src/db.ts'`.

- [ ] **Step 3: Write the store**

`src/backend/src/db.ts`:

```ts
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'node:crypto'

export type NextStep = {
  text: string
  dueDate?: string
  formLinks?: { label: string; url: string }[]
}

export type PathNode = {
  id: string
  title: string
  status: 'locked' | 'active' | 'done'
  translation: string
  nextSteps: NextStep[]
  createdAt: string
}

const db = new DatabaseSync(process.env.DB_PATH ?? 'docuaid.db')

db.exec(`
  CREATE TABLE IF NOT EXISTS nodes (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL,
    translation TEXT NOT NULL,
    next_steps  TEXT NOT NULL,
    created_at  TEXT NOT NULL
  )
`)

type Row = {
  id: string
  title: string
  status: string
  translation: string
  next_steps: string
  created_at: string
}

function toNode(row: Row): PathNode {
  return {
    id: row.id,
    title: row.title,
    status: row.status as PathNode['status'],
    translation: row.translation,
    nextSteps: JSON.parse(row.next_steps) as NextStep[],
    createdAt: row.created_at,
  }
}

export function listNodes(): PathNode[] {
  // rowid breaks ties when two nodes land in the same millisecond.
  const rows = db.prepare('SELECT * FROM nodes ORDER BY created_at, rowid').all() as unknown as Row[]
  return rows.map(toNode)
}

export function createNode(input: {
  title: string
  translation: string
  nextSteps: NextStep[]
}): PathNode {
  const node: PathNode = {
    id: randomUUID(),
    title: input.title,
    // The path is append-only: a new node is always the current step.
    status: 'active',
    translation: input.translation,
    nextSteps: input.nextSteps,
    createdAt: new Date().toISOString(),
  }
  db.prepare(
    'INSERT INTO nodes (id, title, status, translation, next_steps, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(node.id, node.title, node.status, node.translation, JSON.stringify(node.nextSteps), node.createdAt)
  return node
}

export function markDone(id: string): PathNode | null {
  const { changes } = db.prepare("UPDATE nodes SET status = 'done' WHERE id = ?").run(id)
  // node:sqlite types `changes` as number | bigint — normalise before comparing.
  if (Number(changes) === 0) return null
  const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id) as unknown as Row
  return toNode(row)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `src/backend/`: `npm test`

Expected: PASS — all `db.test.ts` tests green, `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/backend/src/db.ts src/backend/test/db.test.ts
git commit -m "feat(backend): add SQLite node store with append-only semantics"
```

---

## Task 3: Path endpoints

**Files:**
- Create: `src/backend/src/routes/path.ts`
- Modify: `src/backend/src/app.ts` (mount the router)
- Test: `src/backend/test/path.test.ts`

**Interfaces:**
- Consumes: `listNodes`, `createNode`, `markDone`, `type NextStep` from `../db.ts` (Task 2).
- Produces: `pathRouter: express.Router`, mounted at `/api` in `app.ts`.

- [ ] **Step 1: Write the failing test**

`src/backend/test/path.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serve } from './helpers.ts'

process.env.DB_PATH = ':memory:'
process.env.ANTHROPIC_API_KEY = 'test-key'
const { app } = await import('../src/app.ts')

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

const patch = (url: string, body: unknown) =>
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

test('GET /api/path returns an empty node list', async () => {
  const s = await serve(app)
  const res = await fetch(`${s.url}/api/path`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { nodes: [] })
  await s.close()
})

test('POST /api/path/nodes appends an active node and GET returns it', async () => {
  const s = await serve(app)
  const created = await post(`${s.url}/api/path/nodes`, {
    title: 'Anmeldung bestätigen',
    translation: 'Please confirm your registration.',
    nextSteps: [{ text: 'Call the office' }],
  })
  assert.equal(created.status, 200)
  const { node } = (await created.json()) as { node: { id: string; status: string } }
  assert.equal(node.status, 'active')

  const listed = await fetch(`${s.url}/api/path`)
  const { nodes } = (await listed.json()) as { nodes: { id: string }[] }
  assert.equal(nodes.length, 1)
  assert.equal(nodes[0].id, node.id)
  await s.close()
})

test('POST /api/path/nodes rejects a malformed body with 400', async () => {
  const s = await serve(app)
  const res = await post(`${s.url}/api/path/nodes`, { title: 'only a title' })
  assert.equal(res.status, 400)
  assert.ok(typeof ((await res.json()) as { error: string }).error === 'string')
  await s.close()
})

test('PATCH marks a node done and omits `unlocked`', async () => {
  const s = await serve(app)
  const created = await post(`${s.url}/api/path/nodes`, {
    title: 'Step',
    translation: 'text',
    nextSteps: [],
  })
  const { node } = (await created.json()) as { node: { id: string } }

  const res = await patch(`${s.url}/api/path/nodes/${node.id}`, { status: 'done' })
  assert.equal(res.status, 200)
  const body = (await res.json()) as { node: { status: string }; unlocked?: unknown }
  assert.equal(body.node.status, 'done')
  assert.ok(!('unlocked' in body), 'append-only path never unlocks a following node')
  await s.close()
})

test('PATCH rejects an unknown id with 404 and a bad status with 400', async () => {
  const s = await serve(app)
  const missing = await patch(`${s.url}/api/path/nodes/does-not-exist`, { status: 'done' })
  assert.equal(missing.status, 404)

  const created = await post(`${s.url}/api/path/nodes`, { title: 'S', translation: 't', nextSteps: [] })
  const { node } = (await created.json()) as { node: { id: string } }
  const bad = await patch(`${s.url}/api/path/nodes/${node.id}`, { status: 'active' })
  assert.equal(bad.status, 400)
  await s.close()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `src/backend/`: `npm test`

Expected: FAIL — `GET /api/path` returns 404 (the router does not exist yet).

- [ ] **Step 3: Write the router**

`src/backend/src/routes/path.ts`:

```ts
import { Router } from 'express'
import { listNodes, createNode, markDone, type NextStep } from '../db.ts'

export const pathRouter = Router()

pathRouter.get('/path', (_req, res) => {
  res.json({ nodes: listNodes() })
})

pathRouter.post('/path/nodes', (req, res) => {
  const { title, translation, nextSteps } = req.body ?? {}
  if (typeof title !== 'string' || typeof translation !== 'string' || !Array.isArray(nextSteps)) {
    res.status(400).json({
      error: 'title (string), translation (string) and nextSteps (array) are required',
    })
    return
  }
  res.json({ node: createNode({ title, translation, nextSteps: nextSteps as NextStep[] }) })
})

pathRouter.patch('/path/nodes/:id', (req, res) => {
  if (req.body?.status !== 'done') {
    res.status(400).json({ error: "body must be { status: 'done' }" })
    return
  }
  const node = markDone(req.params.id)
  if (!node) {
    res.status(404).json({ error: 'node not found' })
    return
  }
  // The path is append-only, so there is never a following locked node to
  // unlock — `unlocked` is deliberately omitted from the response.
  res.json({ node })
})
```

- [ ] **Step 4: Mount the router**

In `src/backend/src/app.ts`, add the import at the top (after `import express from 'express'`):

```ts
import { pathRouter } from './routes/path.ts'
```

and add this line at the end of the file, after the `/health` handler:

```ts
app.use('/api', pathRouter)
```

- [ ] **Step 5: Run the test to verify it passes**

Run from `src/backend/`: `npm test`

Expected: PASS — all `path.test.ts` and `db.test.ts` tests green, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add src/backend/src src/backend/test
git commit -m "feat(backend): implement GET/POST/PATCH path node endpoints"
```

---

## Task 4: Claude vision analysis endpoint

**Files:**
- Create: `src/backend/src/claude.ts`
- Create: `src/backend/src/routes/analyze.ts`
- Modify: `src/backend/src/app.ts` (mount the router)
- Test: `src/backend/test/analyze.test.ts`

**Interfaces:**
- Consumes: `type NextStep` from `../db.ts` (Task 2).
- Produces (Task 7 depends on these exact names):
  - `type Analysis = { translation: string; nextSteps: NextStep[]; detectedProfession?: string }`
  - `analyzeDocument(images: string[], targetLang: string): Promise<Analysis>`
  - `translate(text: string, targetLang: string): Promise<string>`
  - `analyzeRouter: express.Router`, mounted at `/api`.

- [ ] **Step 1: Write the failing test**

This test never touches the real API. The 400 cases short-circuit before any call, and the 502 case points the SDK at a local stub via `ANTHROPIC_BASE_URL` — which also proves the retry actually happens.

`src/backend/test/analyze.test.ts`:

```ts
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { serve } from './helpers.ts'

// A 1x1 transparent PNG — enough to pass request validation.
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

// Stub Anthropic endpoint that always fails, so we can assert the 502 path.
let hits = 0
const stub = express()
stub.use(express.json({ limit: '25mb' }))
stub.post('/v1/messages', (_req, res) => {
  hits += 1
  res.status(500).json({ type: 'error', error: { type: 'api_error', message: 'stub failure' } })
})
const stubHandle = await serve(stub)
// Release the stub even if a test fails, or the open handle keeps Node alive.
after(async () => {
  await stubHandle.close()
})

process.env.DB_PATH = ':memory:'
process.env.ANTHROPIC_API_KEY = 'test-key'
process.env.ANTHROPIC_BASE_URL = stubHandle.url
const { app } = await import('../src/app.ts')

const post = (url: string, body: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

test('rejects a missing images array with 400', async () => {
  const s = await serve(app)
  const res = await post(`${s.url}/api/analyze-document`, { targetLang: 'uk' })
  assert.equal(res.status, 400)
  await s.close()
})

test('rejects an empty images array with 400', async () => {
  const s = await serve(app)
  const res = await post(`${s.url}/api/analyze-document`, { images: [], targetLang: 'uk' })
  assert.equal(res.status, 400)
  await s.close()
})

test('rejects a missing targetLang with 400', async () => {
  const s = await serve(app)
  const res = await post(`${s.url}/api/analyze-document`, { images: [PIXEL] })
  assert.equal(res.status, 400)
  await s.close()
})

test('returns 502 after exactly one retry when Claude keeps failing', async () => {
  const s = await serve(app)
  hits = 0
  const res = await post(`${s.url}/api/analyze-document`, { images: [PIXEL], targetLang: 'uk' })
  assert.equal(res.status, 502)
  assert.ok(typeof ((await res.json()) as { error: string }).error === 'string')
  assert.equal(hits, 2, 'one initial attempt plus one retry')
  await s.close()
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `src/backend/`: `npm test`

Expected: FAIL — `POST /api/analyze-document` returns 404.

- [ ] **Step 3: Write the Claude client**

`src/backend/src/claude.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { NextStep } from './db.ts'

// maxRetries: 1 gives exactly one automatic retry on transient failures
// (timeouts, 408/409/429/5xx), which is the retry policy the spec asks for.
const client = new Anthropic({ maxRetries: 1 })

const MODEL = 'claude-sonnet-5'

export type Analysis = {
  translation: string
  nextSteps: NextStep[]
  /** Internal only — never returned to the frontend. Feeds occupation enrichment. */
  detectedProfession?: string
}

const RECORD_ANALYSIS = {
  name: 'record_analysis',
  description: 'Record the translation and the extracted next steps for the uploaded document.',
  input_schema: {
    type: 'object' as const,
    properties: {
      translation: {
        type: 'string',
        description: 'The full document text, faithfully translated into the target language.',
      },
      nextSteps: {
        type: 'array',
        description:
          'Every concrete action the reader must take, in the order they should be done, written in the target language.',
        items: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description:
                'What to do, in plain language a non-expert understands, in the target language.',
            },
            dueDate: {
              type: 'string',
              description:
                'ISO 8601 date (YYYY-MM-DD) only if the document states a deadline. Omit otherwise.',
            },
          },
          required: ['text'],
          additionalProperties: false,
        },
      },
      detectedProfession: {
        type: 'string',
        description:
          'The profession this document is about, in the target language, if the document names one. Omit otherwise.',
      },
    },
    required: ['translation', 'nextSteps'],
    additionalProperties: false,
  },
}

/** Guesses the media type from the base64 payload's magic bytes. */
function mediaType(base64: string): 'image/png' | 'image/gif' | 'image/webp' | 'image/jpeg' {
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg'
}

/** Accepts either a bare base64 string or a `data:image/png;base64,...` URL. */
function stripDataUrl(image: string): string {
  return image.replace(/^data:[^;]+;base64,/, '')
}

export async function analyzeDocument(images: string[], targetLang: string): Promise<Analysis> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // ponytail: thinking off keeps the live-demo turn fast; this is a
    // schema-constrained extraction, not open reasoning. Switch to
    // { type: 'adaptive' } if translation quality needs it.
    thinking: { type: 'disabled' },
    tools: [RECORD_ANALYSIS],
    tool_choice: { type: 'tool', name: 'record_analysis' },
    system:
      `You help migrants in Germany understand letters from the Ausländerbehörde and other German authorities. ` +
      `Translate the document faithfully into the language with ISO code "${targetLang}", and extract every concrete action the reader must take. ` +
      `Write everything — the translation and every step — in "${targetLang}". ` +
      `Never invent deadlines, form numbers, URLs, offices, or amounts that are not in the document.`,
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((image) => {
            const data = stripDataUrl(image)
            return {
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: mediaType(data), data },
            }
          }),
          {
            type: 'text' as const,
            text: 'These images are the pages of one document, in order. Call record_analysis with the translation and the next steps.',
          },
        ],
      },
    ],
  })

  // The type predicate is required: a plain `.find` returns the whole
  // ContentBlock union, which has no `.input`, and `npm run typecheck` fails.
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  )
  if (!toolUse) throw new Error('model did not call record_analysis')
  return toolUse.input as Analysis
}

/** Translates a short backend-generated sentence into the user's language. */
export async function translate(text: string, targetLang: string): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    thinking: { type: 'disabled' },
    system: `Translate the user's text into the language with ISO code "${targetLang}". Reply with the translation only.`,
    messages: [{ role: 'user', content: text }],
  })
  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  return block ? block.text : text
}
```

- [ ] **Step 4: Write the route**

`src/backend/src/routes/analyze.ts`:

```ts
import { Router } from 'express'
import { analyzeDocument } from '../claude.ts'

export const analyzeRouter = Router()

analyzeRouter.post('/analyze-document', async (req, res) => {
  const { images, targetLang } = req.body ?? {}
  const validImages =
    Array.isArray(images) && images.length > 0 && images.every((i) => typeof i === 'string')
  if (!validImages || typeof targetLang !== 'string' || targetLang.length === 0) {
    res.status(400).json({
      error: 'images (non-empty string[] of base64 pages) and targetLang (ISO code) are required',
    })
    return
  }

  try {
    // detectedProfession is intentionally dropped — it is not part of the
    // public PathNode contract.
    const { translation, nextSteps } = await analyzeDocument(images, targetLang)
    res.json({ translation, nextSteps })
  } catch (error) {
    console.error('analyze-document failed:', error)
    res.status(502).json({ error: 'document analysis failed' })
  }
})
```

- [ ] **Step 5: Mount the router**

In `src/backend/src/app.ts`, add the import alongside the existing `pathRouter` import:

```ts
import { analyzeRouter } from './routes/analyze.ts'
```

and add this line directly after `app.use('/api', pathRouter)`:

```ts
app.use('/api', analyzeRouter)
```

- [ ] **Step 6: Run the test to verify it passes**

Run from `src/backend/`: `npm test`

Expected: PASS — all tests green, `fail 0`. The retry test takes roughly a second because of the SDK's backoff.

- [ ] **Step 7: Typecheck**

Run from `src/backend/`: `npm run typecheck`

Expected: no output, exit code 0.

- [ ] **Step 8: Commit**

```bash
git add src/backend/src src/backend/test
git commit -m "feat(backend): add Claude vision analyze-document endpoint"
```

---

## Task 5: End-to-end verification

**Files:**
- Create: `src/backend/scripts/smoke.ts`
- Modify: `src/backend/package.json` (add the `smoke` script)

**Interfaces:**
- Consumes: the running HTTP server from Tasks 1, 3, and 4. Imports nothing from `src/`.
- Produces: `npm run smoke -- <image...>` — walks upload → analyze → append node → mark done and prints each response.

- [ ] **Step 1: Write the smoke script**

`src/backend/scripts/smoke.ts`:

```ts
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const base = process.env.SMOKE_BASE_URL ?? 'http://localhost:3001'
const targetLang = process.env.SMOKE_LANG ?? 'uk'
const files = process.argv.slice(2)

if (files.length === 0) {
  console.error('usage: npm run smoke -- <page1.png> [page2.png ...]')
  process.exit(1)
}

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    console.error(`${method} ${path} -> ${res.status}`, json)
    process.exit(1)
  }
  return json as Record<string, unknown>
}

const images = await Promise.all(
  files.map(async (file) => (await readFile(file)).toString('base64')),
)
console.log(`1. analyzing ${files.length} page(s) into "${targetLang}"...`)
const analysis = (await call('POST', '/api/analyze-document', { images, targetLang })) as {
  translation: string
  nextSteps: { text: string; dueDate?: string }[]
}
console.log('   translation:', analysis.translation.slice(0, 200))
console.log('   nextSteps:', analysis.nextSteps)

console.log('2. appending the result as a node...')
const created = (await call('POST', '/api/path/nodes', {
  title: basename(files[0]),
  translation: analysis.translation,
  nextSteps: analysis.nextSteps,
})) as { node: { id: string; status: string } }
console.log('   node:', created.node.id, created.node.status)

console.log('3. marking it done...')
const patched = (await call('PATCH', `/api/path/nodes/${created.node.id}`, { status: 'done' })) as {
  node: { status: string }
  unlocked?: unknown
}
console.log('   status:', patched.node.status)
console.log('   unlocked present:', 'unlocked' in patched, '(expected: false)')

console.log('4. reading the whole path...')
const path = (await call('GET', '/api/path')) as { nodes: { id: string; status: string }[] }
console.log('   nodes:', path.nodes.map((n) => `${n.id.slice(0, 8)}=${n.status}`).join(', '))
console.log('\nend-to-end flow OK')
```

- [ ] **Step 2: Add the npm script**

In `src/backend/package.json`, add to `"scripts"`:

```json
"smoke": "node scripts/smoke.ts"
```

- [ ] **Step 3: Prepare a page image**

The contract takes page **images**, not PDFs. `docs-examples/` holds one sample PDF — export or screenshot a page of it as PNG/JPEG, or photograph a real letter. Save it as `src/backend/sample-page.png` and add that filename to the root `.gitignore`: a real letter contains personal data and must not be committed.

- [ ] **Step 4: Run the flow against a live server**

In one shell, from `src/backend/` with a real `ANTHROPIC_API_KEY` in `.env`:

```bash
npm run dev
```

In another shell, from `src/backend/`:

```bash
npm run smoke -- sample-page.png
```

Expected output ends with `end-to-end flow OK`, and specifically:
- step 1 prints a translation in the target language plus at least one next step,
- step 3 prints `status: done` and `unlocked present: false`,
- step 4 lists the node with status `done`.

If step 1 returns 502, check the server log — it prints the underlying Anthropic error.

- [ ] **Step 5: Verify at least one non-German target language (milestone 10)**

Run the same flow with a second language from the frontend's shortlist (`tr ar uk ru pl ro en fa de`):

```bash
SMOKE_LANG=ar npm run smoke -- sample-page.png
SMOKE_LANG=uk npm run smoke -- sample-page.png
```

Expected: the translation and every next step come back in the requested language. Covering all nine is stretch; one non-German language is the milestone bar.

- [ ] **Step 6: Verify the unit tests still pass**

Run from `src/backend/`: `npm test`

Expected: PASS, `fail 0`.

- [ ] **Step 7: Commit**

```bash
git add src/backend/package.json src/backend/scripts/smoke.ts
git commit -m "feat(backend): add end-to-end smoke script"
```

**Milestones 1–5 are complete at this point.** Tasks 6 and 7 are the spec's optional/stretch scope.

---

## Task 6 (STRETCH): Occupation enrichment lookup

**Files:**
- Create: `src/backend/scripts/build-data-cache.py`
- Create: `src/backend/src/enrichment/occupations.ts`
- Test: `src/backend/test/occupations.test.ts`

**Prerequisite:** the `zollhof-recognition-data-pack/` folder must be present at the repo root (it is gitignored, so each developer needs their own copy), and Python 3 with `openpyxl` must be installed. Both were verified present on the original developer's machine. **Nothing in Tasks 1–5 depends on either** — if Python is unavailable, skip Tasks 6 and 7 and ship milestones 1–5.

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (Task 7 depends on these exact names):
  - `type OccupationFacts = { isco: string; label: string; regulated: boolean; shortage: boolean }`
  - `lookupOccupation(profession: string, targetLang: string): OccupationFacts | null`

- [ ] **Step 1: Write the cache build script**

Sheets are addressed by index, not name, because both workbooks use non-ASCII sheet names that decode inconsistently on Windows.

`src/backend/scripts/build-data-cache.py`:

```python
"""Converts the data pack's .xlsx and decision files into one JSON cache.

Run once from src/backend/:  python scripts/build-data-cache.py
Writes src/backend/data/enrichment.json (gitignored).
"""
import json
import pathlib
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[3]
PACK = ROOT / "zollhof-recognition-data-pack"
OUT = pathlib.Path(__file__).resolve().parents[1] / "data" / "enrichment.json"

# 1. KldB 2010 (5-digit) -> ISCO-08 (4-digit). Sheet index 1, header row 5, data from row 6.
#    Inverted to ISCO-4 -> set of KldB-4 prefixes, which is how we query it.
isco_to_kldb: dict[str, set[str]] = {}
wb = openpyxl.load_workbook(PACK / "crosswalks" / "kldb2010-isco08-crosswalk.xlsx", read_only=True)
for row in wb[wb.sheetnames[1]].iter_rows(min_row=6, values_only=True):
    kldb5, isco4 = row[0], row[3]
    if not kldb5 or not isco4:
        continue
    isco_to_kldb.setdefault(str(isco4).strip(), set()).add(str(kldb5).strip()[:4])

# 2. BA shortage analysis. Three sheets (Fachkraefte/Spezialisten/Experten), data from row 11.
#    Column A is "<KldB-4> <name>", column T (index 19) is "Durchschnittliche Punktezahl".
#    BA's methodology treats an average score >= 2.0 as an Engpassberuf.
kldb_score: dict[str, float] = {}
wb = openpyxl.load_workbook(
    PACK / "labour-market" / "ba" / "2025_Deutschland_Engpass.xlsx", read_only=True, data_only=True
)
for name in wb.sheetnames:
    for row in wb[name].iter_rows(min_row=11, values_only=True):
        code = str(row[0])[:4] if row[0] else ""
        score = row[19] if len(row) > 19 else None
        if code.isdigit() and isinstance(score, (int, float)):
            kldb_score[code] = max(kldb_score.get(code, 0.0), float(score))

# 3. Regulated professions, keyed by ISCO-4.
#    regprof-german-professions.json has no ISCO codes, so we use the decisions
#    file instead: it is ISCO-coded, and Directive 2005/36/EC only covers
#    regulated professions. Caveat: 79 professions, EU/EEA-origin decisions only.
decisions = json.loads(
    (PACK / "eu-regulated-professions" / "regprof-decisions-germany.json").read_text(encoding="utf-8")
)
regulated = sorted({d["Isco code 1"] for d in decisions if d.get("Isco code 1")})

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    json.dumps(
        {
            "iscoToKldb": {k: sorted(v) for k, v in isco_to_kldb.items()},
            "kldbShortageScore": kldb_score,
            "regulatedIsco": regulated,
        }
    ),
    encoding="utf-8",
)
print(f"wrote {OUT}")
print(f"  isco groups:      {len(isco_to_kldb)}")
print(f"  scored kldb-4:    {len(kldb_score)}")
print(f"  regulated isco-4: {len(regulated)}")
```

- [ ] **Step 2: Run the build script**

Run from `src/backend/`:

```bash
python scripts/build-data-cache.py
```

Expected: `wrote .../data/enrichment.json` followed by three non-zero counts (roughly 1,300 ISCO groups, 230 scored KldB-4 codes, and 60–80 regulated ISCO-4 codes).

- [ ] **Step 3: Write the failing test**

`src/backend/test/occupations.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { lookupOccupation } from '../src/enrichment/occupations.ts'

// The data pack and the generated cache are gitignored, so skip cleanly when absent.
const ready = existsSync(new URL('../data/enrichment.json', import.meta.url))

test('matches a German profession name to its ISCO group', { skip: !ready }, () => {
  const facts = lookupOccupation('Krankenpfleger', 'de')
  assert.ok(facts, 'expected a match for Krankenpfleger')
  assert.match(facts.isco, /^\d{4}(\.\d+)?$/)
  assert.equal(typeof facts.regulated, 'boolean')
  assert.equal(typeof facts.shortage, 'boolean')
})

test('falls back to German then English for a locale ESCO does not carry', { skip: !ready }, () => {
  // ESCO has no Ukrainian; Claude has already translated the profession name,
  // so the de/en fallback is what makes a match possible at all.
  assert.ok(lookupOccupation('nurse', 'uk'))
})

test('returns null when nothing matches', { skip: !ready }, () => {
  assert.equal(lookupOccupation('zzzz-not-a-profession', 'de'), null)
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run from `src/backend/`: `npm test`

Expected: FAIL — `Cannot find module '.../src/enrichment/occupations.ts'`.

- [ ] **Step 5: Write the lookup**

`src/backend/src/enrichment/occupations.ts`:

```ts
import { readFileSync } from 'node:fs'

const PACK = new URL('../../../../zollhof-recognition-data-pack/', import.meta.url)
const CACHE = new URL('../../data/enrichment.json', import.meta.url)

type EscoRecord = {
  iscoGroup: string
  preferredLabel: Record<string, string>
  alternativeLabel?: Record<string, string[]>
}

type Cache = {
  iscoToKldb: Record<string, string[]>
  kldbShortageScore: Record<string, number>
  regulatedIsco: string[]
}

export type OccupationFacts = {
  isco: string
  label: string
  regulated: boolean
  shortage: boolean
}

const esco = JSON.parse(
  readFileSync(new URL('esco/esco-occupations-multilingual.json', PACK), 'utf8'),
) as EscoRecord[]

const cache = JSON.parse(readFileSync(CACHE, 'utf8')) as Cache
const regulated = new Set(cache.regulatedIsco)

// BA treats an average indicator score >= 2.0 as an Engpassberuf.
const SHORTAGE_THRESHOLD = 2.0

/** Per-locale label index, built on first use and kept for the process lifetime. */
const indexes = new Map<string, { label: string; isco: string }[]>()

function indexFor(lang: string) {
  const cached = indexes.get(lang)
  if (cached) return cached

  const entries: { label: string; isco: string }[] = []
  for (const record of esco) {
    const labels = [record.preferredLabel?.[lang], ...(record.alternativeLabel?.[lang] ?? [])]
    for (const label of labels) {
      if (label) entries.push({ label: label.toLowerCase(), isco: record.iscoGroup })
    }
  }
  // Longest label first, so "fachkrankenpfleger" wins over "pfleger".
  entries.sort((a, b) => b.label.length - a.label.length)
  indexes.set(lang, entries)
  return entries
}

/**
 * Case-insensitive substring match against ESCO labels for `targetLang`,
 * falling back to German then English. ESCO carries no Ukrainian or Turkish,
 * and Claude has already translated the profession name during extraction,
 * so the fallback is what makes those locales matchable at all.
 */
export function lookupOccupation(profession: string, targetLang: string): OccupationFacts | null {
  const query = profession.trim().toLowerCase()
  if (!query) return null

  for (const lang of [targetLang, 'de', 'en']) {
    const hit = indexFor(lang).find(
      (entry) => query.includes(entry.label) || entry.label.includes(query),
    )
    if (!hit) continue

    const isco4 = hit.isco.split('.')[0]
    const shortage = (cache.iscoToKldb[isco4] ?? []).some(
      (kldb4) => (cache.kldbShortageScore[kldb4] ?? 0) >= SHORTAGE_THRESHOLD,
    )
    return { isco: hit.isco, label: hit.label, regulated: regulated.has(isco4), shortage }
  }
  return null
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run from `src/backend/`: `npm test`

Expected: PASS — the three `occupations.test.ts` tests green (or skipped, if the data pack is absent), `fail 0`.

- [ ] **Step 7: Commit**

```bash
git add src/backend/scripts/build-data-cache.py src/backend/src/enrichment src/backend/test/occupations.test.ts
git commit -m "feat(backend): add ESCO/KldB occupation enrichment lookup"
```

---

## Task 7 (STRETCH): Office suggestions folded into next steps

**Files:**
- Create: `src/backend/src/enrichment/offices.ts`
- Modify: `src/backend/src/routes/analyze.ts`
- Test: `src/backend/test/offices.test.ts`

**Interfaces:**
- Consumes: `lookupOccupation` from `../enrichment/occupations.ts` (Task 6); `translate` from `../claude.ts` (Task 4); `type NextStep` from `../db.ts` (Task 2).
- Produces: `type Office = { name: string; category: 'health' | 'trade' | 'commercial' | 'other'; scope: string }` and `officesFor(isco: string): Office[]`.

> The spec asks for ~15–20 office rows; this list has **10**. Every entry is a body I can name with confidence from the data pack README's suggested starting set plus the obvious Bavarian chambers. Padding it to 20 would mean inventing organisation names, which is the same failure mode `formLinks` was deferred to avoid. Add real rows during the hackathon if someone has verified sources.

- [ ] **Step 1: Write the failing test**

`src/backend/test/offices.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { officesFor } from '../src/enrichment/offices.ts'

test('health ISCO groups route to the health authorities', () => {
  const names = officesFor('2221.3').map((o) => o.name)
  assert.ok(names.some((n) => n.includes('Regierung von Mittelfranken')))
})

test('doctors route to the Landesärztekammer', () => {
  assert.ok(officesFor('2211').some((o) => o.name.includes('Bayerische Landesärztekammer')))
})

test('craft trades route to the Handwerkskammer', () => {
  assert.ok(officesFor('7412').some((o) => o.name.includes('Handwerkskammer')))
})

test('commercial occupations route to IHK FOSA', () => {
  assert.ok(officesFor('3313').some((o) => o.name.includes('IHK FOSA')))
})

test('unmatched groups still return a general advice centre', () => {
  const offices = officesFor('9999')
  assert.ok(offices.length > 0)
  assert.equal(offices[0].category, 'other')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run from `src/backend/`: `npm test`

Expected: FAIL — `Cannot find module '.../src/enrichment/offices.ts'`.

- [ ] **Step 3: Write the office list**

This list is original content authored for this project from the starting set named in the data pack README — it is not copied from anabin or BIBB, so it is safe to commit. Names only: URLs are deliberately omitted for the same reason `formLinks` is (a hallucinated or stale government URL on stage is worse than no URL).

`src/backend/src/enrichment/offices.ts`:

```ts
export type Office = {
  name: string
  category: 'health' | 'trade' | 'commercial' | 'other'
  /** What this body actually decides, in German — used verbatim as demo copy. */
  scope: string
}

const OFFICES: Office[] = [
  {
    name: 'Regierung von Mittelfranken',
    category: 'health',
    scope: 'Anerkennung von Gesundheitsfachberufen und Pflegeberufen in Mittelfranken',
  },
  {
    name: 'Bayerische Landesärztekammer (BLÄK)',
    category: 'health',
    scope: 'Approbation und Berufserlaubnis für Ärztinnen und Ärzte',
  },
  {
    name: 'Bayerische Landeszahnärztekammer',
    category: 'health',
    scope: 'Anerkennung zahnärztlicher Abschlüsse',
  },
  {
    name: 'Bayerische Landesapothekerkammer',
    category: 'health',
    scope: 'Anerkennung pharmazeutischer Abschlüsse',
  },
  {
    name: 'Handwerkskammer für Mittelfranken',
    category: 'trade',
    scope: 'Gleichwertigkeitsfeststellung für Handwerksberufe, Meisterprüfung',
  },
  {
    name: 'IHK FOSA',
    category: 'commercial',
    scope: 'Bundesweite Anerkennung kaufmännischer und industrieller IHK-Berufe',
  },
  {
    name: 'IHK Nürnberg für Mittelfranken',
    category: 'commercial',
    scope: 'Erstberatung zu IHK-Berufen vor Ort',
  },
  {
    name: 'Zentralstelle für ausländisches Bildungswesen (anabin/ZAB)',
    category: 'other',
    scope: 'Bewertung ausländischer Hochschulabschlüsse',
  },
  {
    name: 'IQ Netzwerk Bayern – Anerkennungsberatung Nürnberg',
    category: 'other',
    scope: 'Kostenlose, mehrsprachige Erstberatung zum gesamten Anerkennungsverfahren',
  },
  {
    name: 'Agentur für Arbeit Nürnberg',
    category: 'other',
    scope: 'Förderung von Anpassungsqualifizierungen und Anerkennungskosten',
  },
]

/**
 * Maps an ISCO-08 group to the bodies that plausibly decide that profession,
 * by major/sub-major group. Doctors, dentists, and pharmacists have their own
 * chambers, so they are matched on the 4-digit unit group before the broader
 * health rule applies.
 */
export function officesFor(isco: string): Office[] {
  const unit = isco.split('.')[0]
  const sub = unit.slice(0, 2)
  const major = unit.slice(0, 1)

  const pick = (...categories: Office['category'][]) =>
    OFFICES.filter((office) => categories.includes(office.category))

  if (unit === '2211' || unit === '2212') {
    return [
      OFFICES.find((o) => o.name.includes('Landesärztekammer'))!,
      ...pick('health').filter((o) => !o.name.includes('Landesärztekammer')),
      ...pick('other'),
    ]
  }
  if (unit === '2261' || unit === '2262') {
    const chamber = unit === '2261' ? 'Landeszahnärztekammer' : 'Landesapothekerkammer'
    return [OFFICES.find((o) => o.name.includes(chamber))!, ...pick('other')]
  }
  // 22xx health professionals, 32xx health associate professionals, 53xx care workers
  if (sub === '22' || sub === '32' || sub === '53') return [...pick('health'), ...pick('other')]
  // 7xxx craft and related trades, 8xxx plant and machine operators
  if (major === '7' || major === '8') return [...pick('trade'), ...pick('other')]
  // 1xxx managers, 24xx/33xx business and administration, 4xxx clerical support
  if (major === '1' || major === '4' || sub === '24' || sub === '33') {
    return [...pick('commercial'), ...pick('other')]
  }
  return pick('other')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run from `src/backend/`: `npm test`

Expected: PASS — the five `offices.test.ts` tests green, `fail 0`.

- [ ] **Step 5: Fold enrichment into the analyze route**

Replace the whole body of `src/backend/src/routes/analyze.ts` with:

```ts
import { Router } from 'express'
import { analyzeDocument, translate } from '../claude.ts'
import { lookupOccupation } from '../enrichment/occupations.ts'
import { officesFor } from '../enrichment/offices.ts'
import type { NextStep } from '../db.ts'

export const analyzeRouter = Router()

/**
 * Turns the occupation lookup into one extra next step, written in the user's
 * language. Enrichment is best-effort: the data pack and its generated cache
 * are gitignored, so a developer without them still gets a working analysis.
 */
async function enrichmentStep(
  profession: string | undefined,
  targetLang: string,
): Promise<NextStep | null> {
  if (!profession) return null
  try {
    const facts = lookupOccupation(profession, targetLang)
    if (!facts) return null
    const offices = officesFor(facts.isco).slice(0, 3)
    const german =
      `Ihr Beruf "${profession}" ist in Deutschland ` +
      `${facts.regulated ? 'ein reglementierter Beruf — die Anerkennung ist Pflicht, bevor Sie arbeiten dürfen' : 'kein reglementierter Beruf — Sie dürfen auch ohne formale Anerkennung arbeiten, eine Bewertung hilft aber bei der Bewerbung'}. ` +
      `${facts.shortage ? 'Er gilt laut Bundesagentur für Arbeit als Engpassberuf, die Nachfrage ist also hoch. ' : ''}` +
      `Zuständige Beratung in Nürnberg: ${offices.map((o) => `${o.name} (${o.scope})`).join('; ')}.`
    return { text: await translate(german, targetLang) }
  } catch (error) {
    console.error('occupation enrichment skipped:', error)
    return null
  }
}

analyzeRouter.post('/analyze-document', async (req, res) => {
  const { images, targetLang } = req.body ?? {}
  const validImages =
    Array.isArray(images) && images.length > 0 && images.every((i) => typeof i === 'string')
  if (!validImages || typeof targetLang !== 'string' || targetLang.length === 0) {
    res.status(400).json({
      error: 'images (non-empty string[] of base64 pages) and targetLang (ISO code) are required',
    })
    return
  }

  try {
    // detectedProfession is intentionally not returned — it is not part of the
    // public PathNode contract, only the input to enrichment.
    const { translation, nextSteps, detectedProfession } = await analyzeDocument(images, targetLang)
    const extra = await enrichmentStep(detectedProfession, targetLang)
    res.json({ translation, nextSteps: extra ? [...nextSteps, extra] : nextSteps })
  } catch (error) {
    console.error('analyze-document failed:', error)
    res.status(502).json({ error: 'document analysis failed' })
  }
})
```

- [ ] **Step 6: Run the tests to verify nothing regressed**

Run from `src/backend/`: `npm test`

Expected: PASS, `fail 0`. In particular `analyze.test.ts` still returns 502 with `hits === 2` — enrichment runs after `analyzeDocument`, so a failing Claude call never reaches it.

- [ ] **Step 7: Typecheck**

Run from `src/backend/`: `npm run typecheck`

Expected: no output, exit code 0.

- [ ] **Step 8: Re-run the end-to-end smoke test**

With a document that names a profession (e.g. a nursing or medical recognition letter), from `src/backend/` with the dev server running:

```bash
npm run smoke -- sample-page.png
```

Expected: step 1's `nextSteps` now ends with an extra step naming the profession's regulated/shortage status and one to three Nuremberg offices, written in the target language.

- [ ] **Step 9: Commit**

```bash
git add src/backend/src src/backend/test
git commit -m "feat(backend): fold occupation and office enrichment into next steps"
```

---

## Known gaps (state these on the pitch slide, do not build them)

- **No PII detection or redaction.** Images are sent to Claude and discarded; only derived text is stored. There is no redaction step.
- **`formLinks` is always empty.** The fast-follow is a hand-curated `{ profession/topic → official form URL }` table, kept out of this pass so Claude cannot hallucinate a government URL live on stage. `offices.ts` omits URLs for the same reason.
- **`'locked'` is unreachable and `unlocked` is never returned.** The path is append-only; this is the deliberate resolution of the contract's contradictory "locks any node that comes after it" clause.
- **Regulated-profession coverage is 79 professions, not 175** — see the second deviation note under Files.
- **Destatis outcome data is not used at all.** Its cells are independently rounded to multiples of 3, and nothing in this backend needs them.
- No auth, no multi-user support, no deployment, no rate limiting, no concurrent-write handling.
