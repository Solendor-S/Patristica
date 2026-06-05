import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

interface ContextValue {
  strongsInSearch: boolean
  toggleStrongsInSearch: () => void
}

const StrongsInSearchContext = createContext<ContextValue | null>(null)

export function StrongsInSearchProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [strongsInSearch, setOn] = useState(false)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'strongs_in_search'"
    ).then(row => {
      if (row) setOn(row.value === '1')
    }).catch(() => {})
  }, [])

  const toggleStrongsInSearch = useCallback(() => {
    setOn(prev => {
      const next = !prev
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('strongs_in_search', ?)",
        [next ? '1' : '0']
      ).catch(() => {})
      return next
    })
  }, [db])

  return (
    <StrongsInSearchContext.Provider value={{ strongsInSearch, toggleStrongsInSearch }}>
      {children}
    </StrongsInSearchContext.Provider>
  )
}

export function useStrongsInSearch() {
  const ctx = useContext(StrongsInSearchContext)
  if (!ctx) throw new Error('useStrongsInSearch requires StrongsInSearchProvider')
  return ctx
}
