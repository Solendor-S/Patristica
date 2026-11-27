/**
 * NASB95, NASB20 and NKJV via API.Bible (Starter plan, non-commercial), served
 * through our own server (apibible-proxy/ at the repo root) so the key stays out
 * of the APK. Licensed text: never bundle, pack or write it to SQLite.
 *
 * Starter-plan terms that shape this module:
 *   - Show the copyright API.Bible sends, plus a visible link to api.bible, under
 *     every chapter. Do not remove either.
 *   - Text may not be modified (whitespace aside).
 *   - Non-commercial only: no ads, revenue, subscriptions or in-app purchases.
 */
import { parseEsvPassage, type EsvVerse } from './esv'

/** Deployed apibible-proxy URL, no trailing slash. */
export const APIBIBLE_PROXY_URL: string = 'https://patristica-apibible.solendor.workers.dev'
export const APIBIBLE_URL = 'https://api.bible'

export const APIBIBLE_TRANSLATIONS = new Set(['NASB95', 'NASB20', 'NKJV'])

export class ApiBibleError extends Error {
  /** The server can't serve this right now: show the KJV instead. */
  unavailable: boolean
  constructor(message: string, unavailable = false) { super(message); this.unavailable = unavailable }
}

// Memory only, for page-turn-and-back. The server holds the 29-day cache.
const cache = new Map<string, EsvVerse[]>()
const copyrights = new Map<string, string>()

/** Copyright line for a translation, once any chapter of it has loaded. */
export const apiBibleCopyright = (translation: string) => copyrights.get(translation) ?? ''

export async function fetchApiBibleChapter(translation: string, book: string, chapter: number): Promise<EsvVerse[]> {
  const key = `${translation}:${book}:${chapter}`
  const hit = cache.get(key)
  if (hit) return hit

  let res: Response
  try {
    res = await fetch(`${APIBIBLE_PROXY_URL}/chapter?bible=${translation}&book=${encodeURIComponent(book)}&chapter=${chapter}`)
  } catch {
    throw new ApiBibleError(`Could not reach the ${translation} service. Check your connection.`)
  }
  if (!res.ok) throw new ApiBibleError(`The ${translation} is busy right now. Try again later.`, true)

  const data = await res.json() as { content?: string; copyright?: string }
  const verses = parseEsvPassage(data.content ?? '', book, chapter)
  if (verses.length === 0) throw new ApiBibleError(`The ${translation} does not include ${book} ${chapter}.`)
  if (data.copyright) copyrights.set(translation, data.copyright.trim())
  cache.set(key, verses)
  return verses
}
