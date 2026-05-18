import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

export type StartupModeKey = 'default' | 'resume'

const STARTUP_MODE_KEY = 'startup_mode'

export const STARTUP_MODE_OPTIONS: { key: StartupModeKey; label: string; description: string }[] = [
  { key: 'default', label: 'John 1',          description: 'Always opens at John 1'           },
  { key: 'resume',  label: 'Resume reading',   description: 'Continues where you left off'     },
]

interface StartupModeContextValue {
  startupMode: StartupModeKey
  setStartupMode: (mode: StartupModeKey) => void
  startBook: string
  startChapter: number
  resolved: boolean
}

const StartupModeContext = createContext<StartupModeContextValue>({
  startupMode: 'default',
  setStartupMode: () => {},
  startBook: 'John',
  startChapter: 1,
  resolved: false,
})

export function StartupModeProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [startupMode, setStartupModeState] = useState<StartupModeKey>('default')
  const [startBook, setStartBook]         = useState('John')
  const [startChapter, setStartChapter]   = useState(1)
  const [resolved, setResolved]           = useState(false)

  useEffect(() => {
    let active = true
    async function resolve() {
      const modeRow = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = '${STARTUP_MODE_KEY}'`
      )
      if (!active) return
      const mode: StartupModeKey =
        modeRow?.value === 'resume' ? 'resume' : 'default'
      setStartupModeState(mode)

      if (mode === 'resume') {
        const histRow = await db.getFirstAsync<{ book: string; chapter: number }>(
          'SELECT book, chapter FROM history ORDER BY visited_at DESC LIMIT 1'
        )
        if (!active) return
        if (histRow) {
          setStartBook(histRow.book)
          setStartChapter(histRow.chapter)
        }
      }

      setResolved(true)
    }
    resolve().catch(console.error)
    return () => { active = false }
  }, [db])

  const setStartupMode = useCallback((mode: StartupModeKey) => {
    setStartupModeState(mode)
    db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('${STARTUP_MODE_KEY}', ?)`,
      [mode]
    ).catch(console.error)
  }, [db])

  const value = useMemo<StartupModeContextValue>(
    () => ({ startupMode, setStartupMode, startBook, startChapter, resolved }),
    [startupMode, setStartupMode, startBook, startChapter, resolved]
  )

  return (
    <StartupModeContext.Provider value={value}>
      {children}
    </StartupModeContext.Provider>
  )
}

export function useStartupMode(): StartupModeContextValue {
  return useContext(StartupModeContext)
}
