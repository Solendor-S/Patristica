import React from 'react'
import { openDatabaseAsync } from 'expo-sqlite'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { StudyWidget } from './StudyWidget'
import {
  getPlans, getTodayEntries, getStreak,
  markEntryComplete, markEntryIncomplete,
} from '../db/queries'

async function openDb() {
  const db = await openDatabaseAsync('user.db')
  // Ensure plan tables exist (handler may run before app is ever opened)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reading_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS plan_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      target_date TEXT NOT NULL,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      completed_at INTEGER
    );
  `)
  return db
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { taskType, clickAction, clickActionData } = props

  try {
    const db = await openDb()

    if (taskType === 'WIDGET_CLICK') {
      if (clickAction === 'MARK_DONE') {
        const planId = Number(clickActionData?.planId)
        if (planId) {
          const entries = await getTodayEntries(db, planId)
          await Promise.all(
            entries.filter(e => !e.completed_at).map(e => markEntryComplete(db, e.id))
          )
        }
      } else if (clickAction === 'MARK_UNDONE') {
        const planId = Number(clickActionData?.planId)
        if (planId) {
          const entries = await getTodayEntries(db, planId)
          await Promise.all(entries.map(e => markEntryIncomplete(db, e.id)))
        }
      }
      // OPEN_READING is handled by the widget framework launching the app deep link
    }

    // Render widget for ADDED, UPDATE, CLICK
    const plans = await getPlans(db)
    const plan = plans[0] ?? null
    const [todayEntries, streak] = plan
      ? await Promise.all([getTodayEntries(db, plan.id), getStreak(db, plan.id)])
      : [[], 0]

    props.renderWidget(
      React.createElement(StudyWidget, { plan, todayEntries, streak })
    )
  } catch (e) {
    // Render fallback widget on any error
    props.renderWidget(
      React.createElement(StudyWidget, { plan: null, todayEntries: [], streak: 0 })
    )
  }
}
