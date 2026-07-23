import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { lookupOccupation } from '../src/enrichment/occupations.ts'

// The data pack and the generated cache are gitignored, so skip cleanly when absent.
const ready = existsSync(new URL('../data/enrichment.json', import.meta.url))

test('matches a German profession name to its ISCO group', { skip: !ready }, () => {
  const facts = lookupOccupation('Krankenpfleger', 'de')
  assert.ok(facts, 'expected a match for Krankenpfleger')
  assert.match(facts.isco, /^\d{4}(\.\d+)?$/)
  assert.equal(typeof facts.regulated, 'boolean')
  assert.equal(typeof facts.shortage, 'boolean')
})

test('falls back to German then English for a locale ESCO does not carry', { skip: !ready }, () => {
  // ESCO has no Ukrainian; Claude has already translated the profession name,
  // so the de/en fallback is what makes a match possible at all.
  assert.ok(lookupOccupation('nurse', 'uk'))
})

test('returns null when nothing matches', { skip: !ready }, () => {
  assert.equal(lookupOccupation('zzzz-not-a-profession', 'de'), null)
})
