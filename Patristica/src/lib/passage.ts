import { useCallback } from 'react'
import { useChapterText } from '../context/PackContext'
import { API_TRANSLATIONS, type Translation } from '../context/TranslationContext'
import { stripUsfm } from '../data/redLetter'

/** A verse range, as produced by scripts/mass/citations.py (app versification; v2 999 = to chapter end). */
export interface Seg { book: string; ch: number; v1: number; ch2: number; v2: number }
export interface PassageVerse { book: string; chapter: number; verse: number; text: string }

/**
 * Text for a list of verse ranges in a translation, through the same core/pack/online path the
 * reader uses. Verses the translation lacks (Daniel 3:24-90 outside the WEBC, deuterocanon in a
 * Protestant text) come from the WEBC instead.
 */
export function usePassage() {
  const chapterText = useChapterText()
  return useCallback(async (segs: Seg[], translation: string): Promise<PassageVerse[]> => {
    // ponytail: API-only translations (ESV/NASB/NKJV) need their proxy fetch; WEBC stands in here.
    const t = API_TRANSLATIONS.has(translation as Translation) ? 'WEBC' : translation
    // one fetch per distinct chapter (readings like "Isa 63:16-17, 19; 64:2-7" hit the same chapter twice)
    const pieces = segs.flatMap(s => Array.from({ length: s.ch2 - s.ch + 1 }, (_, i) => {
      const c = s.ch + i
      return { book: s.book, c, lo: c === s.ch ? s.v1 : 1, hi: c === s.ch2 ? s.v2 : 999 }
    }))
    const chapters = new Map<string, Promise<{ verse: number; text: string }[]>>()
    const load = (book: string, c: number, tr: string) => {
      const key = `${tr}|${book}|${c}`
      if (!chapters.has(key)) chapters.set(key, chapterText(book, c, tr).catch(() => []))
      return chapters.get(key)!
    }
    const parts = await Promise.all(pieces.map(async ({ book, c, lo, hi }) => {
      const inRange = (v: { verse: number }) => v.verse >= lo && v.verse <= hi
      let pick = (await load(book, c, t)).filter(inRange)
      if (pick.length === 0 && t !== 'WEBC') pick = (await load(book, c, 'WEBC')).filter(inRange)
      return pick.map(v => ({ book, chapter: c, verse: v.verse, text: stripUsfm(v.text) }))
    }))
    return parts.flat()
  }, [chapterText])
}
