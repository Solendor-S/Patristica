import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

interface ContextValue {
  tabletLayout: boolean
  setTabletLayout: (v: boolean) => void
}

const TabletLayoutContext = createContext<ContextValue>({
  tabletLayout: false,
  setTabletLayout: () => {},
})

export function TabletLayoutProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [tabletLayout, setTabletLayoutState] = useState(false)

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = 'tablet_layout'`)
      .then(row => { if (row) setTabletLayoutState(row.value === 'true') })
  }, [db])

  const setTabletLayout = useCallback((v: boolean) => {
    setTabletLayoutState(v)
    db.runAsync(`INSERT OR REPLACE INTO settings (key, value) VALUES ('tablet_layout', ?)`, [String(v)])
  }, [db])

  const value = useMemo(() => ({ tabletLayout, setTabletLayout }), [tabletLayout, setTabletLayout])

  return (
    <TabletLayoutContext.Provider value={value}>
      {children}
    </TabletLayoutContext.Provider>
  )
}

export function useTabletLayout() { return useContext(TabletLayoutContext) }
