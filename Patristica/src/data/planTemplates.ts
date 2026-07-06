import { BOOKS } from './books'

// All canonical chapter tuples [book, chapter] for a given book range
export function chaptersForBooks(bookNames: string[]): [string, number][] {
  const result: [string, number][] = []
  for (const name of bookNames) {
    const meta = BOOKS.find(b => b.name === name)
    if (!meta) continue
    for (let c = 1; c <= meta.chapters; c++) result.push([name, c])
  }
  return result
}

// Distribute a flat chapter list across N days (last day gets the remainder)
export function distributeChapters(chapters: [string, number][], days: number): [string, number][][] {
  const perDay = Math.ceil(chapters.length / days)
  const result: [string, number][][] = []
  for (let i = 0; i < days; i++) {
    const slice = chapters.slice(i * perDay, (i + 1) * perDay)
    if (slice.length > 0) result.push(slice)
  }
  return result
}

const NT_BOOKS = [
  'Matthew','Mark','Luke','John','Acts','Romans',
  '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
]

const OT_BOOKS = BOOKS.filter(b => b.testament === 'OT').map(b => b.name)
const ALL_BOOKS = [...OT_BOOKS, ...NT_BOOKS]
const GOSPELS_ACTS_BOOKS = ['Matthew', 'Mark', 'Luke', 'John', 'Acts']

export interface PlanTemplate {
  key: string
  label: string
  description: string
  days: number
  getChapters: () => [string, number][]
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    key: 'nt_90',
    label: 'NT in 90 Days',
    description: '~3 chapters per day through the entire New Testament',
    days: 90,
    getChapters: () => chaptersForBooks(NT_BOOKS),
  },
  {
    key: 'psalms_30',
    label: 'Psalms in 30 Days',
    description: '5 psalms per day through the complete Psalter',
    days: 30,
    getChapters: () => chaptersForBooks(['Psalms']),
  },
  {
    key: 'bible_365',
    label: 'Bible in a Year',
    description: '~3–4 chapters per day through the entire Bible',
    days: 365,
    getChapters: () => chaptersForBooks(ALL_BOOKS),
  },
  {
    key: 'gospels_60',
    label: 'Gospels & Acts in 60 Days',
    description: 'A focused read through the four Gospels and Acts',
    days: 60,
    getChapters: () => chaptersForBooks(GOSPELS_ACTS_BOOKS),
  },
]
