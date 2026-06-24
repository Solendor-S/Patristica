import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'
import { THEMES, darkTheme, type ThemeColors, type ThemeKey } from '../theme/themes'

interface ThemeContextValue {
  themeKey: ThemeKey
  colors:   ThemeColors
  setTheme: (key: ThemeKey) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: 'dark',
  colors:   darkTheme,
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [themeKey, setThemeKey] = useState<ThemeKey>('dark')

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'theme'"
    ).then(row => {
      if (row?.value && row.value in THEMES) {
        setThemeKey(row.value as ThemeKey)
      }
    }).catch(console.error)
  }, [db])

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeKey(key)
    db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)",
      [key]
    ).catch(console.error)
  }, [db])

  const value = useMemo<ThemeContextValue>(() => ({
    themeKey,
    colors: THEMES[themeKey],
    setTheme,
  }), [themeKey, setTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
