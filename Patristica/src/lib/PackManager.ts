import { File, Paths, Directory } from 'expo-file-system'
import { openDatabaseAsync } from 'expo-sqlite'
import type { SQLiteDatabase } from 'expo-sqlite'
import BUNDLED_MANIFEST from '../../assets/packs-manifest.json'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PackMeta {
  slug: string
  name: string
  description?: string
  type: 'translation' | 'apocrypha' | 'early_text' | 'greek_source' | 'hebrew_source' | 'commentary'
  translations?: string[]
  book?: string
  group?: string
  downloadUrl: string
  sizeMB: number
  version: number
}

export interface PackManifest {
  version: number
  onlineBaseUrl: string
  packs: PackMeta[]
}

export type DownloadProgress = {
  slug: string
  progress: number  // 0–1
  status: 'downloading' | 'done' | 'error'
  error?: string
}

// ── Manifest (bundled + remote merge) ────────────────────────────────────────

const REMOTE_MANIFEST_URL =
  'https://raw.githubusercontent.com/Solendor-S/Patristica/master/Patristica/data/packs-manifest.json'

let _manifest: PackManifest = BUNDLED_MANIFEST as PackManifest

export function getManifest(): PackManifest {
  return _manifest
}

/** Fetch remote manifest and merge — remote downloadUrl/version take precedence. */
export async function refreshManifest(userDb: SQLiteDatabase): Promise<void> {
  try {
    // Check cache age
    const cacheRow = await userDb.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'pack_manifest_cache'"
    )
    const ageRow = await userDb.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'pack_manifest_updated_at'"
    )
    const cacheAge = ageRow ? Date.now() - parseInt(ageRow.value, 10) : Infinity
    const ONE_DAY = 24 * 60 * 60 * 1000

    // Try fetch if stale or no cache
    if (cacheAge > ONE_DAY) {
      const res = await fetch(REMOTE_MANIFEST_URL, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const remote: PackManifest = await res.json()
        // Merge: start with bundled, override with remote URLs/versions
        const mergedPacks = _manifest.packs.map(local => {
          const remotePack = remote.packs.find(r => r.slug === local.slug)
          return remotePack ? { ...local, downloadUrl: remotePack.downloadUrl, version: remotePack.version } : local
        })
        _manifest = {
          ..._manifest,
          onlineBaseUrl: remote.onlineBaseUrl || _manifest.onlineBaseUrl,
          packs: mergedPacks,
        }
        // Cache
        await userDb.runAsync(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('pack_manifest_cache', ?)",
          [JSON.stringify(remote)]
        )
        await userDb.runAsync(
          "INSERT OR REPLACE INTO settings (key, value) VALUES ('pack_manifest_updated_at', ?)",
          [String(Date.now())]
        )
        return
      }
    }

    // Use cached manifest if available and not stale
    if (cacheRow) {
      const cached: PackManifest = JSON.parse(cacheRow.value)
      const mergedPacks = _manifest.packs.map(local => {
        const cachedPack = cached.packs?.find(r => r.slug === local.slug)
        return cachedPack ? { ...local, downloadUrl: cachedPack.downloadUrl, version: cachedPack.version } : local
      })
      _manifest = {
        ..._manifest,
        onlineBaseUrl: cached.onlineBaseUrl || _manifest.onlineBaseUrl,
        packs: mergedPacks,
      }
    }
  } catch {
    // Offline or fetch failed — use bundled manifest
  }
}

// ── Pack metadata helpers ─────────────────────────────────────────────────────

export function getAllPacks(): PackMeta[] {
  return _manifest.packs
}

export function getOnlineBaseUrl(): string {
  return _manifest.onlineBaseUrl
}

export function packBySlug(slug: string): PackMeta | undefined {
  return _manifest.packs.find(p => p.slug === slug)
}

export function packsForTranslation(translation: string): PackMeta[] {
  return _manifest.packs.filter(p => p.translations?.includes(translation))
}

export function packForBook(type: 'apocrypha' | 'early_text', book: string): PackMeta | undefined {
  return _manifest.packs.find(p => p.type === type && p.book === book)
}

// ── Pack directory ─────────────────────────────────────────────────────────────

function packsDir(): Directory {
  return new Directory(Paths.document, 'packs')
}

function packFilePath(slug: string): File {
  return new File(packsDir(), `${slug}.db`)
}

// ── installed_packs DB helpers ────────────────────────────────────────────────

// Single query — callers derive the Set<string> from keys() when needed
export async function loadInstalledVersionsFromDb(userDb: SQLiteDatabase): Promise<Map<string, number>> {
  const rows = await userDb.getAllAsync<{ slug: string; version: number }>(
    'SELECT slug, version FROM installed_packs'
  )
  return new Map(rows.map(r => [r.slug, r.version]))
}

