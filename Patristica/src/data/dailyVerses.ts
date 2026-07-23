// Curated verse references for the "Verse of the Day" notification.
// Text is resolved from the bundled DB at schedule time (KJV, core table) —
// this file holds references only, so the corpus stays small and translation
// follows the DB.
// ponytail: ~60 refs, rotated by day-of-year. Bump toward 365 if variety matters.

export type VerseRef = { book: string; chapter: number; verse: number }

export const DAILY_VERSES: VerseRef[] = [
  { book: 'John',            chapter: 3,  verse: 16 },
  { book: 'Jeremiah',        chapter: 29, verse: 11 },
  { book: 'Philippians',     chapter: 4,  verse: 13 },
  { book: 'Romans',          chapter: 8,  verse: 28 },
  { book: 'Proverbs',        chapter: 3,  verse: 5  },
  { book: 'Isaiah',          chapter: 41, verse: 10 },
  { book: 'Psalms',          chapter: 23, verse: 1  },
  { book: 'Joshua',          chapter: 1,  verse: 9  },
  { book: 'Matthew',         chapter: 6,  verse: 33 },
  { book: 'Philippians',     chapter: 4,  verse: 6  },
  { book: 'Romans',          chapter: 12, verse: 2  },
  { book: '2 Timothy',       chapter: 1,  verse: 7  },
  { book: 'Psalms',          chapter: 46, verse: 1  },
  { book: 'Galatians',       chapter: 2,  verse: 20 },
  { book: 'Hebrews',         chapter: 11, verse: 1  },
  { book: 'Matthew',         chapter: 11, verse: 28 },
  { book: '1 Corinthians',   chapter: 13, verse: 4  },
  { book: 'Ephesians',       chapter: 2,  verse: 8  },
  { book: 'Isaiah',          chapter: 40, verse: 31 },
  { book: 'Psalms',          chapter: 119, verse: 105 },
  { book: 'John',            chapter: 14, verse: 6  },
  { book: 'Romans',          chapter: 5,  verse: 8  },
  { book: 'Proverbs',        chapter: 3,  verse: 6  },
  { book: '1 John',          chapter: 1,  verse: 9  },
  { book: 'Matthew',         chapter: 28, verse: 19 },
  { book: 'Psalms',          chapter: 27, verse: 1  },
  { book: '2 Corinthians',   chapter: 5,  verse: 17 },
  { book: 'Colossians',      chapter: 3,  verse: 23 },
  { book: 'Hebrews',         chapter: 4,  verse: 12 },
  { book: 'James',           chapter: 1,  verse: 5  },
  { book: 'John',            chapter: 15, verse: 5  },
  { book: 'Psalms',          chapter: 37, verse: 4  },
  { book: 'Micah',           chapter: 6,  verse: 8  },
  { book: '1 Peter',         chapter: 5,  verse: 7  },
  { book: 'Matthew',         chapter: 5,  verse: 16 },
  { book: 'Romans',          chapter: 10, verse: 9  },
  { book: 'Deuteronomy',     chapter: 31, verse: 6  },
  { book: 'Psalms',          chapter: 91, verse: 1  },
  { book: 'John',            chapter: 8,  verse: 12 },
  { book: 'Ephesians',       chapter: 6,  verse: 10 },
  { book: 'Galatians',       chapter: 5,  verse: 22 },
  { book: 'Psalms',          chapter: 121, verse: 1 },
  { book: 'Isaiah',          chapter: 53, verse: 5  },
  { book: 'Matthew',         chapter: 7,  verse: 7  },
  { book: 'Proverbs',        chapter: 16, verse: 3  },
  { book: 'John',            chapter: 16, verse: 33 },
  { book: 'Romans',          chapter: 15, verse: 13 },
  { book: 'Psalms',          chapter: 34, verse: 8  },
  { book: 'Hebrews',         chapter: 12, verse: 2  },
  { book: '1 Corinthians',   chapter: 10, verse: 13 },
  { book: 'Lamentations',    chapter: 3,  verse: 22 },
  { book: 'Psalms',          chapter: 139, verse: 14 },
  { book: 'Matthew',         chapter: 22, verse: 37 },
  { book: 'John',            chapter: 1,  verse: 1  },
  { book: 'Philippians',     chapter: 4,  verse: 19 },
  { book: 'Nahum',           chapter: 1,  verse: 7  },
  { book: 'Psalms',          chapter: 118, verse: 24 },
  { book: 'Isaiah',          chapter: 26, verse: 3  },
  { book: 'Romans',          chapter: 8,  verse: 38 },
  { book: 'Zephaniah',       chapter: 3,  verse: 17 },
]

// Stable per-day pick: day-of-year modulo corpus size. Same verse all day,
// advances at midnight, cycles through the whole list.
export function verseForDate(date: Date, corpus: VerseRef[] = DAILY_VERSES): VerseRef {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const dayOfYear = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86_400_000)
  return corpus[dayOfYear % corpus.length]
}
