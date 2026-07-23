import React, { Component, Suspense, useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { SQLiteProvider } from 'expo-sqlite'
import type { SQLiteDatabase } from 'expo-sqlite'
import { File, Directory, Paths } from 'expo-file-system'
import { Colors } from '../theme/colors'

// Bump this number whenever the bundled bible.db gains new tables/data
const DB_SCHEMA_VERSION = 69

async function checkAndResetIfNeeded(): Promise<void> {
  const versionFile = new File(Paths.document, 'db_schema_version.txt')
  let currentVersion = 0
  if (versionFile.exists) {
    try {
      const txt = await versionFile.text()
      currentVersion = parseInt(txt.trim(), 10) || 0
    } catch {}
  }

  if (currentVersion >= DB_SCHEMA_VERSION) return

  // Delete version file FIRST so a failed asset copy doesn't strand us at the new version
  try { if (versionFile.exists) versionFile.delete() } catch {}

  // Delete DB + WAL + SHM so SQLiteProvider copies the asset fresh on next open
  const sqliteDir = new Directory(Paths.document, 'SQLite')
  for (const name of ['bible.db', 'bible.db-wal', 'bible.db-shm']) {
    try {
      const f = new File(sqliteDir, name)
      if (f.exists) f.delete()
    } catch {}
  }
}

async function initDb(db: SQLiteDatabase) {
  // Guard: if bible_verses is absent the asset copy failed and this is an empty DB.
  // Throwing here keeps the version file unwritten so the next launch retries the copy.
  const check = await db.getFirstAsync<{ n: number }>(
    "SELECT count(*) as n FROM sqlite_master WHERE type='table' AND name='bible_verses'"
  )
  if (!check?.n) throw new Error('Asset copy failed — bible_verses missing')

  try { await db.execAsync('ALTER TABLE greek_words ADD COLUMN morph TEXT') } catch {}
  try { await db.execAsync('ALTER TABLE hebrew_words ADD COLUMN morph TEXT') } catch {}
  try { await db.execAsync('ALTER TABLE greek_words ADD COLUMN greek_norm TEXT') } catch {}
  try { await db.execAsync('ALTER TABLE lxx_words ADD COLUMN greek_norm TEXT') } catch {}
  try { await db.execAsync('ALTER TABLE hebrew_words ADD COLUMN hebrew_norm TEXT') } catch {}

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS lxx_apostolic_words (
      book      TEXT    NOT NULL,
      chapter   INTEGER NOT NULL,
      verse     INTEGER NOT NULL,
      position  INTEGER NOT NULL,
      greek     TEXT    NOT NULL,
      translit  TEXT,
      strongs   TEXT,
      gloss     TEXT,
      morph     TEXT,
      greek_norm TEXT,
      PRIMARY KEY (book, chapter, verse, position)
    )
  `)

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS wlc_words (
      book     TEXT    NOT NULL,
      chapter  INTEGER NOT NULL,
      verse    INTEGER NOT NULL,
      position INTEGER NOT NULL,
      hebrew   TEXT    NOT NULL,
      translit TEXT,
      strongs  TEXT,
      gloss    TEXT,
      morph    TEXT,
      PRIMARY KEY (book, chapter, verse, position)
    )
  `)

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dss_words (
      book     TEXT    NOT NULL,
      chapter  INTEGER NOT NULL,
      verse    INTEGER NOT NULL,
      position INTEGER NOT NULL,
      hebrew   TEXT    NOT NULL,
      translit TEXT,
      strongs  TEXT,
      gloss    TEXT,
      morph    TEXT,
      PRIMARY KEY (book, chapter, verse, position)
    )
  `)

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS lxx_words (
      book     TEXT    NOT NULL,
      chapter  INTEGER NOT NULL,
      verse    INTEGER NOT NULL,
      position INTEGER NOT NULL,
      greek    TEXT    NOT NULL,
      translit TEXT,
      strongs  TEXT,
      gloss    TEXT,
      morph    TEXT,
      PRIMARY KEY (book, chapter, verse, position)
    )
  `)

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS early_texts (
      book    TEXT    NOT NULL,
      chapter INTEGER NOT NULL,
      verse   INTEGER NOT NULL,
      text    TEXT    NOT NULL,
      PRIMARY KEY (book, chapter, verse)
    )
  `)

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS early_text_footnotes (
      book    TEXT    NOT NULL,
      chapter INTEGER NOT NULL,
      marker  INTEGER NOT NULL,
      note    TEXT    NOT NULL,
      PRIMARY KEY (book, chapter, marker)
    )
  `)

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS early_text_refs (
      id          INTEGER PRIMARY KEY,
      book        TEXT    NOT NULL,
      chapter     INTEGER NOT NULL,
      verse       INTEGER NOT NULL,
      ref_book    TEXT    NOT NULL,
      ref_chapter INTEGER NOT NULL,
      ref_verse   INTEGER NOT NULL,
      ref_type    TEXT    NOT NULL
    )
  `)
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_etr_source ON early_text_refs(book, chapter, verse)')
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_etr_target ON early_text_refs(ref_book, ref_chapter, ref_verse)')

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS psalm_headings (
      chapter  INTEGER PRIMARY KEY,
      heading  TEXT NOT NULL
    )
  `)

  // User tables (bookmarks, notes, highlights, history, search_history, settings)
  // are now in user.db (UserDbProvider) — bible.db is read-only Bible content only.

  // Mark schema version in filesystem (not in SQLite, to avoid WAL conflicts on reset)
  const versionFile = new File(Paths.document, 'db_schema_version.txt')
  versionFile.write(String(DB_SCHEMA_VERSION))
}

function Loading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accent} />
      <Text style={styles.text}>Loading Bible database…</Text>
    </View>
  )
}

class DbErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.errorTitle}>Database load failed</Text>
          <Text style={styles.errorBody}>Force-close and reopen the app to retry.</Text>
        </View>
      )
    }
    return this.props.children
  }
}

interface Props {
  children: React.ReactNode
}

export function DatabaseProvider({ children }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    checkAndResetIfNeeded().finally(() => setReady(true))
  }, [])

  if (!ready) return <Loading />

  return (
    <DbErrorBoundary>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider
          databaseName="bible.db"
          assetSource={{ assetId: require('../../assets/db/bible.db') }}
          onInit={initDb}
          useSuspense
        >
          {children}
        </SQLiteProvider>
      </Suspense>
    </DbErrorBoundary>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  errorTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorBody: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})
