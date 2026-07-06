import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

interface ContextValue {
  readingMode: boolean
  toggleReadingMode: () => void
}

const ReadingModeContext = createContext<ContextValue | null>(null)

export function ReadingModeProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [readingMode, setOn] = useState(false)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'reading_mode'"
    ).then(row => {
      if (row) setOn(row.value === '1')
    }).catch(() => {})
  }, [])

  const toggleReadingMode = useCallback(() => {
    setOn(prev => {
      const next = !prev
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('reading_mode', ?)",
        [next ? '1' : '0']
      ).catch(() => {})
      return next
    })
  }, [db])

  return (
    <ReadingModeContext.Provider value={{ readingMode, toggleReadingMode }}>
      {children}
    </ReadingModeContext.Provider>
  )
}

export function useReadingMode() {
  const ctx = useContext(ReadingModeContext)
  if (!ctx) throw new Error('useReadingMode requires ReadingModeProvider')
  return ctx
}
