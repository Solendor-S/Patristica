import type { SQLiteDatabase } from 'expo-sqlite'
import type { BibleVerse, Bookmark, CommentaryEntry, CrossRef, Note, SearchResult, TextualVariant } from '../types'

// ── Book name normalisation ────────────────────────────────
// ASV (and some other translations) store numbered books with Roman numerals
// (e.g. "I John", "II Corinthians") while the app uses numeric form ("1 John").
// bookAlt returns the alternative form so queries can match either.
const NUM_PREFIX: Record<string, string> = { '1 ': 'I ', '2 ': 'II ', '3 ': 'III ' }
const ROM_PREFIX: Record<string, string> = { 'I ': '1 ', 'II ': '2 ', 'III ': '3 ' }
function bookAlt(book: string): string | null {
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

// ── Bible verses ──────────────────────────────────────────

export async function getApocryphaChapter(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
): Promise<BibleVerse[]> {
  return db.getAllAsync<BibleVerse>(
    'SELECT book, chapter, verse, text FROM apocrypha_verses WHERE book = ? AND chapter = ? ORDER BY verse',
    [book, chapter]
  )
}

export async function getEarlyTextFootnotes(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
): Promise<Map<number, string>> {
  const rows = await db.getAllAsync<{ marker: number; note: string }>(
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
): Promise<BibleVerse[]> {
  const rows = await db.getAllAsync<BibleVerse>(
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
  translation = 'KJV'
): Promise<BibleVerse[]> {
  if (translation === 'TR+')  return getChapterWordsAnnotated(db, book, chapter, 'greek_words_tr', 'greek')
  if (translation === 'WLC+') return getChapterWordsAnnotated(db, book, chapter, 'wlc_words', 'hebrew')
  if (translation === 'LXX+') return getChapterWordsAnnotated(db, book, chapter, 'lxx_words', 'greek')
  const greekNTTable = GREEK_SOURCE_TABLE[translation.toLowerCase() as GreekSource]
  if (greekNTTable) return getChapterWords(db, book, chapter, greekNTTable, 'greek')
  const otEntry = OT_WORD_TABLE[translation.toLowerCase()]
  if (otEntry) return getChapterWords(db, book, chapter, otEntry.table, otEntry.col)
  if (translation === 'KJV') {
    return db.getAllAsync<BibleVerse>(
      'SELECT book, chapter, verse, text FROM bible_verses WHERE book = ? AND chapter = ? ORDER BY verse',
      [book, chapter]
    )
  }
  const alt = bookAlt(book)
  return db.getAllAsync<BibleVerse>(
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
  translation = 'KJV'
): Promise<BibleVerse | null> {
  if (translation === 'TR+')  return getVerseWordsAnnotated(db, book, chapter, verse, 'greek_words_tr', 'greek')
  if (translation === 'WLC+') return getVerseWordsAnnotated(db, book, chapter, verse, 'wlc_words', 'hebrew')
  if (translation === 'LXX+') return getVerseWordsAnnotated(db, book, chapter, verse, 'lxx_words', 'greek')
  const greekNTTable = GREEK_SOURCE_TABLE[translation.toLowerCase() as GreekSource]
  if (greekNTTable) return getVerseWords(db, book, chapter, verse, greekNTTable, 'greek')
  const otEntry = OT_WORD_TABLE[translation.toLowerCase()]
  if (otEntry) return getVerseWords(db, book, chapter, verse, otEntry.table, otEntry.col)
  if (translation === 'KJV') {
    return db.getFirstAsync<BibleVerse>(
      'SELECT book, chapter, verse, text FROM bible_verses WHERE book = ? AND chapter = ? AND verse = ?',
      [book, chapter, verse]
    )
  }
  const alt = bookAlt(book)
  return db.getFirstAsync<BibleVerse>(
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

export async function searchVerses(
  db: SQLiteDatabase,
  query: string,
  translation = 'KJV',
  books: string[] = [],
  limit = 200,
): Promise<SearchResult[]> {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  // For each word, compute LIKE patterns (with % wildcards) and bare forms (for scoring)
  // together in one pass. Strong's tags also include the zero-padded DB variant.
  const wordVariants = words.map(w => {
    const m = w.match(/^([hgHG])(\d+)$/)
    if (m) {
      const prefix = m[1].toUpperCase()
      const bare   = `${prefix}${parseInt(m[2])}`
      const padded = `${prefix}${String(parseInt(m[2])).padStart(4, '0')}`
      const forms  = bare === padded ? [bare] : [bare, padded]
      return { pats: forms.map(f => `%${f}%`), counts: forms }
    }
    return { pats: [`%${w}%`], counts: [w] }
  })
  const likeArgs  = wordVariants.flatMap(v => v.pats)
  // Bare words for occurrence-count scoring: 2×G746 scores higher than 1×G746.
  const countArgs = wordVariants.flatMap(v => v.counts).flatMap(w => [w, w])
  const scoreExpr = wordVariants
    .map(v => v.counts
      .map(() => `(length(lower(text)) - length(replace(lower(text), lower(?), ''))) / max(1, length(?))`)
      .join(' + '))
    .join(' + ')
  const whereExpr = wordVariants
    .map(v => v.pats.length === 1
      ? `LOWER(text) LIKE LOWER(?)`
      : `(${v.pats.map(() => `LOWER(text) LIKE LOWER(?)`).join(' OR ')})`)
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
  // Expand book filter to include Roman-numeral aliases (e.g. "1 John" → also "I John")
  const transBookArgs = books.length > 0
    ? books.flatMap(b => { const a = bookAlt(b); return a ? [b, a] : [b] })
    : []
  const transBookClause = transBookArgs.length > 0
    ? ` AND book IN (${transBookArgs.map(() => '?').join(',')})`
    : ''
  return db.getAllAsync<SearchResult>(
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
): Promise<SearchResult[]> {
  return searchVerses(db, query, translation, books, 5000)
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
  verse: number
): Promise<CommentaryEntry[]> {
  return db.getAllAsync<CommentaryEntry>(
    `SELECT id, father_name, father_era, excerpt, full_text, source, source_url
     FROM commentary
     WHERE book = ? AND chapter = ? AND verse = ?`,
    [book, chapter, verse]
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

export async function getGreekWords(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  source: GreekSource = 'sblgnt'
): Promise<GreekWord[]> {
  const table = GREEK_SOURCE_TABLE[source]
  return db.getAllAsync<GreekWord>(
    `SELECT position, greek, translit, strongs, gloss, morph FROM ${table} WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position`,
    [book, chapter, verse]
  )
}

export async function getHebrewWords(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  source: HebrewSource = 'tahot'
): Promise<HebrewWord[]> {
  return db.getAllAsync<HebrewWord>(
    `SELECT position, hebrew, translit, strongs, gloss, morph FROM ${HEBREW_SOURCE_TABLE[source]} WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position`,
    [book, chapter, verse]
  )
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
): Promise<GreekWord[]> {
  const table = LXX_WORD_TABLE[source]
  return db.getAllAsync<GreekWord>(
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

// ── Strong's Concordance ──────────────────────────────────

export interface StrongsConcordanceResult {
  book: string
  chapter: number
  verse: number
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
  hebrewSource: HebrewSource = 'tahot',
): Promise<StrongsConcordanceResult[]> {
  const table = lang === 'greek' ? GREEK_SOURCE_TABLE[greekSource]
    : lang === 'lxx_a'  ? 'lxx_apostolic_words'
    : lang === 'lxx'    ? 'lxx_words'
    :                     HEBREW_SOURCE_TABLE[hebrewSource]
  const wordCol = (lang === 'greek' || lang === 'lxx' || lang === 'lxx_a') ? 'greek' : 'hebrew'
  const q = `
    SELECT w.book, w.chapter, w.verse,
           MIN(w.${wordCol}) AS word,
           MIN(w.translit)   AS translit,
           bv.text,
           MIN(bt.text) AS kjvPlusText
    FROM ${table} w
    JOIN bible_verses bv ON bv.book = w.book AND bv.chapter = w.chapter AND bv.verse = w.verse
    LEFT JOIN bible_translations bt ON bt.book = w.book AND bt.chapter = w.chapter
                                   AND bt.verse = w.verse AND bt.translation = 'KJV+'
    WHERE w.strongs = ?
    GROUP BY w.book, w.chapter, w.verse
    ORDER BY MIN(w.rowid)`

  const normLang = (lang === 'lxx' || lang === 'lxx_a') ? 'greek' : lang

  // Fast path: exact match (works when stored format matches input)
  let rows = await db.getAllAsync<StrongsConcordanceResult>(q, [strongs])
  let normalized = normalizeStrongsNumber(strongs)

  if (!rows.length) {
    // Normalize both sides via CAST — strips leading zeros and trailing
    // disambiguation letters (e.g. G0746→G746, H3947A→H3947) so that
    // the display form (already stripped by NORM_STRONGS_EXPR) always matches.
    const normQ = q.replace(
      'WHERE w.strongs = ?',
      `WHERE SUBSTR(w.strongs,1,1) || CAST(CAST(SUBSTR(w.strongs,2) AS INTEGER) AS TEXT) = ?`,
    )
    rows = await db.getAllAsync<StrongsConcordanceResult>(normQ, [normalized])
  }

  if (!rows.length && normLang === 'greek') {
    const stdNum = await bsbGreekFallbackNum(db, strongs)
    if (stdNum) rows = await db.getAllAsync<StrongsConcordanceResult>(q, [stdNum])
  }

  return rows
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
): Promise<EarlyTextRef[]> {
  return db.getAllAsync<EarlyTextRef>(
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
