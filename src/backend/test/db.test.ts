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
