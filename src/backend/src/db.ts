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

export function updateNode(
  id: string,
  patch: Partial<Pick<PathNode, 'title' | 'translation' | 'nextSteps' | 'status'>>,
): PathNode | null {
  const row = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id) as unknown as Row | undefined
  if (!row) return null
  // Only overwrite fields actually present in the patch.
  const next: PathNode = {
    ...toNode(row),
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.translation !== undefined ? { translation: patch.translation } : {}),
    ...(patch.nextSteps !== undefined ? { nextSteps: patch.nextSteps } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
  }
  db.prepare('UPDATE nodes SET title = ?, translation = ?, next_steps = ?, status = ? WHERE id = ?').run(
    next.title,
    next.translation,
    JSON.stringify(next.nextSteps),
    next.status,
    id,
  )
  return next
}

export function clearNodes(): void {
  db.exec('DELETE FROM nodes')
}
