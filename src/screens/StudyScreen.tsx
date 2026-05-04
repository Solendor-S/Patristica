import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, StatusBar, LayoutAnimation,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { getCommentary, getCrossRefs, getJosephusForVerse } from '../db/queries'
import type { JosephusEntry } from '../db/queries'
import { getFatherInfo } from '../data/fatherDates'
import { getHistoricalForVerse, HISTORICAL_SOURCES, CATEGORY_LABEL } from '../data/historicalData'
import type { HistoricalSource } from '../data/historicalData'
import CouncilsPanel from './CouncilsPanel'
import HeresiesPanel from './HeresiesPanel'
import WordStudyPanel from './WordStudyPanel'
import { Colors } from '../theme/colors'
import type { CommentaryEntry, CrossRef, Note, RootTabParamList } from '../types'

type StudyTab = 'fathers' | 'crossrefs' | 'historical' | 'councils' | 'heresies' | 'words'
type HistMode = 'verse' | 'browse'
type NavProp = BottomTabNavigationProp<RootTabParamList, 'Study'>

// ── Entry card ────────────────────────────────────────────

function EntryCard({ entry }: { entry: CommentaryEntry }) {
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }

  const hasMore = entry.full_text.length > entry.excerpt.length
  const body = expanded ? entry.full_text : entry.excerpt
  const info = useMemo(() => getFatherInfo(entry.father_name), [entry.father_name])
  const dateLabel = info?.dates ?? entry.father_era

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.fatherInfo}>
          <Text style={styles.fatherName}>{entry.father_name}</Text>
          {!!dateLabel && <Text style={styles.fatherEra}>{dateLabel}</Text>}
        </View>
      </View>

      <Text style={styles.cardText}>{body}</Text>

      {!!entry.source && <Text style={styles.source}>{entry.source}</Text>}

      {hasMore && (
        <TouchableOpacity style={styles.expandBtn} onPress={toggle} activeOpacity={0.7}>
          <Text style={styles.expandLabel}>{expanded ? 'Show less' : 'Show more'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Cross-ref card ────────────────────────────────────────

function CrossRefCard({ item, onPress }: { item: CrossRef; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.crossRefLabel}>
        {item.ref_book} {item.ref_chapter}:{item.ref_verse}
      </Text>
      {!!item.text && <Text style={styles.crossRefText}>{item.text}</Text>}
      <View style={styles.crossRefArrow}>
        <Ionicons name="arrow-forward" size={13} color={Colors.accent} />
        <Text style={styles.crossRefGo}>Go to verse</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Historical panel ──────────────────────────────────────

const CATEGORY_COLOR: Record<string, string> = {
  ancient_author: Colors.accent,
  archaeology:    '#6dbf6d',
  manuscript:     '#7ab8e8',
  inscription:    '#b07ee8',
}

function HistoricalCard({ entry }: { entry: HistoricalSource }) {
  const [expanded, setExpanded] = useState(false)
  const PREVIEW = 280
  const hasMore = entry.description.length > PREVIEW
  const body = expanded ? entry.description : entry.description.slice(0, PREVIEW) + (hasMore ? '…' : '')

  return (
    <View style={hist.card}>
      <View style={hist.cardTop}>
        <Text style={hist.cardTitle}>{entry.title}</Text>
        {!!entry.author && <Text style={hist.cardAuthor}>{entry.author}</Text>}
      </View>
      <View style={hist.meta}>
        <View style={[hist.badge, { backgroundColor: CATEGORY_COLOR[entry.category] + '22' }]}>
          <Text style={[hist.badgeText, { color: CATEGORY_COLOR[entry.category] }]}>
            {CATEGORY_LABEL[entry.category]}
          </Text>
        </View>
        <Text style={hist.metaText}>{entry.date_desc}</Text>
        {!!entry.location && <Text style={hist.metaText}>· {entry.location}</Text>}
      </View>
      <Text style={hist.body}>{body}</Text>
      {hasMore && (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.expandBtn} activeOpacity={0.7}>
          <Text style={styles.expandLabel}>{expanded ? 'Show less' : 'Show more'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.accent} />
        </TouchableOpacity>
      )}
      <View style={hist.significance}>
        <Text style={hist.significanceLabel}>Significance</Text>
        <Text style={hist.significanceText}>{entry.significance}</Text>
      </View>
      <Text style={hist.citation}>{entry.citation}</Text>
    </View>
  )
}

function JosephusCard({ entry }: { entry: JosephusEntry }) {
  const [expanded, setExpanded] = useState(false)
  const PREVIEW = 280
  const hasMore = entry.text.length > PREVIEW
  const body = expanded ? entry.text : entry.text.slice(0, PREVIEW) + (hasMore ? '…' : '')

  return (
    <View style={hist.card}>
      <View style={hist.cardTop}>
        <Text style={hist.cardTitle}>{entry.ref}</Text>
        <Text style={hist.cardAuthor}>{entry.work}</Text>
      </View>
      <View style={hist.meta}>
        <View style={[hist.badge, { backgroundColor: CATEGORY_COLOR.ancient_author + '22' }]}>
          <Text style={[hist.badgeText, { color: CATEGORY_COLOR.ancient_author }]}>Ancient Author</Text>
        </View>
        <Text style={hist.metaText}>c. 37–100 AD</Text>
        <Text style={hist.metaText}>· Rome / Judaea</Text>
      </View>
      {!!entry.note && (
        <View style={hist.significance}>
          <Text style={hist.significanceLabel}>Context</Text>
          <Text style={hist.significanceText}>{entry.note}</Text>
        </View>
      )}
      <Text style={hist.body}>{body}</Text>
      {hasMore && (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} style={styles.expandBtn} activeOpacity={0.7}>
          <Text style={styles.expandLabel}>{expanded ? 'Show less' : 'Show more'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  )
}

function HistoricalPanel({
  selected, mode, onModeChange,
}: {
  selected: { book: string; chapter: number; verse: number } | null
  mode: HistMode
  onModeChange: (m: HistMode) => void
}) {
  const db = useSQLiteContext()
  const [josephus, setJosephus] = useState<JosephusEntry[]>([])
  const [historical, setHistorical] = useState<HistoricalSource[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode !== 'verse' || !selected) { setJosephus([]); setHistorical([]); return }
    setLoading(true)
    getJosephusForVerse(db, selected.book, selected.chapter, selected.verse)
      .then(rows => {
        setJosephus(rows)
        setHistorical(getHistoricalForVerse(selected.book, selected.chapter, selected.verse))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [mode, selected?.book, selected?.chapter, selected?.verse])

  const browseOT = useMemo(
    () => HISTORICAL_SOURCES.filter(s => s.testament === 'ot').sort((a, b) => a.sort_year - b.sort_year),
    [],
  )
  const browseNT = useMemo(
    () => HISTORICAL_SOURCES.filter(s => s.testament === 'nt').sort((a, b) => a.sort_year - b.sort_year),
    [],
  )
  const [otOpen, setOtOpen] = useState(true)
  const [ntOpen, setNtOpen] = useState(true)

  return (
    <View style={{ flex: 1 }}>
      {/* Verse / Browse All toggle */}
      <View style={hist.toggle}>
        <TouchableOpacity
          style={[hist.toggleBtn, mode === 'verse' && hist.toggleBtnActive]}
          onPress={() => onModeChange('verse')} activeOpacity={0.7}
        >
          <Text style={[hist.toggleLabel, mode === 'verse' && hist.toggleLabelActive]}>Verse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[hist.toggleBtn, mode === 'browse' && hist.toggleBtnActive]}
          onPress={() => onModeChange('browse')} activeOpacity={0.7}
        >
          <Text style={[hist.toggleLabel, mode === 'browse' && hist.toggleLabelActive]}>Browse All</Text>
        </TouchableOpacity>
      </View>

      {mode === 'verse' ? (
        !selected ? (
          <View style={styles.center}>
            <Ionicons name="earth-outline" size={52} color={Colors.border} />
            <Text style={styles.emptyTitle}>No verse selected</Text>
            <Text style={styles.emptyText}>Select a verse to see historical sources</Text>
          </View>
        ) : loading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
        ) : josephus.length === 0 && historical.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="earth-outline" size={52} color={Colors.border} />
            <Text style={styles.emptyTitle}>No historical sources</Text>
            <Text style={styles.emptyText}>No external sources recorded for this verse</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.list, { gap: 10 }]}>
            {josephus.map((e, i) => <JosephusCard key={`jos-${i}`} entry={e} />)}
            {historical.map(e => <HistoricalCard key={e.source_key} entry={e} />)}
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { gap: 0 }]}>
          <TouchableOpacity style={hist.sectionToggle} onPress={() => setOtOpen(o => !o)} activeOpacity={0.7}>
            <Ionicons name={otOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={Colors.textMuted} />
            <Text style={hist.sectionHeader}>Old Testament</Text>
            <Text style={hist.sectionCount}>{browseOT.length} sources</Text>
          </TouchableOpacity>
          {otOpen && browseOT.map(e => <HistoricalCard key={e.source_key} entry={e} />)}

          <TouchableOpacity style={[hist.sectionToggle, { marginTop: 12 }]} onPress={() => setNtOpen(o => !o)} activeOpacity={0.7}>
            <Ionicons name={ntOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={Colors.textMuted} />
            <Text style={hist.sectionHeader}>New Testament</Text>
            <Text style={hist.sectionCount}>{browseNT.length} sources + Josephus</Text>
          </TouchableOpacity>
          {ntOpen && browseNT.map(e => <HistoricalCard key={e.source_key} entry={e} />)}
          {ntOpen && (
            <View style={hist.josephusNote}>
              <Text style={hist.josephusNoteText}>
                Flavius Josephus (c. 37–100 AD) references appear in Verse mode when you select a verse. His works — <Text style={{ fontStyle: 'italic' }}>Antiquities of the Jews</Text> and <Text style={{ fontStyle: 'italic' }}>The Jewish War</Text> — are the primary non-biblical source for the NT world.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────

export default function StudyScreen() {
  const db = useSQLiteContext()
  const { selected } = useSelectedVerse()
  const navigation = useNavigation<NavProp>()

  const [activeTab, setActiveTab] = useState<StudyTab>('fathers')
  const [entries, setEntries] = useState<CommentaryEntry[]>([])
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([])
  const [histMode, setHistMode] = useState<HistMode>('verse')
  const [loadingFathers, setLoadingFathers] = useState(false)
  const [loadingRefs, setLoadingRefs] = useState(false)

  useEffect(() => {
    if (!selected) { setEntries([]); setCrossRefs([]); return }

    setLoadingFathers(true)
    getCommentary(db, selected.book, selected.chapter, selected.verse)
      .then(rows => {
        const sorted = [...rows].sort((a, b) => {
          const aSort = getFatherInfo(a.father_name)?.sort ?? 9999
          const bSort = getFatherInfo(b.father_name)?.sort ?? 9999
          return aSort - bSort
        })
        setEntries(sorted)
        setLoadingFathers(false)
      })
      .catch(() => setLoadingFathers(false))

    setLoadingRefs(true)
    getCrossRefs(db, selected.book, selected.chapter, selected.verse)
      .then(rows => { setCrossRefs(rows); setLoadingRefs(false) })
      .catch(() => setLoadingRefs(false))

  }, [selected?.book, selected?.chapter, selected?.verse])

  const verseRef = selected
    ? `${selected.book} ${selected.chapter}:${selected.verse}`
    : null

  const goToVerse = (ref: CrossRef) => {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: ref.ref_book, chapter: ref.ref_chapter, verse: ref.ref_verse },
    })
  }

  const loading = activeTab === 'fathers' ? loadingFathers : activeTab === 'crossrefs' ? loadingRefs : false
  const count   = activeTab === 'fathers' ? entries.length : crossRefs.length

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Study</Text>
          {verseRef && <Text style={styles.verseRef}>{verseRef}</Text>}
        </View>
        {!loading && count > 0 && (
          <Text style={styles.entryCount}>{count} {count === 1 ? 'entry' : 'entries'}</Text>
        )}
      </View>

      {/* Tab bar — always visible */}
      <View style={styles.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.tabBarContent}
        >
          {([
            { key: 'words',      label: 'Words' },
            { key: 'fathers',    label: 'Church Fathers', badge: entries.length   || undefined },
            { key: 'crossrefs',  label: 'Cross-Refs',    badge: crossRefs.length || undefined },
            { key: 'historical', label: 'Historical' },
            { key: 'councils',   label: 'Councils' },
            { key: 'heresies',   label: 'Heresies' },
          ] as Array<{ key: StudyTab; label: string; badge?: number }>).map(tab => {
            const active = activeTab === tab.key
            return (
              <TouchableOpacity key={tab.key} style={styles.tab} onPress={() => setActiveTab(tab.key)} activeOpacity={0.7}>
                <View style={styles.tabInner}>
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                  {!!tab.badge && (
                    <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                      <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{tab.badge}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.tabIndicator, { backgroundColor: active ? Colors.accent : 'transparent' }]} />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {/* Loading */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.accent} size="large" />
          </View>
        )}

        {/* Fathers list */}
        {!loading && activeTab === 'fathers' && (
          !selected ? (
            <View style={styles.center}>
              <Ionicons name="book-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyTitle}>No verse selected</Text>
              <Text style={styles.emptyText}>Tap a verse in the Bible tab to see Church Fathers commentary</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="chatbubble-ellipses-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyTitle}>No commentary found</Text>
              <Text style={styles.emptyText}>No patristic commentary recorded for {verseRef}</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={e => e.id.toString()}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => <EntryCard entry={item} />}
            />
          )
        )}

        {/* Cross-refs list */}
        {!loading && activeTab === 'crossrefs' && (
          !selected ? (
            <View style={styles.center}>
              <Ionicons name="book-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyTitle}>No verse selected</Text>
              <Text style={styles.emptyText}>Tap a verse in the Bible tab to see cross-references</Text>
            </View>
          ) : crossRefs.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="git-branch-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyTitle}>No cross-references</Text>
              <Text style={styles.emptyText}>No cross-references recorded for {verseRef}</Text>
            </View>
          ) : (
            <FlatList
              data={crossRefs}
              keyExtractor={r => `${r.ref_book}-${r.ref_chapter}-${r.ref_verse}`}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <CrossRefCard item={item} onPress={() => goToVerse(item)} />
              )}
            />
          )
        )}

        {/* Words / Strong's */}
        {activeTab === 'words' && (
          !selected ? (
            <View style={styles.center}>
              <Ionicons name="book-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyTitle}>No verse selected</Text>
              <Text style={styles.emptyText}>Tap a verse in the Bible tab to study its words</Text>
            </View>
          ) : (
            <WordStudyPanel selected={selected} />
          )
        )}

        {/* Historical */}
        {activeTab === 'historical' && (
          <HistoricalPanel
            selected={selected}
            mode={histMode}
            onModeChange={setHistMode}
          />
        )}

        {/* Councils */}
        {activeTab === 'councils' && <CouncilsPanel />}

        {/* Heresies */}
        {activeTab === 'heresies' && <HeresiesPanel />}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title:      { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  verseRef:   { fontSize: 13, color: Colors.accent, fontWeight: '600', marginTop: 2 },
  entryCount: {
    fontSize: 12, color: Colors.textMuted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4,
  },

  tabBar: {
    height: 48,
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    height: 48,
    alignItems: 'stretch',
  },
  tab: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
    paddingHorizontal: 14,
    height: 48,
  },
  tabInner: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingBottom: 8, flex: 1,
  },
  tabIndicator: {
    height: 2, borderRadius: 1, alignSelf: 'stretch',
  },
  tabLabel:      { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabLabelActive:{ color: Colors.accent },
  tabBadge: {
    backgroundColor: Colors.bgTertiary, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  tabBadgeActive:    { backgroundColor: Colors.accentDim },
  tabBadgeText:      { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  tabBadgeTextActive:{ color: Colors.accent },

  list: { padding: 12, paddingBottom: 40, gap: 10 },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  fatherInfo: { flex: 1 },
  fatherName: { fontSize: 15, fontWeight: '700', color: Colors.textAccent },
  fatherEra:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  cardText: { fontSize: 15, lineHeight: 24, color: Colors.textPrimary },
  source:   { fontSize: 12, color: Colors.textMuted, marginTop: 8, fontStyle: 'italic' },

  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-start',
  },
  expandLabel: { fontSize: 13, color: Colors.accent, fontWeight: '600' },

  crossRefLabel: { fontSize: 15, fontWeight: '700', color: Colors.textAccent, marginBottom: 6 },
  crossRefText:  { fontSize: 14, lineHeight: 22, color: Colors.textPrimary },
  crossRefArrow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-end',
  },
  crossRefGo: { fontSize: 12, color: Colors.accent, fontWeight: '600' },

  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
})

const hist = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    margin: 12,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
  },
  toggleBtnActive:   { backgroundColor: Colors.bgCard },
  toggleLabel:       { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  toggleLabelActive: { color: Colors.textPrimary },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border,
    marginBottom: 10, gap: 8,
  },
  cardTop:   { gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textAccent },
  cardAuthor:{ fontSize: 12, color: Colors.textMuted },

  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaText:  { fontSize: 11, color: Colors.textMuted },

  body: { fontSize: 14, lineHeight: 22, color: Colors.textPrimary },

  significance: { backgroundColor: Colors.bgTertiary, borderRadius: 8, padding: 10, gap: 4 },
  significanceLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  significanceText:  { fontSize: 13, lineHeight: 20, color: Colors.textSecondary },

  citation: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },

  sectionToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 12, color: Colors.textMuted, marginLeft: 'auto',
  },
  josephusNote: {
    backgroundColor: Colors.bgTertiary, borderRadius: 10,
    padding: 12, marginTop: 10,
  },
  josephusNoteText: { fontSize: 13, lineHeight: 20, color: Colors.textMuted },
})

