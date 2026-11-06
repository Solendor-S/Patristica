import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'
import type { CanonKey } from '../data/books'

export type { CanonKey }

const CANON_KEY = 'canon'

export const CANON_OPTIONS: { key: CanonKey; label: string; description: string }[] = [
  { key: 'catholic',   label: 'Catholic',   description: '73 books, deuterocanon in the Old Testament' },
  { key: 'protestant', label: 'Protestant', description: '66 books, deuterocanon under Apocrypha' },
]

interface CanonContextValue {
  canon: CanonKey
  setCanon: (key: CanonKey) => void
}

const CanonContext = createContext<CanonContextValue>({
  canon: 'catholic',
  setCanon: () => {},
})

export function CanonProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [canon, setCanonState] = useState<CanonKey>('catholic')

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = '${CANON_KEY}'`
    ).then(row => {
      if (row?.value && CANON_OPTIONS.some(o => o.key === row.value)) {
        setCanonState(row.value as CanonKey)
      }
    }).catch(console.error)
  }, [db])

  const setCanon = useCallback((key: CanonKey) => {
    setCanonState(key)
    db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('${CANON_KEY}', ?)`,
      [key]
    ).catch(console.error)
  }, [db])

  const value = useMemo<CanonContextValue>(
    () => ({ canon, setCanon }),
    [canon, setCanon]
  )

  return (
    <CanonContext.Provider value={value}>
      {children}
    </CanonContext.Provider>
  )
}

export function useCanon(): CanonContextValue {
  return useContext(CanonContext)
}
