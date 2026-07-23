import type { SQLiteDatabase } from 'expo-sqlite'
import type { BibleVerse, Bookmark, CommentaryEntry, CrossRef, Note, SearchResult, TextualVariant } from '../types'
import { distributeChapters, PLAN_TEMPLATES } from '../data/planTemplates'
export type { PlanTemplate } from '../data/planTemplates'
export { PLAN_TEMPLATES } from '../data/planTemplates'

// ── Book name normalisation ────────────────────────────────
// ASV (and some other translations) store numbered books with Roman numerals
// (e.g. "I John", "II Corinthians") while the app uses numeric form ("1 John").
// bookAlt returns the alternative form so queries can match either.
const NUM_PREFIX: Record<string, string> = { '1 ': 'I ', '2 ': 'II ', '3 ': 'III ' }
const ROM_PREFIX: Record<string, string> = { 'I ': '1 ', 'II ': '2 ', 'III ': '3 ' }
function bookAlt(book: string): string | null {
  // BSB stores Psalms as "Psalm" (singular, from its source VerseId); the app uses "Psalms".
  if (book === 'Psalms') return 'Psalm'
  for (const [from, to] of Object.entries(NUM_PREFIX))
    if (book.startsWith(from)) return to + book.slice(from.length)
  for (const [from, to] of Object.entries(ROM_PREFIX))
    if (book.startsWith(from)) return to + book.slice(from.length)
  return null
}

// OT word-per-row tables; NT Greek tables live near the word-study functions below
const OT_WORD_TABLE: Record<string, { table: string; col: string }> = {
  lxx:   { table: 'lxx_words',    col: 'greek'  },
  tahot: { table: 'hebrew_words', col: 'hebrew' },
  wlc:   { table: 'wlc_words',    col: 'hebrew' },
  dss:   { table: 'dss_words',    col: 'hebrew' },
}

async function getChapterWords(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  table: string,
  col: string,
): Promise<BibleVerse[]> {
  return db.getAllAsync<BibleVerse>(
    // Inner ORDER BY preserves word order for GROUP_CONCAT (SQLite scan-order guarantee)
    `SELECT book, chapter, verse, GROUP_CONCAT(${col}, ' ') AS text
     FROM (SELECT book, chapter, verse, position, ${col} FROM ${table}
           WHERE book = ? AND chapter = ? ORDER BY verse, position)
     GROUP BY verse ORDER BY verse`,
    [book, chapter],
  )
}

async function getVerseWords(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  table: string,
  col: string,
): Promise<BibleVerse | null> {
  const row = await db.getFirstAsync<{ text: string }>(
    `SELECT GROUP_CONCAT(${col}, ' ') AS text
     FROM (SELECT ${col} FROM ${table} WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position)`,
    [book, chapter, verse],
  )
  if (!row?.text) return null
  return { book, chapter, verse, text: row.text }
}

// Annotated variants: interleave each word with its Strong's number ("word Gxxxx word Gxxxx …")
// Strip leading zeros via CAST trick: SUBSTR(s,1,1) || CAST(CAST(SUBSTR(s,2) AS INTEGER) AS TEXT)
const NORM_STRONGS_EXPR = `SUBSTR(strongs,1,1) || CAST(CAST(SUBSTR(strongs,2) AS INTEGER) AS TEXT)`

async function getChapterWordsAnnotated(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  table: string,
  col: string,
): Promise<BibleVerse[]> {
  return db.getAllAsync<BibleVerse>(
    `SELECT book, chapter, verse, GROUP_CONCAT(${col} || ' ' || ${NORM_STRONGS_EXPR}, ' ') AS text
     FROM (SELECT book, chapter, verse, position, ${col}, strongs FROM ${table}
           WHERE book = ? AND chapter = ? ORDER BY verse, position)
     GROUP BY verse ORDER BY verse`,
    [book, chapter],
  )
}

async function getVerseWordsAnnotated(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  table: string,
  col: string,
): Promise<BibleVerse | null> {
  const row = await db.getFirstAsync<{ text: string }>(
    `SELECT GROUP_CONCAT(${col} || ' ' || ${NORM_STRONGS_EXPR}, ' ') AS text
     FROM (SELECT ${col}, strongs FROM ${table} WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position)`,
    [book, chapter, verse],
  )
  if (!row?.text) return null
  return { book, chapter, verse, text: row.text }
}

// ── Pack routing helpers ──────────────────────────────────

// Maps translation string → pack slug for optional content
export const TRANSLATION_PACK_SLUG: Record<string, string> = {
  // Translation packs (rows in bible_translations)
  ASV:   'asv',
  WEB:   'web',
  BSB:   'bsb',
  E_LXX: 'elxx',
  A_LXX: 'elxx',
  LXX:   'elxx',
  'LXX+': 'elxx',
  DSS:   'dss',
  // Scholar word-table packs (TR and WLC are core defaults; these are optional)
  SBLGNT: 'sblgnt',
  TAGNT:  'tagnt',
  TAHOT:  'tahot',
}

// Maps annotation translation key → its word table/column.
// TR+/WLC+ are in the core DB; LXX+ is in a pack DB — use TRANSLATION_PACK_SLUG to decide.
const ANNOTATED_TRANSLATION_TABLE: Record<string, { table: string; col: string }> = {
  'TR+':  { table: 'greek_words_tr', col: 'greek'  },
  'WLC+': OT_WORD_TABLE['wlc'],
  'LXX+': OT_WORD_TABLE['lxx'],
}

// Maps translation key → online fetch source and whether it is word-level data.
// Needed for translations whose online path differs from their pack slug.
export const TRANSLATION_ONLINE_SOURCE: Record<string, { source: string; isWordSource: boolean }> = {
  LXX:    { source: 'lxx',  isWordSource: true  },
  'LXX+': { source: 'lxx',  isWordSource: true  },
  A_LXX:  { source: 'alxx', isWordSource: false },
}

// ── Bible verses ──────────────────────────────────────────

export async function getApocryphaChapter(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  packDb?: SQLiteDatabase,
): Promise<BibleVerse[]> {
  const q = 'SELECT book, chapter, verse, text FROM apocrypha_verses WHERE book = ? AND chapter = ? ORDER BY verse'
  return (packDb ?? db).getAllAsync<BibleVerse>(q, [book, chapter])
}

export async function getEarlyTextFootnotes(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  packDb?: SQLiteDatabase,
): Promise<Map<number, string>> {
  const rows = await (packDb ?? db).getAllAsync<{ marker: number; note: string }>(
    'SELECT marker, note FROM early_text_footnotes WHERE book = ? AND chapter = ? ORDER BY marker',
    [book, chapter]
  )
  return new Map(rows.map(r => [r.marker, r.note]))
}

// Books whose chapters contain numbered sections (1. 2. 3. …) that should
// each become a separate verse rather than one monolithic block.
const NUMBERED_SECTION_BOOKS = new Set([
  'Against Heresies Book 1',
  'Against Heresies Book 2',
  'Against Heresies Book 3',
  'Against Heresies Book 4',
  'Against Heresies Book 5',
])

/**
 * Split a chapter text that uses inline numbered sections (1. 2. 3. …)
 * into individual BibleVerse rows, one per section.
 * The leading "N. " prefix is stripped from each verse's text since the
 * verse number indicator already shows it.
 */
function splitNumberedSections(text: string, book: string, chapter: number): BibleVerse[] {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)

  const groups: { verse: number; paras: string[] }[] = []
  const preamble: string[] = []

  for (const para of paragraphs) {
    // Match 1–2 digit section number at start: "1. " or "12. "
    const m = para.match(/^(\d{1,2})\.\s+/)
    if (m) {
      groups.push({ verse: parseInt(m[1], 10), paras: [para.slice(m[0].length)] })
    } else if (groups.length === 0) {
      preamble.push(para)
    } else {
      groups[groups.length - 1].paras.push(para)
    }
  }

  // No numbered sections found — return the raw single verse unchanged
  if (groups.length === 0) {
    return [{ book, chapter, verse: 1, text } as BibleVerse]
  }

  // Prepend any pre-section preamble text to the first section
  if (preamble.length > 0) {
    groups[0].paras = [...preamble, ...groups[0].paras]
  }

  return groups.map(g => ({
    book, chapter, verse: g.verse,
    text: g.paras.join('\n\n'),
  } as BibleVerse))
}

