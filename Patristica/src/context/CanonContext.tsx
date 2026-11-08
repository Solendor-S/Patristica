import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'
import type { CanonKey, DeuteroText } from '../data/books'

export type { CanonKey, DeuteroText }

const CANON_KEY = 'canon'
const DEUTERO_TEXT_KEY = 'deutero_text'

export const CANON_OPTIONS: { key: CanonKey; label: string; description: string }[] = [
  { key: 'catholic',   label: 'Catholic',   description: '73 books, deuterocanon in the Old Testament' },
  { key: 'protestant', label: 'Protestant', description: '66 books, deuterocanon under Apocrypha' },
]

export const DEUTERO_TEXT_OPTIONS: { key: DeuteroText; label: string; description: string }[] = [
  { key: 'WEBC', label: 'WEBC', description: 'World English Bible Catholic, modern English' },
  { key: 'KJVA', label: 'KJVA', description: 'King James Version Apocrypha (1611)' },
]

interface CanonContextValue {
  canon: CanonKey
  setCanon: (key: CanonKey) => void
  /** The text deuterocanonical books show in translations that don't have them. */
  deuteroText: DeuteroText
  setDeuteroText: (key: DeuteroText) => void
}

const CanonContext = createContext<CanonContextValue>({
  canon: 'catholic',
  setCanon: () => {},
  deuteroText: 'WEBC',
  setDeuteroText: () => {},
})

export function CanonProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [canon, setCanonState] = useState<CanonKey>('catholic')
  const [deuteroText, setDeuteroTextState] = useState<DeuteroText>('WEBC')

  useEffect(() => {
    db.getAllAsync<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE key IN ('${CANON_KEY}', '${DEUTERO_TEXT_KEY}')`
    ).then(rows => {
      for (const { key, value } of rows) {
        if (key === CANON_KEY && CANON_OPTIONS.some(o => o.key === value)) setCanonState(value as CanonKey)
        if (key === DEUTERO_TEXT_KEY && DEUTERO_TEXT_OPTIONS.some(o => o.key === value)) setDeuteroTextState(value as DeuteroText)
      }
    }).catch(console.error)
  }, [db])

  const save = useCallback((key: string, value: string) => {
    db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]).catch(console.error)
  }, [db])

  const setCanon = useCallback((key: CanonKey) => {
    setCanonState(key)
    save(CANON_KEY, key)
  }, [save])

  const setDeuteroText = useCallback((key: DeuteroText) => {
    setDeuteroTextState(key)
    save(DEUTERO_TEXT_KEY, key)
  }, [save])

  const value = useMemo<CanonContextValue>(
    () => ({ canon, setCanon, deuteroText, setDeuteroText }),
    [canon, setCanon, deuteroText, setDeuteroText]
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
