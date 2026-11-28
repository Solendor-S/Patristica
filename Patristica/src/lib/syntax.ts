import { useCallback } from 'react'
import { usePackDb } from '../context/PackContext'
import { BOOK_MAP } from '../data/books'
import { fetchOnlineJson } from './PackManager'

// Clause view: MACULA Greek (SBLGNT) / Hebrew (WLC) syntax trees, (c) Biblica, CC BY 4.0,
// flattened to indented clause rows by scripts/syntax/build_syntax.py.

export const SYNTAX_NT_PACK = 'syntax_nt'
export const SYNTAX_OT_PACK = 'syntax_ot'

/** [ref "5:12!27", text, English gloss, Strong's "G1909", text that follows ("" = joins the next morpheme)] */
export type SynWord = [string, string, string, string, string]
/** [depth, role (s/v/o/adv/rel/...), words] */
export type SynRow = [number, string, SynWord[]]
export interface Sentence { id: number; startCh: number; startV: number; endCh: number; endV: number; rows: SynRow[] }

type ChapterJson = { s: Record<string, [number, number, number, number, SynRow[]]>; v: Record<string, number[]> }

export function hasSyntax(book: string): boolean {
  const t = BOOK_MAP[book]?.testament
  return t === 'NT' || t === 'OT'
}

export function useSyntax() {
  const nt = usePackDb(SYNTAX_NT_PACK)
  const ot = usePackDb(SYNTAX_OT_PACK)

  return useCallback(async (book: string, chapter: number, verse: number): Promise<Sentence[]> => {
    if (!hasSyntax(book)) return []
    const db = BOOK_MAP[book].testament === 'NT' ? nt.db : ot.db
    if (db) {
      const rows = await db.getAllAsync<{ id: number; start_ch: number; start_v: number; end_ch: number; end_v: number; rows: string }>(
        `SELECT s.id, s.start_ch, s.start_v, s.end_ch, s.end_v, s.rows FROM syn_verse v JOIN syn_sentence s ON s.id = v.sentence_id
         WHERE v.book = ? AND v.chapter = ? AND v.verse = ? ORDER BY s.id`, [book, chapter, verse])
      return rows.map(r => ({ id: r.id, startCh: r.start_ch, startV: r.start_v, endCh: r.end_ch, endV: r.end_v, rows: JSON.parse(r.rows) }))
    }
    const ch = await fetchOnlineJson<ChapterJson>(`/syntax/${encodeURIComponent(book)}/${chapter}.json`)
    if (!ch) return []
    return (ch.v[String(verse)] ?? []).map(id => {
      const [startCh, startV, endCh, endV, rows] = ch.s[String(id)]
      return { id, startCh, startV, endCh, endV, rows }
    })
  }, [nt.db, ot.db])
}

/** "5:12!27" -> [5, 12] */
export function wordVerse(ref: string): [number, number] {
  const m = /^(\d+):(\d+)/.exec(ref)
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

export const ROLE_LABEL: Record<string, string> = {
  s: 'subject', v: 'verb', o: 'object', o2: 'object', io: 'ind. object', p: 'predicate', vc: 'linking verb',
  adv: 'adverbial', rel: 'relative', aux: 'auxiliary',
}