export async function getEarlyTextChapter(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  packDb?: SQLiteDatabase,
): Promise<BibleVerse[]> {
  const rows = await (packDb ?? db).getAllAsync<BibleVerse>(
    'SELECT book, chapter, verse, text FROM early_texts WHERE book = ? AND chapter = ? ORDER BY verse',
    [book, chapter]
  )

  // For books with inline numbered sections, split the single-verse blob
  // into one verse per section so each renders as its own row in the reader.
  if (NUMBERED_SECTION_BOOKS.has(book) && rows.length === 1) {
    return splitNumberedSections(rows[0].text, book, chapter)
  }

  return rows
}

export async function getChapter(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  translation = 'KJV',
  packDb?: SQLiteDatabase,
): Promise<BibleVerse[]> {
  const annotatedEntry = ANNOTATED_TRANSLATION_TABLE[translation]
  if (annotatedEntry) {
    const effectiveDb = TRANSLATION_PACK_SLUG[translation] ? (packDb ?? db) : db
    return getChapterWordsAnnotated(effectiveDb, book, chapter, annotatedEntry.table, annotatedEntry.col)
  }
  // Greek NT word tables: TR is core (use db); SBLGNT/TAGNT are pack DBs
  const greekNTTable = GREEK_SOURCE_TABLE[translation.toLowerCase() as GreekSource]
  if (greekNTTable) {
    const effectiveDb = greekNTTable === 'greek_words_tr' ? db : (packDb ?? db)
    return getChapterWords(effectiveDb, book, chapter, greekNTTable, 'greek')
  }
  // OT word tables: WLC is core (use db); DSS/TAHOT/LXX are pack DBs
  const otEntry = OT_WORD_TABLE[translation.toLowerCase()]
  if (otEntry) {
    const effectiveDb = otEntry.table === 'wlc_words' ? db : (packDb ?? db)
    return getChapterWords(effectiveDb, book, chapter, otEntry.table, otEntry.col)
  }
  if (translation === 'KJV') {
    return db.getAllAsync<BibleVerse>(
      'SELECT book, chapter, verse, text FROM bible_verses WHERE book = ? AND chapter = ? ORDER BY verse',
      [book, chapter]
    )
  }
  // Optional translations (ASV/WEB/BSB/E_LXX/A_LXX) — query their pack DB
  const queryDb = packDb ?? db
  const alt = bookAlt(book)
  return queryDb.getAllAsync<BibleVerse>(
    alt
      ? 'SELECT book, chapter, verse, text FROM bible_translations WHERE translation = ? AND (book = ? OR book = ?) AND chapter = ? ORDER BY verse'
      : 'SELECT book, chapter, verse, text FROM bible_translations WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse',
    alt ? [translation, book, alt, chapter] : [translation, book, chapter]
  )
}

export async function getVerse(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  translation = 'KJV',
  packDb?: SQLiteDatabase,
): Promise<BibleVerse | null> {
  const annotatedEntry = ANNOTATED_TRANSLATION_TABLE[translation]
  if (annotatedEntry) {
    const effectiveDb = TRANSLATION_PACK_SLUG[translation] ? (packDb ?? db) : db
    return getVerseWordsAnnotated(effectiveDb, book, chapter, verse, annotatedEntry.table, annotatedEntry.col)
  }
  const greekNTTable = GREEK_SOURCE_TABLE[translation.toLowerCase() as GreekSource]
  if (greekNTTable) {
    const effectiveDb = greekNTTable === 'greek_words_tr' ? db : (packDb ?? db)
    return getVerseWords(effectiveDb, book, chapter, verse, greekNTTable, 'greek')
  }
  const otEntry = OT_WORD_TABLE[translation.toLowerCase()]
  if (otEntry) {
    const effectiveDb = otEntry.table === 'wlc_words' ? db : (packDb ?? db)
    return getVerseWords(effectiveDb, book, chapter, verse, otEntry.table, otEntry.col)
  }
  if (translation === 'KJV') {
    return db.getFirstAsync<BibleVerse>(
      'SELECT book, chapter, verse, text FROM bible_verses WHERE book = ? AND chapter = ? AND verse = ?',
      [book, chapter, verse]
    )
  }
  const alt = bookAlt(book)
  const queryDb = packDb ?? db
  return queryDb.getFirstAsync<BibleVerse>(
    alt
      ? 'SELECT book, chapter, verse, text FROM bible_translations WHERE translation = ? AND (book = ? OR book = ?) AND chapter = ? AND verse = ?'
      : 'SELECT book, chapter, verse, text FROM bible_translations WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?',
    alt ? [translation, book, alt, chapter, verse] : [translation, book, chapter, verse]
  )
}

// ── Original-language search ──────────────────────────────

// Greek: NFD + strip combining diacritical marks (U+0300-U+036F)
// Hebrew: strip vowel points / cantillation (U+0591-U+05C7)
export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/[̀-֑ͯ-ׇ]/g, '').toLowerCase()
}

export function detectQueryScript(query: string): 'greek' | 'hebrew' | 'latin' {
  if (/[Ͱ-Ͽἀ-῿]/.test(query)) return 'greek'
  if (/[א-ת]/.test(query)) return 'hebrew'
  return 'latin'
}

const NT_GREEK_SOURCES  = [{ table: 'greek_words',  col: 'greek',  normCol: 'greek_norm'  }]
const LXX_SOURCES       = [{ table: 'lxx_words',    col: 'greek',  normCol: 'greek_norm'  }]
const HEBREW_SOURCES    = [{ table: 'hebrew_words', col: 'hebrew', normCol: 'hebrew_norm' }]
const ALL_GREEK_SOURCES = [...NT_GREEK_SOURCES, ...LXX_SOURCES]

function resolveGreekSources(translation?: string) {
  if (translation === 'LXX') return LXX_SOURCES
  if (translation && GREEK_SOURCE_TABLE[translation.toLowerCase() as GreekSource]) return NT_GREEK_SOURCES
  return ALL_GREEK_SOURCES
}

export async function searchOriginalLanguage(
  db: SQLiteDatabase,
  query: string,
  script: 'greek' | 'hebrew',
  books: string[] = [],
  translation?: string,
): Promise<SearchResult[]> {
  const normWords = query.trim().split(/\s+/).filter(Boolean).map(normalizeForSearch).filter(Boolean)
  if (normWords.length === 0) return []

  const sources = script === 'greek' ? resolveGreekSources(translation) : HEBREW_SOURCES
  const whereClause = normWords.map(() => `norm_text LIKE ?`).join(' AND ')
  const likeArgs = normWords.map(w => `%${w}%`)

  const results: SearchResult[] = []
  const seen = new Set<string>()

  for (const { table, col, normCol } of sources) {
    const bookClause = books.length > 0
      ? `WHERE book IN (${books.map(() => '?').join(',')})`
      : ''

    const rows = await db.getAllAsync<SearchResult>(
      `WITH grouped AS (
         SELECT book, chapter, verse,
                GROUP_CONCAT(${col}, ' ')     AS text,
                GROUP_CONCAT(${normCol}, ' ') AS norm_text
         FROM (SELECT book, chapter, verse, position, ${col}, ${normCol}
               FROM ${table} ${bookClause}
               ORDER BY book, chapter, verse, position)
         GROUP BY book, chapter, verse
       )
       SELECT book, chapter, verse, text FROM grouped
       WHERE ${whereClause}
       LIMIT 200`,
      [...books, ...likeArgs],
    )

    for (const row of rows) {
      const key = `${row.book}|${row.chapter}|${row.verse}`
      if (!seen.has(key)) { seen.add(key); results.push(row) }
    }
  }

  return results.slice(0, 200)
}

// ── Search ────────────────────────────────────────────────

export const SEARCH_STOP_WORDS = new Set(['a','an','the','in','of','to','and','or','but','for','with','is','was','be','are','were','it','at','by','as','on','up','i','me','my','he','she','we','his','her','thy','thee','thou','ye','him','them','they','not','no','nor','so','do','if'])

