import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { useUserDb } from '../db/UserDbProvider'
import type { SQLiteDatabase } from 'expo-sqlite'
import type { PlanWithProgress, PlanEntry } from '../db/queries'
import { getPlans, getTodayEntries, getStreak, markEntryComplete, markEntryIncomplete, deletePlan } from '../db/queries'
import { StudyWidget } from '../widgets/StudyWidget'

// Push a fresh render to all pinned StudyWidgets after plan data changes
async function pushWidgetUpdate(db: SQLiteDatabase) {
  if (Platform.OS !== 'android') return
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget')
    const plans = await getPlans(db)
    const plan = plans[0] ?? null
    const [todayEntries, streak] = plan
      ? await Promise.all([getTodayEntries(db, plan.id), getStreak(db, plan.id)])
      : [[], 0]
    requestWidgetUpdate({
      widgetName: 'StudyWidget',
      renderWidget: () => React.createElement(StudyWidget, { plan, todayEntries, streak }),
      onNotFound: () => {},
    })
  } catch { /* no widget pinned or library unavailable */ }
}

interface ContextValue {
  plans: PlanWithProgress[]
  todayEntries: Record<number, PlanEntry[]>  // planId → today's entries
  refresh: () => Promise<void>
  completeEntry: (planId: number, entryId: number) => Promise<void>
  uncompleteEntry: (planId: number, entryId: number) => Promise<void>
  removePlan: (planId: number) => Promise<void>
}

const ReadingPlanContext = createContext<ContextValue>({
  plans: [],
  todayEntries: {},
  refresh: async () => {},
  completeEntry: async () => {},
  uncompleteEntry: async () => {},
  removePlan: async () => {},
})

export function ReadingPlanProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [plans, setPlans] = useState<PlanWithProgress[]>([])
  const [todayEntries, setTodayEntries] = useState<Record<number, PlanEntry[]>>({})

  const refresh = useCallback(async () => {
    const loaded = await getPlans(db)
    setPlans(loaded)
    const entries: Record<number, PlanEntry[]> = {}
    await Promise.all(loaded.map(async p => {
      entries[p.id] = await getTodayEntries(db, p.id)
    }))
    setTodayEntries(entries)
  }, [db])

  useEffect(() => { refresh().catch(console.error) }, [refresh])

  const completeEntry = useCallback(async (planId: number, entryId: number) => {
    await markEntryComplete(db, entryId)
    await refresh()
    pushWidgetUpdate(db).catch(() => {})
  }, [db, refresh])

  const uncompleteEntry = useCallback(async (planId: number, entryId: number) => {
    await markEntryIncomplete(db, entryId)
    await refresh()
    pushWidgetUpdate(db).catch(() => {})
  }, [db, refresh])

  const removePlan = useCallback(async (planId: number) => {
    await deletePlan(db, planId)
    await refresh()
    pushWidgetUpdate(db).catch(() => {})
  }, [db, refresh])

  return (
    <ReadingPlanContext.Provider value={{ plans, todayEntries, refresh, completeEntry, uncompleteEntry, removePlan }}>
      {children}
    </ReadingPlanContext.Provider>
  )
}

export function useReadingPlan() {
  return useContext(ReadingPlanContext)
}
