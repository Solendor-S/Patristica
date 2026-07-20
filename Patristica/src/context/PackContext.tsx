import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { SQLiteDatabase } from 'expo-sqlite'
import { useUserDb } from '../db/UserDbProvider'
import {
  getAllPacks, packBySlug, PackMeta, DownloadProgress,
  isPackDownloaded, downloadPack, deletePack,
  openPackDb, closePackDb, fetchOnlineChapter, OnlineVerse,
  packsForTranslation, packForBook,
  loadInstalledVersionsFromDb, refreshManifest,
} from '../lib/PackManager'

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
