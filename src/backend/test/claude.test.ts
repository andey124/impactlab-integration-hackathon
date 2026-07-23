import { test } from 'node:test'
import assert from 'node:assert/strict'

process.env.ANTHROPIC_API_KEY = 'test-key'
const { toContentBlock } = await import('../src/claude.ts')

test('a PDF payload becomes a document block, images stay image blocks', () => {
  const pdf = toContentBlock('JVBERi0xLjQK') as { type: string; source: { media_type: string } }
  assert.equal(pdf.type, 'document')
  assert.equal(pdf.source.media_type, 'application/pdf')

  const png = toContentBlock('iVBORw0KGgoAAA') as { type: string; source: { media_type: string } }
  assert.equal(png.type, 'image')
  assert.equal(png.source.media_type, 'image/png')

  // A `data:` URL prefix is stripped before the type is detected.
  const prefixed = toContentBlock('data:application/pdf;base64,JVBERi0xLjQK') as { type: string }
  assert.equal(prefixed.type, 'document')
})
