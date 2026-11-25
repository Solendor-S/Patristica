/**
 * ESV text via Crossway's API (https://api.esv.org).
 *
 * The ESV is licensed, so unlike every other translation in the app it can NOT be
 * bundled or downloaded as a pack. Crossway's terms impose three constraints that
 * shape this whole module:
 *
 *   1. "You may not sell, share, or publish your access key." An APK is
 *      decompilable, so a bundled key is a published key. The app's key lives on
 *      our own server instead (esv-proxy/ at the repo root), an arrangement
 *      Crossway Permissions approved by email on 2026-11-25. Readers can still
 *      use their own free key (Settings → ESV Bible), which skips the server.
 *   2. Local storage is capped at "500 verses or one-half of any book, whichever
 *      is less". Hence the memory-only cache below — nothing ever touches SQLite.
 *   3. Non-commercial use only. If Patristica ever takes ads, sponsorships, or
 *      charges for access, ESV support must be removed unless Crossway grants a
 *      written licence.
 *
 * Rate limits are per key: 5,000/day, 1,000/hour, 60/minute. One chapter view =
 * one request. The server enforces them for the shared key; when it has no quota
 * left the reader falls back to the KJV (EsvError.unavailable).
 */

/** Deployed esv-proxy URL, no trailing slash. Empty = readers must use their own key. */
export const ESV_PROXY_URL: string = 'https://patristica-esv.solendor.workers.dev'

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

// Crossway reads "Jude 1" as verse 1, so one-chapter books are asked for by name alone.
const ONE_CHAPTER = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude'])

export interface EsvVerse { book: string; chapter: number; verse: number; text: string }

export class EsvError extends Error {
  needsKey: boolean
  /** The shared server can't serve the ESV right now: show another translation. */
  unavailable: boolean
  constructor(message: string, needsKey = false, unavailable = false) {
    super(message)
    this.needsKey = needsKey
    this.unavailable = unavailable
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
  proxyUrl: string = ESV_PROXY_URL,
): Promise<EsvVerse[]> {
  if (!apiKey && !proxyUrl) throw new EsvError('No ESV API key set.', true)

  const cacheKey = `${book}:${chapter}`
  const hit = cache.get(cacheKey)
  if (hit) return hit

  let res: Response
  try {
    res = apiKey
      ? await fetch(`${API_BASE}?q=${encodeURIComponent(ONE_CHAPTER.has(book) ? book : `${book} ${chapter}`)}&${PARAMS}`,
          { headers: { Authorization: `Token ${apiKey}` } })
      : await fetch(`${proxyUrl}/chapter?book=${encodeURIComponent(book)}&chapter=${chapter}`)
  } catch {
    throw new EsvError('Could not reach the ESV service. Check your connection.')
  }

  if (!apiKey && !res.ok) {
    throw new EsvError('The ESV is busy right now. Try again later.', false, true)
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
