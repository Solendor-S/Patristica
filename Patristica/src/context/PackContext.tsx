import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { SQLiteDatabase } from 'expo-sqlite'
import { useUserDb } from '../db/UserDbProvider'
import {
  getAllPacks, packBySlug, PackMeta, DownloadProgress,
  isPackDownloaded, downloadPack, deletePack,
  openPackDb, closePackDb, fetchOnlineChapter, OnlineVerse,
  packsForTranslation, packForBook,
  loadInstalledVersionsFromDb, refreshManifest,
  fetchOnlineCommentaryVerse,
} from '../lib/PackManager'
import { getCommentaryFromDb } from '../db/queries'
import type { CommentarySource } from '../db/queries'
import type { CommentaryEntry } from '../types'

// ── Context value ─────────────────────────────────────────────────────────────

interface PackContextValue {
  installed: Set<string>
  downloading: Map<string, number>
  updatesAvailable: Set<string>
  /** True once the installed-pack set is known (local DB + disk scan, no network). */
  installedReady: boolean
  manifestReady: boolean
  download: (slug: string) => Promise<void>
  uninstall: (slug: string) => void
  isInstalled: (slug: string) => boolean
  isDownloading: (slug: string) => boolean
  hasUpdate: (slug: string) => boolean
  getPackDb: (slug: string) => Promise<SQLiteDatabase | null>
  fetchOnline: (slug: string, book: string, chapter: number) => Promise<OnlineVerse[] | null>
  packForTranslation: (translation: string) => PackMeta | undefined
  packForContent: (type: 'apocrypha' | 'early_text', book: string) => PackMeta | undefined
  allPacks: PackMeta[]
}

