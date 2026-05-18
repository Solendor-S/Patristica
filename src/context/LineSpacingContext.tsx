import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

export type LineSpacingKey = 'compact' | 'normal' | 'relaxed' | 'spacious'

export const LINE_SPACING_OPTIONS: {
  key: LineSpacingKey
  label: string
  description: string
  lineHeight: number
}[] = [
  { key: 'compact',  label: 'Compact',  description: 'Tight lines',        lineHeight: 24 },
  { key: 'normal',   label: 'Normal',   description: 'Default reading',     lineHeight: 28 },
  { key: 'relaxed',  label: 'Relaxed',  description: 'More breathing room', lineHeight: 32 },
  { key: 'spacious', label: 'Spacious', description: 'Maximum comfort',     lineHeight: 38 },
]

const LINE_HEIGHTS = Object.fromEntries(
  LINE_SPACING_OPTIONS.map(o => [o.key, o.lineHeight])
) as Record<LineSpacingKey, number>

interface LineSpacingContextValue {
  spacingKey: LineSpacingKey
  lineHeight: number
  setSpacing: (key: LineSpacingKey) => void
}

const LineSpacingContext = createContext<LineSpacingContextValue>({
  spacingKey: 'normal',
  lineHeight: 28,
  setSpacing: () => {},
})

export function LineSpacingProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [spacingKey, setSpacingKey] = useState<LineSpacingKey>('normal')

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'line_spacing'"
    ).then(row => {
      if (row?.value && row.value in LINE_HEIGHTS) {
        setSpacingKey(row.value as LineSpacingKey)
      }
    }).catch(console.error)
  }, [db])

  const setSpacing = useCallback((key: LineSpacingKey) => {
    setSpacingKey(key)
    db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('line_spacing', ?)",
      [key]
    ).catch(console.error)
  }, [db])

  const value = useMemo<LineSpacingContextValue>(() => ({
    spacingKey,
    lineHeight: LINE_HEIGHTS[spacingKey],
    setSpacing,
  }), [spacingKey, setSpacing])

  return (
    <LineSpacingContext.Provider value={value}>
      {children}
    </LineSpacingContext.Provider>
  )
}

export function useLineSpacing(): LineSpacingContextValue {
  return useContext(LineSpacingContext)
}
