import Anthropic from '@anthropic-ai/sdk'
import type { NextStep } from './db.ts'

// maxRetries: 1 gives exactly one automatic retry on transient failures
// (timeouts, 408/409/429/5xx), which is the retry policy the spec asks for.
const client = new Anthropic({ maxRetries: 1 })

const MODEL = 'claude-sonnet-5'

export type Analysis = {
  translation: string
  nextSteps: NextStep[]
  /** Internal only — never returned to the frontend. Feeds occupation enrichment. */
  detectedProfession?: string
}

const RECORD_ANALYSIS = {
  name: 'record_analysis',
  description: 'Record the translation and the extracted next steps for the uploaded document.',
  input_schema: {
    type: 'object' as const,
    properties: {
      translation: {
        type: 'string',
        description: 'The full document text, faithfully translated into the target language.',
      },
      nextSteps: {
        type: 'array',
        description:
          'Every concrete action the reader must take, in the order they should be done, written in the target language.',
        items: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description:
                'What to do, in plain language a non-expert understands, in the target language.',
            },
            dueDate: {
              type: 'string',
              description:
                'ISO 8601 date (YYYY-MM-DD) only if the document states a deadline. Omit otherwise.',
            },
          },
          required: ['text'],
          additionalProperties: false,
        },
      },
      detectedProfession: {
        type: 'string',
        description:
          'The profession this document is about, in the target language, if the document names one. Omit otherwise.',
      },
    },
    required: ['translation', 'nextSteps'],
    additionalProperties: false,
  },
}

/** Guesses the media type from the base64 payload's magic bytes. */
function mediaType(base64: string): 'image/png' | 'image/gif' | 'image/webp' | 'image/jpeg' {
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg'
}

/** Accepts either a bare base64 string or a `data:image/png;base64,...` URL. */
function stripDataUrl(image: string): string {
  return image.replace(/^data:[^;]+;base64,/, '')
}

export async function analyzeDocument(images: string[], targetLang: string): Promise<Analysis> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // ponytail: thinking off keeps the live-demo turn fast; this is a
    // schema-constrained extraction, not open reasoning. Switch to
    // { type: 'adaptive' } if translation quality needs it.
    thinking: { type: 'disabled' },
    tools: [RECORD_ANALYSIS],
    tool_choice: { type: 'tool', name: 'record_analysis' },
    system:
      `You help migrants in Germany understand letters from the Ausländerbehörde and other German authorities. ` +
      `Translate the document faithfully into the language with ISO code "${targetLang}", and extract every concrete action the reader must take. ` +
      `Write everything — the translation and every step — in "${targetLang}". ` +
      `Never invent deadlines, form numbers, URLs, offices, or amounts that are not in the document.`,
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((image) => {
            const data = stripDataUrl(image)
            return {
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: mediaType(data), data },
            }
          }),
          {
            type: 'text' as const,
            text: 'These images are the pages of one document, in order. Call record_analysis with the translation and the next steps.',
          },
        ],
      },
    ],
  })

  // The type predicate is required: a plain `.find` returns the whole
  // ContentBlock union, which has no `.input`, and `npm run typecheck` fails.
  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  )
  if (!toolUse) throw new Error('model did not call record_analysis')
  return toolUse.input as Analysis
}

/** Translates a short backend-generated sentence into the user's language. */
export async function translate(text: string, targetLang: string): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    thinking: { type: 'disabled' },
    system: `Translate the user's text into the language with ISO code "${targetLang}". Reply with the translation only.`,
    messages: [{ role: 'user', content: text }],
  })
  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  return block ? block.text : text
}
