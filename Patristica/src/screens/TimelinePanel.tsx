import React, { useMemo, useState } from 'react'
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { COUNCILS } from './CouncilsPanel'
import { HERESIES } from './HeresiesPanel'
import { PERSECUTIONS } from './PersecutionPanel'
import { FATHER_DATES } from '../data/fatherDates'
import type { StudyTab } from './StudyScreen'

// ── Types ─────────────────────────────────────────────────

export type EventCategory = 'council' | 'heresy' | 'persecution' | 'father'

interface TimelineEvent {
  id: string
  yearNum: number
  yearLabel: string
  category: EventCategory
  title: string
  subtitle: string
  targetTab?: StudyTab
}

// ── Category config ────────────────────────────────────────

const CATEGORY_CONFIG: Record<EventCategory, { label: string; color: string; icon: string }> = {
  council:     { label: 'Council',     color: '#c9a45a', icon: 'business-outline' },
  heresy:      { label: 'Heresy',      color: '#c45a5a', icon: 'warning-outline' },
  persecution: { label: 'Persecution', color: '#c47a40', icon: 'flame-outline' },
  father:      { label: 'Father',      color: '#7a9fd4', icon: 'person-outline' },
}

const ALL_CATEGORIES: EventCategory[] = ['council', 'heresy', 'persecution', 'father']

// ── Build unified timeline ────────────────────────────────

function buildTimeline(): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Councils
  for (const c of COUNCILS) {
    events.push({
      id: `council-${c.yearNum}-${c.name}`,
      yearNum: c.yearNum,
      yearLabel: `${c.year} AD`,
      category: 'council',
      title: c.name,
      subtitle: c.decree.length > 90 ? c.decree.slice(0, 87) + '…' : c.decree,
      targetTab: 'councils',
    })
  }

  // Heresies
  for (const h of HERESIES) {
    events.push({
      id: `heresy-${h.yearNum}-${h.name}`,
      yearNum: h.yearNum,
      yearLabel: h.year,
      category: 'heresy',
      title: h.name,
      subtitle: h.taught.length > 90 ? h.taught.slice(0, 87) + '…' : h.taught,
      targetTab: 'heresies',
    })
  }

  // Persecutions
  for (const p of PERSECUTIONS) {
    events.push({
      id: `persecution-${p.yearNum}-${p.emperor}`,
      yearNum: p.yearNum,
      yearLabel: p.dateRange,
      category: 'persecution',
      title: `${p.emperor} Persecution`,
      subtitle: p.significance.length > 90 ? p.significance.slice(0, 87) + '…' : p.significance,
      targetTab: 'persecution',
    })
  }

  // Church Fathers (birth year, filtered to 30–500 AD; deduplicate by sort year + name)
  const seenFathers = new Set<string>()
  for (const [name, info] of Object.entries(FATHER_DATES)) {
    if (info.sort < 30 || info.sort > 500) continue
    // Skip alias/duplicate entries (same sort + very similar name)
    const key = `${info.sort}-${name.split(' ')[0]}`
    if (seenFathers.has(key)) continue
    seenFathers.add(key)
    events.push({
      id: `father-${info.sort}-${name}`,
      yearNum: info.sort,
      yearLabel: info.dates,
      category: 'father',
      title: name,
      subtitle: `Church Father · ${info.dates}`,
      targetTab: 'fathers',
    })
  }

  return events.sort((a, b) => a.yearNum - b.yearNum)
}

const ALL_EVENTS = buildTimeline()

// ── Timeline row ──────────────────────────────────────────

function EventRow({
  event, s, colors, onNavigate, isLast,
}: {
  event: TimelineEvent
  s: ReturnType<typeof makeStyles>
  colors: ThemeColors
  onNavigate: (tab: StudyTab) => void
  isLast: boolean
}) {
  const config = CATEGORY_CONFIG[event.category]

  return (
    <TouchableOpacity
      style={s.row}
      onPress={() => event.targetTab && onNavigate(event.targetTab)}
      activeOpacity={event.targetTab ? 0.7 : 1}
    >
      {/* Axis */}
      <View style={s.axisCol}>
        <View style={[s.dot, { backgroundColor: config.color }]} />
        {!isLast && <View style={[s.axisLine, { backgroundColor: colors.border }]} />}
      </View>

      {/* Content */}
      <View style={[s.content, isLast && { paddingBottom: 4 }]}>
        <View style={s.contentTop}>
          <Text style={[s.yearLabel, { color: config.color }]}>{event.yearLabel}</Text>
          {event.targetTab && (
            <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
          )}
        </View>
        <Text style={s.title}>{event.title}</Text>
        <Text style={s.subtitle} numberOfLines={2}>{event.subtitle}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Category filter chip ──────────────────────────────────

function FilterChip({
  category, active, onPress, s,
}: {
  category: EventCategory | 'all'
  active: boolean
  onPress: () => void
  s: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
  const config = category === 'all' ? null : CATEGORY_CONFIG[category]
  const color = config?.color ?? colors.accent
  const label = config?.label ?? 'All'

  return (
    <TouchableOpacity
      style={[
        s.chip,
        { borderColor: color },
        active && { backgroundColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.chipText, { color: active ? '#fff' : color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ── Main panel ────────────────────────────────────────────

interface TimelinePanelProps {
  onNavigate: (tab: StudyTab) => void
}

export default function TimelinePanel({ onNavigate }: TimelinePanelProps) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [activeCategories, setActiveCategories] = useState<Set<EventCategory>>(
    new Set(ALL_CATEGORIES)
  )

  const toggleCategory = (cat: EventCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size === 1) return prev // keep at least one
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const toggleAll = () => {
    setActiveCategories(new Set(ALL_CATEGORIES))
  }

  const isAll = activeCategories.size === ALL_CATEGORIES.length

  const filtered = useMemo(
    () => ALL_EVENTS.filter(e => activeCategories.has(e.category)),
    [activeCategories]
  )

  return (
    <View style={s.container}>
      {/* Filter chips */}
      <View style={s.filterRow}>
        <FilterChip category="all" active={isAll} onPress={toggleAll} s={s} />
        {ALL_CATEGORIES.map(cat => (
          <FilterChip
            key={cat}
            category={cat}
            active={activeCategories.has(cat)}
            onPress={() => toggleCategory(cat)}
            s={s}
          />
        ))}
      </View>

      {/* Legend summary */}
      <Text style={s.countLabel}>{filtered.length} events · 30–500 AD</Text>

      {/* Timeline list */}
      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        renderItem={({ item, index }) => (
          <EventRow
            event={item}
            s={s}
            colors={colors}
            onNavigate={onNavigate}
            isLast={index === filtered.length - 1}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No events for selected categories</Text>
          </View>
        }
      />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },

  filterRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4,
  },
  chip: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 14, borderWidth: 1.5,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  countLabel: {
    fontSize: 11, color: c.textMuted,
    paddingHorizontal: 12, paddingBottom: 6,
  },

  list: { paddingHorizontal: 12, paddingBottom: 40 },

  row: { flexDirection: 'row' },

  axisCol: { width: 28, alignItems: 'center', paddingTop: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
  axisLine: {
    flex: 1, width: 2,
    marginTop: 4,
  },

  content: { flex: 1, paddingLeft: 8, paddingTop: 12, paddingBottom: 16, gap: 2 },
  contentTop: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  yearLabel: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  subtitle: { fontSize: 13, lineHeight: 18, color: c.textSecondary },

  empty: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: c.textMuted },
})
