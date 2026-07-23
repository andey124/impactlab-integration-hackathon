import express from 'express'
import { pathRouter } from './routes/path.ts'
import { analyzeRouter } from './routes/analyze.ts'

export const app = express()

// Single-user local demo, but the backend also binds only to loopback and
// holds an API key + the user's translated correspondence — a wildcard
// origin would let any website the user visits read those from the browser.
// Restrict to the frontend's dev origin, overridable via FRONTEND_ORIGIN.
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', frontendOrigin)
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

// Express's default handler returns HTML with stack traces; the contract is JSON.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const status = typeof err?.status === 'number' ? err.status : 500
  res.status(status).json({
    error: err?.type === 'entity.too.large' ? 'document too large' : 'bad request',
  })
})
