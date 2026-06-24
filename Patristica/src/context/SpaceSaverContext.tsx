import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

interface ContextValue {
  spaceSaverOn: boolean
  chromeHidden: boolean
  toggleSpaceSaver: () => void
  setChromeHidden: (hidden: boolean) => void
}

const SpaceSaverContext = createContext<ContextValue | null>(null)

export function SpaceSaverProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [spaceSaverOn, setSpaceSaverOn] = useState(false)
  const [chromeHidden, setChromeHiddenState] = useState(false)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'space_saver'"
    ).then(row => {
      if (row) setSpaceSaverOn(row.value === '1')
    }).catch(() => {})
  }, [])

  const toggleSpaceSaver = useCallback(() => {
    setSpaceSaverOn(prev => {
      const next = !prev
      if (!next) setChromeHiddenState(false)
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('space_saver', ?)",
        [next ? '1' : '0']
      ).catch(() => {})
      return next
    })
  }, [db])

  const setChromeHidden = useCallback((hidden: boolean) => {
    setChromeHiddenState(hidden)
  }, [])

  return (
    <SpaceSaverContext.Provider value={{ spaceSaverOn, chromeHidden, toggleSpaceSaver, setChromeHidden }}>
      {children}
    </SpaceSaverContext.Provider>
  )
}

export function useSpaceSaver() {
  const ctx = useContext(SpaceSaverContext)
  if (!ctx) throw new Error('useSpaceSaver requires SpaceSaverProvider')
  return ctx
}
