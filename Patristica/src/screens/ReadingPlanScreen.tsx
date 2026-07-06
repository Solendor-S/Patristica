import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, FlatList, TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { RootTabParamList } from '../types'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { useReadingPlan } from '../context/ReadingPlanContext'
import { useUserDb } from '../db/UserDbProvider'
import {
  PLAN_TEMPLATES,
  createPlanFromTemplate, createCustomPlan,
  getPlanEntriesForMonth, getTodayEntries, getStreak,
  markEntryComplete, markEntryIncomplete,
} from '../db/queries'
import type { PlanEntry, PlanWithProgress } from '../db/queries'

const planPct = (p: PlanWithProgress) =>
  p.total_days > 0 ? Math.round((p.completed_entries / p.total_days) * 100) : 0
import { BOOKS } from '../data/books'
import { chaptersForBooks } from '../data/planTemplates'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Library'>

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function firstDayOfMonth(year: number, month: number) {
  // 0=Sun → remap to 0=Mon
  return (new Date(year, month - 1, 1).getDay() + 6) % 7
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Plan List ─────────────────────────────────────────────────────────────────

export default function ReadingPlanScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const { plans, refresh } = useReadingPlan()
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<PlanWithProgress | null>(null)

  if (selected) {
    return (
      <PlanDetailView
        plan={selected}
        colors={colors}
        onBack={() => { setSelected(null); refresh() }}
      />
    )
  }

  if (creating) {
    return (
      <CreatePlanView
        colors={colors}
        onDone={() => { setCreating(false); refresh() }}
        onCancel={() => setCreating(false)}
      />
    )
  }

  return (
    <View style={s.container}>
      <View style={s.topRow}>
        <Text style={s.sectionTitle}>Reading Plans</Text>
        <TouchableOpacity style={s.newBtn} onPress={() => setCreating(true)} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={s.newBtnLabel}>New</Text>
        </TouchableOpacity>
      </View>

      {plans.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="calendar-outline" size={52} color={colors.border} />
          <Text style={s.emptyTitle}>No plans yet</Text>
          <Text style={s.emptyText}>Create a reading plan to track your daily study</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => setCreating(true)} activeOpacity={0.8}>
            <Text style={s.emptyBtnLabel}>Create a Plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              colors={colors}
              onOpen={() => setSelected(plan)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, colors, onOpen }: {
  plan: PlanWithProgress
  colors: ThemeColors
  onOpen: () => void
}) {
  const s = useMemo(() => makeStyles(colors), [colors])
  const { completeEntry, uncompleteEntry, todayEntries, removePlan } = useReadingPlan()
  const entries = todayEntries[plan.id] ?? []
  const allDone = entries.length > 0 && entries.every(e => e.completed_at != null)
  const pct = planPct(plan)

  const handleDelete = () => Alert.alert('Delete Plan', `Delete "${plan.name}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => removePlan(plan.id) },
  ])

  return (
    <View style={s.card}>
      <TouchableOpacity onPress={onOpen} activeOpacity={0.8}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{plan.name}</Text>
            <Text style={s.cardSub}>
              {plan.completed_entries === plan.total_days && plan.total_days > 0
                ? 'Completed ✓'
                : `Day ${Math.min(plan.completed_entries + 1, plan.total_days)} of ${plan.total_days} · ${pct}%`}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="trash-outline" size={17} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` as any }]} />
        </View>
      </TouchableOpacity>

      {/* Today's reading */}
      {entries.length > 0 && (
        <View style={s.todayRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.todayLabel}>Today</Text>
            <Text style={s.todayChapters}>
              {entries.map(e => `${e.book} ${e.chapter}`).join('  ·  ')}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.doneBtn, allDone && s.doneBtnActive]}
            onPress={() => {
              if (allDone) entries.forEach(e => uncompleteEntry(plan.id, e.id))
              else entries.forEach(e => { if (!e.completed_at) completeEntry(plan.id, e.id) })
            }}
            activeOpacity={0.7}
          >
            <Ionicons name={allDone ? 'checkmark-circle' : 'checkmark-circle-outline'} size={16} color={allDone ? '#fff' : colors.accent} />
            <Text style={[s.doneBtnLabel, allDone && { color: '#fff' }]}>{allDone ? 'Done' : 'Mark done'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {entries.length === 0 && plan.completed_entries < plan.total_days && (
        <Text style={s.noTodayText}>No reading scheduled for today</Text>
      )}
    </View>
  )
}

// ── Plan Detail / Calendar ────────────────────────────────────────────────────

