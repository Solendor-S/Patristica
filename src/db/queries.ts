import type { SQLiteDatabase } from 'expo-sqlite'
import type { BibleVerse, Bookmark, CommentaryEntry, CrossRef, Note, SearchResult } from '../types'

// ── Bible verses ──────────────────────────────────────────

export async function getChapter(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  translation = 'KJV'
): Promise<BibleVerse[]> {
  if (translation === 'KJV') {
    return db.getAllAsync<BibleVerse>(
      'SELECT book, chapter, verse, text FROM bible_verses WHERE book = ? AND chapter = ? ORDER BY verse',
      [book, chapter]
    )
  }
  return db.getAllAsync<BibleVerse>(
    'SELECT book, chapter, verse, text FROM bible_translations WHERE translation = ? AND book = ? AND chapter = ? ORDER BY verse',
    [translation, book, chapter]
  )
}

export async function getVerse(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number,
  translation = 'KJV'
): Promise<BibleVerse | null> {
  if (translation === 'KJV') {
    return db.getFirstAsync<BibleVerse>(
      'SELECT book, chapter, verse, text FROM bible_verses WHERE book = ? AND chapter = ? AND verse = ?',
      [book, chapter, verse]
    )
  }
  return db.getFirstAsync<BibleVerse>(
    'SELECT book, chapter, verse, text FROM bible_translations WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?',
    [translation, book, chapter, verse]
  )
}

// ── Search ────────────────────────────────────────────────

export async function searchVerses(
  db: SQLiteDatabase,
  query: string,
  translation = 'KJV',
  book = '',
): Promise<SearchResult[]> {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const likeArgs = words.map(w => `%${w}%`)

  const scoreExpr = words.map(() => `CASE WHEN LOWER(text) LIKE LOWER(?) THEN 1 ELSE 0 END`).join(' + ')
  const whereExpr = words.map(() => `LOWER(text) LIKE LOWER(?)`).join(' OR ')
  const bookClause = book ? ' AND book = ?' : ''
  const bookArgs = book ? [book] : []

  if (translation === 'KJV') {
    return db.getAllAsync<SearchResult>(
      `SELECT book, chapter, verse, text FROM bible_verses
       WHERE (${whereExpr})${bookClause}
       ORDER BY (${scoreExpr}) DESC
       LIMIT 200`,
      [...likeArgs, ...bookArgs, ...likeArgs],
    )
  }
  return db.getAllAsync<SearchResult>(
    `SELECT book, chapter, verse, text FROM bible_translations
     WHERE translation = ? AND (${whereExpr})${bookClause}
     ORDER BY (${scoreExpr}) DESC
     LIMIT 200`,
    [translation, ...likeArgs, ...bookArgs, ...likeArgs],
  )
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
    'SELECT book, chapter, verse, created_at as createdAt FROM bookmarks ORDER BY created_at DESC'
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
    'INSERT OR IGNORE INTO bookmarks (book, chapter, verse, created_at) VALUES (?, ?, ?, ?)',
    [book, chapter, verse, Date.now()]
  )
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

export async function getAllNotes(db: SQLiteDatabase): Promise<NoteWithVerse[]> {
  return db.getAllAsync<NoteWithVerse>(
    `SELECT n.book, n.chapter, n.verse,
            n.text       AS noteText,
            n.updated_at AS updatedAt,
            COALESCE(bv.text, '') AS verseText
     FROM notes n
     LEFT JOIN bible_verses bv
       ON bv.book = n.book AND bv.chapter = n.chapter AND bv.verse = n.verse
     ORDER BY bv.rowid`
  )
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

// ── Strong's / Word Study ─────────────────────────────────

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
  verse: number
): Promise<GreekWord[]> {
  return db.getAllAsync<GreekWord>(
    'SELECT position, greek, translit, strongs, gloss, morph FROM greek_words WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position',
    [book, chapter, verse]
  )
}

export async function getHebrewWords(
  db: SQLiteDatabase,
  book: string,
  chapter: number,
  verse: number
): Promise<HebrewWord[]> {
  return db.getAllAsync<HebrewWord>(
    'SELECT position, hebrew, translit, strongs, gloss, morph FROM hebrew_words WHERE book = ? AND chapter = ? AND verse = ? ORDER BY position',
    [book, chapter, verse]
  )
}

const STRONGS_NORM_RE: Record<'greek' | 'hebrew', RegExp> = {
  greek:  /^G0*(\d+)/,
  hebrew: /^H0*(\d+)/,
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
    const m = num.match(STRONGS_NORM_RE[type])
    if (m) {
      row = await db.getFirstAsync<StrongsEntry>(query, [`${prefix}${parseInt(m[1])}`])
    }
  }
  return row ?? null
}

// ── Distinct books (ordered as they appear in the Bible) ──

export async function getBooks(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ book: string }>(
    'SELECT DISTINCT book FROM bible_verses ORDER BY MIN(rowid)',
    []
  )
  return rows.map(r => r.book)
}
