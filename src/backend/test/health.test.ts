import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serve } from './helpers.ts'
import { app } from '../src/app.ts'

test('GET /health returns ok', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const res = await fetch(`${s.url}/health`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { ok: true })
})

test('CORS preflight is answered', async (t) => {
  const s = await serve(app)
  t.after(() => s.close())
  const res = await fetch(`${s.url}/api/path`, { method: 'OPTIONS' })
  assert.equal(res.status, 204)
  assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173')
})
