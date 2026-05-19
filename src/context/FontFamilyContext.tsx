import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

export type FontFamilyKey = 'system' | 'serif' | 'light' | 'condensed' | 'mono'
export type FontScopeKey  = 'verses' | 'all'

export const FONT_FAMILY_OPTIONS: {
  key: FontFamilyKey
  label: string
  description: string
  family: string | undefined
}[] = [
  { key: 'system',    label: 'Default',   description: 'Roboto (system default)',  family: undefined },
  { key: 'serif',     label: 'Serif',     description: 'Noto Serif',               family: 'serif' },
  { key: 'light',     label: 'Light',     description: 'Roboto Light',             family: 'sans-serif-light' },
  { key: 'condensed', label: 'Condensed', description: 'Roboto Condensed',         family: 'sans-serif-condensed' },
  { key: 'mono',      label: 'Mono',      description: 'Roboto Mono',              family: 'monospace' },
]

export const FONT_SCOPE_OPTIONS: { key: FontScopeKey; label: string; description: string }[] = [
  { key: 'verses', label: 'Verse text only', description: 'Applies only to Bible verse text' },
  { key: 'all',    label: 'All text',        description: 'Applies to all text in the app' },
]

export const FAMILY_MAP = Object.fromEntries(
  FONT_FAMILY_OPTIONS.map(o => [o.key, o.family])
) as Record<FontFamilyKey, string | undefined>

interface FontFamilyContextValue {
  familyKey: FontFamilyKey
  fontFamily: string | undefined
  fontScope: FontScopeKey
  setFontFamily: (key: FontFamilyKey) => void
  setFontScope: (key: FontScopeKey) => void
}

const FontFamilyContext = createContext<FontFamilyContextValue>({
  familyKey: 'system',
  fontFamily: undefined,
  fontScope: 'verses',
  setFontFamily: () => {},
  setFontScope: () => {},
})

export function FontFamilyProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [familyKey, setFamilyKeyState] = useState<FontFamilyKey>('system')
  const [fontScope, setFontScopeState] = useState<FontScopeKey>('verses')

  useEffect(() => {
    Promise.all([
      db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'font_family'"),
      db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'font_scope'"),
    ]).then(([fam, scope]) => {
      if (fam?.value && fam.value in FAMILY_MAP) setFamilyKeyState(fam.value as FontFamilyKey)
      if (scope?.value === 'verses' || scope?.value === 'all') setFontScopeState(scope.value)
    }).catch(console.error)
  }, [db])

  const setFontFamily = useCallback((key: FontFamilyKey) => {
    setFamilyKeyState(key)
    db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('font_family', ?)", [key])
      .catch(console.error)
  }, [db])

  const setFontScope = useCallback((key: FontScopeKey) => {
    setFontScopeState(key)
    db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('font_scope', ?)", [key])
      .catch(console.error)
  }, [db])

  const value = useMemo<FontFamilyContextValue>(() => ({
    familyKey,
    fontFamily: FAMILY_MAP[familyKey],
    fontScope,
    setFontFamily,
    setFontScope,
  }), [familyKey, fontScope, setFontFamily, setFontScope])

  return (
    <FontFamilyContext.Provider value={value}>
      {children}
    </FontFamilyContext.Provider>
  )
}

export function useReaderFont(): FontFamilyContextValue {
  return useContext(FontFamilyContext)
}
