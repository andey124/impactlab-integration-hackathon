import { Router } from 'express'
import { analyzeDocument } from '../claude.ts'

export const analyzeRouter = Router()

analyzeRouter.post('/analyze-document', async (req, res) => {
  const { images, targetLang } = req.body ?? {}
  const validImages =
    Array.isArray(images) && images.length > 0 && images.every((i) => typeof i === 'string')
  if (!validImages || typeof targetLang !== 'string' || targetLang.length === 0) {
    res.status(400).json({
      error: 'images (non-empty string[] of base64 pages) and targetLang (ISO code) are required',
    })
    return
  }

  try {
    // detectedProfession is intentionally dropped — it is not part of the
    // public PathNode contract.
    const { translation, nextSteps } = await analyzeDocument(images, targetLang)
    res.json({ translation, nextSteps })
  } catch (error) {
    console.error('analyze-document failed:', error)
    res.status(502).json({ error: 'document analysis failed' })
  }
})