export async function searchVerses(
  db: SQLiteDatabase,
  query: string,
  translation = 'KJV',
  books: string[] = [],
  limit = 200,
  exactWords = false,
  packDb?: SQLiteDatabase,
): Promise<SearchResult[]> {
  const allWords = query.trim().split(/\s+/).filter(Boolean)
  if (allWords.length === 0) return []
  const filtered = exactWords ? allWords.filter(w => !SEARCH_STOP_WORDS.has(w.toLowerCase())) : allWords
  const words = filtered.length > 0 ? filtered : allWords

  // For each word, compute LIKE patterns and bare forms for scoring.
  // Strong's tags include the zero-padded DB variant.
  // exactWords mode uses word-boundary patterns so "in" doesn't match "king".
  const wordVariants = words.map(w => {
    const m = w.match(/^([hgHG])(\d+)$/)
    if (m) {
      const prefix = m[1].toUpperCase()
      const bare   = `${prefix}${parseInt(m[2])}`
      const padded = `${prefix}${String(parseInt(m[2])).padStart(4, '0')}`
      const forms  = bare === padded ? [bare] : [bare, padded]
      return { pats: forms.map(f => `%${f}%`), counts: forms, boundary: false }
    }
    if (exactWords) {
      // Five patterns cover the word followed by space, comma, period, semicolon, or colon.
      // The text is padded with a leading space so words at the start also match.
      const wl = w.toLowerCase()
      return {
        pats: [`% ${wl} %`, `% ${wl},%`, `% ${wl}.%`, `% ${wl};%`, `% ${wl}:%`],
        counts: [w],
        boundary: true,
      }
    }
    return { pats: [`%${w}%`], counts: [w], boundary: false }
  })

  const likeArgs  = wordVariants.flatMap(v => v.pats)
  const countArgs = wordVariants.flatMap(v => v.counts).flatMap(w => [w, w])
  const scoreExpr = wordVariants
    .map(v => v.counts
      .map(() => `min(1, (length(lower(text)) - length(replace(lower(text), lower(?), ''))) / max(1, length(?)))`)
      .join(' + '))
    .join(' + ')

  const whereExpr = wordVariants
    .map(v => {
      if (v.boundary) {
        const col = `lower(' ' || text || ' ')`
        return `(${v.pats.map(() => `${col} LIKE ?`).join(' OR ')})`
      }
      return v.pats.length === 1
        ? `LOWER(text) LIKE LOWER(?)`
        : `(${v.pats.map(() => `LOWER(text) LIKE LOWER(?)`).join(' OR ')})`
    })
    .join(' OR ')

  const bookClause = books.length > 0
    ? ` AND book IN (${books.map(() => '?').join(',')})`
    : ''
  const bookArgs = books.length > 0 ? books : []

  if (translation === 'KJV') {
    return db.getAllAsync<SearchResult>(
      `SELECT book, chapter, verse, text FROM bible_verses
       WHERE (${whereExpr})${bookClause}
       ORDER BY (${scoreExpr}) DESC
       LIMIT ${limit}`,
      [...likeArgs, ...bookArgs, ...countArgs],
    )
  }
  const transBookArgs = books.length > 0
    ? books.flatMap(b => { const a = bookAlt(b); return a ? [b, a] : [b] })
    : []
  const transBookClause = transBookArgs.length > 0
    ? ` AND book IN (${transBookArgs.map(() => '?').join(',')})`
    : ''
  return (packDb ?? db).getAllAsync<SearchResult>(
    `SELECT book, chapter, verse, text FROM bible_translations
     WHERE translation = ? AND (${whereExpr})${transBookClause}
     ORDER BY (${scoreExpr}) DESC
     LIMIT ${limit}`,
    [translation, ...likeArgs, ...transBookArgs, ...countArgs],
  )
}

export async function searchVersesAll(
  db: SQLiteDatabase,
  query: string,
  translation = 'KJV',
  books: string[] = [],
  exactWords = false,
  packDb?: SQLiteDatabase,
): Promise<SearchResult[]> {
  return searchVerses(db, query, translation, books, 5000, exactWords, packDb)
}

// ── Strongs search for word-table translations (TR+, WLC+, LXX+) ─────────────

export async function searchAnnotatedByStrongs(
  db: SQLiteDatabase,
  strongs: string,          // e.g. "G4145" or "g4145"
  translation: string,
  books: string[],
  limit = 200,
): Promise<SearchResult[]> {
  const entry = ANNOTATED_TRANSLATION_TABLE[translation]
  if (!entry) return []

  // Normalise: "g4145" → "G4145", strip leading zeros
  const norm = strongs.replace(/^([hgHG])0*(\d+)$/, (_, p, n) => p.toUpperCase() + n)
  // Also build the zero-padded variant some tables store
  const padded = strongs.replace(/^([hgHG])0*(\d+)$/, (_, p, n) => p.toUpperCase() + String(parseInt(n)).padStart(4, '0'))
  const variants = norm === padded ? [norm] : [norm, padded]

  const { table, col } = entry
  const bookClause = books.length > 0
    ? `AND t.book IN (${books.map(() => '?').join(',')})`
    : ''

  // Find verses containing this Strongs, then return full annotated text for each
  const sql = `
    SELECT t.book, t.chapter, t.verse,
      GROUP_CONCAT(
        t.${col}
        || CASE WHEN t.strongs IS NOT NULL AND t.strongs != ''
           THEN ' ' || SUBSTR(t.strongs,1,1) || CAST(CAST(SUBSTR(t.strongs,2) AS INTEGER) AS TEXT)
           ELSE '' END,
        ' '
      ) AS text
    FROM (SELECT book, chapter, verse, position, ${col}, strongs
          FROM ${table} ORDER BY book, chapter, verse, position) t
    WHERE EXISTS (
      SELECT 1 FROM ${table} s
      WHERE s.book = t.book AND s.chapter = t.chapter AND s.verse = t.verse
        AND s.strongs IN (${variants.map(() => '?').join(',')})
    )
    ${bookClause}
    GROUP BY t.book, t.chapter, t.verse
    ORDER BY t.book, t.chapter, t.verse
    LIMIT ${limit}
  `

  return db.getAllAsync<SearchResult>(sql, [...variants, ...books])
}

// ── Fuzzy search ──────────────────────────────────────────

// Reusable DP rows — JS is single-threaded so these are safe to share.
const _lvRow:  number[] = []
const _plRow:  number[] = []
const _scoreExprCache = new Map<number, string>()

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  while (_lvRow.length <= n) _lvRow.push(0)
  for (let i = 0; i <= n; i++) _lvRow[i] = i
  for (let i = 1; i <= m; i++) {
    let prev = _lvRow[0]
    _lvRow[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = _lvRow[j]
      _lvRow[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, _lvRow[j], _lvRow[j - 1])
      prev = tmp
    }
  }
  return _lvRow[n]
}

function buildScoreExpr(count: number): string {
  let expr = _scoreExprCache.get(count)
  if (!expr) {
    expr = Array.from({ length: count }, () => `(CASE WHEN LOWER(text) LIKE ? THEN 1 ELSE 0 END)`).join(' + ')
    _scoreExprCache.set(count, expr)
  }
  return expr
}

// Returns the minimum edit distance from `a` to any prefix of `b`, and that prefix length.
// Lets a misspelled query stem match longer derived forms — e.g. "resurect" → prefix "resurrect"
// inside "resurrection" — so the correction banner shows the stem, not the full suffixed word.
function prefixLevenshtein(a: string, b: string): { dist: number; len: number } {
  const m = a.length, n = b.length
  while (_plRow.length <= n) _plRow.push(0)
  for (let i = 0; i <= n; i++) _plRow[i] = i
  for (let i = 1; i <= m; i++) {
    let prev = _plRow[0]
    _plRow[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = _plRow[j]
      _plRow[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, _plRow[j], _plRow[j - 1])
      prev = tmp
    }
  }
  let dist = _plRow[0], len = 0
  for (let j = 1; j <= n; j++) {
    if (_plRow[j] < dist) { dist = _plRow[j]; len = j }
  }
  return { dist, len }
}

function fourGrams(s: string): string[] {
  const out: string[] = []
  for (let i = 0; i <= s.length - 4; i++) out.push(s.slice(i, i + 4))
  return out
}

export interface FuzzySearchResult extends SearchResult {
  closestWords: string[]
}

