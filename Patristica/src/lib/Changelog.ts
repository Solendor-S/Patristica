import type { SQLiteDatabase } from 'expo-sqlite'

/**
 * Changelog is hosted on master rather than bundled, so release notes can be
 * published (or corrected) without shipping an app update. The last successful
 * fetch is cached in user.db, so it still renders offline once seen.
 */

const CHANGELOG_URL =
  'https://raw.githubusercontent.com/Solendor-S/Patristica/master/Patristica/data/changelog.json'

const CACHE_KEY = 'changelog_cache'
const CACHE_AT_KEY = 'changelog_updated_at'
const ONE_DAY = 24 * 60 * 60 * 1000

export interface Release {
  /**
   * Unique per announcement, and what the "What's new" notice tracks.
   * Deliberately NOT the app version: this project uses
   * `runtimeVersion: { policy: "appVersion" }`, so an OTA update must keep the
   * same app version or existing installs stop matching and never receive it.
   * Keying on the entry means an OTA release can announce itself by publishing a
   * new entry (e.g. id "1.0.7-1" with version still "1.0.7").
   */
  id: string
  version: string
  date: string
  title?: string
  /** Optional badge, e.g. "Update" for an over-the-air release. */
  label?: string
  changes: string[]
}

export interface Changelog {
  version: number
  releases: Release[]
}

async function readCache(db: SQLiteDatabase): Promise<Changelog | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', [CACHE_KEY])
  if (!row) return null
  try {
    return JSON.parse(row.value) as Changelog
  } catch {
    return null
  }
}

/**
 * Cached changelog, refreshed from master at most once a day.
 * Returns null only when there's no cache AND the fetch failed — i.e. a first
 * run with no connection.
 */
export async function loadChangelog(db: SQLiteDatabase): Promise<Changelog | null> {
  const ageRow = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', [CACHE_AT_KEY])
  const age = ageRow ? Date.now() - parseInt(ageRow.value, 10) : Infinity

  if (age <= ONE_DAY) {
    const cached = await readCache(db)
    if (cached) return cached
  }

  try {
    const res = await fetch(CHANGELOG_URL, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data = (await res.json()) as Changelog
      if (Array.isArray(data?.releases)) {
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [CACHE_KEY, JSON.stringify(data)])
        await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [CACHE_AT_KEY, String(Date.now())])
        return data
      }
    }
  } catch {
    // offline or malformed — fall through to whatever was cached
  }
  return readCache(db)
}

// ── Version filtering ─────────────────────────────────────────────────────────

/** Numeric compare of dotted versions: -1 / 0 / 1. Non-numeric parts count as 0. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.')
  const pb = b.split('.')
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = parseInt(pa[i] ?? '0', 10) || 0
    const nb = parseInt(pb[i] ?? '0', 10) || 0
    if (na !== nb) return na < nb ? -1 : 1
  }
  return 0
}

/**
 * Releases the running app actually has.
 *
 * The changelog is fetched remotely by every install, so without this a user
 * still on 1.0.7 would be shown 1.0.8's notes the moment they're published.
 * OTA entries keep the current version (they must — see the appVersion runtime
 * policy), so they pass this filter and still appear.
 */
export function releasesFor(releases: Release[], currentVersion: string): Release[] {
  if (!currentVersion) return releases
  return releases.filter(r => compareVersions(r.version, currentVersion) <= 0)
}

// ── "What's new" gate ─────────────────────────────────────────────────────────

const LAST_SEEN_KEY = 'changelog_last_seen_id'

/**
 * The newest release to announce, or null when there's nothing to say.
 * Works for over-the-air updates as well as store releases, because it compares
 * the newest published entry id rather than the app version (which OTA cannot
 * change under the appVersion runtime policy).
 *
 * Null on a fresh install: the newest id is seeded silently, so a first launch
 * never opens with notes for a release the user was never on.
 */
export async function pendingRelease(
  db: SQLiteDatabase,
  currentVersion: string,
): Promise<Release | null> {
  const log = await loadChangelog(db)
  if (!log) return null
  // only announce what this install actually has
  const newest = releasesFor(log.releases, currentVersion)[0]
  if (!newest) return null

  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', [LAST_SEEN_KEY])

  if (!row) {
    await markChangelogSeen(db, newest.id)
    return null
  }
  return row.value === newest.id ? null : newest
}

export async function markChangelogSeen(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [LAST_SEEN_KEY, id])
}