async function recordInstall(userDb: SQLiteDatabase, slug: string): Promise<void> {
  const meta = packBySlug(slug)
  await userDb.runAsync(
    `INSERT OR REPLACE INTO installed_packs (slug, version, installed_at, size_mb)
     VALUES (?, ?, ?, ?)`,
    [slug, meta?.version ?? 1, new Date().toISOString(), meta?.sizeMB ?? null]
  )
}

async function recordUninstall(userDb: SQLiteDatabase, slug: string): Promise<void> {
  await userDb.runAsync('DELETE FROM installed_packs WHERE slug = ?', [slug])
}

// ── Download ──────────────────────────────────────────────────────────────────

export async function downloadPack(
  slug: string,
  userDb: SQLiteDatabase,
  onProgress?: (p: DownloadProgress) => void,
): Promise<void> {
  const meta = packBySlug(slug)
  if (!meta) throw new Error(`Unknown pack: ${slug}`)
  if (!meta.downloadUrl) throw new Error(`Pack ${slug} has no download URL`)

  const dir = packsDir()
  if (!dir.exists) dir.create()

  const dest = packFilePath(slug)
  onProgress?.({ slug, progress: 0, status: 'downloading' })

  try {
    await File.downloadFileAsync(meta.downloadUrl, dest)
    await recordInstall(userDb, slug)
    onProgress?.({ slug, progress: 1, status: 'done' })
  } catch (e: any) {
    onProgress?.({ slug, progress: 0, status: 'error', error: e?.message ?? String(e) })
    throw e
  }
}

export function isPackDownloaded(slug: string): boolean {
  return packFilePath(slug).exists
}

export async function deletePack(slug: string, userDb: SQLiteDatabase): Promise<void> {
  await closePackDb(slug)   // close first — flushes WAL before file is removed
  const f = packFilePath(slug)
  if (f.exists) f.delete()
  await recordUninstall(userDb, slug)
}

// ── DB access ─────────────────────────────────────────────────────────────────

const _openDbs = new Map<string, SQLiteDatabase>()

export async function openPackDb(slug: string): Promise<SQLiteDatabase | null> {
  if (_openDbs.has(slug)) return _openDbs.get(slug)!
  const f = packFilePath(slug)
  if (!f.exists) return null
  try {
    const db = await openDatabaseAsync(f.uri, { useNewConnection: true })
    // Validate — SQLite opens malformed files without error; queries blow up later
    await db.getFirstAsync('SELECT 1')
    _openDbs.set(slug, db)
    return db
  } catch {
    // Corrupt file: delete it so isInstalled returns false and online fallback kicks in
    try { packFilePath(slug).delete() } catch {}
    _openDbs.delete(slug)
    return null
  }
}

export async function closePackDb(slug: string): Promise<void> {
  const db = _openDbs.get(slug)
  if (db) {
    await db.closeAsync()
    _openDbs.delete(slug)
  }
}

// ── Online fetch ──────────────────────────────────────────────────────────────

export interface OnlineVerse {
  verse: number
  text: string
}

// Pack types that use word tables rather than bible_translations text
export const WORD_SOURCE_PACK_TYPES = new Set(['greek_source', 'hebrew_source'])

export function isWordSourcePack(slug: string): boolean {
  return WORD_SOURCE_PACK_TYPES.has(packBySlug(slug)?.type ?? '')
}

// ── Private fetch helper ──────────────────────────────────────────────────────

/**
 * Online JSON lives under the manifest's base URL, with the hardcoded master-branch
 * URL as a fallback when the manifest points somewhere else. Every online fetcher
 * needs the same pair, so build it once.
 */
function onlineUrls(path: string): { url: string; fallback?: string } {
  const base = _manifest.onlineBaseUrl || ONLINE_FALLBACK_BASE
  return {
    url: base + path,
    fallback: base !== ONLINE_FALLBACK_BASE ? ONLINE_FALLBACK_BASE + path : undefined,
  }
}

async function fetchJson<T>(url: string, fallbackUrl?: string): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) {
      if (fallbackUrl) {
        const res2 = await fetch(fallbackUrl)
        if (!res2.ok) return null
        return (await res2.json()) as T
      }
      return null
    }
    return (await res.json()) as T
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ── Online word study fetch ───────────────────────────────────────────────────

export interface OnlineWord {
  p: number   // position
  t: string   // text (greek or hebrew)
  tr: string  // transliteration
  s: string   // strongs
  g: string   // gloss
  m: string   // morph
}

export async function fetchOnlineWords(
  source: string,
  book: string,
  chapter: number,
  verse: number,
): Promise<OnlineWord[] | null> {
  const { url, fallback } = onlineUrls(`/words/${source}/${encodeURIComponent(book)}/${chapter}.json`)
  const data = await fetchJson<Record<string, OnlineWord[]>>(url, fallback)
  return data?.[String(verse)] ?? null
}