export async function searchVersesFuzzy(
  db: SQLiteDatabase,
  query: string,
  translation = 'KJV',
  books: string[] = [],
): Promise<FuzzySearchResult[]> {
  const qWords = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (qWords.length === 0) return []

  // Per-word pattern groups: OR within a word, AND between words.
  // This ensures candidates contain fragments of every query word,
  // preventing OT-biased results from burying NT matches under LIMIT.
  //
  // Short words (4-7 chars): substitution patterns (word with each char replaced by _)
  // handle mid-word typos where no 4-gram survives (e.g. "bejin" → "%be_in%" finds "begin").
  // Long words (8+): 4-grams have enough overlap even with a 1-char typo.
  const wordPats: string[][] = qWords.map(w => {
    if (w.length < 4) return [`%${w}%`]
    if (w.length < 8) {
      const pats = new Set<string>([`%${w}%`])
      for (let i = 0; i < w.length; i++)
        pats.add(`%${w.slice(0, i)}_${w.slice(i + 1)}%`)
      return [...pats]
    }
    return [...new Set(fourGrams(w).map(g => `%${g}%`))]
  })
  const allPats = wordPats.flat()
  const wordWhereExprs = wordPats.map(
    grp => `(${grp.map(() => 'LOWER(text) LIKE ?').join(' OR ')})`
  )
  const whereExpr = wordWhereExprs.join(' AND ')
  const bookClause = books.length > 0
    ? ` AND book IN (${books.map(() => '?').join(',')})`
    : ''

  // Rank candidates by how many n-gram patterns they satisfy — ensures derived
  // forms like "resurrection" (matches resu+esur+rect = 3) beat unrelated
  // common-pattern matches like "surely" (matches sure = 1) within the LIMIT.
  const scoreExpr = buildScoreExpr(allPats.length)
  const isKJV = translation === 'KJV'
  const candidates = await db.getAllAsync<SearchResult>(
    `SELECT book, chapter, verse, text FROM ${isKJV ? 'bible_verses' : 'bible_translations'}
     WHERE ${isKJV ? '' : 'translation = ? AND '}(${whereExpr})${bookClause}
     ORDER BY (${scoreExpr}) DESC, rowid LIMIT 500`,
    [...(isKJV ? [] : [translation]), ...allPats, ...books, ...allPats],
  )

  const maxDist = (len: number) => len >= 12 ? 3 : len >= 8 ? 2 : 1

  const scored: Array<{ r: SearchResult; dist: number; closest: string[] }> = []
  for (const row of candidates) {
    const vWords: string[] = row.text.toLowerCase().match(/[a-z']+/g) ?? []
    let total = 0
    const closest: string[] = []
    let ok = true

    for (const qw of qWords) {
      if (qw.length < 4) {
        if (!vWords.includes(qw)) { ok = false; break }
        closest.push(qw)
        continue
      }
      const limit = maxDist(qw.length)
      let bestD = Infinity, bestW = ''
      for (const vw of vWords) {
        if (bestD === 0) break
        const lenDiff = vw.length - qw.length
        if (lenDiff < -(limit + 1)) continue
        if (lenDiff > limit + 1) {
          // vw is a longer derived form — use prefix distance so bestW becomes the stem
          // ("resurrect") not the suffixed word ("resurrection")
          const { dist, len } = prefixLevenshtein(qw, vw)
          if (dist < bestD) { bestD = dist; bestW = vw.slice(0, len) }
        } else {
          const d = levenshtein(qw, vw)
          if (d < bestD) { bestD = d; bestW = vw }
        }
      }
      if (bestD > limit) { ok = false; break }
      total += bestD
      closest.push(bestW)
    }

    if (ok) scored.push({ r: row, dist: total, closest })
  }

  scored.sort((a, b) => a.dist - b.dist)
  return scored.slice(0, 100).map(s => ({ ...s.r, closestWords: s.closest }))
}

// ── Settings (key-value) ──────────────────────────────────

export async function getOnboardingDone(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'onboarding_done'"
  )
  return !!row
}

export async function setOnboardingDone(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('onboarding_done', '1')"
  )
}

export async function getRedLetterOn(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'red_letter_on'"
  )
  return row ? row.value === '1' : true
}

export async function setRedLetterOn(db: SQLiteDatabase, on: boolean): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES ('red_letter_on', ?)",
    [on ? '1' : '0']
  )
}

// ── Search history ────────────────────────────────────────

export async function getSearchHistory(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ query: string }>(
    'SELECT query FROM search_history ORDER BY ts DESC LIMIT 20'
  )
  return rows.map(r => r.query)
}

export async function addSearchHistory(db: SQLiteDatabase, query: string): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO search_history (query, ts) VALUES (?, ?)',
    [query, Date.now()]
  )
}

export async function deleteSearchHistory(db: SQLiteDatabase, query?: string): Promise<void> {
  if (query) {
    await db.runAsync('DELETE FROM search_history WHERE query = ?', [query])
  } else {
    await db.runAsync('DELETE FROM search_history')
  }
}

// ── Commentary ────────────────────────────────────────────

export async function getCommentary(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  includeLegacy = false
): Promise<CommentaryEntry[]> {
  const base = `SELECT id, father_name, father_era, excerpt, full_text, source, source_url
     FROM commentary
     WHERE book = ? AND chapter = ? AND verse = ?`
  if (!includeLegacy) {
    return db.getAllAsync<CommentaryEntry>(base, [book, chapter, verse])
  }
  // legacy ids offset so FlatList keys never collide with hand-picked rows
  return db.getAllAsync<CommentaryEntry>(
    `${base}
     UNION ALL
     SELECT id + 1000000 AS id, father_name, father_era, excerpt, full_text, source, source_url
     FROM commentary_legacy
     WHERE book = ? AND chapter = ? AND verse = ?`,
    [book, chapter, verse, book, chapter, verse]
  )
}

export interface CommentaryEntryWithRef {
  id: number
  father_name: string
  father_era: string
  excerpt: string
  full_text: string
  source: string
  source_url: string
  book: string
  chapter: number
  verse: number
}

export async function getAllCommentaryByFather(
  db: SQLiteDatabase,
  fatherName: string
): Promise<CommentaryEntryWithRef[]> {
  return db.getAllAsync<CommentaryEntryWithRef>(
    `SELECT id, father_name, father_era, excerpt, full_text, source, source_url,
            book, chapter, verse
     FROM commentary
     WHERE father_name LIKE ?
     ORDER BY book, chapter, verse`,
    [`${fatherName}%`]
  )
}

export async function searchCommentary(
  db: SQLiteDatabase,
  query: string
): Promise<CommentaryEntryWithRef[]> {
  const like = `%${query.toLowerCase()}%`
  return db.getAllAsync<CommentaryEntryWithRef>(
    `SELECT id, father_name, father_era, excerpt, full_text, source, source_url,
            book, chapter, verse
     FROM commentary
     WHERE LOWER(father_name) LIKE ? OR LOWER(excerpt) LIKE ? OR LOWER(full_text) LIKE ?
     ORDER BY book, chapter, verse
     LIMIT 150`,
    [like, like, like]
  )
}

export async function searchCommentaryByKeywords(
  db: SQLiteDatabase,
  keywords: string[],
  limit = 300,
): Promise<CommentaryEntryWithRef[]> {
  if (keywords.length === 0) return []
  // Build: (LOWER(full_text) LIKE ? OR LOWER(excerpt) LIKE ?) OR ...
  const clause = keywords.map(() => `(LOWER(full_text) LIKE ? OR LOWER(excerpt) LIKE ?)`).join(' OR ')
  const params = keywords.flatMap(k => [`%${k}%`, `%${k}%`])
  return db.getAllAsync<CommentaryEntryWithRef>(
    `SELECT id, father_name, father_era, excerpt, full_text, source, source_url,
            book, chapter, verse
     FROM commentary
     WHERE ${clause}
     LIMIT ${limit}`,
    params,
  )
}

// ── Cross references ──────────────────────────────────────

