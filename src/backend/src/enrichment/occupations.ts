// NOT WIRED INTO ANY ROUTE. Groundwork for the cancelled office-suggestion task.
// Match quality is unvalidated: substring matching returns arbitrary specialisations
// for short queries (e.g. 'Arzt' matches a veterinary-physiology specialist), and
// ESCO carries no Ukrainian or Turkish labels, so those locales do not match at all.
// Review before wiring this into a user-facing path.
import { readFileSync } from 'node:fs'

const PACK = new URL('../../../../zollhof-recognition-data-pack/', import.meta.url)
const CACHE = new URL('../../data/enrichment.json', import.meta.url)

type EscoRecord = {
  iscoGroup: string
  preferredLabel: Record<string, string>
  alternativeLabel?: Record<string, string[]>
}

type Cache = {
  iscoToKldb: Record<string, string[]>
  kldbShortageScore: Record<string, number>
  regulatedIsco: string[]
}

export type OccupationFacts = {
  isco: string
  label: string
  regulated: boolean
  shortage: boolean
}

// BA treats an average indicator score >= 2.0 as an Engpassberuf.
const SHORTAGE_THRESHOLD = 2.0

// Lazy: reading these at module scope would throw during `import`, before a
// test file's per-test { skip } guard ever gets a chance to run.
let esco: EscoRecord[] | undefined
let cache: Cache | undefined
let regulated: Set<string> | undefined

function loadData() {
  if (cache && regulated && esco) return
  esco = JSON.parse(
    readFileSync(new URL('esco/esco-occupations-multilingual.json', PACK), 'utf8'),
  ) as EscoRecord[]
  cache = JSON.parse(readFileSync(CACHE, 'utf8')) as Cache
  regulated = new Set(cache.regulatedIsco)
}

/** Per-locale label index, built on first use and kept for the process lifetime. */
const indexes = new Map<string, { label: string; isco: string }[]>()

function indexFor(lang: string) {
  const cached = indexes.get(lang)
  if (cached) return cached

  const entries: { label: string; isco: string }[] = []
  for (const record of esco!) {
    const labels = [record.preferredLabel?.[lang], ...(record.alternativeLabel?.[lang] ?? [])]
    for (const label of labels) {
      if (label) entries.push({ label: label.toLowerCase(), isco: record.iscoGroup })
    }
  }
  // Longest label first, so "fachkrankenpfleger" wins over "pfleger".
  entries.sort((a, b) => b.label.length - a.label.length)
  indexes.set(lang, entries)
  return entries
}

/**
 * Case-insensitive substring match against ESCO labels for `targetLang`,
 * falling back to German then English. ESCO carries no Ukrainian or Turkish,
 * and Claude has already translated the profession name during extraction,
 * so the fallback is what makes those locales matchable at all.
 */
export function lookupOccupation(profession: string, targetLang: string): OccupationFacts | null {
  const query = profession.trim().toLowerCase()
  if (!query) return null

  loadData()

  for (const lang of [targetLang, 'de', 'en']) {
    const hit = indexFor(lang).find(
      (entry) => query.includes(entry.label) || entry.label.includes(query),
    )
    if (!hit) continue

    const isco4 = hit.isco.split('.')[0]
    const shortage = (cache!.iscoToKldb[isco4] ?? []).some(
      (kldb4) => (cache!.kldbShortageScore[kldb4] ?? 0) >= SHORTAGE_THRESHOLD,
    )
    // regulatedIsco holds a mix of 4-digit unit-group codes and 3-digit minor-group
    // codes (e.g. "221" = all medical doctors). A 3-digit entry regulates every
    // unit group under it, so check both the full code and its 3-digit prefix.
    const isRegulated = regulated!.has(isco4) || regulated!.has(isco4.slice(0, 3))
    return { isco: hit.isco, label: hit.label, regulated: isRegulated, shortage }
  }
  return null
}
