import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

interface ContextValue {
  crossRefBiblicalOrder: boolean
  toggleCrossRefBiblicalOrder: () => void
}

const CrossRefOrderContext = createContext<ContextValue | null>(null)

export function CrossRefOrderProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [crossRefBiblicalOrder, setOn] = useState(false)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'crossref_biblical_order'"
    ).then(row => {
      if (row) setOn(row.value === '1')
    }).catch(() => {})
  }, [])

  const toggleCrossRefBiblicalOrder = useCallback(() => {
    setOn(prev => {
      const next = !prev
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('crossref_biblical_order', ?)",
        [next ? '1' : '0']
      ).catch(() => {})
      return next
    })
  }, [db])

  return (
    <CrossRefOrderContext.Provider value={{ crossRefBiblicalOrder, toggleCrossRefBiblicalOrder }}>
      {children}
    </CrossRefOrderContext.Provider>
  )
}

export function useCrossRefOrder() {
  const ctx = useContext(CrossRefOrderContext)
  if (!ctx) throw new Error('useCrossRefOrder requires CrossRefOrderProvider')
  return ctx
}
