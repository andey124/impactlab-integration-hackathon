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
