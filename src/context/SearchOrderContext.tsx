import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

export type SearchMode = 'default' | 'exact_words' | 'exact_phrase'

interface ContextValue {
  biblicalOrder: boolean
  toggleBiblicalOrder: () => void
  searchMode: SearchMode
  setSearchMode: (mode: SearchMode) => void
}

const SearchOrderContext = createContext<ContextValue | null>(null)

export function SearchOrderProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [biblicalOrder, setBiblicalOrder] = useState(false)
  const [searchMode, setSearchModeState] = useState<SearchMode>('exact_words')

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'search_biblical_order'"
    ).then(row => { if (row) setBiblicalOrder(row.value === '1') }).catch(() => {})

    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'search_mode'"
    ).then(row => { if (row) setSearchModeState(row.value as SearchMode) }).catch(() => {})
  }, [])

  const toggleBiblicalOrder = useCallback(() => {
    setBiblicalOrder(prev => {
      const next = !prev
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('search_biblical_order', ?)",
        [next ? '1' : '0']
      ).catch(() => {})
      return next
    })
  }, [db])

  const setSearchMode = useCallback((mode: SearchMode) => {
    setSearchModeState(mode)
    db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('search_mode', ?)",
      [mode]
    ).catch(() => {})
  }, [db])

  return (
    <SearchOrderContext.Provider value={{ biblicalOrder, toggleBiblicalOrder, searchMode, setSearchMode }}>
      {children}
    </SearchOrderContext.Provider>
  )
}

export function useSearchOrder() {
  const ctx = useContext(SearchOrderContext)
  if (!ctx) throw new Error('useSearchOrder requires SearchOrderProvider')
  return ctx
}
