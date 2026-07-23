import express from 'express'
import { pathRouter } from './routes/path.ts'
import { analyzeRouter } from './routes/analyze.ts'

export const app = express()

// Single-user local demo, no cookies or auth headers — a wildcard origin is
// sufficient and avoids hard-coding the frontend's dev port.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

// Multi-page base64 scans blow past Express's 100kb default.
app.use(express.json({ limit: '25mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api', pathRouter)
app.use('/api', analyzeRouter)
