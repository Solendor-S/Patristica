import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { SQLiteDatabase } from 'expo-sqlite'
import { getVerse } from '../db/queries'
import { verseForDate } from '../data/dailyVerses'

// Daily reading reminders.
//
// Design: notification CONTENT is baked in the foreground (here) and scheduled
// ~14 days ahead, re-topped every app open. We can't compute content in a
// background task because opening SQLite off the main connection conflicts in
// New Arch (same reason the widget task handler avoids the DB). A single
// repeating trigger would freeze one verse forever, so we schedule N dated
// one-shots instead.

export type NotifStyle = 'verse' | 'continue'
export type NotifPrefs = { style: NotifStyle; hour: number; minute: number }

const DAYS_AHEAD = 14
const CHANNEL_ID = 'daily-reading'

// Foreground presentation: show the banner even if the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily reading',
    importance: Notifications.AndroidImportance.DEFAULT,
  })
}

// Returns true if we may post notifications. Requests permission if undetermined.
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  if (!current.canAskAgain) return false
  const req = await Notifications.requestPermissionsAsync()
  return req.granted
}

export async function cancelAll() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

async function latestHistory(db: SQLiteDatabase): Promise<{ book: string; chapter: number } | null> {
  return db.getFirstAsync<{ book: string; chapter: number }>(
    'SELECT book, chapter FROM history ORDER BY visited_at DESC LIMIT 1'
  )
}

// The fire time for `daysFromNow`, at the chosen hour:minute. Returns null if
// today's slot has already passed (so we don't schedule a notification in the past).
function fireDate(daysFromNow: number, hour: number, minute: number): Date | null {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, minute, 0, 0)
  if (daysFromNow === 0 && d.getTime() <= Date.now()) return null
  return d
}

async function contentForDay(
  db: SQLiteDatabase,
  date: Date,
  style: NotifStyle,
): Promise<{ title: string; body: string; data: Record<string, unknown> } | null> {
  if (style === 'continue') {
    const last = await latestHistory(db)
    if (!last) return null // nothing read yet → skip the "continue" nudge for this day
    return {
      title: 'Continue your reading',
      body: `Pick up where you left off in ${last.book} ${last.chapter}`,
      data: { book: last.book, chapter: last.chapter },
    }
  }
  // verse of the day
  const ref = verseForDate(date)
  const v = await getVerse(db, ref.book, ref.chapter, ref.verse, 'KJV')
  if (!v?.text) return null
  const text = v.text.replace(/\s+/g, ' ').trim()
  return {
    title: 'Verse of the Day',
    body: `"${text}" — ${ref.book} ${ref.chapter}:${ref.verse}`,
    data: { book: ref.book, chapter: ref.chapter, verse: ref.verse },
  }
}

// Cancel everything and schedule the next DAYS_AHEAD reminders. Caller must have
// confirmed permission. Safe to call on every app open — it's idempotent.
export async function rescheduleDaily(db: SQLiteDatabase, prefs: NotifPrefs) {
  await ensureAndroidChannel()
  await cancelAll()
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = fireDate(i, prefs.hour, prefs.minute)
    if (!date) continue
    const content = await contentForDay(db, date, prefs.style)
    if (!content) continue
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    })
  }
}
