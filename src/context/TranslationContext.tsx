import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

export type Translation = 'KJV' | 'ASV' | 'WEB'

export const TRANSLATIONS: { key: Translation; label: string; full: string }[] = [
  { key: 'KJV', label: 'KJV', full: 'King James Version' },
  { key: 'ASV', label: 'ASV', full: 'American Standard Version' },
  { key: 'WEB', label: 'WEB', full: 'World English Bible' },
]

const VALID_TRANSLATIONS = new Set<string>(TRANSLATIONS.map(t => t.key))

interface ContextValue {
  translation: Translation
  setTranslation: (t: Translation) => void
}

const TranslationContext = createContext<ContextValue>({
  translation: 'KJV',
  setTranslation: () => {},
})

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [translation, setTranslationState] = useState<Translation>('KJV')

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'default_translation'"
    ).then(row => {
      if (row?.value && VALID_TRANSLATIONS.has(row.value)) {
        setTranslationState(row.value as Translation)
      }
    }).catch(console.error)
  }, [db])

  const setTranslation = useCallback((t: Translation) => {
    setTranslationState(t)
    db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('default_translation', ?)",
      [t]
    ).catch(console.error)
  }, [db])

  const value = useMemo<ContextValue>(() => ({ translation, setTranslation }), [translation, setTranslation])

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  return useContext(TranslationContext)
}
