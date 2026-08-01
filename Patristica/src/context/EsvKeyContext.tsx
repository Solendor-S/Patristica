import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'
import { clearEsvCache } from '../lib/esv'

interface ContextValue {
  esvKey: string
  /** False until the stored key has been read — reader must not decide "no key" before this. */
  esvKeyReady: boolean
  setEsvKey: (key: string) => void
}

const EsvKeyContext = createContext<ContextValue | null>(null)

export function EsvKeyProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [esvKey, setKey] = useState('')
  const [esvKeyReady, setReady] = useState(false)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'esv_api_key'"
    ).then(row => {
      if (row?.value) setKey(row.value)
    }).catch(() => {}).finally(() => setReady(true))
  }, [])

  const setEsvKey = useCallback((key: string) => {
    const trimmed = key.trim()
    setKey(trimmed)
    clearEsvCache()  // a key change may mean a different account; don't serve its results
    // ponytail: plain row in the app-private settings DB, same as every other
    // preference. It's the user's own key on their own device, so app-private
    // storage is proportionate. Move to expo-secure-store if we ever store a
    // credential that isn't the user's to lose.
    db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('esv_api_key', ?)",
      [trimmed]
    ).catch(() => {})
  }, [db])

  const value = useMemo<ContextValue>(
    () => ({ esvKey, esvKeyReady, setEsvKey }),
    [esvKey, esvKeyReady, setEsvKey],
  )

  return (
    <EsvKeyContext.Provider value={value}>
      {children}
    </EsvKeyContext.Provider>
  )
}

export function useEsvKey() {
  const ctx = useContext(EsvKeyContext)
  if (!ctx) throw new Error('useEsvKey requires EsvKeyProvider')
  return ctx
}
