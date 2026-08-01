/**
 * ESV text via Crossway's API (https://api.esv.org).
 *
 * The ESV is licensed, so unlike every other translation in the app it can NOT be
 * bundled or downloaded as a pack. Crossway's terms impose three constraints that
 * shape this whole module:
 *
 *   1. "You may not sell, share, or publish your access key." An APK is
 *      decompilable, so a bundled key is a published key. Each user therefore
 *      brings their own free key (Settings → ESV Bible).
 *   2. Local storage is capped at "500 verses or one-half of any book, whichever
 *      is less". Hence the memory-only cache below — nothing ever touches SQLite.
 *   3. Non-commercial use only. If Patristica ever takes ads, sponsorships, or
 *      charges for access, ESV support must be removed unless Crossway grants a
 *      written licence.
 *
 * Rate limits are per key: 5,000/day, 1,000/hour, 60/minute. One chapter view =
 * one request, so a normal reader never comes close.
 */

const API_BASE = 'https://api.esv.org/v3/passage/text/'

// Everything off except verse numbers — the reader supplies its own chrome, and
// headings/footnotes/indentation would all have to be stripped back out again.
const PARAMS = [
  'include-passage-references=false',
  'include-headings=false',
  'include-footnotes=false',
  'include-footnote-body=false',
  'include-short-copyright=false',
  'include-passage-horizontal-lines=false',
  'include-heading-horizontal-lines=false',
  'indent-paragraphs=0',
  'indent-poetry=false',
  'indent-poetry-lines=0',
  'indent-declares=0',
  'indent-psalm-doxology=0',
  'include-verse-numbers=true',
  'include-first-verse-numbers=true',
].join('&')

/** Required attribution — rendered under every ESV chapter. Do not remove. */
export const ESV_COPYRIGHT =
  'Scripture quotations are from the ESV® Bible (The Holy Bible, English Standard Version®), ' +
  '© 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.'

export const ESV_SIGNUP_URL = 'https://api.esv.org/account/create-application/'

export interface EsvVerse { book: string; chapter: number; verse: number; text: string }

export class EsvError extends Error {
  needsKey: boolean
  constructor(message: string, needsKey = false) {
    super(message)
    this.needsKey = needsKey
  }
}

// ── Cache ─────────────────────────────────────────────────
// Memory only, and capped well under Crossway's 500-verse storage limit. Lives
// for the process lifetime so page-turn-and-back doesn't burn a request.
const MAX_CACHED_VERSES = 400
const cache = new Map<string, EsvVerse[]>()

function remember(key: string, verses: EsvVerse[]) {
  cache.delete(key)
  cache.set(key, verses)
  let total = 0
  for (const v of cache.values()) total += v.length
  // Evict oldest (Map preserves insertion order) until back under the cap.
  for (const oldest of cache.keys()) {
    if (total <= MAX_CACHED_VERSES) break
    total -= cache.get(oldest)!.length
    cache.delete(oldest)
  }
}

export function clearEsvCache() {
  cache.clear()
}

// ── Parsing ───────────────────────────────────────────────

/**
 * Split the API's plain-text blob into verses.
 *
 * The response looks like "  [1] In the beginning... [2] The earth was...",
 * with verse markers inline. Splitting on the marker gives alternating
 * [number, text] pairs after an initial (usually empty) preamble.
 */
export function parseEsvPassage(passage: string, book: string, chapter: number): EsvVerse[] {
  const parts = passage.split(/\[(\d+)\]/)
  const verses: EsvVerse[] = []
  for (let i = 1; i < parts.length; i += 2) {
    const verse = parseInt(parts[i], 10)
    const text = parts[i + 1]
      // The API footer "(ESV)" and stray whitespace/newlines from line wrapping.
      ?.replace(/\s*\(ESV\)\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (verse && text) verses.push({ book, chapter, verse, text })
  }
  return verses
}

// ── Fetch ─────────────────────────────────────────────────

export async function fetchEsvChapter(
  book: string,
  chapter: number,
  apiKey: string,
): Promise<EsvVerse[]> {
  if (!apiKey) throw new EsvError('No ESV API key set.', true)

  const cacheKey = `${book}:${chapter}`
  const hit = cache.get(cacheKey)
  if (hit) return hit

  const url = `${API_BASE}?q=${encodeURIComponent(`${book} ${chapter}`)}&${PARAMS}`
  let res: Response
  try {
    res = await fetch(url, { headers: { Authorization: `Token ${apiKey}` } })
  } catch {
    throw new EsvError('Could not reach the ESV service. Check your connection.')
  }

  if (res.status === 401 || res.status === 403) {
    throw new EsvError('Your ESV API key was rejected. Check it in Settings.', true)
  }
  if (res.status === 429) {
    throw new EsvError('ESV rate limit reached. Try again shortly.')
  }
  if (!res.ok) {
    throw new EsvError(`ESV service error (${res.status}).`)
  }

  const data = await res.json() as { passages?: string[] }
  const verses = parseEsvPassage((data.passages ?? []).join('\n'), book, chapter)
  if (verses.length === 0) {
    throw new EsvError(`The ESV does not include ${book} ${chapter}.`)
  }
  remember(cacheKey, verses)
  return verses
}

/** Cheap round-trip used by Settings to tell the user whether their key works. */
export async function validateEsvKey(apiKey: string): Promise<void> {
  clearEsvCache()
  await fetchEsvChapter('John', 11, apiKey)
  clearEsvCache()
}
