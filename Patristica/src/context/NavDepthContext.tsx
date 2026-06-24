import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

export type NavDepthKey = 'book' | 'chapter' | 'verse'

const NAV_DEPTH_KEY = 'nav_depth'

export const NAV_DEPTH_OPTIONS: { key: NavDepthKey; label: string; description: string }[] = [
  { key: 'book',    label: 'Book only',     description: 'Opens at chapter 1'            },
  { key: 'chapter', label: 'Show chapters', description: 'Pick a chapter before reading' },
  { key: 'verse',   label: 'Show verses',   description: 'Pick a chapter then a verse'   },
]

interface NavDepthContextValue {
  navDepth: NavDepthKey
  setNavDepth: (key: NavDepthKey) => void
}

const NavDepthContext = createContext<NavDepthContextValue>({
  navDepth: 'book',
  setNavDepth: () => {},
})

export function NavDepthProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [navDepth, setNavDepthState] = useState<NavDepthKey>('book')

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = '${NAV_DEPTH_KEY}'`
    ).then(row => {
      if (row?.value && NAV_DEPTH_OPTIONS.some(o => o.key === row.value)) {
        setNavDepthState(row.value as NavDepthKey)
      }
    }).catch(console.error)
  }, [db])

  const setNavDepth = useCallback((key: NavDepthKey) => {
    setNavDepthState(key)
    db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('${NAV_DEPTH_KEY}', ?)`,
      [key]
    ).catch(console.error)
  }, [db])

  const value = useMemo<NavDepthContextValue>(
    () => ({ navDepth, setNavDepth }),
    [navDepth, setNavDepth]
  )

  return (
    <NavDepthContext.Provider value={value}>
      {children}
    </NavDepthContext.Provider>
  )
}

export function useNavDepth(): NavDepthContextValue {
  return useContext(NavDepthContext)
}
