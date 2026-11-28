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
    const out: PassageVerse[] = []
    for (const s of segs) {
      for (let c = s.ch; c <= s.ch2; c++) {
        const lo = c === s.ch ? s.v1 : 1
        const hi = c === s.ch2 ? s.v2 : 999
        const inRange = (v: { verse: number }) => v.verse >= lo && v.verse <= hi
        let pick = (await chapterText(s.book, c, t).catch(() => [])).filter(inRange)
        if (pick.length === 0 && t !== 'WEBC') pick = (await chapterText(s.book, c, 'WEBC').catch(() => [])).filter(inRange)
        out.push(...pick.map(v => ({ book: s.book, chapter: c, verse: v.verse, text: stripUsfm(v.text) })))
      }
    }
    return out
  }, [chapterText])
}
