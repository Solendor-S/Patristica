import React, { createContext, useContext, useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { openDatabaseAsync } from 'expo-sqlite'
import type { SQLiteDatabase } from 'expo-sqlite'
import { Colors } from '../theme/colors'

async function initUserDb(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      book       TEXT    NOT NULL,
      chapter    INTEGER NOT NULL,
      verse      INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      position   INTEGER,
      UNIQUE(book, chapter, verse)
    );
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      book       TEXT    NOT NULL,
      chapter    INTEGER NOT NULL,
      verse      INTEGER NOT NULL,
      text       TEXT    NOT NULL DEFAULT '',
      updated_at INTEGER NOT NULL,
      UNIQUE(book, chapter, verse)
    );
    CREATE TABLE IF NOT EXISTS highlights (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      book       TEXT    NOT NULL,
      chapter    INTEGER NOT NULL,
      verse      INTEGER NOT NULL,
      color      TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(book, chapter, verse)
    );
    CREATE TABLE IF NOT EXISTS history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      book       TEXT    NOT NULL,
      chapter    INTEGER NOT NULL,
      visited_at INTEGER NOT NULL,
      UNIQUE(book, chapter)
    );
    CREATE TABLE IF NOT EXISTS search_history (
      query TEXT PRIMARY KEY,
      ts    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS installed_packs (
      slug         TEXT PRIMARY KEY,
      version      INTEGER NOT NULL,
      installed_at TEXT    NOT NULL,
      size_mb      REAL
    );
  `)
}

async function migrateUserDb(db: SQLiteDatabase): Promise<void> {
  try {
    await db.execAsync('ALTER TABLE bookmarks ADD COLUMN position INTEGER')
  } catch {
    // column already exists
  }
  await db.execAsync(`
    UPDATE bookmarks SET position = (
      SELECT COUNT(*) FROM bookmarks b2 WHERE b2.created_at > bookmarks.created_at
    ) WHERE position IS NULL
  `)
}

const UserDbContext = createContext<SQLiteDatabase | null>(null)

export function UserDbProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null)

  useEffect(() => {
    openDatabaseAsync('user.db')
      .then(async database => {
        await initUserDb(database)
        try { await migrateUserDb(database) } catch (e) { console.error('DB migration error:', e) }
        setDb(database)
      })
      .catch(console.error)
  }, [])

  if (!db) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    )
  }

  return (
    <UserDbContext.Provider value={db}>
      {children}
    </UserDbContext.Provider>
  )
}

export function useUserDb(): SQLiteDatabase {
  const db = useContext(UserDbContext)
  if (!db) throw new Error('useUserDb must be used within UserDbProvider')
  return db
}
