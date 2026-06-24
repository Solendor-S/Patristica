import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

interface ContextValue {
  otQuoteCapsOn: boolean
  toggleOtQuoteCaps: () => void
}

const OtQuoteCapsContext = createContext<ContextValue | null>(null)

export function OtQuoteCapsProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [otQuoteCapsOn, setOn] = useState(false)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'ot_quote_caps'"
    ).then(row => {
      if (row) setOn(row.value === '1')
    }).catch(() => {})
  }, [])

  const toggleOtQuoteCaps = useCallback(() => {
    setOn(prev => {
      const next = !prev
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('ot_quote_caps', ?)",
        [next ? '1' : '0']
      ).catch(() => {})
      return next
    })
  }, [db])

  return (
    <OtQuoteCapsContext.Provider value={{ otQuoteCapsOn, toggleOtQuoteCaps }}>
      {children}
    </OtQuoteCapsContext.Provider>
  )
}

export function useOtQuoteCaps() {
  const ctx = useContext(OtQuoteCapsContext)
  if (!ctx) throw new Error('useOtQuoteCaps requires OtQuoteCapsProvider')
  return ctx
}
