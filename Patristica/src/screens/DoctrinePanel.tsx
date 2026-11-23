import React, { useCallback, useMemo, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, LayoutAnimation, Linking,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import type { RootTabParamList } from '../types'
import { ScripturePreviewModal } from './ScripturePreviewModal'
import { TRADITION_COLORS } from '../data/traditionColors'
import { DOCTRINES, DOCTRINE_ERAS } from '../data/doctrines'
import type { Doctrine } from '../data/doctrines'
import { DOCTRINE_ENTRIES } from '../data/doctrineEntries'
import type { DoctrineEntry } from '../data/doctrineEntries'
import { getFatherInfo } from '../data/fatherDates'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'


// ── Verse-ref parser ──────────────────────────────────────
// Matches "Titus 3:5", "1 Corinthians 12:3", "Song of Songs 1:2", etc.
// Non-global source — a fresh regex is created per call via matchAll, no lastIndex state.
const VERSE_RE_SRC = /\b((?:[1-4]\s+)?[A-Z][a-zA-Z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+):(\d+)\b/

export type TextSegment =
  | { type: 'text'; content: string }
  | { type: 'ref'; raw: string; book: string; chapter: number; verse: number }

export function parseVerseRefs(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let last = 0
  for (const m of text.matchAll(new RegExp(VERSE_RE_SRC.source, 'g'))) {
    if (m.index! > last) segments.push({ type: 'text', content: text.slice(last, m.index) })
    segments.push({ type: 'ref', raw: m[0], book: m[1].trim(), chapter: parseInt(m[2]), verse: parseInt(m[3]) })
    last = m.index! + m[0].length
  }
  if (last < text.length) segments.push({ type: 'text', content: text.slice(last) })
  return segments
}

type VerseRef = { book: string; chapter: number; verse: number }

// ── Overview card ─────────────────────────────────────────

function OverviewCard({ doctrine, onVerseRef }: {
  doctrine: Doctrine
  onVerseRef: (book: string, chapter: number, verse: number) => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const segments = useMemo(() => parseVerseRefs(doctrine.development), [doctrine.development])
  return (
    <View style={styles.overviewCard}>
      <Text style={styles.overviewTitle}>How this doctrine developed</Text>
      <Text style={styles.overviewText}>
        {segments.map((seg, i) =>
          seg.type === 'text' ? seg.content : (
            <Text
              key={i}
              style={{ color: colors.accent, fontWeight: '600' }}
              onPress={() => onVerseRef(seg.book, seg.chapter, seg.verse)}
            >
              {seg.raw}
            </Text>
          )
        )}
      </Text>
    </View>
  )
}

// ── Entry card ────────────────────────────────────────────

function parseVerse(v?: string): VerseRef | null {
  const m = v?.match(/^(.+) (\d+):(\d+)$/)
  return m ? { book: m[1], chapter: +m[2], verse: +m[3] } : null
}

function DoctrineEntryCard({ entry, onVerseRef }: {
  entry: DoctrineEntry
  onVerseRef: (book: string, chapter: number, verse: number) => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [expanded, setExpanded] = useState(false)
  const info = useMemo(() => getFatherInfo(entry.father), [entry.father])
  const verse = useMemo(() => parseVerse(entry.verse), [entry.verse])

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }, [])

  // Expanded: the context paragraph with the key quote highlighted inside it.
  const body = useMemo(() => {
    if (!expanded || !entry.context) return <Text style={styles.quote}>{entry.quote}</Text>
    const at = entry.context.indexOf(entry.quote)
    if (at < 0) return <Text style={styles.contextText}>{entry.context}</Text>
    return (
      <Text style={styles.contextText}>
        {entry.context.slice(0, at)}
        <Text style={styles.quoteInContext}>{entry.quote}</Text>
        {entry.context.slice(at + entry.quote.length)}
      </Text>
    )
  }, [expanded, entry.context, entry.quote, styles])

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.traditionDot, { backgroundColor: TRADITION_COLORS[info?.tradition ?? ''] ?? '#94a3b8' }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.fatherName}>{entry.father}</Text>
          <Text style={styles.workLine}>
            {entry.work}{entry.ref ? `, ${entry.ref}` : ''} · c. {entry.year}
          </Text>
        </View>
        {!!entry.tag && <Text style={styles.tag}>{entry.tag}</Text>}
      </View>

      {body}
      {!!entry.note && <Text style={styles.note}>{entry.note}</Text>}

      <View style={styles.actions}>
        {!!entry.context && (
          <TouchableOpacity style={styles.action} onPress={toggle} activeOpacity={0.7}>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={colors.accent} />
            <Text style={styles.actionLabel}>{expanded ? 'Hide context' : 'Show context'}</Text>
          </TouchableOpacity>
        )}
        {verse && (
          <TouchableOpacity style={styles.action} onPress={() => onVerseRef(verse.book, verse.chapter, verse.verse)} activeOpacity={0.7}>
            <Ionicons name="book-outline" size={13} color={colors.accent} />
            <Text style={styles.actionLabel}>{entry.verse}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.action} onPress={() => Linking.openURL(entry.url)} activeOpacity={0.7}>
          <Ionicons name="open-outline" size={13} color={colors.accent} />
          <Text style={styles.actionLabel}>Read in full</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Era header ────────────────────────────────────────────

function EraHeader({ label }: { label: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.eraHeader}>
      <Text style={styles.eraLabel}>{label}</Text>
    </View>
  )
}

// ── Main panel ────────────────────────────────────────────

type ListItem =
  | { type: 'era'; label: string }
  | { type: 'entry'; entry: DoctrineEntry }

export default function DoctrinePanel() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const db = useSQLiteContext()
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>()
  const { setSelected: setSelectedVerse } = useSelectedVerse()

  const [selected, setSelected] = useState<Doctrine | null>(null)
  const [previewVerse, setPreviewVerse] = useState<VerseRef | null>(null)

  const handleVerseRef = useCallback((book: string, chapter: number, verse: number) => {
    setPreviewVerse({ book, chapter, verse })
  }, [])

  const handlePreviewNavigate = useCallback((book: string, chapter: number, verse: number) => {
    setPreviewVerse(null)
    setSelectedVerse({ book, chapter, verse })
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book, chapter, verse, earlyText: false, apocrypha: false },
    })
  }, [navigation, setSelectedVerse])

  // Curated entries arrive sorted by year; group them by era.
  const listItems = useMemo((): ListItem[] => {
    if (!selected) return []
    const items: ListItem[] = []
    let currentEra = ''
    for (const entry of DOCTRINE_ENTRIES[selected.id] ?? []) {
      const era = DOCTRINE_ERAS.find(e => entry.year <= e.maxYear)?.label ?? 'Medieval'
      if (era !== currentEra) {
        items.push({ type: 'era', label: era })
        currentEra = era
      }
      items.push({ type: 'entry', entry })
    }
    return items
  }, [selected])

  return (
    <View style={{ flex: 1 }}>
      {/* Doctrine picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pickerScroll}
        contentContainerStyle={styles.pickerContent}
      >
        {DOCTRINES.map(d => {
          const active = selected?.id === d.id
          return (
            <TouchableOpacity
              key={d.id}
              style={[styles.doctrineChip, active && styles.doctrineChipActive]}
              onPress={() => setSelected(active ? null : d)}
              activeOpacity={0.7}
            >
              <Text style={[styles.doctrineChipText, active && styles.doctrineChipTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <Text style={styles.disclaimer}>
        Views expressed by Church Fathers may not reflect biblical teachings. Cross-reference with Scripture.
      </Text>

      {!selected ? (
        <View style={styles.empty}>
          <Ionicons name="library-outline" size={52} color={colors.border} />
          <Text style={styles.emptyTitle}>Select a doctrine</Text>
          <Text style={styles.emptyText}>See how the church fathers developed their teaching over the centuries</Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item, i) => item.type === 'era' ? `era-${item.label}` : `${item.entry.father}-${item.entry.ref}-${i}`}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<OverviewCard doctrine={selected} onVerseRef={handleVerseRef} />}
          ListFooterComponent={
            <Text style={styles.footer}>
              Translations: Ante-Nicene and Nicene & Post-Nicene Fathers (public domain), via New Advent.
            </Text>
          }
          renderItem={({ item }) =>
            item.type === 'era'
              ? <EraHeader label={item.label} />
              : <DoctrineEntryCard entry={item.entry} onVerseRef={handleVerseRef} />
          }
        />
      )}

      {!!previewVerse && (
        <ScripturePreviewModal
          db={db}
          book={previewVerse.book}
          chapter={previewVerse.chapter}
          verse={previewVerse.verse}
          translation="KJV"
          colors={colors}
          onClose={() => setPreviewVerse(null)}
          onNavigate={handlePreviewNavigate}
        />
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  pickerScroll: { flexGrow: 0, flexShrink: 0 },
  pickerContent: { paddingHorizontal: 12, paddingVertical: 12, gap: 8, alignItems: 'center' as const },
  doctrineChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 18, borderWidth: 1.5, borderColor: c.border,
    backgroundColor: c.bgCard,
  },
  doctrineChipActive: { backgroundColor: c.accent, borderColor: c.accent },
  doctrineChipText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  doctrineChipTextActive: { color: '#fff' },

  disclaimer: {
    fontSize: 11, color: c.textMuted, fontStyle: 'italic',
    lineHeight: 16, marginHorizontal: 14, marginBottom: 6, opacity: 0.8,
  },

  eraHeader: {
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4,
  },
  eraLabel: {
    fontSize: 11, fontWeight: '700', color: c.accent,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  card: {
    backgroundColor: c.bgCard, borderRadius: 12,
    padding: 13, marginHorizontal: 12, marginBottom: 8, gap: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  traditionDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  fatherName: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  workLine: { fontSize: 11, color: c.textMuted, marginTop: 1 },
  tag: {
    fontSize: 10, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.textMuted, overflow: 'hidden',
  },
  quote: { fontSize: 14, color: c.textPrimary, lineHeight: 22 },
  contextText: { fontSize: 13, color: c.textSecondary, lineHeight: 20 },
  quoteInContext: { color: c.textPrimary, fontWeight: '600' },
  note: { fontSize: 12, color: c.textMuted, fontStyle: 'italic', lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 12, color: c.accent, fontWeight: '600' },

  overviewCard: {
    marginHorizontal: 12, marginTop: 10, marginBottom: 4,
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: c.accent,
  },
  overviewTitle: {
    fontSize: 11, fontWeight: '700', color: c.accent,
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8,
  },
  overviewText: {
    fontSize: 13, color: c.textSecondary, lineHeight: 20,
  },

  footer: { fontSize: 11, color: c.textMuted, fontStyle: 'italic', textAlign: 'center', padding: 16 },
  list: { paddingBottom: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary },
  emptyText: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 19 },
})
