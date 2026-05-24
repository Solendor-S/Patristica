// Verse ranges where Jesus speaks directly.
// Format: [book, chapter, verseStart, verseEnd]
// Based on the KJV red-letter tradition.

type R = [string, number, number, number]

const RANGES: R[] = [
  // ── Matthew ────────────────────────────────
  ['Matthew', 3, 15, 15],
  ['Matthew', 4, 4, 4], ['Matthew', 4, 7, 7], ['Matthew', 4, 10, 10],
  ['Matthew', 4, 17, 17], ['Matthew', 4, 19, 19],
  ['Matthew', 5, 2, 48],
  ['Matthew', 6, 1, 34],
  ['Matthew', 7, 1, 27],
  ['Matthew', 8, 3, 4], ['Matthew', 8, 7, 7], ['Matthew', 8, 10, 13],
  ['Matthew', 8, 20, 20], ['Matthew', 8, 22, 22], ['Matthew', 8, 26, 26], ['Matthew', 8, 32, 32],
  ['Matthew', 9, 2, 2], ['Matthew', 9, 4, 6], ['Matthew', 9, 9, 9],
  ['Matthew', 9, 12, 13], ['Matthew', 9, 15, 17], ['Matthew', 9, 22, 22],
  ['Matthew', 9, 24, 24], ['Matthew', 9, 28, 29], ['Matthew', 9, 37, 38],
  ['Matthew', 10, 5, 42],
  ['Matthew', 11, 4, 6], ['Matthew', 11, 7, 19], ['Matthew', 11, 21, 30],
  ['Matthew', 12, 3, 8], ['Matthew', 12, 11, 12], ['Matthew', 12, 25, 37],
  ['Matthew', 12, 39, 45], ['Matthew', 12, 48, 50],
  ['Matthew', 13, 3, 9], ['Matthew', 13, 11, 23], ['Matthew', 13, 24, 30],
  ['Matthew', 13, 31, 33], ['Matthew', 13, 37, 43], ['Matthew', 13, 44, 50], ['Matthew', 13, 51, 51],
  ['Matthew', 13, 52, 52], ['Matthew', 13, 57, 57],
  ['Matthew', 14, 16, 16], ['Matthew', 14, 18, 18], ['Matthew', 14, 27, 27],
  ['Matthew', 14, 29, 29], ['Matthew', 14, 31, 31],
  ['Matthew', 15, 3, 9], ['Matthew', 15, 11, 11], ['Matthew', 15, 13, 14],
  ['Matthew', 15, 16, 20], ['Matthew', 15, 24, 24], ['Matthew', 15, 26, 26],
  ['Matthew', 15, 28, 28], ['Matthew', 15, 32, 34],
  ['Matthew', 16, 2, 3], ['Matthew', 16, 6, 6], ['Matthew', 16, 8, 12],
  ['Matthew', 16, 15, 19], ['Matthew', 16, 23, 28],
  ['Matthew', 17, 7, 7], ['Matthew', 17, 9, 9], ['Matthew', 17, 11, 12],
  ['Matthew', 17, 17, 17], ['Matthew', 17, 20, 21], ['Matthew', 17, 22, 23],
  ['Matthew', 17, 25, 27],
  ['Matthew', 18, 2, 35],
  ['Matthew', 19, 4, 6], ['Matthew', 19, 9, 9], ['Matthew', 19, 11, 12],
  ['Matthew', 19, 14, 14], ['Matthew', 19, 17, 19], ['Matthew', 19, 21, 21],
  ['Matthew', 19, 23, 26], ['Matthew', 19, 28, 30],
  ['Matthew', 20, 1, 16], ['Matthew', 20, 17, 19], ['Matthew', 20, 21, 23],
  ['Matthew', 20, 25, 28], ['Matthew', 20, 32, 33],
  ['Matthew', 21, 2, 3], ['Matthew', 21, 13, 13], ['Matthew', 21, 16, 16],
  ['Matthew', 21, 19, 19], ['Matthew', 21, 21, 22], ['Matthew', 21, 24, 27],
  ['Matthew', 21, 28, 32], ['Matthew', 21, 33, 44],
  ['Matthew', 22, 2, 14], ['Matthew', 22, 18, 21], ['Matthew', 22, 29, 32],
  ['Matthew', 22, 37, 40], ['Matthew', 22, 42, 45],
  ['Matthew', 23, 1, 39],
  ['Matthew', 24, 2, 2], ['Matthew', 24, 4, 51],
  ['Matthew', 25, 1, 46],
  ['Matthew', 26, 2, 2], ['Matthew', 26, 10, 13], ['Matthew', 26, 18, 18],
  ['Matthew', 26, 21, 25], ['Matthew', 26, 26, 29], ['Matthew', 26, 31, 32],
  ['Matthew', 26, 34, 34], ['Matthew', 26, 36, 36], ['Matthew', 26, 38, 41],
  ['Matthew', 26, 45, 46], ['Matthew', 26, 50, 50], ['Matthew', 26, 52, 56],
  ['Matthew', 26, 64, 64],
  ['Matthew', 27, 11, 11], ['Matthew', 27, 46, 46],
  ['Matthew', 28, 9, 10], ['Matthew', 28, 18, 20],

  // ── Mark ───────────────────────────────────
  ['Mark', 1, 15, 15], ['Mark', 1, 17, 17], ['Mark', 1, 25, 25],
  ['Mark', 1, 38, 38], ['Mark', 1, 41, 41], ['Mark', 1, 44, 44],
  ['Mark', 2, 5, 5], ['Mark', 2, 8, 11], ['Mark', 2, 14, 14],
  ['Mark', 2, 17, 17], ['Mark', 2, 19, 22], ['Mark', 2, 25, 28],
  ['Mark', 3, 3, 5], ['Mark', 3, 23, 29], ['Mark', 3, 33, 35],
  ['Mark', 4, 3, 20], ['Mark', 4, 21, 25], ['Mark', 4, 26, 29],
  ['Mark', 4, 30, 32], ['Mark', 4, 39, 40],
  ['Mark', 5, 8, 8], ['Mark', 5, 19, 19], ['Mark', 5, 34, 34],
  ['Mark', 5, 36, 36], ['Mark', 5, 39, 39], ['Mark', 5, 41, 41],
  ['Mark', 6, 4, 4], ['Mark', 6, 10, 11], ['Mark', 6, 31, 31],
  ['Mark', 6, 37, 38], ['Mark', 6, 50, 50],
  ['Mark', 7, 6, 13], ['Mark', 7, 14, 15], ['Mark', 7, 18, 23],
  ['Mark', 7, 27, 27], ['Mark', 7, 29, 29],
  ['Mark', 8, 12, 12], ['Mark', 8, 15, 15], ['Mark', 8, 17, 21],
  ['Mark', 8, 27, 27], ['Mark', 8, 29, 29], ['Mark', 8, 33, 38],
  ['Mark', 9, 1, 1], ['Mark', 9, 12, 13], ['Mark', 9, 19, 19],
  ['Mark', 9, 21, 21], ['Mark', 9, 23, 23], ['Mark', 9, 25, 25],
  ['Mark', 9, 29, 29], ['Mark', 9, 31, 31], ['Mark', 9, 35, 35],
  ['Mark', 9, 39, 50],
  ['Mark', 10, 3, 3], ['Mark', 10, 5, 9], ['Mark', 10, 11, 12],
  ['Mark', 10, 14, 15], ['Mark', 10, 18, 19], ['Mark', 10, 21, 21],
  ['Mark', 10, 23, 27], ['Mark', 10, 29, 31], ['Mark', 10, 33, 34],
  ['Mark', 10, 36, 36], ['Mark', 10, 38, 40], ['Mark', 10, 42, 45],
  ['Mark', 10, 49, 49], ['Mark', 10, 51, 52],
  ['Mark', 11, 2, 3], ['Mark', 11, 14, 14], ['Mark', 11, 17, 17],
  ['Mark', 11, 22, 26], ['Mark', 11, 29, 33],
  ['Mark', 12, 1, 12], ['Mark', 12, 15, 17], ['Mark', 12, 24, 27],
  ['Mark', 12, 29, 31], ['Mark', 12, 35, 35], ['Mark', 12, 38, 40],
  ['Mark', 12, 43, 44],
  ['Mark', 13, 2, 2], ['Mark', 13, 5, 37],
  ['Mark', 14, 6, 9], ['Mark', 14, 13, 15], ['Mark', 14, 18, 18],
  ['Mark', 14, 20, 25], ['Mark', 14, 27, 28], ['Mark', 14, 30, 30],
  ['Mark', 14, 34, 34], ['Mark', 14, 36, 38], ['Mark', 14, 41, 42],
  ['Mark', 14, 48, 49], ['Mark', 14, 62, 62],
  ['Mark', 15, 2, 2], ['Mark', 15, 34, 34],
  ['Mark', 16, 15, 18],

  // ── Luke ───────────────────────────────────
  ['Luke', 2, 49, 49],
  ['Luke', 4, 4, 4], ['Luke', 4, 8, 8], ['Luke', 4, 12, 12],
  ['Luke', 4, 18, 21], ['Luke', 4, 23, 27], ['Luke', 4, 35, 35], ['Luke', 4, 43, 43],
  ['Luke', 5, 4, 4], ['Luke', 5, 10, 10], ['Luke', 5, 13, 14],
  ['Luke', 5, 20, 20], ['Luke', 5, 22, 24], ['Luke', 5, 27, 27],
  ['Luke', 5, 31, 32], ['Luke', 5, 34, 39],
  ['Luke', 6, 3, 5], ['Luke', 6, 8, 10], ['Luke', 6, 20, 49],
  ['Luke', 7, 9, 9], ['Luke', 7, 13, 14], ['Luke', 7, 22, 35],
  ['Luke', 7, 40, 48], ['Luke', 7, 50, 50],
  ['Luke', 8, 5, 18], ['Luke', 8, 21, 21], ['Luke', 8, 25, 25],
  ['Luke', 8, 39, 39], ['Luke', 8, 45, 46], ['Luke', 8, 48, 48],
  ['Luke', 8, 50, 50], ['Luke', 8, 52, 52], ['Luke', 8, 54, 54],
  ['Luke', 9, 3, 5], ['Luke', 9, 13, 14], ['Luke', 9, 20, 20],
  ['Luke', 9, 22, 26], ['Luke', 9, 41, 41], ['Luke', 9, 44, 44],
  ['Luke', 9, 48, 48], ['Luke', 9, 50, 50], ['Luke', 9, 58, 58],
  ['Luke', 9, 60, 60], ['Luke', 9, 62, 62],
  ['Luke', 10, 2, 16], ['Luke', 10, 18, 24], ['Luke', 10, 26, 28],
  ['Luke', 10, 30, 37], ['Luke', 10, 41, 42],
  ['Luke', 11, 2, 13], ['Luke', 11, 17, 36], ['Luke', 11, 39, 52],
  ['Luke', 12, 1, 1], ['Luke', 12, 4, 59],
  ['Luke', 13, 2, 9], ['Luke', 13, 12, 12], ['Luke', 13, 15, 17],
  ['Luke', 13, 18, 21], ['Luke', 13, 23, 30], ['Luke', 13, 32, 35],
  ['Luke', 14, 3, 5], ['Luke', 14, 8, 24], ['Luke', 14, 26, 35],
  ['Luke', 15, 3, 32],
  ['Luke', 16, 1, 15], ['Luke', 16, 17, 18], ['Luke', 16, 19, 31],
  ['Luke', 17, 1, 4], ['Luke', 17, 6, 6], ['Luke', 17, 10, 10],
  ['Luke', 17, 14, 14], ['Luke', 17, 17, 18], ['Luke', 17, 20, 37],
  ['Luke', 18, 1, 14], ['Luke', 18, 16, 17], ['Luke', 18, 19, 20],
  ['Luke', 18, 22, 22], ['Luke', 18, 24, 27], ['Luke', 18, 29, 33],
  ['Luke', 19, 5, 5], ['Luke', 19, 9, 10], ['Luke', 19, 13, 13],
  ['Luke', 19, 17, 26], ['Luke', 19, 31, 31], ['Luke', 19, 40, 40],
  ['Luke', 19, 42, 44], ['Luke', 19, 46, 46],
  ['Luke', 20, 3, 4], ['Luke', 20, 8, 8], ['Luke', 20, 9, 18],
  ['Luke', 20, 23, 25], ['Luke', 20, 34, 38], ['Luke', 20, 41, 44],
  ['Luke', 20, 45, 47],
  ['Luke', 21, 3, 4], ['Luke', 21, 6, 6], ['Luke', 21, 8, 36],
  ['Luke', 22, 10, 12], ['Luke', 22, 15, 22], ['Luke', 22, 25, 32],
  ['Luke', 22, 34, 34], ['Luke', 22, 35, 38], ['Luke', 22, 40, 40],
  ['Luke', 22, 42, 42], ['Luke', 22, 46, 46], ['Luke', 22, 48, 48],
  ['Luke', 22, 51, 53], ['Luke', 22, 67, 70],
  ['Luke', 23, 3, 3], ['Luke', 23, 28, 31], ['Luke', 23, 34, 34],
  ['Luke', 23, 43, 43], ['Luke', 23, 46, 46],
  ['Luke', 24, 17, 17], ['Luke', 24, 25, 27], ['Luke', 24, 36, 36],
  ['Luke', 24, 38, 44], ['Luke', 24, 46, 49],

  // ── John ───────────────────────────────────
  ['John', 1, 38, 39], ['John', 1, 42, 43], ['John', 1, 47, 48], ['John', 1, 50, 51],
  ['John', 2, 4, 4], ['John', 2, 7, 8], ['John', 2, 16, 16], ['John', 2, 19, 19],
  ['John', 3, 3, 3], ['John', 3, 5, 8], ['John', 3, 10, 21],
  ['John', 4, 7, 7], ['John', 4, 10, 10], ['John', 4, 13, 14],
  ['John', 4, 16, 18], ['John', 4, 21, 24], ['John', 4, 26, 26],
  ['John', 4, 32, 32], ['John', 4, 34, 38], ['John', 4, 48, 48], ['John', 4, 50, 50],
  ['John', 5, 6, 6], ['John', 5, 8, 8], ['John', 5, 14, 14],
  ['John', 5, 17, 17], ['John', 5, 19, 47],
  ['John', 6, 5, 5], ['John', 6, 10, 10], ['John', 6, 12, 12], ['John', 6, 20, 20],
  ['John', 6, 26, 27], ['John', 6, 29, 29], ['John', 6, 32, 40],
  ['John', 6, 43, 51], ['John', 6, 53, 58], ['John', 6, 61, 65],
  ['John', 6, 67, 67], ['John', 6, 70, 70],
  ['John', 7, 6, 8], ['John', 7, 16, 16], ['John', 7, 19, 19],
  ['John', 7, 21, 24], ['John', 7, 28, 29], ['John', 7, 33, 34], ['John', 7, 37, 38],
  ['John', 8, 7, 7], ['John', 8, 10, 12], ['John', 8, 14, 19],
  ['John', 8, 21, 30], ['John', 8, 31, 32], ['John', 8, 34, 47],
  ['John', 8, 49, 51], ['John', 8, 54, 58],
  ['John', 9, 3, 3], ['John', 9, 5, 5], ['John', 9, 7, 7],
  ['John', 9, 35, 37], ['John', 9, 39, 39], ['John', 9, 41, 41],
  ['John', 10, 1, 18], ['John', 10, 25, 30], ['John', 10, 32, 32], ['John', 10, 34, 38],
  ['John', 11, 4, 4], ['John', 11, 9, 11], ['John', 11, 14, 15],
  ['John', 11, 23, 23], ['John', 11, 25, 26], ['John', 11, 34, 34],
  ['John', 11, 39, 40], ['John', 11, 43, 44],
  ['John', 12, 7, 8], ['John', 12, 23, 28], ['John', 12, 30, 30],
  ['John', 12, 32, 32], ['John', 12, 35, 36], ['John', 12, 44, 50],
  ['John', 13, 7, 8], ['John', 13, 10, 11], ['John', 13, 12, 17],
  ['John', 13, 18, 21], ['John', 13, 26, 27], ['John', 13, 31, 36], ['John', 13, 38, 38],
  ['John', 14, 1, 31],
  ['John', 15, 1, 27],
  ['John', 16, 1, 33],
  ['John', 17, 1, 26],
  ['John', 18, 4, 5], ['John', 18, 7, 8], ['John', 18, 11, 11],
  ['John', 18, 20, 21], ['John', 18, 23, 23], ['John', 18, 34, 37],
  ['John', 19, 11, 11], ['John', 19, 26, 28], ['John', 19, 30, 30],
  ['John', 20, 15, 17], ['John', 20, 19, 19], ['John', 20, 21, 23],
  ['John', 20, 26, 29],
  ['John', 21, 5, 6], ['John', 21, 10, 10], ['John', 21, 12, 12],
  ['John', 21, 15, 19], ['John', 21, 22, 22],

  // ── Acts (post-resurrection appearances) ───
  ['Acts', 1, 4, 5], ['Acts', 1, 7, 8],
  ['Acts', 9, 4, 6], ['Acts', 9, 11, 12], ['Acts', 9, 15, 16],
  ['Acts', 11, 16, 16],
  ['Acts', 18, 9, 10],
  ['Acts', 22, 7, 8], ['Acts', 22, 10, 10], ['Acts', 22, 18, 18], ['Acts', 22, 21, 21],
  ['Acts', 23, 11, 11],
  ['Acts', 26, 14, 18],

  // ── 1 Corinthians (words of institution) ───
  ['1 Corinthians', 11, 24, 25],

  // ── Revelation ─────────────────────────────
  ['Revelation', 1, 8, 8], ['Revelation', 1, 11, 11], ['Revelation', 1, 17, 20],
  ['Revelation', 2, 1, 29],
  ['Revelation', 3, 1, 22],
  ['Revelation', 16, 15, 15],
  ['Revelation', 21, 5, 8],
  ['Revelation', 22, 7, 7], ['Revelation', 22, 12, 13], ['Revelation', 22, 16, 16],
  ['Revelation', 22, 20, 20],
]

