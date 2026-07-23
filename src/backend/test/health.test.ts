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
