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

const esco = JSON.parse(
  readFileSync(new URL('esco/esco-occupations-multilingual.json', PACK), 'utf8'),
) as EscoRecord[]

const cache = JSON.parse(readFileSync(CACHE, 'utf8')) as Cache
const regulated = new Set(cache.regulatedIsco)

// BA treats an average indicator score >= 2.0 as an Engpassberuf.
const SHORTAGE_THRESHOLD = 2.0

/** Per-locale label index, built on first use and kept for the process lifetime. */
const indexes = new Map<string, { label: string; isco: string }[]>()

function indexFor(lang: string) {
  const cached = indexes.get(lang)
  if (cached) return cached

  const entries: { label: string; isco: string }[] = []
  for (const record of esco) {
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

  for (const lang of [targetLang, 'de', 'en']) {
    const hit = indexFor(lang).find(
      (entry) => query.includes(entry.label) || entry.label.includes(query),
    )
    if (!hit) continue

    const isco4 = hit.isco.split('.')[0]
    const shortage = (cache.iscoToKldb[isco4] ?? []).some(
      (kldb4) => (cache.kldbShortageScore[kldb4] ?? 0) >= SHORTAGE_THRESHOLD,
    )
    return { isco: hit.isco, label: hit.label, regulated: regulated.has(isco4), shortage }
  }
  return null
}
