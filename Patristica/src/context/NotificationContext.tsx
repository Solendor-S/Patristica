import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useUserDb } from '../db/UserDbProvider'
import { ensurePermission, rescheduleDaily, cancelAll, type NotifStyle } from '../lib/notifications'

// Daily reading reminders. Prefs live in the settings table. Verse-of-the-day
// is ON by default (per product decision) — permission is requested on first
// resolve; if the user denies it, `enabled` reflects off.

interface ContextValue {
  enabled: boolean
  style: NotifStyle
  hour: number
  minute: number
  setEnabled: (on: boolean) => Promise<void>
  setStyle: (style: NotifStyle) => void
  setTime: (hour: number, minute: number) => void
}

const NotificationContext = createContext<ContextValue | null>(null)

const setPref = (db: ReturnType<typeof useUserDb>, key: string, value: string) =>
  db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]).catch(() => {})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [enabled, setEnabledState] = useState(false)
  const [style, setStyleState] = useState<NotifStyle>('verse')
  const [hour, setHour] = useState(8)
  const [minute, setMinute] = useState(0)
  const resolved = useRef(false)

  // Reschedule using the latest values. Reads state via refs to stay stable.
  const prefsRef = useRef({ enabled, style, hour, minute })
  prefsRef.current = { enabled, style, hour, minute }

  const applySchedule = useCallback(async () => {
    const p = prefsRef.current
    if (!p.enabled) { await cancelAll(); return }
    const ok = await ensurePermission()
    if (!ok) { setEnabledState(false); await setPref(db, 'notif_enabled', '0'); return }
    await rescheduleDaily(db, { style: p.style, hour: p.hour, minute: p.minute })
  }, [db])

  // Load prefs once, then apply. Default: enabled + verse.
  useEffect(() => {
    let active = true
    ;(async () => {
      const rows = await db.getAllAsync<{ key: string; value: string }>(
        "SELECT key, value FROM settings WHERE key IN ('notif_enabled','notif_style','notif_hour','notif_minute')"
      ).catch(() => [] as { key: string; value: string }[])
      if (!active) return
      const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
      // notif_enabled defaults to ON when the key was never set
      const on = map['notif_enabled'] === undefined ? true : map['notif_enabled'] === '1'
      setEnabledState(on)
      if (map['notif_style'] === 'continue' || map['notif_style'] === 'verse') setStyleState(map['notif_style'])
      if (map['notif_hour'] !== undefined) setHour(Number(map['notif_hour']))
      if (map['notif_minute'] !== undefined) setMinute(Number(map['notif_minute']))
      resolved.current = true
      await applySchedule()
    })()
    return () => { active = false }
  }, [db, applySchedule])

  // Top-up the 14-day buffer whenever the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active' && resolved.current && prefsRef.current.enabled) applySchedule().catch(() => {})
    })
    return () => sub.remove()
  }, [applySchedule])

  // Setters mutate prefsRef synchronously so the immediate applySchedule() sees
  // the new value (state → prefsRef only syncs on the next render).
  const setEnabled = useCallback(async (on: boolean) => {
    setEnabledState(on)
    prefsRef.current.enabled = on
    await setPref(db, 'notif_enabled', on ? '1' : '0')
    await applySchedule()
  }, [db, applySchedule])

  const setStyle = useCallback((s: NotifStyle) => {
    setStyleState(s)
    prefsRef.current.style = s
    setPref(db, 'notif_style', s)
    applySchedule().catch(() => {})
  }, [db, applySchedule])

  const setTime = useCallback((h: number, m: number) => {
    setHour(h); setMinute(m)
    prefsRef.current.hour = h; prefsRef.current.minute = m
    setPref(db, 'notif_hour', String(h))
    setPref(db, 'notif_minute', String(m))
    applySchedule().catch(() => {})
  }, [db, applySchedule])

  return (
    <NotificationContext.Provider value={{ enabled, style, hour, minute, setEnabled, setStyle, setTime }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications requires NotificationProvider')
  return ctx
}