function PlanDetailView({ plan, colors, onBack }: {
  plan: PlanWithProgress
  colors: ThemeColors
  onBack: () => void
}) {
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()
  const navigation = useNavigation<NavProp>()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [monthEntries, setMonthEntries] = useState<PlanEntry[]>([])
  const [todayList, setTodayList] = useState<PlanEntry[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [me, te, st] = await Promise.all([
      getPlanEntriesForMonth(db, plan.id, year, month),
      getTodayEntries(db, plan.id),
      getStreak(db, plan.id),
    ])
    setMonthEntries(me)
    setTodayList(te)
    setStreak(st)
    setLoading(false)
  }, [db, plan.id, year, month])

  useEffect(() => { load() }, [load])

  const pct = planPct(plan)
  const today = isoDate(new Date())
  const allTodayDone = todayList.length > 0 && todayList.every(e => e.completed_at != null)

  // Build per-date maps from monthEntries
  const dateMap = useMemo(() => {
    const m: Record<string, PlanEntry[]> = {}
    for (const e of monthEntries) {
      if (!m[e.target_date]) m[e.target_date] = []
      m[e.target_date].push(e)
    }
    return m
  }, [monthEntries])

  const days = daysInMonth(year, month)
  const firstDay = firstDayOfMonth(year, month)
  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const navigateToChapter = (book: string, chapter: number) => {
    navigation.navigate('Bible' as any, { screen: 'Reader', params: { book, chapter, verse: 1, _ts: Date.now() } })
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgPrimary }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={s.detailHeader}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.detailTitle} numberOfLines={1}>{plan.name}</Text>
        {streak > 0 && (
          <View style={s.streakBadge}>
            <Text style={s.streakText}>🔥 {streak}</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={s.detailProgressWrap}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${Math.min(pct, 100)}%` as any }]} />
        </View>
        <Text style={s.detailProgressLabel}>{pct}% complete · {plan.total_days} days</Text>
      </View>

      {/* Today's reading card */}
      {todayList.length > 0 && (
        <View style={s.todayCard}>
          <Text style={s.todayCardLabel}>TODAY</Text>
          {todayList.map(entry => (
            <View key={entry.id} style={s.todayEntryRow}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => navigateToChapter(entry.book, entry.chapter)}
                activeOpacity={0.7}
              >
                <Text style={s.todayEntryText}>{entry.book} {entry.chapter}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (entry.completed_at) await markEntryIncomplete(db, entry.id)
                  else await markEntryComplete(db, entry.id)
                  load()
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={entry.completed_at ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={entry.completed_at ? colors.accent : colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Calendar */}
      <View style={s.calWrap}>
        {/* Month nav */}
        <View style={s.calNav}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.calMonthLabel}>{monthName} {year}</Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week headers */}
        <View style={s.calWeekRow}>
          {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
            <Text key={d} style={s.calWeekLabel}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        ) : (
          <CalendarGrid
            year={year} month={month} firstDay={firstDay} days={days}
            today={today} dateMap={dateMap} colors={colors}
          />
        )}

        {/* Legend */}
        <View style={s.legend}>
          <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.accent }]} /><Text style={s.legendLabel}>Done</Text></View>
          <View style={s.legendItem}><View style={[s.legendDot, { backgroundColor: colors.border, borderWidth: 1, borderColor: colors.textMuted }]} /><Text style={s.legendLabel}>Scheduled</Text></View>
        </View>
      </View>

      {/* Upcoming entries */}
      <UpcomingList planId={plan.id} colors={colors} onNavigate={navigateToChapter} />
    </ScrollView>
  )
}

function CalendarGrid({ year, month, firstDay, days, today, dateMap, colors }: {
  year: number; month: number; firstDay: number; days: number
  today: string; dateMap: Record<string, PlanEntry[]>; colors: ThemeColors
}) {
  const s = useMemo(() => makeStyles(colors), [colors])
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={s.calRow}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={s.calCell} />
            const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const entries = dateMap[iso] ?? []
            const isToday = iso === today
            const hasPlan = entries.length > 0
            const allDone = hasPlan && entries.every(e => e.completed_at != null)
            const partial = hasPlan && !allDone && entries.some(e => e.completed_at != null)
            return (
              <View key={col} style={[s.calCell, isToday && s.calCellToday]}>
                <Text style={[s.calDay, isToday && s.calDayToday]}>{day}</Text>
                {hasPlan && (
                  <View style={[
                    s.calDot,
                    allDone ? { backgroundColor: colors.accent } : partial ? { backgroundColor: colors.accent, opacity: 0.5 } : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.textMuted }
                  ]} />
                )}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function UpcomingList({ planId, colors, onNavigate }: {
  planId: number
  colors: ThemeColors
  onNavigate: (book: string, chapter: number) => void
}) {
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()
  const [upcoming, setUpcoming] = useState<{ date: string; entries: PlanEntry[] }[]>([])

  useEffect(() => {
    const today = isoDate(new Date())
    db.getAllAsync<PlanEntry>(
      'SELECT * FROM plan_entries WHERE plan_id = ? AND target_date >= ? AND completed_at IS NULL ORDER BY target_date, id LIMIT 30',
      [planId, today]
    ).then(rows => {
      const grouped: Record<string, PlanEntry[]> = {}
      for (const r of rows) {
        if (!grouped[r.target_date]) grouped[r.target_date] = []
        grouped[r.target_date].push(r)
      }
      setUpcoming(Object.entries(grouped).slice(0, 7).map(([date, entries]) => ({ date, entries })))
    }).catch(console.error)
  }, [db, planId])

  if (upcoming.length === 0) return null

  return (
    <View style={s.upcomingWrap}>
      <Text style={s.upcomingTitle}>Upcoming</Text>
      {upcoming.map(({ date, entries }) => (
        <View key={date} style={s.upcomingRow}>
          <Text style={s.upcomingDate}>{formatDate(date)}</Text>
          <Text style={s.upcomingChapters} numberOfLines={1}>
            {entries.map(e => `${e.book} ${e.chapter}`).join('  ·  ')}
          </Text>
        </View>
      ))}
    </View>
  )
}

// ── Create Plan ───────────────────────────────────────────────────────────────

type CreateStep = 'pick' | 'custom_books' | 'custom_days'

function CreatePlanView({ colors, onDone, onCancel }: {
  colors: ThemeColors
  onDone: () => void
  onCancel: () => void
}) {
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useUserDb()
  const [step, setStep] = useState<CreateStep>('pick')
  const [busy, setBusy] = useState(false)

  // Custom plan state
  const [customName, setCustomName] = useState('')
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  const [customDays, setCustomDays] = useState('')

  const pickTemplate = async (key: string) => {
    setBusy(true)
    try {
      await createPlanFromTemplate(db, key)
      onDone()
    } catch (e) {
      Alert.alert('Error', String(e))
      setBusy(false)
    }
  }

  const createCustom = async () => {
    const days = parseInt(customDays, 10)
    if (!days || days < 1) { Alert.alert('Invalid', 'Enter a valid number of days'); return }
    if (selectedBooks.size === 0) { Alert.alert('Invalid', 'Select at least one book'); return }
    const name = customName.trim() || 'Custom Plan'
    const chapters = chaptersForBooks([...selectedBooks])
    setBusy(true)
    try {
      await createCustomPlan(db, name, chapters, days)
      onDone()
    } catch (e) {
      Alert.alert('Error', String(e))
      setBusy(false)
    }
  }

  const toggleBook = (book: string) => {
    setSelectedBooks(prev => {
      const next = new Set(prev)
      if (next.has(book)) next.delete(book); else next.add(book)
      return next
    })
  }

  if (busy) return (
    <View style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={[s.emptyText, { marginTop: 16 }]}>Creating plan…</Text>
    </View>
  )

  if (step === 'custom_books') return (
    <View style={s.container}>
      <View style={s.createHeader}>
        <TouchableOpacity onPress={() => setStep('pick')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.createTitle}>Select Books</Text>
        <TouchableOpacity onPress={() => setStep('custom_days')} disabled={selectedBooks.size === 0}>
          <Text style={[s.nextBtn, selectedBooks.size === 0 && { opacity: 0.3 }]}>Next</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={s.nameInput}
        placeholder="Plan name (optional)"
        placeholderTextColor={colors.textMuted}
        value={customName}
        onChangeText={setCustomName}
      />
      <FlatList
        data={BOOKS}
        keyExtractor={b => b.name}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.bookRow, selectedBooks.has(item.name) && s.bookRowSelected]}
            onPress={() => toggleBook(item.name)}
            activeOpacity={0.7}
          >
            <Text style={[s.bookRowLabel, selectedBooks.has(item.name) && { color: colors.accent }]}>{item.name}</Text>
            {selectedBooks.has(item.name) && <Ionicons name="checkmark" size={16} color={colors.accent} />}
          </TouchableOpacity>
        )}
      />
    </View>
  )

  if (step === 'custom_days') return (
    <View style={s.container}>
      <View style={s.createHeader}>
        <TouchableOpacity onPress={() => setStep('custom_books')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.createTitle}>Set Duration</Text>
        <View />
      </View>
      <View style={s.daysWrap}>
        <Text style={s.daysLabel}>
          {chaptersForBooks([...selectedBooks]).length} chapters selected
        </Text>
        <TextInput
          style={s.daysInput}
          placeholder="Number of days"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          value={customDays}
          onChangeText={setCustomDays}
        />
        {customDays && parseInt(customDays, 10) > 0 && (
          <Text style={s.daysHint}>
            ≈ {Math.ceil(chaptersForBooks([...selectedBooks]).length / parseInt(customDays, 10))} chapters/day
          </Text>
        )}
        <TouchableOpacity style={s.createBtn} onPress={createCustom} activeOpacity={0.8}>
          <Text style={s.createBtnLabel}>Create Plan</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // Template picker (default step)
  return (
    <View style={s.container}>
      <View style={s.createHeader}>
        <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.createTitle}>New Reading Plan</Text>
        <View />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={s.createSection}>Quick Start</Text>
        {PLAN_TEMPLATES.map(tpl => (
          <TouchableOpacity key={tpl.key} style={s.templateCard} onPress={() => pickTemplate(tpl.key)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={s.templateLabel}>{tpl.label}</Text>
              <Text style={s.templateDesc}>{tpl.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

        <Text style={[s.createSection, { marginTop: 8 }]}>Custom</Text>
        <TouchableOpacity style={s.templateCard} onPress={() => setStep('custom_books')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={s.templateLabel}>Build your own</Text>
            <Text style={s.templateDesc}>Choose specific books and set your own pace</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },

  topRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  newBtnLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, gap: 10, paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary },
  emptyText: { fontSize: 14, color: c.textMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8, backgroundColor: c.accent,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  emptyBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    marginHorizontal: 16, marginVertical: 8,
    backgroundColor: c.bgCard, borderRadius: 12, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8, gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  cardSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  progressTrack: {
    height: 4, backgroundColor: c.border,
    marginHorizontal: 14, marginBottom: 12, borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: c.accent, borderRadius: 2 },

  todayRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4, gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  todayLabel: { fontSize: 10, fontWeight: '700', color: c.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  todayChapters: { fontSize: 14, color: c.textPrimary, marginTop: 2, fontWeight: '500' },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: c.accent,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  doneBtnActive: { backgroundColor: c.accent },
  doneBtnLabel: { fontSize: 12, fontWeight: '600', color: c.accent },
  noTodayText: { fontSize: 12, color: c.textMuted, padding: 14, paddingTop: 0 },

  // Detail view
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    backgroundColor: c.bgSecondary,
  },
  detailTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.textPrimary },
  streakBadge: {
    backgroundColor: 'rgba(255,140,0,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  streakText: { fontSize: 13, fontWeight: '700', color: '#ff8c00' },
  detailProgressWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  detailProgressLabel: { fontSize: 12, color: c.textMuted, marginTop: 6 },

  todayCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: c.bgCard, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.accent + '44',
    padding: 14, gap: 8,
  },
  todayCardLabel: { fontSize: 10, fontWeight: '700', color: c.accent, letterSpacing: 1 },
  todayEntryRow: { flexDirection: 'row', alignItems: 'center' },
  todayEntryText: { fontSize: 15, fontWeight: '600', color: c.textPrimary, flex: 1 },

  calWrap: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: c.bgCard, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    padding: 14,
  },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calMonthLabel: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  calWeekRow: { flexDirection: 'row', marginBottom: 4 },
  calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: c.textMuted, fontWeight: '600' },
  calRow: { flexDirection: 'row' },
  calCell: { flex: 1, alignItems: 'center', paddingVertical: 5 },
  calCellToday: { backgroundColor: c.accent + '22', borderRadius: 6 },
  calDay: { fontSize: 13, color: c.textPrimary },
  calDayToday: { fontWeight: '700', color: c.accent },
  calDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: c.textMuted },

  upcomingWrap: { marginHorizontal: 16 },
  upcomingTitle: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  upcomingRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  upcomingDate: { fontSize: 12, color: c.textMuted, fontWeight: '600' },
  upcomingChapters: { fontSize: 14, color: c.textPrimary, marginTop: 2 },

  // Create plan
  createHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
    backgroundColor: c.bgSecondary,
  },
  createTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  nextBtn: { fontSize: 15, fontWeight: '700', color: c.accent },
  createSection: { fontSize: 12, fontWeight: '700', color: c.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  templateCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  templateLabel: { fontSize: 15, fontWeight: '600', color: c.textPrimary },
  templateDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  nameInput: {
    margin: 16, marginBottom: 4,
    backgroundColor: c.bgCard, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: c.textPrimary, fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  bookRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  bookRowSelected: { backgroundColor: c.accent + '11' },
  bookRowLabel: { fontSize: 15, color: c.textPrimary },

  daysWrap: { padding: 24, gap: 16 },
  daysLabel: { fontSize: 14, color: c.textMuted },
  daysInput: {
    backgroundColor: c.bgCard, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    color: c.textPrimary, fontSize: 20, fontWeight: '600',
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    textAlign: 'center',
  },
  daysHint: { fontSize: 13, color: c.textMuted, textAlign: 'center' },
  createBtn: {
    backgroundColor: c.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  createBtnLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