export async function getCrossRefs(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<CrossRef[]> {
  return db.getAllAsync<CrossRef>(
    `SELECT cr.to_book AS ref_book, cr.to_chapter AS ref_chapter, cr.to_verse AS ref_verse,
            COALESCE(bv.text, '') AS text
     FROM cross_refs cr
     LEFT JOIN bible_verses bv
       ON bv.book = cr.to_book AND bv.chapter = cr.to_chapter AND bv.verse = cr.to_verse
     WHERE cr.from_book = ? AND cr.from_chapter = ? AND cr.from_verse = ?
     ORDER BY cr.weight DESC
     LIMIT 30`,
    [book, chapter, verse]
  )
}

export async function getChapterCrossRefMarkers(
  db: SQLiteDatabase,
  book: string,
  chapter: number
): Promise<Map<number, CrossRef[]>> {
  const rows = await db.getAllAsync<{
    verse: number; ref_book: string; ref_chapter: number; ref_verse: number; text: string
  }>(
    `SELECT cr.from_verse AS verse, cr.to_book AS ref_book,
            cr.to_chapter AS ref_chapter, cr.to_verse AS ref_verse,
            COALESCE(bv.text, '') AS text
     FROM cross_refs cr
     LEFT JOIN bible_verses bv
       ON bv.book = cr.to_book AND bv.chapter = cr.to_chapter AND bv.verse = cr.to_verse
     WHERE cr.from_book = ? AND cr.from_chapter = ?
       AND cr.weight >= 3.0
       AND cr.to_book NOT IN (
         'Matthew','Mark','Luke','John','Acts','Romans',
         '1 Corinthians','2 Corinthians','Galatians','Ephesians',
         'Philippians','Colossians','1 Thessalonians','2 Thessalonians',
         '1 Timothy','2 Timothy','Titus','Philemon','Hebrews',
         'James','1 Peter','2 Peter','1 John','2 John','3 John',
         'Jude','Revelation'
       )
     ORDER BY cr.from_verse, cr.weight DESC`,
    [book, chapter]
  )
  const map = new Map<number, CrossRef[]>()
  for (const r of rows) {
    if (!map.has(r.verse)) map.set(r.verse, [])
    map.get(r.verse)!.push({ ref_book: r.ref_book, ref_chapter: r.ref_chapter, ref_verse: r.ref_verse, text: r.text })
  }
  return map
}

// ── OT quote spans ────────────────────────────────────────

export interface OtQuoteSpan {
  verse: number
  word_start: number
  word_end: number
}

export async function getOtQuoteSpans(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
): Promise<OtQuoteSpan[]> {
  return db.getAllAsync<OtQuoteSpan>(
    'SELECT verse, word_start, word_end FROM ot_quote_spans WHERE book=? AND chapter=? ORDER BY verse, word_start',
    [book, chapter]
  )
}

// ── Chapter count ─────────────────────────────────────────

export async function getChapterCount(
  db: SQLiteDatabase,
  book: string
): Promise<number> {
  const row = await db.getFirstAsync<{ max_chapter: number }>(
    'SELECT MAX(chapter) as max_chapter FROM bible_verses WHERE book = ?',
    [book]
  )
  return row?.max_chapter ?? 0
}

// ── Bookmarks ─────────────────────────────────────────────

export async function getBookmarks(db: SQLiteDatabase): Promise<Bookmark[]> {
  return db.getAllAsync<Bookmark>(
    'SELECT book, chapter, verse, created_at as createdAt, COALESCE(position, 0) as position FROM bookmarks ORDER BY position ASC, created_at DESC'
  )
}

export async function isBookmarked(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<boolean> {
  const row = await db.getFirstAsync(
    'SELECT 1 FROM bookmarks WHERE book = ? AND chapter = ? AND verse = ?',
    [book, chapter, verse]
  )
  return !!row
}

export async function addBookmark(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO bookmarks (book, chapter, verse, created_at, position)
     VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position) + 1, 0) FROM bookmarks))`,
    [book, chapter, verse, Date.now()]
  )
}

export async function updateBookmarkPositions(
  db: SQLiteDatabase,
  bookmarks: Bookmark[]
): Promise<void> {
  for (let i = 0; i < bookmarks.length; i++) {
    const b = bookmarks[i]
    await db.runAsync(
      'UPDATE bookmarks SET position = ? WHERE book = ? AND chapter = ? AND verse = ?',
      [i, b.book, b.chapter, b.verse]
    )
  }
}

export async function removeBookmark(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<void> {
  await db.runAsync(
    'DELETE FROM bookmarks WHERE book = ? AND chapter = ? AND verse = ?',
    [book, chapter, verse]
  )
}

// ── Notes ─────────────────────────────────────────────────

export interface NoteWithVerse {
  book: string
  chapter: number
  verse: number
  noteText: string
  verseText: string
  updatedAt: number
}

export async function getAllNotes(
  userDb: SQLiteDatabase,
  bibleDb: SQLiteDatabase,
): Promise<NoteWithVerse[]> {
  const notes = await userDb.getAllAsync<Omit<NoteWithVerse, 'verseText'>>(
    `SELECT book, chapter, verse, text AS noteText, updated_at AS updatedAt
     FROM notes ORDER BY updated_at DESC`
  )
  return Promise.all(notes.map(async note => {
    const row = await bibleDb.getFirstAsync<{ text: string }>(
      'SELECT text FROM bible_verses WHERE book = ? AND chapter = ? AND verse = ?',
      [note.book, note.chapter, note.verse]
    )
    return { ...note, verseText: row?.text ?? '' }
  }))
}

export async function getNote(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<Note | null> {
  return db.getFirstAsync<Note>(
    'SELECT book, chapter, verse, text, updated_at as updatedAt FROM notes WHERE book = ? AND chapter = ? AND verse = ?',
    [book, chapter, verse]
  )
}

export async function saveNote(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  text: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO notes (book, chapter, verse, text, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(book, chapter, verse) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
    [book, chapter, verse, text, Date.now()]
  )
}

export async function deleteNote(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<void> {
  await db.runAsync(
    'DELETE FROM notes WHERE book = ? AND chapter = ? AND verse = ?',
    [book, chapter, verse]
  )
}


// ── Textual variants ──────────────────────────────────────

export async function getVariantsForVerse(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<TextualVariant[]> {
  return db.getAllAsync<TextualVariant>(
    `SELECT id, testament, word_ref, main_type, main_english, main_hebrew,
            variant_source, variant_source_label, variant_english, variant_hebrew, description
     FROM textual_variants
     WHERE book = ? AND chapter = ? AND verse = ?
     ORDER BY id`,
    [book, chapter, verse]
  )
}

// ── Josephus ──────────────────────────────────────────────

export interface JosephusEntry {
  ref: string
  work: string
  text: string
  note: string
}

export async function getJosephusForVerse(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<JosephusEntry[]> {
  return db.getAllAsync<JosephusEntry>(
    `SELECT j.ref, j.work, j.text, jr.note
     FROM josephus_refs jr
     JOIN josephus j
       ON j.work = jr.jos_work AND j.book = jr.jos_book
      AND j.chapter = jr.jos_chapter AND j.section = jr.jos_section
     WHERE jr.bible_book = ? AND jr.bible_chapter = ? AND jr.bible_verse = ?`,
    [book, chapter, verse]
  )
}

// ── History ───────────────────────────────────────────────

export interface HistoryEntry {
  book: string
  chapter: number
  visitedAt: number
}

export async function recordHistory(
  db: SQLiteDatabase,
  book: string,
  chapter: number
): Promise<void> {
  await db.runAsync(
    `INSERT INTO history (book, chapter, visited_at) VALUES (?, ?, ?)
     ON CONFLICT(book, chapter) DO UPDATE SET visited_at = excluded.visited_at`,
    [book, chapter, Date.now()]
  )
}

export async function getHistory(db: SQLiteDatabase): Promise<HistoryEntry[]> {
  return db.getAllAsync<HistoryEntry>(
    `SELECT book, chapter, visited_at AS visitedAt
     FROM history
     ORDER BY visited_at DESC
     LIMIT 200`
  )
}

export async function clearHistory(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM history')
}

// ── Highlights ────────────────────────────────────────────

export interface Highlight {
  book: string
  chapter: number
  verse: number
  color: string
  createdAt: number
}

export async function getChapterHighlights(
  db: SQLiteDatabase,
  book: string,
  chapter: number
): Promise<Highlight[]> {
  return db.getAllAsync<Highlight>(
    'SELECT book, chapter, verse, color, created_at as createdAt FROM highlights WHERE book = ? AND chapter = ?',
    [book, chapter]
  )
}

export async function getAllHighlights(db: SQLiteDatabase): Promise<Highlight[]> {
  return db.getAllAsync<Highlight>(
    'SELECT book, chapter, verse, color, created_at as createdAt FROM highlights ORDER BY created_at DESC'
  )
}

export async function setHighlight(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  color: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO highlights (book, chapter, verse, color, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(book, chapter, verse) DO UPDATE SET color = excluded.color, created_at = excluded.created_at`,
    [book, chapter, verse, color, Date.now()]
  )
}

