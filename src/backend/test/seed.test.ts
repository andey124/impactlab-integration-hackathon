import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serve } from './helpers.ts'
import { buildSeed } from '../src/seed.ts'

process.env.DB_PATH = ':memory:'
process.env.ANTHROPIC_API_KEY = 'test-key'
const { app } = await import('../src/app.ts')

test('buildSeed returns Ukrainian/Turkish content with an English fallback', () => {
  const uk = buildSeed('uk')
  const tr = buildSeed('tr')
  const en = buildSeed('zz') // unknown code → English fallback

  assert.ok(uk.length >= 5, 'seed has several nodes')
  assert.equal(uk.length, tr.length)
  assert.equal(tr.length, en.length)

  assert.match(uk[0].translation, /[\u0400-\u04FF]/, 'Ukrainian text is Cyrillic')
  assert.match(en[0].translation, /^This confirms/, 'unknown lang falls back to English')

  // Every step but the last is done; the last is the active current step.
  assert.equal(en.at(-1)!.status, 'active')
  assert.ok(en.slice(0, -1).every((n) => n.status === 'done'))

  const steps = uk.flatMap((n) => n.nextSteps)
  assert.ok(steps.some((s) => s.formLinks && s.formLinks.length > 0), 'has formLinks')
  assert.ok(steps.some((s) => s.dueDate), 'has a dueDate')
})

test('GET /api/path?lang=uk seeds the example path in Ukrainian', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const res = await fetch(`${s.url}/api/path?lang=uk`)
  assert.equal(res.status, 200)
  const { nodes } = (await res.json()) as {
    nodes: { title: string; status: string; translation: string }[]
  }
  assert.ok(nodes.length >= 5)
  assert.equal(nodes.at(-1)!.status, 'active')
  assert.match(nodes[0].translation, /[\u0400-\u04FF]/)
})

test('seeding is idempotent — a repeated GET does not duplicate nodes', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const first = (await (await fetch(`${s.url}/api/path?lang=uk`)).json()) as { nodes: unknown[] }
  const second = (await (await fetch(`${s.url}/api/path?lang=uk`)).json()) as { nodes: unknown[] }
  assert.equal(first.nodes.length, second.nodes.length)
})
