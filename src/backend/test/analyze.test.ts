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
