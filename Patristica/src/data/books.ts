import type { Book } from '../types'

export const BOOKS: Book[] = [
  // Old Testament
  { name: 'Genesis',         chapters: 50,  testament: 'OT' },
  { name: 'Exodus',          chapters: 40,  testament: 'OT' },
  { name: 'Leviticus',       chapters: 27,  testament: 'OT' },
  { name: 'Numbers',         chapters: 36,  testament: 'OT' },
  { name: 'Deuteronomy',     chapters: 34,  testament: 'OT' },
  { name: 'Joshua',          chapters: 24,  testament: 'OT' },
  { name: 'Judges',          chapters: 21,  testament: 'OT' },
  { name: 'Ruth',            chapters: 4,   testament: 'OT' },
  { name: '1 Samuel',        chapters: 31,  testament: 'OT' },
  { name: '2 Samuel',        chapters: 24,  testament: 'OT' },
  { name: '1 Kings',         chapters: 22,  testament: 'OT' },
  { name: '2 Kings',         chapters: 25,  testament: 'OT' },
  { name: '1 Chronicles',    chapters: 29,  testament: 'OT' },
  { name: '2 Chronicles',    chapters: 36,  testament: 'OT' },
  { name: 'Ezra',            chapters: 10,  testament: 'OT' },
  { name: 'Nehemiah',        chapters: 13,  testament: 'OT' },
  { name: 'Esther',          chapters: 10,  testament: 'OT' },
  { name: 'Job',             chapters: 42,  testament: 'OT' },
  { name: 'Psalms',          chapters: 150, testament: 'OT' },
  { name: 'Proverbs',        chapters: 31,  testament: 'OT' },
  { name: 'Ecclesiastes',    chapters: 12,  testament: 'OT' },
  { name: 'Song of Solomon', chapters: 8,   testament: 'OT' },
  { name: 'Isaiah',          chapters: 66,  testament: 'OT' },
  { name: 'Jeremiah',        chapters: 52,  testament: 'OT' },
  { name: 'Lamentations',    chapters: 5,   testament: 'OT' },
  { name: 'Ezekiel',         chapters: 48,  testament: 'OT' },
  { name: 'Daniel',          chapters: 12,  testament: 'OT' },
  { name: 'Hosea',           chapters: 14,  testament: 'OT' },
  { name: 'Joel',            chapters: 3,   testament: 'OT' },
  { name: 'Amos',            chapters: 9,   testament: 'OT' },
  { name: 'Obadiah',         chapters: 1,   testament: 'OT' },
  { name: 'Jonah',           chapters: 4,   testament: 'OT' },
  { name: 'Micah',           chapters: 7,   testament: 'OT' },
  { name: 'Nahum',           chapters: 3,   testament: 'OT' },
  { name: 'Habakkuk',        chapters: 3,   testament: 'OT' },
  { name: 'Zephaniah',       chapters: 3,   testament: 'OT' },
  { name: 'Haggai',          chapters: 2,   testament: 'OT' },
  { name: 'Zechariah',       chapters: 14,  testament: 'OT' },
  { name: 'Malachi',         chapters: 4,   testament: 'OT' },
  // New Testament
  { name: 'Matthew',         chapters: 28,  testament: 'NT' },
  { name: 'Mark',            chapters: 16,  testament: 'NT' },
  { name: 'Luke',            chapters: 24,  testament: 'NT' },
  { name: 'John',            chapters: 21,  testament: 'NT' },
  { name: 'Acts',            chapters: 28,  testament: 'NT' },
  { name: 'Romans',          chapters: 16,  testament: 'NT' },
  { name: '1 Corinthians',   chapters: 16,  testament: 'NT' },
  { name: '2 Corinthians',   chapters: 13,  testament: 'NT' },
  { name: 'Galatians',       chapters: 6,   testament: 'NT' },
  { name: 'Ephesians',       chapters: 6,   testament: 'NT' },
  { name: 'Philippians',     chapters: 4,   testament: 'NT' },
  { name: 'Colossians',      chapters: 4,   testament: 'NT' },
  { name: '1 Thessalonians', chapters: 5,   testament: 'NT' },
  { name: '2 Thessalonians', chapters: 3,   testament: 'NT' },
  { name: '1 Timothy',       chapters: 6,   testament: 'NT' },
  { name: '2 Timothy',       chapters: 4,   testament: 'NT' },
  { name: 'Titus',           chapters: 3,   testament: 'NT' },
  { name: 'Philemon',        chapters: 1,   testament: 'NT' },
  { name: 'Hebrews',         chapters: 13,  testament: 'NT' },
  { name: 'James',           chapters: 5,   testament: 'NT' },
  { name: '1 Peter',         chapters: 5,   testament: 'NT' },
  { name: '2 Peter',         chapters: 3,   testament: 'NT' },
  { name: '1 John',          chapters: 5,   testament: 'NT' },
  { name: '2 John',          chapters: 1,   testament: 'NT' },
  { name: '3 John',          chapters: 1,   testament: 'NT' },
  { name: 'Jude',            chapters: 1,   testament: 'NT' },
  { name: 'Revelation',      chapters: 22,  testament: 'NT' },
]

