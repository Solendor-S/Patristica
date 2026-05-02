import type { SQLiteDatabase } from 'expo-sqlite'
import type { BibleVerse, Bookmark, CommentaryEntry, SearchResult } from '../types'

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
  translation = 'KJV'
): Promise<SearchResult[]> {
  const clean = query.trim()
  if (!clean) return []
  const like = `%${clean}%`
  if (translation === 'KJV') {
    return db.getAllAsync<SearchResult>(
      'SELECT book, chapter, verse, text FROM bible_verses WHERE LOWER(text) LIKE LOWER(?) LIMIT 200',
      [like]
    )
  }
  return db.getAllAsync<SearchResult>(
    'SELECT book, chapter, verse, text FROM bible_translations WHERE translation = ? AND LOWER(text) LIKE LOWER(?) LIMIT 200',
    [translation, like]
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
): Promise<{ ref_book: string; ref_chapter: number; ref_verse: number }[]> {
  return db.getAllAsync(
    `SELECT ref_book, ref_chapter, ref_verse FROM cross_refs
     WHERE book = ? AND chapter = ? AND verse = ?
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

// ── Distinct books (ordered as they appear in the Bible) ──

export async function getBooks(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ book: string }>(
    'SELECT DISTINCT book FROM bible_verses ORDER BY MIN(rowid)',
    []
  )
  return rows.map(r => r.book)
}