function build(): Set<string> {
  const s = new Set<string>()
  for (const [book, ch, v1, v2] of RANGES) {
    for (let v = v1; v <= v2; v++) s.add(`${book}|${ch}|${v}`)
  }
  return s
}

export const RED_LETTER_VERSES = build()

export function isRedLetter(book: string, chapter: number, verse: number): boolean {
  return RED_LETTER_VERSES.has(`${book}|${chapter}|${verse}`)
}

export interface Segment { t: string; red: boolean; italic?: boolean }

export function stripUsfm(t: string): string {
  return t
    .replace(/\\\+?add\*/g, '}')
    .replace(/\\\+?add\s*/g, '{')
    .replace(/\\\+?w\*/g, '')
    .replace(/\\\+?w\s*/g, '')
    .replace(/\\\+?[a-z]{1,5}\*/g, '')
    .replace(/\\\+?[a-z]{1,5}\s+/g, '')
}

// Narrator speech-attribution verbs in KJV ("And Jesus said unto them,")
const ATTRIB_VERB_RE = /\b(answered|spake|cried|saying)\b/i

// Explicit "Jesus [verb]" attribution — up to 9 words between "Jesus" and the verb
const JESUS_ATTRIB_RE = /\bJesus(?:\s+\w+){0,9}?\s+(said|saith|answered|spake|cried)\b/i