// ── Online commentary fetch ───────────────────────────────────────────────────

export type CommentaryFolder = 'commentary' | 'commentary-legacy'

interface OnlineCommentaryChapter {
  texts: string[]
  entries: Array<{
    v: number; f: string; era: string; e: string; ti: number; s: string; u: string
  }>
}

export interface OnlineCommentaryEntry {
  father_name: string
  father_era: string
  excerpt: string
  full_text: string
  source: string
  source_url: string
  verse: number
}

// Chapter payloads are reused verse-to-verse as the reader moves down a chapter,
// so one fetch serves the whole chapter. Bounded to keep memory flat — the biggest
// chapter (Matthew 5) is ~1.9 MB of JSON.
const _commentaryCache = new Map<string, OnlineCommentaryChapter | null>()
const COMMENTARY_CACHE_MAX = 6

/**
 * Commentary for ONE verse, from the cached chapter payload. Null when offline
 * or the chapter has no file. Only the matching entries are expanded — callers
 * want a single verse, and a big chapter holds hundreds of entries.
 */
export async function fetchOnlineCommentaryVerse(
  folder: CommentaryFolder,
  book: string,
  chapter: number,
  verse: number,
): Promise<OnlineCommentaryEntry[] | null> {
  const key = `${folder}|${book}|${chapter}`
  if (!_commentaryCache.has(key)) {
    const { url, fallback } = onlineUrls(`/${folder}/${encodeURIComponent(book)}/${chapter}.json`)
    const data = await fetchJson<OnlineCommentaryChapter>(url, fallback)
    if (_commentaryCache.size >= COMMENTARY_CACHE_MAX) {
      const oldest = _commentaryCache.keys().next().value
      if (oldest !== undefined) _commentaryCache.delete(oldest)
    }
    _commentaryCache.set(key, data)
  } else {
    // Re-insert on hit so eviction is least-recently-used: without this the
    // chapter currently on screen can be evicted while stale ones survive.
    const hit = _commentaryCache.get(key)!
    _commentaryCache.delete(key)
    _commentaryCache.set(key, hit)
  }
  const cached = _commentaryCache.get(key)
  if (!cached) return null
  return cached.entries
    .filter(e => e.v === verse)
    .map(e => ({
      father_name: e.f,
      father_era: e.era,
      excerpt: e.e,
      full_text: cached.texts[e.ti] ?? '',
      source: e.s,
      source_url: e.u,
      verse: e.v,
    }))
}

/**
 * Fetch a full chapter of word-table data and reconstruct verse texts.
 * Used for SBLGNT/TAGNT/TAHOT reader display in online mode.
 * Returns BibleVerse-shaped objects where text = Greek/Hebrew words joined by spaces.
 */
export async function fetchOnlineWordsAsChapter(
  packSlug: string,
  book: string,
  chapter: number,
  annotated = false,
): Promise<Array<{ book: string; chapter: number; verse: number; text: string }> | null> {
  const { url, fallback } = onlineUrls(`/words/${packSlug}/${encodeURIComponent(book)}/${chapter}.json`)
  const data = await fetchJson<Record<string, Array<{ t: string; s?: string }>>>(url, fallback)
  return data ? reconstructVerses(data, book, chapter, annotated) : null
}

function reconstructVerses(
  data: Record<string, Array<{ t: string; s?: string }>>,
  book: string,
  chapter: number,
  annotated = false,
): Array<{ book: string; chapter: number; verse: number; text: string }> {
  return Object.entries(data).map(([v, words]) => ({
    book, chapter,
    verse: parseInt(v, 10),
    // annotated = true (LXX+): include Strongs so parseKJVPlus can tag each word
    text: words.map(w => annotated && w.s ? `${w.t} ${w.s}` : w.t).join(' '),
  })).sort((a, b) => a.verse - b.verse)
}

// Fallback base URL — used if manifest hasn't refreshed yet (branch is master, not main)
const ONLINE_FALLBACK_BASE =
  'https://raw.githubusercontent.com/Solendor-S/Patristica/master/Patristica/data/online'

export async function fetchOnlineChapter(
  slug: string,   // pack slug OR folder name ('apoc', 'early', translation slug)
  book: string,
  chapter: number,
): Promise<OnlineVerse[] | null> {
  const meta = packBySlug(slug)
  const folder = meta?.type === 'apocrypha' ? 'apoc'
    : meta?.type === 'early_text' ? 'early'
    : slug
  // BSB's online tree stores Psalms under "Psalm" (from its source VerseId); the app uses "Psalms".
  const bookForPath = slug === 'bsb' && book === 'Psalms' ? 'Psalm' : book
  const { url, fallback } = onlineUrls(`/${folder}/${encodeURIComponent(bookForPath)}/${chapter}.json`)
  return fetchJson<OnlineVerse[]>(url, fallback)
}
