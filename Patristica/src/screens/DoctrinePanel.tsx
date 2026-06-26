import React, { useCallback, useMemo, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, LayoutAnimation,
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
import { searchCommentaryByKeywords } from '../db/queries'
import type { CommentaryEntryWithRef } from '../db/queries'
import { getFatherInfo } from '../data/fatherDates'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'


// ── Verse-ref parser ──────────────────────────────────────
// Matches "Titus 3:5", "1 Corinthians 12:3", "Song of Songs 1:2", etc.
// Non-global source — a fresh regex is created per call via matchAll, no lastIndex state.
const VERSE_RE_SRC = /\b((?:[1-4]\s+)?[A-Z][a-zA-Z]+(?:\s+of\s+[A-Za-z]+)?)\s+(\d+):(\d+)\b/

type TextSegment =
  | { type: 'text'; content: string }
  | { type: 'ref'; raw: string; book: string; chapter: number; verse: number }

function parseVerseRefs(text: string): TextSegment[] {
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

function DoctrineEntryCard({ entry }: { entry: CommentaryEntryWithRef }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [expanded, setExpanded] = useState(false)

  const info = useMemo(() => getFatherInfo(entry.father_name), [entry.father_name])
  const hasMore = entry.full_text.length > entry.excerpt.length
  const body = expanded ? entry.full_text : entry.excerpt

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }, [])

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.traditionDot, { backgroundColor: TRADITION_COLORS[info?.tradition ?? ''] ?? '#94a3b8' }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.fatherName}>{entry.father_name}</Text>
          {!!info?.dates && <Text style={styles.fatherDates}>{info.dates}{info.tradition ? ` · ${info.tradition}` : ''}</Text>}
        </View>
        {!!entry.book && (
          <Text style={styles.verseRef}>{entry.book} {entry.chapter}:{entry.verse}</Text>
        )}
      </View>
      <Text style={styles.excerpt}>{body}</Text>
      {!!entry.source && <Text style={styles.source}>{entry.source}</Text>}
      {hasMore && (
        <TouchableOpacity style={styles.expandBtn} onPress={toggle} activeOpacity={0.7}>
          <Text style={styles.expandLabel}>{expanded ? 'Show less' : 'Show more'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accent} />
        </TouchableOpacity>
      )}
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
  | { type: 'entry'; entry: CommentaryEntryWithRef }

export default function DoctrinePanel() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const db = useSQLiteContext()
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>()
  const { setSelected: setSelectedVerse } = useSelectedVerse()

  const [selected, setSelected] = useState<Doctrine | null>(null)
  const [previewVerse, setPreviewVerse] = useState<{ book: string; chapter: number; verse: number } | null>(null)

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
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<CommentaryEntryWithRef[]>([])

  const selectDoctrine = useCallback(async (doctrine: Doctrine) => {
    if (selected?.id === doctrine.id) { setSelected(null); setResults([]); return }
    setSelected(doctrine)
    setLoading(true)
    try {
      const rows = await searchCommentaryByKeywords(db, doctrine.keywords)
      setResults(rows)
    } finally {
      setLoading(false)
    }
  }, [db, selected?.id])

  // Sort by father sort year, then group by era
  const listItems = useMemo((): ListItem[] => {
    if (results.length === 0) return []

    const sorted = [...results].sort((a, b) => {
      const sortA = getFatherInfo(a.father_name)?.sort ?? 9999
      const sortB = getFatherInfo(b.father_name)?.sort ?? 9999
      return sortA - sortB
    })

    const items: ListItem[] = []
    let currentEra = ''
    for (const entry of sorted) {
      const fSort = getFatherInfo(entry.father_name)?.sort ?? 9999
      const era = DOCTRINE_ERAS.find(e => fSort <= e.maxSort)?.label ?? 'Medieval'
      if (era !== currentEra) {
        items.push({ type: 'era', label: era })
        currentEra = era
      }
      items.push({ type: 'entry', entry })
    }
    return items
  }, [results])

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
              onPress={() => selectDoctrine(d)}
              activeOpacity={0.7}
            >
              <Text style={[styles.doctrineChipText, active && styles.doctrineChipTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>


      {/* Results */}
      {!selected ? (
        <View style={styles.empty}>
          <Ionicons name="library-outline" size={52} color={colors.border} />
          <Text style={styles.emptyTitle}>Select a doctrine</Text>
          <Text style={styles.emptyText}>See how the church fathers developed their teaching over the centuries</Text>
        </View>
      ) : loading ? (
        <>
          <OverviewCard doctrine={selected} onVerseRef={handleVerseRef} />
          <View style={styles.empty}><ActivityIndicator color={colors.accent} size="large" /></View>
        </>
      ) : listItems.length === 0 ? (
        <>
          <OverviewCard doctrine={selected} onVerseRef={handleVerseRef} />
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={52} color={colors.border} />
            <Text style={styles.emptyTitle}>No results</Text>
            <Text style={styles.emptyText}>No commentary found for {selected.label}</Text>
          </View>
        </>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item, i) => item.type === 'era' ? `era-${item.label}` : `${item.entry.id}-${i}`}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<OverviewCard doctrine={selected} onVerseRef={handleVerseRef} />}
          renderItem={({ item }) =>
            item.type === 'era'
              ? <EraHeader label={item.label} />
              : <DoctrineEntryCard entry={item.entry} />
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

  descRow: {
    paddingHorizontal: 14, paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  descText: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },

  eraHeader: {
    paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4,
  },
  eraLabel: {
    fontSize: 11, fontWeight: '700', color: c.accent,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  card: {
    backgroundColor: c.bgCard, borderRadius: 12,
    padding: 13, marginHorizontal: 12, marginBottom: 8, gap: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  traditionDot: { width: 9, height: 9, borderRadius: 5, marginTop: 3, flexShrink: 0 },
  fatherName: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  fatherDates: { fontSize: 11, color: c.textMuted },
  verseRef: { fontSize: 11, color: c.accent, fontWeight: '600', flexShrink: 0 },
  excerpt: { fontSize: 13, color: c.textSecondary, lineHeight: 19 },
  source: { fontSize: 11, color: c.textMuted, fontStyle: 'italic' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  expandLabel: { fontSize: 12, color: c.accent, fontWeight: '500' },

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

  list: { paddingBottom: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary },
  emptyText: { fontSize: 13, color: c.textMuted, textAlign: 'center', lineHeight: 19 },
})