export async function removeHighlight(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<void> {
  await db.runAsync(
    'DELETE FROM highlights WHERE book = ? AND chapter = ? AND verse = ?',
    [book, chapter, verse]
  )
}

// ── Lexicon (BDB / Thayer's) ──────────────────────────────

export interface LexiconEntry {
  number: string
  lemma: string
  translit: string
  pronunciation: string
  part_of_speech: string
  strongs_def: string
  outline: string
  bdb_text?: string
  thayers_text?: string
  kjv_translations: string
}

const STRONGS_LEXICON_RE: Record<'greek' | 'hebrew', RegExp> = {
  greek:  /^G0*(\d+)/,
  hebrew: /^H0*(\d+)/,
}

const STRONGS_NORMALIZE_RE = /^([GH])0*(\d+)/
export function normalizeStrongsNumber(s: string): string {
  const m = s.match(STRONGS_NORMALIZE_RE)
  return m ? m[1] + m[2] : s
}

async function queryLexicon(
  db: SQLiteDatabase,
  table: string,
  type: 'greek' | 'hebrew',
  num: string,
): Promise<LexiconEntry | null> {
  const q = `SELECT * FROM ${table} WHERE number = ?`
  let row = await db.getFirstAsync<LexiconEntry>(q, [num])
  if (!row) {
    const prefix = type === 'greek' ? 'G' : 'H'
    const m = num.match(STRONGS_LEXICON_RE[type])
    if (m) row = await db.getFirstAsync<LexiconEntry>(q, [`${prefix}${parseInt(m[1])}`])
  }
  if (!row && type === 'greek') {
    const stdNum = await bsbGreekFallbackNum(db, num)
    if (stdNum) row = await db.getFirstAsync<LexiconEntry>(q, [stdNum])
  }
  return row ?? null
}

export async function getBdbEntry(
  db: SQLiteDatabase,
  num: string,
): Promise<LexiconEntry | null> {
  return queryLexicon(db, 'bdb_hebrew', 'hebrew', num)
}

export async function getThayersEntry(
  db: SQLiteDatabase,
  num: string,
): Promise<LexiconEntry | null> {
  return queryLexicon(db, 'thayers_greek', 'greek', num)
}

// ── Strong's / Word Study ─────────────────────────────────

export type GreekSource = 'sblgnt' | 'tagnt' | 'tr'

const GREEK_SOURCE_TABLE: Record<GreekSource, string> = {
  sblgnt: 'greek_words',
  tagnt:  'greek_words_tagnt',
  tr:     'greek_words_tr',
}

export type HebrewSource = 'tahot' | 'wlc'

const HEBREW_SOURCE_TABLE: Record<HebrewSource, string> = {
  tahot: 'hebrew_words',
  wlc:   'wlc_words',
}

export interface GreekWord {
  position: number
  greek: string
  translit: string
  strongs: string
  gloss: string | null
  morph: string | null
}

export interface HebrewWord {
  position: number
  hebrew: string
  translit: string
  strongs: string
  gloss: string | null
  morph: string | null
}

export interface StrongsEntry {
  number: string
  lemma: string
  translit: string
  pronunciation: string
  definition: string
  kjv_usage: string
}

// Derived from authoritative maps — TR and WLC are the core defaults
const CORE_WORD_TABLES = new Set([GREEK_SOURCE_TABLE['tr'], HEBREW_SOURCE_TABLE['wlc']])

export async function getGreekWords(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  source: GreekSource = 'tr',
  packDb?: SQLiteDatabase,
): Promise<GreekWord[]> {
  const table = GREEK_SOURCE_TABLE[source]
  const queryDb = CORE_WORD_TABLES.has(table) ? db : (packDb ?? db)
  return queryDb.getAllAsync<GreekWord>(
    `SELECT position, greek, translit, strongs, gloss, morph FROM ${table} WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position`,
    [book, chapter, verse]
  )
}

export async function getHebrewWords(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  source: HebrewSource = 'wlc',
  packDb?: SQLiteDatabase,
): Promise<HebrewWord[]> {
  const table = HEBREW_SOURCE_TABLE[source]
  const queryDb = CORE_WORD_TABLES.has(table) ? db : (packDb ?? db)
  return queryDb.getAllAsync<HebrewWord>(
    `SELECT position, hebrew, translit, strongs, gloss, morph FROM ${table} WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position`,
    [book, chapter, verse]
  )
}

export async function getPsalmHeading(
  db: SQLiteDatabase,
  chapter: number,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ heading: string }>(
    'SELECT heading FROM psalm_headings WHERE chapter = ?',
    [chapter]
  )
  return row?.heading ?? null
}

export type LxxSource = 'lxx' | 'lxx_a'

const LXX_WORD_TABLE: Record<LxxSource, string> = {
  lxx:   'lxx_words',
  lxx_a: 'lxx_apostolic_words',
}

export async function getLxxWords(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  source: LxxSource = 'lxx',
  packDb?: SQLiteDatabase,
): Promise<GreekWord[]> {
  const table = LXX_WORD_TABLE[source]
  return (packDb ?? db).getAllAsync<GreekWord>(
    `SELECT position, greek, translit, strongs, gloss, morph FROM ${table} WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position`,
    [book, chapter, verse]
  )
}

async function bsbGreekFallbackNum(db: SQLiteDatabase, num: string): Promise<string | null> {
  const mapped = await db.getFirstAsync<{ standard_num: string }>(
    'SELECT standard_num FROM bsb_strongs_map WHERE bsb_num = ?',
    [num]
  )
  return mapped?.standard_num ?? null
}

export async function getStrongsEntry(
  db: SQLiteDatabase,
  type: 'greek' | 'hebrew',
  num: string
): Promise<StrongsEntry | null> {
  const table = type === 'hebrew' ? 'strongs_hebrew' : 'strongs_greek'
  const query = `SELECT number, lemma, translit, pronunciation, definition, kjv_usage FROM ${table} WHERE number = ?`
  let row = await db.getFirstAsync<StrongsEntry>(query, [num])
  if (!row) {
    const prefix = type === 'greek' ? 'G' : 'H'
    const m = num.match(STRONGS_LEXICON_RE[type])
    if (m) {
      row = await db.getFirstAsync<StrongsEntry>(query, [`${prefix}${parseInt(m[1])}`])
    }
  }
  if (!row && type === 'greek') {
    const stdNum = await bsbGreekFallbackNum(db, num)
    if (stdNum) row = await db.getFirstAsync<StrongsEntry>(query, [stdNum])
  }
  return row ?? null
}

// ── Strong's Reverse Lookup (English → Strong's) ─────────

export interface StrongsWordMatch extends StrongsEntry {
  lang: 'greek' | 'hebrew'
}

export async function searchStrongsByEnglishWord(
  db: SQLiteDatabase,
  word: string,
): Promise<StrongsWordMatch[]> {
  const pattern = `%${word}%`
  const rows = await db.getAllAsync<StrongsWordMatch>(`
    SELECT number, lemma, translit, pronunciation, definition, kjv_usage, 'greek' AS lang
    FROM strongs_greek WHERE kjv_usage LIKE ? COLLATE NOCASE
    UNION ALL
    SELECT number, lemma, translit, pronunciation, definition, kjv_usage, 'hebrew' AS lang
    FROM strongs_hebrew WHERE kjv_usage LIKE ? COLLATE NOCASE
    ORDER BY lang DESC, number
    LIMIT 60
  `, [pattern, pattern])
  const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  const lexiconResults = rows.filter(r => re.test(r.kjv_usage))
  if (lexiconResults.length > 0) return lexiconResults

  // Fallback: lexicon spelling may differ from KJV text (e.g. "sycamore" vs "sycomore").
  // Find Strongs tags that appear directly after this word in KJV+ text, then look them up.
  const textRows = await db.getAllAsync<{ text: string }>(
    `SELECT text FROM bible_translations WHERE translation='KJV+' AND LOWER(text) LIKE ?`,
    [`% ${word.toLowerCase()} %`]
  )
  const foundTags = new Set<string>()
  const wordLower = word.toLowerCase()
  const STRONGS_TOK_RE = /^[GH]\d+$/
  for (const { text } of textRows) {
    const tokens = text.split(' ')
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i].toLowerCase().replace(/[^a-z']/g, '')
      if (tok !== wordLower) continue
      // Scan forward up to 3 positions to find the next Strongs tag.
      // Multi-word phrases put the tag after the last word in the phrase,
      // e.g. "sycomore trees H8256" — the tag is 2 tokens after "sycomore".
      for (let j = i + 1; j <= Math.min(i + 3, tokens.length - 1); j++) {
        if (STRONGS_TOK_RE.test(tokens[j])) { foundTags.add(tokens[j]); break }
      }
    }
  }
  if (foundTags.size === 0) return []

  const inClause = [...foundTags].map(() => '?').join(',')
  return db.getAllAsync<StrongsWordMatch>(`
    SELECT number, lemma, translit, pronunciation, definition, kjv_usage, 'greek' AS lang
    FROM strongs_greek WHERE number IN (${inClause})
    UNION ALL
    SELECT number, lemma, translit, pronunciation, definition, kjv_usage, 'hebrew' AS lang
    FROM strongs_hebrew WHERE number IN (${inClause})
  `, [...foundTags, ...foundTags])
}

// ── Strong's Concordance ──────────────────────────────────

export interface StrongsConcordanceResult {
  book: string
  chapter: number
  verse: number
  word_count: number
  word: string
  translit: string
  kjvPlusText: string | null
  text: string
}

