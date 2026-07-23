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
