import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'
import { TRANSLATIONS, type Translation } from './TranslationContext'

// apiOnly excluded: the parallel column reads local SQLite directly, so an API-only
// translation restored from storage would silently render an empty column.
const VALID_TRANSLATIONS = new Set<string>(TRANSLATIONS.filter(t => !t.apiOnly).map(t => t.key))

interface ContextValue {
  compareTrans: Translation | null
  parallelOn: boolean
  setCompareTrans: (t: Translation | null) => void
  setParallelOn: (v: boolean | ((prev: boolean) => boolean)) => void
}

const ParallelTranslationContext = createContext<ContextValue>({
  compareTrans: null,
  parallelOn: false,
  setCompareTrans: () => {},
  setParallelOn: () => {},
})

export function ParallelTranslationProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [compareTrans, setCompareTransState] = useState<Translation | null>(null)
  const [parallelOn, setParallelOnState] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'parallel_translation'"),
      db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'parallel_on'"),
    ]).then(([transRow, onRow]) => {
      if (cancelled) return
      if (transRow?.value && VALID_TRANSLATIONS.has(transRow.value)) {
        setCompareTransState(transRow.value as Translation)
      }
      if (onRow?.value === '1') {
        setParallelOnState(true)
      }
    }).catch(console.error)
    return () => { cancelled = true }
  }, [db])

  const setCompareTrans = useCallback((t: Translation | null) => {
    setCompareTransState(t)
    if (t === null) {
      db.runAsync("DELETE FROM settings WHERE key = 'parallel_translation'").catch(console.error)
    } else {
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('parallel_translation', ?)",
        [t]
      ).catch(console.error)
    }
  }, [db])

  const setParallelOn = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setParallelOnState(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('parallel_on', ?)",
        [next ? '1' : '0']
      ).catch(console.error)
      return next
    })
  }, [db])

  return (
    <ParallelTranslationContext.Provider value={{ compareTrans, setCompareTrans, parallelOn, setParallelOn }}>
      {children}
    </ParallelTranslationContext.Provider>
  )
}

export function useParallelTranslation() { return useContext(ParallelTranslationContext) }