export async function getStrongsConcordance(
  db: SQLiteDatabase,
  lang: 'greek' | 'hebrew' | 'lxx' | 'lxx_a',
  strongs: string,
  greekSource: GreekSource = 'sblgnt',
  packDb?: SQLiteDatabase,
): Promise<StrongsConcordanceResult[]> {

  // LXX has no KJV+ equivalent — query word table in pack db; join bible_verses from core db
  if (lang === 'lxx' || lang === 'lxx_a') {
    const table = lang === 'lxx_a' ? 'lxx_apostolic_words' : 'lxx_words'
    const wordDb = packDb ?? db
    const q = `
      SELECT w.book, w.chapter, w.verse,
             COUNT(*) AS word_count,
             MIN(w.greek) AS word,
             MIN(w.translit) AS translit,
             bv.text,
             NULL AS kjvPlusText
      FROM ${table} w
      JOIN bible_verses bv ON bv.book = w.book AND bv.chapter = w.chapter AND bv.verse = w.verse
      WHERE w.strongs = ?
      GROUP BY w.book, w.chapter, w.verse
      ORDER BY MIN(w.rowid)`
    let rows = await wordDb.getAllAsync<StrongsConcordanceResult>(q, [strongs])
    if (!rows.length) {
      const normQ = q.replace(
        'WHERE w.strongs = ?',
        `WHERE SUBSTR(w.strongs,1,1) || CAST(CAST(SUBSTR(w.strongs,2) AS INTEGER) AS TEXT) = ?`,
      )
      rows = await wordDb.getAllAsync<StrongsConcordanceResult>(normQ, [normalizeStrongsNumber(strongs)])
    }
    return rows
  }

  // Hebrew/Greek: scan KJV+ annotation text — identical counting method to Search,
  // so concordance counts always match what the user sees when searching a tag.
  const wordTable = lang === 'greek' ? GREEK_SOURCE_TABLE[greekSource] : 'hebrew_words'
  const wordCol  = lang === 'greek' ? 'greek' : 'hebrew'
  const tag = normalizeStrongsNumber(strongs).toUpperCase()  // canonical e.g. 'H2719'

  // Build the full query with word-table join (for original word + translit).
  // Falls back to a join-free query if the word table is in an uninstalled pack.
  const fullQ = `
    SELECT bt.book, bt.chapter, bt.verse,
           bt.text AS kjvPlusText,
           COALESCE(bv.text, '') AS text,
           MIN(w.${wordCol}) AS word,
           MIN(w.translit)   AS translit
     FROM bible_translations bt
     LEFT JOIN bible_verses bv ON bv.book = bt.book AND bv.chapter = bt.chapter AND bv.verse = bt.verse
     LEFT JOIN ${wordTable} w  ON w.book  = bt.book AND w.chapter  = bt.chapter AND w.verse  = bt.verse
                               AND (w.strongs = ?
                                 OR SUBSTR(w.strongs,1,1) || CAST(CAST(SUBSTR(w.strongs,2) AS INTEGER) AS TEXT) = ?)
     WHERE bt.translation = 'KJV+'
       AND UPPER(bt.text) LIKE '%' || ? || '%'
     GROUP BY bt.book, bt.chapter, bt.verse
     ORDER BY bt.rowid`
  const simpleQ = `
    SELECT bt.book, bt.chapter, bt.verse,
           bt.text AS kjvPlusText,
           COALESCE(bv.text, '') AS text,
           NULL AS word, NULL AS translit
     FROM bible_translations bt
     LEFT JOIN bible_verses bv ON bv.book = bt.book AND bv.chapter = bt.chapter AND bv.verse = bt.verse
     WHERE bt.translation = 'KJV+'
       AND UPPER(bt.text) LIKE '%' || ? || '%'
     GROUP BY bt.book, bt.chapter, bt.verse
     ORDER BY bt.rowid`

  let raw: Array<{ book: string; chapter: number; verse: number; kjvPlusText: string; text: string; word: string | null; translit: string | null }>
  try {
    raw = await db.getAllAsync(fullQ, [strongs, tag, tag])
  } catch {
    // Word table not available (pack not installed) — fall back without it
    raw = await db.getAllAsync(simpleQ, [tag])
  }

  const results: StrongsConcordanceResult[] = []
  for (const row of raw) {
    const word_count = (row.kjvPlusText.toUpperCase().match(new RegExp(`${tag}(?!\\d)`, 'g')) ?? []).length
    if (word_count === 0) continue  // LIKE false positive
    results.push({
      book: row.book,
      chapter: row.chapter,
      verse: row.verse,
      word_count,
      word:    row.word    ?? '',
      translit: row.translit ?? '',
      kjvPlusText: row.kjvPlusText,
      text: row.text,
    })
  }
  return results
}

// ── Concordance ───────────────────────────────────────────

export interface ConcordanceResult {
  book: string
  chapter: number
  verse: number
  text: string
}

export async function getConcordance(
  db: SQLiteDatabase,
  word: string,
  limit = 300,
): Promise<ConcordanceResult[]> {
  const w = word.toLowerCase()
  return db.getAllAsync<ConcordanceResult>(
    `SELECT book, chapter, verse, text FROM bible_verses
     WHERE LOWER(' ' || text || ' ') LIKE ?
        OR LOWER(' ' || text || ' ') LIKE ?
        OR LOWER(' ' || text || ' ') LIKE ?
        OR LOWER(' ' || text || ' ') LIKE ?
        OR LOWER(' ' || text || ' ') LIKE ?
     ORDER BY rowid
     LIMIT ?`,
    [`% ${w} %`, `% ${w},%`, `% ${w}.%`, `% ${w};%`, `% ${w}:%`, limit]
  )
}

// ── Verse count in a chapter ──────────────────────────────

export async function getMaxVerse(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT MAX(verse) as n FROM bible_verses WHERE book = ? AND chapter = ?',
    [book, chapter]
  )
  return row?.n ?? 1
}

// ── Single verse text ─────────────────────────────────────

export async function getVerseText(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  translation = 'KJV',
): Promise<string | null> {
  const row = await getVerse(db, book, chapter, verse, translation)
  return row?.text ?? null
}

// ── Distinct books (ordered as they appear in the Bible) ──

export async function getBooks(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ book: string }>(
    'SELECT DISTINCT book FROM bible_verses ORDER BY MIN(rowid)'
  )
  return rows.map(r => r.book)
}

// ── BSB footnotes ─────────────────────────────────────────

export async function getBsbChapterFootnotes(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  packDb?: SQLiteDatabase | null,
): Promise<import('../types').BsbFootnote[]> {
  const queryDb = packDb ?? db
  const alt = bookAlt(book)  // bsb_footnotes stores Psalms as "Psalm"
  return queryDb.getAllAsync(
    alt
      ? 'SELECT verse, word_index, word, footnote FROM bsb_footnotes WHERE (book=? OR book=?) AND chapter=? ORDER BY verse, word_index'
      : 'SELECT verse, word_index, word, footnote FROM bsb_footnotes WHERE book=? AND chapter=? ORDER BY verse, word_index',
    alt ? [book, alt, chapter] : [book, chapter]
  )
}


// ── E_LXX inline notes ───────────────────────────────────

export async function getElxxChapterNotes(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
): Promise<import('../types').ElxxNote[]> {
  return db.getAllAsync(
    'SELECT verse, word_index, note FROM elxx_notes WHERE book=? AND chapter=? ORDER BY verse, word_index',
    [book, chapter]
  )
}

// ── Footnotes ─────────────────────────────────────────────

export async function getChapterFootnotes(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
): Promise<import('../types').Footnote[]> {
  return db.getAllAsync(
    'SELECT verse, marker, word_index, content FROM verse_footnotes WHERE book=? AND chapter=? ORDER BY verse, marker',
    [book, chapter]
  )
}

// ── Overview ──────────────────────────────────────────────

export interface OverviewVerse { note: string }
export interface OverviewChapter { themes: string; summary: string }
export interface BiblehubChapter { essay: string; passages: string }
export interface BiblesummaryChapter { summary: string }
export interface OverviewPericope { title: string; verse_start: number; verse_end: number; description: string }
export interface BiblehubPassage { heading: string; verse_start: number; verse_end: number; text: string }

export async function getOverviewVerse(
  db: SQLiteDatabase, book: string, chapter: number, verse: number
): Promise<OverviewVerse | null> {
  return db.getFirstAsync<OverviewVerse>(
    'SELECT note FROM overview_verses WHERE book=? AND chapter=? AND verse=?',
    [book, chapter, verse]
  )
}

