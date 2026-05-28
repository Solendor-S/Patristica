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

export const BOOK_MAP = Object.fromEntries(BOOKS.map(b => [b.name, b]))

export const APOCRYPHA_BOOKS: Book[] = [
  // Deuterocanon (accepted by Catholic & Orthodox churches)
  { name: 'Tobit',               chapters: 14,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Judith',              chapters: 16,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Wisdom of Solomon',   chapters: 19,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Sirach',              chapters: 51,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Baruch',              chapters: 6,   testament: 'APOC', group: 'Deuterocanon' },
  { name: '1 Maccabees',         chapters: 16,  testament: 'APOC', group: 'Deuterocanon' },
  { name: '2 Maccabees',         chapters: 15,  testament: 'APOC', group: 'Deuterocanon' },
  { name: '1 Esdras',            chapters: 9,   testament: 'APOC', group: 'Deuterocanon' },
  { name: '2 Esdras',            chapters: 16,  testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Prayer of Manasseh',  chapters: 1,   testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Psalm 151',           chapters: 1,   testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Prayer of Azariah',   chapters: 1,   testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Susanna',             chapters: 1,   testament: 'APOC', group: 'Deuterocanon' },
  { name: 'Bel and the Dragon',  chapters: 1,   testament: 'APOC', group: 'Deuterocanon' },
  // Broader Canon (accepted by some Orthodox traditions)
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