const PackContext = createContext<PackContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function PackProvider({ children }: { children: React.ReactNode }) {
  const userDb = useUserDb()
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState<Map<string, number>>(new Map())
  const [updatesAvailable, setUpdatesAvailable] = useState<Set<string>>(new Set())
  const [installedReady, setInstalledReady] = useState(false)
  const [manifestReady, setManifestReady] = useState(false)

  // On mount: load installed packs from DB, then refresh manifest and check for updates
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      // Single DB read — derive Set<slug> from version map keys, merge with disk scan
      const installedVersions = await loadInstalledVersionsFromDb(userDb)
      const fromDisk = new Set(getAllPacks().map(p => p.slug).filter(isPackDownloaded))
      const merged = new Set([...installedVersions.keys(), ...fromDisk])
      // Publish install state before the (network) manifest refresh — readers gate on this,
      // so it must not wait on the network.
      if (!cancelled) { setInstalled(merged); setInstalledReady(true) }

      // Refresh manifest from GitHub (updates download URLs + versions)
      await refreshManifest(userDb)
      const updates = new Set<string>()
      for (const [slug, installedVer] of installedVersions) {
        const meta = getAllPacks().find(p => p.slug === slug)
        if (meta && meta.version > installedVer) {
          updates.add(slug)
        }
      }
      if (!cancelled) {
        setUpdatesAvailable(updates)
        setManifestReady(true)
      }
    }
    // On failure still release the gates, so readers fall back rather than hang loading.
    init().catch(() => { if (!cancelled) { setInstalledReady(true); setManifestReady(true) } })
    return () => { cancelled = true }
  }, [userDb])

  const download = useCallback(async (slug: string) => {
    if (downloading.has(slug)) return

    setDownloading(prev => new Map(prev).set(slug, 0))

    try {
      await downloadPack(slug, userDb, ({ progress, status }) => {
        if (status === 'downloading') {
          setDownloading(prev => new Map(prev).set(slug, progress))
        } else if (status === 'done') {
          setDownloading(prev => { const m = new Map(prev); m.delete(slug); return m })
          setInstalled(prev => new Set(prev).add(slug))
          setUpdatesAvailable(prev => { const s = new Set(prev); s.delete(slug); return s })
        } else {
          setDownloading(prev => { const m = new Map(prev); m.delete(slug); return m })
        }
      })
    } catch {
      setDownloading(prev => { const m = new Map(prev); m.delete(slug); return m })
    }
  }, [installed, downloading, userDb])

  const uninstall = useCallback((slug: string) => {
    deletePack(slug, userDb).catch(() => {})
    setInstalled(prev => { const s = new Set(prev); s.delete(slug); return s })
  }, [userDb])

  const isInstalled = useCallback((slug: string) => installed.has(slug), [installed])
  const isDownloading = useCallback((slug: string) => downloading.has(slug), [downloading])
  const hasUpdate = useCallback((slug: string) => updatesAvailable.has(slug), [updatesAvailable])
  const getPackDb = useCallback((slug: string) => openPackDb(slug), [])
  const fetchOnline = useCallback(fetchOnlineChapter, [])

  const packForTranslation = useCallback((translation: string) =>
    packsForTranslation(translation)[0], [])

  const packForContent = useCallback((type: 'apocrypha' | 'early_text', book: string) =>
    packForBook(type, book), [])

  return (
    <PackContext.Provider value={{
      installed, downloading, updatesAvailable, installedReady, manifestReady,
      download, uninstall,
      isInstalled, isDownloading, hasUpdate,
      getPackDb, fetchOnline,
      packForTranslation, packForContent,
      allPacks: getAllPacks(),
    }}>
      {children}
    </PackContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePacks() {
  const ctx = useContext(PackContext)
  if (!ctx) throw new Error('usePacks requires PackProvider')
  return ctx
}

// ── Commentary packs ──────────────────────────────────────────────────────────

export const COMMENTARY_FATHERS_PACK = 'commentary-fathers'
export const COMMENTARY_LEGACY_PACK = 'commentary-legacy'

/**
 * Open handles for the two commentary packs, or null where a pack isn't installed.
 * Commentary is no longer in the core DB, so every commentary query needs these.
 * A null handle is not an error — the caller falls back to the online JSON.
 */
export function useCommentaryDbs() {
  const { isInstalled, installedReady, getPackDb } = usePacks()
  const [dbs, setDbs] = useState<{
    fathers: SQLiteDatabase | null
    legacy: SQLiteDatabase | null
  }>({ fathers: null, legacy: null })

  const hasFathers = isInstalled(COMMENTARY_FATHERS_PACK)
  const hasLegacy = isInstalled(COMMENTARY_LEGACY_PACK)

  useEffect(() => {
    if (!installedReady) return
    let cancelled = false
    Promise.all([
      hasFathers ? getPackDb(COMMENTARY_FATHERS_PACK) : Promise.resolve(null),
      hasLegacy ? getPackDb(COMMENTARY_LEGACY_PACK) : Promise.resolve(null),
    ]).then(([fathers, legacy]) => {
      if (!cancelled) setDbs({ fathers, legacy })
    })
    return () => { cancelled = true }
  }, [hasFathers, hasLegacy, installedReady, getPackDb])

  return { ...dbs, hasFathers, hasLegacy }
}

/**
 * Verse commentary for ONE corpus, from whichever source is available:
 * installed pack first, otherwise the online per-chapter JSON — the same
 * pack-or-online arrangement translations and early texts already use.
 * Packs stay optional; they just make it work offline and faster.
 */
export function useCommentary() {
  const { fathers, legacy, hasFathers, hasLegacy } = useCommentaryDbs()

  const load = useCallback(async (
    book: string,
    chapter: number,
    verse: number,
    source: CommentarySource,
  ): Promise<{ entries: CommentaryEntry[]; offline: boolean }> => {
    // The two corpora are separate packs and the UI shows one at a time, so only
    // the selected source is queried — the results are never merged, which is why
    // online rows can just be numbered from zero without colliding with pack ids.
    const db = source === 'fathers' ? fathers : legacy
    if (db) {
      return { entries: await getCommentaryFromDb(db, source, book, chapter, verse), offline: false }
    }

    const folder = source === 'fathers' ? 'commentary' : 'commentary-legacy'
    const rows = await fetchOnlineCommentaryVerse(folder, book, chapter, verse)
    // null means the fetch failed — a different empty state from "this verse
    // genuinely has no commentary".
    if (rows === null) return { entries: [], offline: true }

    return {
      entries: rows.map((r, i) => ({
        id: i,
        father_name: r.father_name,
        father_era: r.father_era,
        excerpt: r.excerpt,
        full_text: r.full_text,
        source: r.source,
        source_url: r.source_url,
      })),
      offline: false,
    }
  }, [fathers, legacy])

  // `fathers` is exposed for the pack-only features (corpus-wide search and
  // browse-by-father), which per-chapter online JSON cannot serve.
  return { load, fathers, hasFathers, hasLegacy }
}