export async function getOverviewChapter(
  db: SQLiteDatabase, book: string, chapter: number
): Promise<OverviewChapter | null> {
  return db.getFirstAsync<OverviewChapter>(
    'SELECT themes, summary FROM overview_chapters WHERE book=? AND chapter=?',
    [book, chapter]
  )
}

export async function getBiblehubChapter(
  db: SQLiteDatabase, book: string, chapter: number
): Promise<BiblehubChapter | null> {
  return db.getFirstAsync<BiblehubChapter>(
    'SELECT essay, passages FROM biblehub_chapters WHERE book=? AND chapter=?',
    [book, chapter]
  )
}

export async function getBiblesummaryChapter(
  db: SQLiteDatabase, book: string, chapter: number
): Promise<BiblesummaryChapter | null> {
  return db.getFirstAsync<BiblesummaryChapter>(
    'SELECT summary FROM biblesummary_chapters WHERE book=? AND chapter=?',
    [book, chapter]
  )
}

export async function getOverviewPericope(
  db: SQLiteDatabase, book: string, chapter: number, verse: number
): Promise<OverviewPericope | null> {
  return db.getFirstAsync<OverviewPericope>(
    `SELECT title, verse_start, verse_end, description
     FROM overview_pericopes
     WHERE book=? AND chapter=? AND verse_start<=? AND verse_end>=?
     LIMIT 1`,
    [book, chapter, verse, verse]
  )
}

export async function getBiblehubPassage(
  db: SQLiteDatabase, book: string, chapter: number, verse: number
): Promise<BiblehubPassage | null> {
  const row = await db.getFirstAsync<{ passages: string }>(
    'SELECT passages FROM biblehub_chapters WHERE book=? AND chapter=?',
    [book, chapter]
  )
  if (!row?.passages) return null
  const passages: BiblehubPassage[] = JSON.parse(row.passages)
  return passages.find(p => p.verse_start <= verse && verse <= p.verse_end) ?? null
}

// ── Early text cross-references ───────────────────────────────────────────────

export type EarlyRefType = 'quote' | 'allusion'

export interface EarlyTextRef {
  ref_book: string
  ref_chapter: number
  ref_verse: number
  ref_type: EarlyRefType
}

export async function getEarlyTextRefs(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  packDb?: SQLiteDatabase,
): Promise<EarlyTextRef[]> {
  return (packDb ?? db).getAllAsync<EarlyTextRef>(
    `SELECT ref_book, ref_chapter, ref_verse, ref_type
     FROM early_text_refs
     WHERE book=? AND chapter=?
     ORDER BY ref_book, ref_chapter, ref_verse`,
    [book, chapter]
  )
}

export interface EarlyTextCitation {
  book: string
  chapter: number
  verse: number
  ref_type: EarlyRefType
}

export async function getBibleVerseCitedByEarlyTexts(
  db: SQLiteDatabase,
  refBook: string,
  refChapter: number,
  refVerse: number,
): Promise<EarlyTextCitation[]> {
  return db.getAllAsync<EarlyTextCitation>(
    `SELECT book, chapter, verse, ref_type
     FROM early_text_refs
     WHERE ref_book=? AND ref_chapter=? AND ref_verse=?
     ORDER BY book, chapter`,
    [refBook, refChapter, refVerse]
  )
}

// ── Reading Plans ──────────────────────────────────────────────────────────────

export interface ReadingPlan {
  id: number
  name: string
  created_at: number
}

export interface PlanEntry {
  id: number
  plan_id: number
  day_number: number
  target_date: string
  book: string
  chapter: number
  completed_at: number | null
}

export interface PlanWithProgress extends ReadingPlan {
  total_days: number
  total_entries: number
  completed_entries: number
  today_book: string | null
  today_chapter: number | null
  today_completed: number | null
}

function isoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function createPlanFromTemplate(
  db: SQLiteDatabase,
  templateKey: string,
  startDate: Date = new Date(),
): Promise<number> {
  const tpl = PLAN_TEMPLATES.find(t => t.key === templateKey)
  if (!tpl) throw new Error(`Unknown template: ${templateKey}`)
  return createCustomPlan(db, tpl.label, tpl.getChapters(), tpl.days, startDate)
}

export async function createCustomPlan(
  db: SQLiteDatabase,
  name: string,
  chapters: [string, number][],
  totalDays: number,
  startDate: Date = new Date(),
): Promise<number> {
  const plan = await db.runAsync(
    'INSERT INTO reading_plans (name, created_at) VALUES (?, ?)',
    [name, Date.now()]
  )
  const planId = plan.lastInsertRowId
  const dayGroups = distributeChapters(chapters, totalDays)
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  // Build all rows first, then insert in a single transaction
  const rows: [number, number, string, string, number][] = []
  for (let i = 0; i < dayGroups.length; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    const dateStr = isoDate(date)
    for (const [book, chapter] of dayGroups[i]) {
      rows.push([planId, i + 1, dateStr, book, chapter])
    }
  }

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync(
        'INSERT INTO plan_entries (plan_id, day_number, target_date, book, chapter) VALUES (?, ?, ?, ?, ?)',
        row
      )
    }
  })

  return planId
}

export async function deletePlan(db: SQLiteDatabase, planId: number): Promise<void> {
  await db.runAsync('DELETE FROM plan_entries WHERE plan_id = ?', [planId])
  await db.runAsync('DELETE FROM reading_plans WHERE id = ?', [planId])
}

export async function markEntryComplete(db: SQLiteDatabase, entryId: number): Promise<void> {
  await db.runAsync('UPDATE plan_entries SET completed_at = ? WHERE id = ?', [Date.now(), entryId])
}

export async function markEntryIncomplete(db: SQLiteDatabase, entryId: number): Promise<void> {
  await db.runAsync('UPDATE plan_entries SET completed_at = NULL WHERE id = ?', [entryId])
}

export async function getPlans(db: SQLiteDatabase): Promise<PlanWithProgress[]> {
  const today = isoDate(new Date())
  return db.getAllAsync<PlanWithProgress>(`
    WITH comp AS (
      SELECT plan_id, COUNT(*) AS cnt
      FROM (
        SELECT plan_id, day_number
        FROM plan_entries
        GROUP BY plan_id, day_number
        HAVING SUM(CASE WHEN completed_at IS NULL THEN 1 ELSE 0 END) = 0
      )
      GROUP BY plan_id
    )
    SELECT
      p.id, p.name, p.created_at,
      COUNT(DISTINCT e.day_number)             AS total_days,
      COUNT(e.id)                              AS total_entries,
      COALESCE(comp.cnt, 0)                    AS completed_entries,
      MAX(CASE WHEN e.target_date = '${today}' THEN e.book         END) AS today_book,
      MAX(CASE WHEN e.target_date = '${today}' THEN e.chapter      END) AS today_chapter,
      MAX(CASE WHEN e.target_date = '${today}' THEN e.completed_at END) AS today_completed
    FROM reading_plans p
    LEFT JOIN plan_entries e ON e.plan_id = p.id
    LEFT JOIN comp ON comp.plan_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `, [])
}

export async function getPlanEntriesForMonth(
  db: SQLiteDatabase,
  planId: number,
  year: number,
  month: number,
): Promise<PlanEntry[]> {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return db.getAllAsync<PlanEntry>(
    "SELECT * FROM plan_entries WHERE plan_id = ? AND target_date LIKE ? ORDER BY day_number, id",
    [planId, `${prefix}%`]
  )
}

export async function getTodayEntries(db: SQLiteDatabase, planId: number): Promise<PlanEntry[]> {
  const today = isoDate(new Date())
  return db.getAllAsync<PlanEntry>(
    'SELECT * FROM plan_entries WHERE plan_id = ? AND target_date = ? ORDER BY id',
    [planId, today]
  )
}

export async function getStreak(db: SQLiteDatabase, planId: number): Promise<number> {
  const rows = await db.getAllAsync<{ target_date: string; total: number; done: number }>(
    `SELECT target_date, COUNT(*) AS total, COUNT(completed_at) AS done
     FROM plan_entries WHERE plan_id = ?
     GROUP BY target_date ORDER BY target_date DESC`,
    [planId]
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  for (const row of rows) {
    const rowDate = new Date(row.target_date + 'T00:00:00')
    const diffDays = Math.round((today.getTime() - rowDate.getTime()) / 86400000)
    if (diffDays !== streak) break
    if (row.done === row.total && row.total > 0) streak++
  }
  return streak
}
