import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

export const FONT_SIZE_DEFAULT = 17
export const FONT_SIZE_MIN = 12
export const FONT_SIZE_MAX = 30

interface FontSizeContextValue {
  fontSize: number
  setFontSize: (size: number) => void
}

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSize: FONT_SIZE_DEFAULT,
  setFontSize: () => {},
})

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [fontSize, setFontSizeState] = useState(FONT_SIZE_DEFAULT)
  const dbWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'font_size'"
    ).then(row => {
      const n = row?.value ? parseInt(row.value, 10) : NaN
      if (!isNaN(n) && n >= FONT_SIZE_MIN && n <= FONT_SIZE_MAX) {
        setFontSizeState(n)
      }
    }).catch(console.error)
    return () => { if (dbWriteTimer.current) clearTimeout(dbWriteTimer.current) }
  }, [db])

  const setFontSize = useCallback((size: number) => {
    setFontSizeState(size)
    if (dbWriteTimer.current) clearTimeout(dbWriteTimer.current)
    dbWriteTimer.current = setTimeout(() => {
      db.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('font_size', ?)",
        [String(size)]
      ).catch(console.error)
    }, 400)
  }, [db])

  const value = useMemo<FontSizeContextValue>(
    () => ({ fontSize, setFontSize }),
    [fontSize, setFontSize]
  )

  return (
    <FontSizeContext.Provider value={value}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize(): FontSizeContextValue {
  return useContext(FontSizeContext)
}