function trySplit(text: string, matchEnd: number): Segment[] | null {
  const commaIdx = text.indexOf(',', matchEnd)
  if (commaIdx === -1 || commaIdx - matchEnd > 65) return null
  const speechStart = commaIdx + 1 + (text[commaIdx + 1] === ' ' ? 1 : 0)
  if (speechStart >= text.length - 3) return null
  return [
    { t: text.slice(0, speechStart), red: false },
    { t: text.slice(speechStart), red: true },
  ]
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

// WEB uses \+w on most words in speech verses (Strong's concordance tagging).
// Gaps > this threshold are untranslated loanwords/compounds, not narrator text.
const W_DENSITY_THRESHOLD = 0.7

/**
 * Parses \+w...\+w* markers into red/black segments, stripping USFM tags from
 * each segment. Returns null if no markers found.
 * Dense tagging (>W_DENSITY_THRESHOLD words tagged) means the entire verse is
 * speech — untagged gaps are just words missing Strong's tags, not narrator text.
 */
export function splitByWMarkers(text: string): Segment[] | null {
  if (!text.includes('\\+w')) return null
  const stripped = stripUsfm(text)
  const re = /\\\+w\s*([\s\S]*?)\\\+w\*/g
  const segs: Segment[] = []
  let last = 0, taggedWords = 0, gapWords = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      const gap = text.slice(last, m.index)
      const isPunct = taggedWords > 0 && /^[\s ;:,.!\-—–?'"'"«»]+$/.test(gap)
      segs.push({ t: stripUsfm(gap), red: isPunct })
      if (!isPunct) gapWords += wordCount(gap)
    }
    segs.push({ t: stripUsfm(m[1]), red: true })
    taggedWords += wordCount(m[1])
    last = m.index + m[0].length
  }
  if (taggedWords === 0) return null
  if (last < text.length) {
    const tail = text.slice(last)
    const isPunct = /^[\s ;:,.!\-—–?'"'"«»]+$/.test(tail) // taggedWords > 0 guaranteed above
    segs.push({ t: stripUsfm(tail), red: isPunct })
    if (!isPunct) gapWords += wordCount(tail)
  }
  const startsWithNarrator = segs.length > 0 && !segs[0].red && wordCount(segs[0].t) >= 2
  if (!startsWithNarrator && taggedWords / (taggedWords + gapWords) > W_DENSITY_THRESHOLD) {
    return [{ t: stripped, red: true }]
  }
  return segs
}

/**
 * Splits a red-letter verse into narrator (black) and speech (red) segments.
 * Priority 1: explicit "Jesus [verb]" attribution.
 * Priority 2: first generic speech verb within 120 chars.
 * Fallback: whole verse is speech.
 */
export function splitRedLetterVerse(text: string): Segment[] {
  const jm = JESUS_ATTRIB_RE.exec(text)
  if (jm) {
    const result = trySplit(text, jm.index + jm[0].length)
    if (result) return result
  }

  const m = ATTRIB_VERB_RE.exec(text)
  if (m && m.index <= 120) {
    // Skip if preceded by a relative clause ("which saith", "that said") —
    // those attribute the prophecy/text, not the current speaker
    const pre = text.slice(Math.max(0, m.index - 10), m.index).toLowerCase()
    if (!pre.includes('which') && !pre.includes('that ')) {
      const result = trySplit(text, m.index + m[0].length)
      if (result) return result
    }
  }

  return [{ t: text, red: true }]
}