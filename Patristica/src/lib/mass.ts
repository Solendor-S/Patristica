import type { SQLiteDatabase } from 'expo-sqlite'
import { fetchOnlineJson } from './PackManager'
import type { Seg } from './passage'

// Daily Mass data, built by scripts/mass/build_no.py (Novus Ordo, per national calendar) and
// scripts/mass/build_tlm.py (1962 Missal propers). Fetched once per year/month file and kept in
// user.db (mass_cache) so a day that has been opened works offline.

export type MassRite = 'no' | 'tlm'
export type MassCalendar = 'VA' | 'US' | 'CA' | 'AU' | 'EW' | 'IE'

export const MASS_CALENDARS: { key: MassCalendar; label: string }[] = [
  { key: 'VA', label: 'General Roman Calendar' },
  { key: 'AU', label: 'Australia' },
  { key: 'CA', label: 'Canada' },
  { key: 'EW', label: 'England & Wales' },
  { key: 'IE', label: 'Ireland' },
  { key: 'US', label: 'United States' },
]

export interface NoReading { label: string; cite: string; alts: Seg[][] }
export interface NoMass { label: string; readings: NoReading[] | null }
export interface NoDay {
  title: string
  grade: number
  color: string[]
  season: string
  masses: NoMass[]
  optional: { title: string; readings: NoReading[] | null }[]
}
export interface TlmSection { id: string; label: string; en: string; la: string }
export interface TlmMass { title: string; rank: number | null; colors: string[]; commemorations: string[]; sections: TlmSection[] }

export const GRADE_LABEL: Record<number, string> = {
  0: 'Weekday', 1: 'Commemoration', 2: 'Optional Memorial', 3: 'Memorial', 4: 'Feast', 5: 'Feast of the Lord', 6: 'Solemnity', 7: 'Solemnity',
}

/** Liturgical colour name -> swatch. TLM uses single letters (v = violet, r, w, g, b, p = rose). */
export const LITURGICAL_COLOR: Record<string, string> = {
  green: '#2e7d32', g: '#2e7d32', purple: '#6a1b9a', violet: '#6a1b9a', v: '#6a1b9a', white: '#d8d2c0', w: '#d8d2c0',
  red: '#c62828', r: '#c62828', rose: '#e91e63', pink: '#e91e63', p: '#e91e63', black: '#212121', b: '#212121', gold: '#c9a227',
}

export function isoDate(d: Date): string {
  const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate()
  return `${y}-${m < 10 ? '0' : ''}${m}-${day < 10 ? '0' : ''}${day}`
}

async function cached<T>(userDb: SQLiteDatabase, path: string): Promise<T | null> {
  const row = await userDb.getFirstAsync<{ json: string }>('SELECT json FROM mass_cache WHERE key = ?', [path]).catch(() => null)
  if (row) return JSON.parse(row.json) as T
  const data = await fetchOnlineJson<T>(path, false)
  if (data) {
    await userDb.runAsync('INSERT OR REPLACE INTO mass_cache (key, json, fetched_at) VALUES (?, ?, ?)',
      [path, JSON.stringify(data), Date.now()]).catch(() => {})
  }
  return data
}

/** Novus Ordo day, or null when offline with nothing cached / outside the built years. */
export async function getNoDay(userDb: SQLiteDatabase, cal: MassCalendar, date: string): Promise<NoDay | null> {
  const year = await cached<Record<string, NoDay>>(userDb, `/mass/no/${cal}/${date.slice(0, 4)}.json`)
  return year?.[date] ?? null
}

/** 1962 Missal Masses for a day (usually one; some days have several). */
export async function getTlmDay(userDb: SQLiteDatabase, date: string): Promise<TlmMass[] | null> {
  const month = await cached<Record<string, TlmMass[]>>(userDb, `/mass/tlm/${date.slice(0, 4)}/${date.slice(5, 7)}.json`)
  return month?.[date] ?? null
}

/** The Gospel ranges of a Novus Ordo day (default alternative of each Mass), for the Fathers footer. */
export function noGospels(day: NoDay): Seg[] {
  const out: Seg[] = []
  for (const m of day.masses) for (const r of m.readings ?? []) if (r.label === 'Gospel' && r.alts[0]) out.push(...r.alts[0])
  return out
}

/** Gospel reference in a 1962 Gospel section, e.g. "*Matt 21:1-9*" -> first verse. */
export function tlmGospelRef(m: TlmMass): { book: string; chapter: number; verse: number } | null {
  const g = m.sections.find(s => s.id === 'Evangelium')
  const hit = g && /\*\s*(Matt|Mark|Luke|John|Joann|Matth|Marc|Luc)\w*\.?\s+(\d+):(\d+)/i.exec(g.en)
  if (!hit) return null
  const b = hit[1].toLowerCase()
  const book = b.startsWith('matt') ? 'Matthew' : b.startsWith('mar') ? 'Mark' : b.startsWith('lu') ? 'Luke' : 'John'
  return { book, chapter: Number(hit[2]), verse: Number(hit[3]) }
}
