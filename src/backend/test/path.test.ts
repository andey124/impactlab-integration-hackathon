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

test('GET /api/path returns an empty node list', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const res = await fetch(`${s.url}/api/path`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { nodes: [] })
})

test('POST /api/path/nodes appends an active node and GET returns it', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
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
})

test('POST /api/path/nodes rejects a malformed body with 400', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const res = await post(`${s.url}/api/path/nodes`, { title: 'only a title' })
  assert.equal(res.status, 400)
  assert.ok(typeof ((await res.json()) as { error: string }).error === 'string')
})

test('PATCH marks a node done and omits `unlocked`', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
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
})

test('PATCH rejects an unknown id with 404 and a bad status with 400', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const missing = await patch(`${s.url}/api/path/nodes/does-not-exist`, { status: 'done' })
  assert.equal(missing.status, 404)

  const created = await post(`${s.url}/api/path/nodes`, { title: 'S', translation: 't', nextSteps: [] })
  const { node } = (await created.json()) as { node: { id: string } }
  const bad = await patch(`${s.url}/api/path/nodes/${node.id}`, { status: 'active' })
  assert.equal(bad.status, 400)
})

test('PATCH edits title/translation/nextSteps without touching status', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const created = await post(`${s.url}/api/path/nodes`, {
    title: 'Old',
    translation: 'old text',
    nextSteps: [{ text: 'a' }],
  })
  const { node } = (await created.json()) as { node: { id: string } }

  const res = await patch(`${s.url}/api/path/nodes/${node.id}`, {
    title: 'New',
    translation: 'new text',
    nextSteps: [{ text: 'b' }, { text: 'c' }],
  })
  assert.equal(res.status, 200)
  const body = (await res.json()) as { node: { title: string; translation: string; status: string; nextSteps: unknown[] } }
  assert.equal(body.node.title, 'New')
  assert.equal(body.node.translation, 'new text')
  assert.equal(body.node.nextSteps.length, 2)
  assert.equal(body.node.status, 'active', 'editing must not change status')
})

test('PATCH with an empty body is rejected with 400', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const created = await post(`${s.url}/api/path/nodes`, { title: 'S', translation: 't', nextSteps: [] })
  const { node } = (await created.json()) as { node: { id: string } }
  const res = await patch(`${s.url}/api/path/nodes/${node.id}`, {})
  assert.equal(res.status, 400)
})

test('DELETE /api/path clears every node', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  await post(`${s.url}/api/path/nodes`, { title: 'A', translation: 't', nextSteps: [] })
  await post(`${s.url}/api/path/nodes`, { title: 'B', translation: 't', nextSteps: [] })

  const del = await fetch(`${s.url}/api/path`, { method: 'DELETE' })
  assert.equal(del.status, 200)
  assert.deepEqual(await del.json(), { nodes: [] })

  const listed = await fetch(`${s.url}/api/path`)
  assert.deepEqual(await listed.json(), { nodes: [] })
})
