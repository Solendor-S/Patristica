import { useCallback } from 'react'
import { usePackDb } from '../context/PackContext'
import { fetchOnlineJson } from './PackManager'

// People & Places: STEPBible TIPNR (CC BY 4.0) + OpenBible.info coordinates (CC BY 4.0)
// + our deuterocanon curation. Pack `people` (scripts/people/build_people.py) or online JSON.

export const PEOPLE_PACK = 'people'

export type EntityKind = 'person' | 'place' | 'other'
export interface EntitySummary { id: number; name: string; kind: EntityKind; brief: string; refCount?: number }
export interface EntityRelation { rel: string; id: number; name: string }
export interface EntityProfile extends EntitySummary {
  uid: string
  short: string
  gender: string | null
  lat: number | null
  lng: number | null
  names: [string, string][]          // [form, strongs]
  refs: [string, number, number][]   // [book, chapter, verse]
  rel: EntityRelation[]
}

type ChapterJson = Record<string, [number, string, EntityKind, string][]>
type ProfileJson = Omit<EntityProfile, 'rel'> & { rel: [string, number, string][] }

let _index: Promise<EntitySummary[]> | null = null

export function usePeople() {
  const { db } = usePackDb(PEOPLE_PACK)

  const forVerse = useCallback(async (book: string, chapter: number, verse: number): Promise<EntitySummary[]> => {
    if (db) {
      return db.getAllAsync<EntitySummary>(
        `SELECT e.id, e.name, e.kind, e.brief, e.ref_count AS refCount FROM pn_ref r JOIN pn_entity e ON e.id = r.entity_id
         WHERE r.book = ? AND r.chapter = ? AND r.verse = ? ORDER BY e.kind, e.name`, [book, chapter, verse])
    }
    const ch = await fetchOnlineJson<ChapterJson>(`/people/ch/${encodeURIComponent(book)}/${chapter}.json`)
    return (ch?.[String(verse)] ?? []).map(([id, name, kind, brief]) => ({ id, name, kind, brief }))
  }, [db])

  /** Every entity named anywhere in a chapter (for the map's places mode). */
  const forChapter = useCallback(async (book: string, chapter: number): Promise<EntitySummary[]> => {
    if (db) {
      return db.getAllAsync<EntitySummary>(
        `SELECT DISTINCT e.id, e.name, e.kind, e.brief FROM pn_ref r JOIN pn_entity e ON e.id = r.entity_id
         WHERE r.book = ? AND r.chapter = ? ORDER BY e.name`, [book, chapter])
    }
    const ch = await fetchOnlineJson<ChapterJson>(`/people/ch/${encodeURIComponent(book)}/${chapter}.json`)
    const seen = new Map<number, EntitySummary>()
    for (const list of Object.values(ch ?? {})) for (const [id, name, kind, brief] of list) seen.set(id, { id, name, kind, brief })
    return [...seen.values()]
  }, [db])

  const profile = useCallback(async (id: number): Promise<EntityProfile | null> => {
    if (db) {
      const e = await db.getFirstAsync<EntityProfile & { refCount: number }>(
        'SELECT id, uid, name, kind, brief, short, gender, lat, lng, ref_count AS refCount FROM pn_entity WHERE id = ?', [id])
      if (!e) return null
      const [names, refs, rel] = await Promise.all([
        db.getAllAsync<{ form: string; strongs: string }>('SELECT form, strongs FROM pn_name WHERE entity_id = ?', [id]),
        db.getAllAsync<{ book: string; chapter: number; verse: number }>(
          'SELECT book, chapter, verse FROM pn_ref WHERE entity_id = ? ORDER BY rowid', [id]),
        db.getAllAsync<EntityRelation>(
          'SELECT r.rel, e.id, e.name FROM pn_rel r JOIN pn_entity e ON e.id = r.other_id WHERE r.entity_id = ?', [id]),
      ])
      return { ...e, names: names.map(n => [n.form, n.strongs]), refs: refs.map(r => [r.book, r.chapter, r.verse]), rel }
    }
    const p = await fetchOnlineJson<ProfileJson>(`/people/e/${id}.json`, false)
    return p ? { ...p, rel: p.rel.map(([rel, rid, name]) => ({ rel, id: rid, name })) } : null
  }, [db])

  /** All entities, for search / A–Z browse. */
  const index = useCallback((): Promise<EntitySummary[]> => {
    // cache the in-flight promise (concurrent callers share one load); a failed online load isn't kept
    _index ??= (db
      ? db.getAllAsync<EntitySummary>('SELECT id, name, kind, brief, ref_count AS refCount FROM pn_entity ORDER BY name')
      : fetchOnlineJson<[number, string, EntityKind, string, number][]>('/people/index.json', false).then(rows => {
          if (!rows) { _index = null; return [] }
          return rows.map(([id, name, kind, brief, refCount]) => ({ id, name, kind, brief, refCount }))
        }))
    return _index
  }, [db])

  /** The entity a Strong's-tagged name in a verse refers to (disambiguated by the verse). */
  const byStrongs = useCallback(async (strongs: string, book: string, chapter: number, verse: number): Promise<EntitySummary | null> => {
    const list = await forVerse(book, chapter, verse)
    if (!list.length) return null
    const want = strongs.toUpperCase().replace(/^([GH])0+/, '$1')
    if (db) {
      // strongs are stored normalised at build time (H85, H1008G), so no UPPER() needed
      const hit = await db.getFirstAsync<{ id: number }>(
        `SELECT entity_id AS id FROM pn_name WHERE entity_id IN (${list.map(() => '?').join(',')})
         AND (strongs = ? OR strongs LIKE ? || '_') LIMIT 1`, [...list.map(e => e.id), want, want])
      return list.find(e => e.id === hit?.id) ?? null
    }
    const profiles = await Promise.all(list.map(e => profile(e.id)))
    const i = profiles.findIndex(p => p?.names.some(([, s]) => s && s.replace(/[A-Z]$/, '') === want))
    return i >= 0 ? list[i] : null
  }, [db, forVerse, profile])

  return { forVerse, forChapter, profile, index, byStrongs }
}
