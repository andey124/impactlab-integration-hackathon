import { Router } from 'express'
import { listNodes, createNode, updateNode, clearNodes, seedIfEmpty, type NextStep } from '../db.ts'

export const pathRouter = Router()

pathRouter.get('/path', (req, res) => {
  // A `lang` param means a real client is opening the path: seed the demo journey
  // (in that language) when it's empty. Without `lang` the path is left as-is.
  if (typeof req.query.lang === 'string' && req.query.lang.length > 0) {
    seedIfEmpty(req.query.lang)
  }
  res.json({ nodes: listNodes() })
})

pathRouter.delete('/path', (_req, res) => {
  // Reset the demo: wipe every node so the user starts from a clean path.
  clearNodes()
  res.json({ nodes: [] })
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
  const { title, translation, nextSteps, status } = req.body ?? {}
  if (
    (title !== undefined && typeof title !== 'string') ||
    (translation !== undefined && typeof translation !== 'string') ||
    (nextSteps !== undefined && !Array.isArray(nextSteps)) ||
    // Linear MVP: the only status a client may set is 'done'.
    (status !== undefined && status !== 'done')
  ) {
    res.status(400).json({
      error: "title/translation must be strings, nextSteps an array, status must be 'done'",
    })
    return
  }
  if (title === undefined && translation === undefined && nextSteps === undefined && status === undefined) {
    res.status(400).json({ error: 'nothing to update' })
    return
  }
  const node = updateNode(req.params.id, {
    title,
    translation,
    nextSteps: nextSteps as NextStep[] | undefined,
    status,
  })
  if (!node) {
    res.status(404).json({ error: 'node not found' })
    return
  }
  // The path is append-only, so there is never a following locked node to
  // unlock — `unlocked` is deliberately omitted from the response.
  res.json({ node })
})