export const BOOK_MAP   = Object.fromEntries(BOOKS.map(b => [b.name, b]))
export const BOOK_ORDER = new Map(BOOKS.map((b, i) => [b.name, i]))

export const APOCRYPHA_BOOKS: Book[] = [
  // Deuterocanon (accepted by Catholic & Orthodox churches)
  { name: 'Tobit',               chapters: 14,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Judith',              chapters: 16,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Wisdom of Solomon',   chapters: 19,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Sirach',              chapters: 51,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Baruch',              chapters: 6,   testament: 'APOC', group: 'Deuterocanon' },
  { name: '1 Maccabees',         chapters: 16,  testament: 'APOC', group: 'Deuterocanon' },
  { name: '2 Maccabees',         chapters: 15,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Prayer of Azariah',   chapters: 1,   testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Susanna',             chapters: 1,   testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Bel and the Dragon',  chapters: 1,   testament: 'APOC', group: 'Deuterocanon' },
  // Broader Canon (accepted by some Orthodox traditions)
  { name: '1 Esdras',            chapters: 9,   testament: 'APOC', group: 'Broader Canon' },
  { name: '2 Esdras',            chapters: 16,  testament: 'APOC', group: 'Broader Canon' },
  { name: 'Prayer of Manasseh',  chapters: 1,   testament: 'APOC', group: 'Broader Canon' },
  { name: 'Psalm 151',           chapters: 1,   testament: 'APOC', group: 'Broader Canon' },
  { name: '3 Maccabees',         chapters: 7,   testament: 'APOC', group: 'Broader Canon' },
  { name: '4 Maccabees',         chapters: 18,  testament: 'APOC', group: 'Broader Canon' },
  // Ethiopian Canon
  { name: '1 Enoch',             chapters: 108, testament: 'APOC', group: 'Ethiopian Canon' },
  { name: 'Jubilees',            chapters: 50,  testament: 'APOC', group: 'Ethiopian Canon' },
  { name: '1 Meqabyan',          chapters: 7,   testament: 'APOC', group: 'Ethiopian Canon' },
  { name: '2 Meqabyan',          chapters: 21,  testament: 'APOC', group: 'Ethiopian Canon' },
  { name: '3 Meqabyan',          chapters: 10,  testament: 'APOC', group: 'Ethiopian Canon' },
]

export const APOCRYPHA_BOOK_NAMES = new Set(APOCRYPHA_BOOKS.map(b => b.name))
export const APOCRYPHA_BOOK_MAP   = Object.fromEntries(APOCRYPHA_BOOKS.map(b => [b.name, b]))

// ── Canons ──────────────────────────────────────────────────────────────────
// Each canon is an Old Testament reading order (the NT is the same everywhere).
// Deuterocanonical books keep testament 'APOC' and are still read from the
// apocrypha packs — the canon only decides where they're listed.
export type CanonKey = 'protestant' | 'catholic'

const OT_NAMES = BOOKS.filter(b => b.testament === 'OT').map(b => b.name)
const NT_NAMES = BOOKS.filter(b => b.testament === 'NT').map(b => b.name)

// Insert `extra` immediately after `after` in `list`.
function insertAfter(list: string[], after: string, ...extra: string[]): string[] {
  const i = list.indexOf(after)
  return [...list.slice(0, i + 1), ...extra, ...list.slice(i + 1)]
}

const CATHOLIC_OT = [
  ['Nehemiah',        ['Tobit', 'Judith']],
  ['Esther',          ['1 Maccabees', '2 Maccabees']],
  ['Song of Solomon', ['Wisdom of Solomon', 'Sirach']],
  ['Lamentations',    ['Baruch']],
].reduce<string[]>((l, [after, extra]) => insertAfter(l, after as string, ...(extra as string[])), OT_NAMES)

export const CANON_OT_ORDER: Record<CanonKey, string[]> = {
  protestant: OT_NAMES,
  catholic:   CATHOLIC_OT,
}

// In the Catholic canon these are part of Daniel, not books of their own: the picker lists
// only Daniel, and these labels show where they went when one turns up in a book search.
export const CANON_BADGE: Record<string, string> = {
  'Prayer of Azariah':  'Daniel 3',
  'Susanna':            'Daniel 13',
  'Bel and the Dragon': 'Daniel 14',
}

// The WEBC carries the deuterocanon itself, so while it's the active translation these
// reader books come from it instead of the apocrypha packs. Daniel's Greek portions sit
// inside Daniel there, and the Prayer of Azariah is only a verse range of chapter 3.
export const WEBC_DEUTERO: Record<string, { book: string; chapter?: number; verses?: [number, number] }> = {
  'Tobit':              { book: 'Tobit' },
  'Judith':             { book: 'Judith' },
  'Wisdom of Solomon':  { book: 'Wisdom of Solomon' },
  'Sirach':             { book: 'Sirach' },
  'Baruch':             { book: 'Baruch' },
  '1 Maccabees':        { book: '1 Maccabees' },
  '2 Maccabees':        { book: '2 Maccabees' },
  'Prayer of Azariah':  { book: 'Daniel', chapter: 3, verses: [24, 90] },
  'Susanna':            { book: 'Daniel', chapter: 13 },
  'Bel and the Dragon': { book: 'Daniel', chapter: 14 },
}

// Chapters of Daniel that other translations don't have; they read from the apocrypha text.
export const DANIEL_GREEK_CHAPTERS: Record<number, string> = { 13: 'Susanna', 14: 'Bel and the Dragon' }

export function chapterCount(book: string, translation: string, canon: CanonKey): number {
  if (book === 'Daniel' && (translation === 'WEBC' || canon === 'catholic')) return 14
  return (BOOK_MAP[book] ?? APOCRYPHA_BOOK_MAP[book] ?? EARLY_TEXT_MAP[book])?.chapters ?? 1
}

// The verse number cross-refs, commentary and other translations use for this verse, or
// null if it has no equivalent. The WEBC puts the Prayer of Azariah at Daniel 3:24-90,
// which pushes the Hebrew text's 3:24-30 along to 3:91-97.
export function kjvVerse(translation: string, book: string, chapter: number, verse: number): number | null {
  if (translation === 'WEBC' && book === 'Daniel' && chapter === 3) {
    if (verse >= 91) return verse - 67
    if (verse >= 24) return null
  }
  return verse
}

const resolveBook = (name: string): Book => BOOK_MAP[name] ?? APOCRYPHA_BOOK_MAP[name]

export function canonOtBooks(canon: CanonKey): Book[] {
  return CANON_OT_ORDER[canon].map(name => ({ ...resolveBook(name), chapters: chapterCount(name, '', canon) }))
}

// Daniel's Greek portions count as in the canon even though they aren't listed separately.
export function inCanon(canon: CanonKey, name: string): boolean {
  return canonBookNames(canon).includes(name) || (canon === 'catholic' && name in CANON_BADGE)
}

export function canonBookNames(canon: CanonKey): string[] {
  return [...CANON_OT_ORDER[canon], ...NT_NAMES]
}

export function canonBookOrder(canon: CanonKey): Map<string, number> {
  return new Map(canonBookNames(canon).map((n, i) => [n, i]))
}

export const EARLY_TEXTS: Array<{ name: string; chapters: number; testament: 'EARLY'; group: string; date: string }> = [
  { name: 'Didache',   chapters: 16, testament: 'EARLY', group: 'Early Church Writings', date: 'c. 50–120 AD' },
  { name: '1 Clement', chapters: 59, testament: 'EARLY', group: 'Apostolic Fathers',     date: 'c. 96 AD' },
  { name: '2 Clement', chapters: 20, testament: 'EARLY', group: 'Spurious',              date: 'c. 130–160 AD' },
  // Ignatius Letters (c. 107 AD)
  { name: 'Ignatius to the Ephesians',      chapters: 21, testament: 'EARLY', group: 'Ignatius Letters', date: 'c. 107 AD' },
  { name: 'Ignatius to the Magnesians',     chapters: 15, testament: 'EARLY', group: 'Ignatius Letters', date: 'c. 107 AD' },
  { name: 'Ignatius to the Trallians',      chapters: 13, testament: 'EARLY', group: 'Ignatius Letters', date: 'c. 107 AD' },
  { name: 'Ignatius to the Romans',         chapters: 10, testament: 'EARLY', group: 'Ignatius Letters', date: 'c. 107 AD' },
  { name: 'Ignatius to the Philadelphians', chapters: 11, testament: 'EARLY', group: 'Ignatius Letters', date: 'c. 107 AD' },
  { name: 'Ignatius to the Smyrnaeans',     chapters: 13, testament: 'EARLY', group: 'Ignatius Letters', date: 'c. 107 AD' },
  { name: 'Ignatius to Polycarp',           chapters:  8, testament: 'EARLY', group: 'Ignatius Letters', date: 'c. 107 AD' },
  // Apostolic Fathers
  { name: 'Epistle to Diognetus',  chapters: 12, testament: 'EARLY', group: 'Apostolic Fathers', date: 'c. 130–200 AD' },
  { name: 'Epistle of Barnabas',   chapters: 21, testament: 'EARLY', group: 'Apostolic Fathers', date: 'c. 70–132 AD' },
  { name: 'Epistle of Polycarp',   chapters: 14, testament: 'EARLY', group: 'Apostolic Fathers', date: 'c. 110–140 AD' },
  { name: 'Martyrdom of Polycarp', chapters: 22, testament: 'EARLY', group: 'Apostolic Fathers', date: 'c. 155 AD' },
  // Apologists
  { name: 'Justin Martyr — First Apology',        chapters:  68, testament: 'EARLY', group: 'Apologists', date: 'c. 155 AD' },
  { name: 'Justin Martyr — Dialogue with Trypho', chapters: 142, testament: 'EARLY', group: 'Apologists', date: 'c. 155–160 AD' },
  { name: 'Tertullian — Apologeticus',            chapters:  50, testament: 'EARLY', group: 'Apologists', date: 'c. 197 AD' },
  // Irenaeus — Against Heresies
  { name: 'Against Heresies Book 1', chapters: 31, testament: 'EARLY', group: 'Irenaeus', date: 'c. 180 AD' },
  { name: 'Against Heresies Book 2', chapters: 35, testament: 'EARLY', group: 'Irenaeus', date: 'c. 180 AD' },
  { name: 'Against Heresies Book 3', chapters: 25, testament: 'EARLY', group: 'Irenaeus', date: 'c. 180 AD' },
  { name: 'Against Heresies Book 4', chapters: 41, testament: 'EARLY', group: 'Irenaeus', date: 'c. 180 AD' },
  { name: 'Against Heresies Book 5', chapters: 36, testament: 'EARLY', group: 'Irenaeus', date: 'c. 180 AD' },
]

export const EARLY_TEXT_NAMES = new Set(EARLY_TEXTS.map(b => b.name))
export const EARLY_TEXT_MAP   = Object.fromEntries(EARLY_TEXTS.map(b => [b.name, b]))

// Short display names for books whose full name is too long for compact UI slots
const SHORT_BOOK_NAMES: Record<string, string> = {
  // Canonical
  'Song of Solomon':    'Song of Sol.',
  '1 Thessalonians':   '1 Thess.',
  '2 Thessalonians':   '2 Thess.',
  // Apocrypha
  'Wisdom of Solomon':  'Wisdom',
  'Prayer of Manasseh': 'Pr. Manasseh',
  'Prayer of Azariah':  'Pr. Azariah',
  'Bel and the Dragon': 'Bel & Dragon',
  // Early texts — Ignatius
  'Ignatius to the Ephesians':      'Ign. Ephesians',
  'Ignatius to the Magnesians':     'Ign. Magnesians',
  'Ignatius to the Trallians':      'Ign. Trallians',
  'Ignatius to the Romans':         'Ign. Romans',
  'Ignatius to the Philadelphians': 'Ign. Philad.',
  'Ignatius to the Smyrnaeans':     'Ign. Smyrnaeans',
  'Ignatius to Polycarp':           'Ign. Polycarp',
  // Early texts — Epistles
  'Epistle to Diognetus': 'Ep. Diognetus',
  'Epistle of Barnabas':  'Ep. Barnabas',
  'Epistle of Polycarp':  'Ep. Polycarp',
  'Martyrdom of Polycarp':'Mart. Polycarp',
  // Apologists
  'Justin Martyr — First Apology':        'Justin — 1 Apol.',
  'Justin Martyr — Dialogue with Trypho': 'Justin — Dialogue',
  'Tertullian — Apologeticus':            'Tertullian — Apol.',
  // Irenaeus
  'Against Heresies Book 1': 'Ag. Heresies 1',
  'Against Heresies Book 2': 'Ag. Heresies 2',
  'Against Heresies Book 3': 'Ag. Heresies 3',
  'Against Heresies Book 4': 'Ag. Heresies 4',
  'Against Heresies Book 5': 'Ag. Heresies 5',
}

export function shortBookName(name: string): string {
  return SHORT_BOOK_NAMES[name] ?? name
}
