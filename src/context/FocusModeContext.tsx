import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

interface ContextValue {
  focusMode: boolean
  toggleFocusMode: () => void
}

const FocusModeContext = createContext<ContextValue | null>(null)

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [focusMode, setOn] = useState(false)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'focus_mode'"
    ).then(row => {
      if (row) setOn(row.value === '1')
    }).catch(() => {})
  }, [])

  const toggleFocusMode = useCallback(() => {
    setOn(prev => {
      const next = !prev
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('focus_mode', ?)",
        [next ? '1' : '0']
      ).catch(() => {})
      return next
    })
  }, [db])

  return (
    <FocusModeContext.Provider value={{ focusMode, toggleFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  )
}

export function useFocusMode() {
  const ctx = useContext(FocusModeContext)
  if (!ctx) throw new Error('useFocusMode requires FocusModeProvider')
  return ctx
}
