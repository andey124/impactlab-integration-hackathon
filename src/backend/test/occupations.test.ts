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

test('returns null for a Ukrainian label, which ESCO does not carry', { skip: !ready }, () => {
  // ESCO has no Ukrainian labels, and Claude returns the profession name
  // already translated into the target language — so a Ukrainian profession
  // name doesn't match the de/en fallback either. This is the real, unsolved
  // case for that locale, not a success path.
  assert.equal(lookupOccupation('медична сестра', 'uk'), null)
})

test('returns null when nothing matches', { skip: !ready }, () => {
  assert.equal(lookupOccupation('zzzz-not-a-profession', 'de'), null)
})

test('reports a doctor as regulated via the 221 minor-group entry', { skip: !ready }, () => {
  const facts = lookupOccupation('Arzt für Allgemeinmedizin', 'de')
  assert.ok(facts, 'expected a match for Arzt für Allgemeinmedizin')
  assert.equal(facts.regulated, true)
})
