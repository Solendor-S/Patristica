import { BOOKS } from '../data/books'

const CANONICAL_BOOKS = BOOKS.map(b => b.name)

const NORM_BOOKS: Record<string, string> = {}
for (const b of CANONICAL_BOOKS) {
  NORM_BOOKS[b.toLowerCase().replace(/\s+/g, '')] = b
}

const ALIASES: Record<string, string> = {
  gen: 'Genesis', ge: 'Genesis', gn: 'Genesis',
  ex: 'Exodus', exo: 'Exodus', exod: 'Exodus',
  lev: 'Leviticus', le: 'Leviticus', lv: 'Leviticus',
  num: 'Numbers', nu: 'Numbers', nm: 'Numbers', numb: 'Numbers',
  deu: 'Deuteronomy', deut: 'Deuteronomy', dt: 'Deuteronomy',
  jos: 'Joshua', josh: 'Joshua', jsh: 'Joshua',
  jdg: 'Judges', judg: 'Judges', jdgs: 'Judges',
  ru: 'Ruth', rut: 'Ruth', rth: 'Ruth',
  '1sa': '1 Samuel', '1sam': '1 Samuel', '1s': '1 Samuel',
  '2sa': '2 Samuel', '2sam': '2 Samuel', '2s': '2 Samuel',
  '1ki': '1 Kings', '1kgs': '1 Kings', '1kg': '1 Kings',
  '2ki': '2 Kings', '2kgs': '2 Kings', '2kg': '2 Kings',
  '1ch': '1 Chronicles', '1chr': '1 Chronicles', '1chron': '1 Chronicles',
  '2ch': '2 Chronicles', '2chr': '2 Chronicles', '2chron': '2 Chronicles',
  ezr: 'Ezra',
  neh: 'Nehemiah',
  est: 'Esther', esth: 'Esther',
  job: 'Job', jb: 'Job',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', pss: 'Psalms',
  pro: 'Proverbs', prov: 'Proverbs', pr: 'Proverbs', prv: 'Proverbs',
  ecc: 'Ecclesiastes', eccl: 'Ecclesiastes', qoh: 'Ecclesiastes',
  sos: 'Song of Solomon', sng: 'Song of Solomon', ss: 'Song of Solomon',
  song: 'Song of Solomon', cant: 'Song of Solomon',
  isa: 'Isaiah', is: 'Isaiah',
  jer: 'Jeremiah',
  lam: 'Lamentations', la: 'Lamentations',
  eze: 'Ezekiel', ezek: 'Ezekiel', ezk: 'Ezekiel',
  dan: 'Daniel', da: 'Daniel', dn: 'Daniel',
  hos: 'Hosea', ho: 'Hosea',
  joe: 'Joel', jl: 'Joel',
  amo: 'Amos', am: 'Amos',
  oba: 'Obadiah', ob: 'Obadiah',
  jon: 'Jonah',
  mic: 'Micah', mi: 'Micah',
  nah: 'Nahum', na: 'Nahum',
  hab: 'Habakkuk',
  zep: 'Zephaniah', zeph: 'Zephaniah', zp: 'Zephaniah',
  hag: 'Haggai', hg: 'Haggai',
  zec: 'Zechariah', zech: 'Zechariah', zch: 'Zechariah',
  mal: 'Malachi',
  mt: 'Matthew', mat: 'Matthew', matt: 'Matthew', mth: 'Matthew',
  mk: 'Mark', mar: 'Mark', mrk: 'Mark',
  lk: 'Luke', luk: 'Luke',
  jn: 'John', joh: 'John', jhn: 'John',
  ac: 'Acts', act: 'Acts', acts: 'Acts',
  ro: 'Romans', rom: 'Romans',
  '1co': '1 Corinthians', '1cor': '1 Corinthians',
  '2co': '2 Corinthians', '2cor': '2 Corinthians',
  gal: 'Galatians',
  eph: 'Ephesians',
  php: 'Philippians', phil: 'Philippians', phl: 'Philippians',
  col: 'Colossians',
  '1th': '1 Thessalonians', '1thes': '1 Thessalonians', '1thess': '1 Thessalonians',
  '2th': '2 Thessalonians', '2thes': '2 Thessalonians', '2thess': '2 Thessalonians',
  '1ti': '1 Timothy', '1tim': '1 Timothy',
  '2ti': '2 Timothy', '2tim': '2 Timothy',
  tit: 'Titus', ti: 'Titus',
  phm: 'Philemon', phlm: 'Philemon',
  heb: 'Hebrews',
  jas: 'James', jam: 'James', jms: 'James',
  '1pe': '1 Peter', '1pet': '1 Peter', '1pt': '1 Peter',
  '2pe': '2 Peter', '2pet': '2 Peter', '2pt': '2 Peter',
  '1jn': '1 John', '1jo': '1 John',
  '2jn': '2 John', '2jo': '2 John',
  '3jn': '3 John', '3jo': '3 John',
  jud: 'Jude',
  rev: 'Revelation', re: 'Revelation', apoc: 'Revelation', rv: 'Revelation',
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

function resolveBook(raw: string): string | null {
  const key = raw.toLowerCase().replace(/\s+/g, '')

  if (ALIASES[key]) return ALIASES[key]
  if (NORM_BOOKS[key]) return NORM_BOOKS[key]

  const prefixMatch = CANONICAL_BOOKS.find(b =>
    b.toLowerCase().replace(/\s+/g, '').startsWith(key)
  )
  if (prefixMatch) return prefixMatch

  let best: string | null = null
  let bestDist = Infinity
  for (const b of CANONICAL_BOOKS) {
    const normB = b.toLowerCase().replace(/\s+/g, '')
    const dist = Math.min(
      levenshtein(key, normB),
      levenshtein(key, normB.slice(0, key.length))
    )
    if (dist < bestDist) { bestDist = dist; best = b }
  }
  const maxDist = Math.max(1, Math.floor(key.length / 3))
  if (best && bestDist <= maxDist) return best

  return null
}

const PASSAGE_RE = /^([1-3]?\s*[a-z]+(?:\s+[a-z]+)*)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i
const BOOK_ONLY_RE = /^([1-3]?\s*[a-z]+(?:\s+[a-z]+)*)$/i

export interface BookRef {
  book: string
  chapter: number
  chapterSpecified: boolean
  verse?: number
  verseEnd?: number
}

export function matchBookRefs(input: string): BookRef[] {
  const q = input.trim()
  if (q.length < 2) return []

  // Try passage match first: "rom 8", "john 1:10", "john 1:10-15"
  const pm = q.match(PASSAGE_RE)
  if (pm) {
    const book = resolveBook(pm[1].trim())
    if (book && CANONICAL_BOOKS.includes(book)) {
      const chapter = parseInt(pm[2], 10)
      const bookData = BOOKS.find(b => b.name === book)
      if (bookData && chapter >= 1 && chapter <= bookData.chapters) {
        const verse    = pm[3] ? parseInt(pm[3], 10) : undefined
        const verseEnd = pm[4] ? parseInt(pm[4], 10) : undefined
        return [{ book, chapter, chapterSpecified: true, verse, verseEnd }]
      }
    }
  }

  // Book-only: find all canonical books that contain the query substring
  if (BOOK_ONLY_RE.test(q)) {
    const qNorm = q.toLowerCase().replace(/\s+/g, '')
    const results: BookRef[] = []

    // Substring match: "john" → John, 1 John, 2 John, 3 John
    for (const b of CANONICAL_BOOKS) {
      if (b.toLowerCase().replace(/\s+/g, '').includes(qNorm)) {
        results.push({ book: b, chapter: 1, chapterSpecified: false })
      }
    }

    if (results.length > 0) return results

    // Alias/prefix/fuzzy match for abbreviations: "jn" → John
    const resolved = resolveBook(q)
    if (resolved && CANONICAL_BOOKS.includes(resolved)) {
      return [{ book: resolved, chapter: 1, chapterSpecified: false }]
    }
  }

  return []
}
