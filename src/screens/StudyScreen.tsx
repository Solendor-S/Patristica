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
import { useWordFocus } from '../context/WordFocusContext'
import { getCommentary, getCrossRefs, getJosephusForVerse, getVariantsForVerse, getVerseText, getMaxVerse } from '../db/queries'
import type { JosephusEntry } from '../db/queries'
import type { TextualVariant } from '../types'
import { getFatherInfo } from '../data/fatherDates'
import { stripUsfm } from '../data/redLetter'
import { getHistoricalForVerse, HISTORICAL_SOURCES, CATEGORY_LABEL } from '../data/historicalData'
import type { HistoricalSource } from '../data/historicalData'
import CouncilsPanel from './CouncilsPanel'
import HeresiesPanel from './HeresiesPanel'
import WordStudyPanel from './WordStudyPanel'
import OverviewPanel from './OverviewPanel'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { CommentaryEntry, CrossRef, Note, RootTabParamList } from '../types'

type StudyTab = 'fathers' | 'crossrefs' | 'historical' | 'councils' | 'heresies' | 'words' | 'overview'
type HistMode = 'verse' | 'browse'
type NavProp = BottomTabNavigationProp<RootTabParamList, 'Study'>

// ── Entry card ────────────────────────────────────────────

function EntryCard({ entry }: { entry: CommentaryEntry }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
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
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Cross-ref card ────────────────────────────────────────

function CrossRefCard({ item, onPress }: { item: CrossRef; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.crossRefLabel}>
        {item.ref_book} {item.ref_chapter}:{item.ref_verse}
      </Text>
      {!!item.text && <Text style={styles.crossRefText}>{stripUsfm(item.text).replace(/¶\s*/g, '').replace(/[{}]/g, '')}</Text>}
      <View style={styles.crossRefArrow}>
        <Ionicons name="arrow-forward" size={13} color={colors.accent} />
        <Text style={styles.crossRefGo}>Go to verse</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Historical panel ──────────────────────────────────────

function getCategoryColor(accent: string): Record<string, string> {
  return {
    ancient_author: accent,
    archaeology:    '#6dbf6d',
    manuscript:     '#7ab8e8',
    inscription:    '#b07ee8',
  }
}

function HistoricalCard({ entry }: { entry: HistoricalSource }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const hist = useMemo(() => makeHist(colors), [colors])
  const CATEGORY_COLOR = useMemo(() => getCategoryColor(colors.accent), [colors.accent])
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
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accent} />
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
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const hist = useMemo(() => makeHist(colors), [colors])
  const CATEGORY_COLOR = useMemo(() => getCategoryColor(colors.accent), [colors.accent])
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
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accent} />
        </TouchableOpacity>
      )}
    </View>
  )
}

const VARIANT_BADGE_COLOR: Record<string, string> = {
  // OT — manuscript / scribal
  K: '#b07ee8', D: '#6dbf6d', A: '#7ab8e8', B: '#7ab8e8',
  C: '#7ab8e8', H: '#b07ee8', S: '#b07ee8', L: '#7ab8e8',
  X: '#e8c47a', E: '#e89a7a', R: '#e89a7a',
  // NT — critical texts
  WH: '#6dbf6d', Treg: '#7ab8e8', RP: '#b07ee8', NIV: '#e8c47a',
}

function VariantCard({ variant }: { variant: TextualVariant }) {
  const { colors } = useTheme()
  const vari = useMemo(() => makeVari(colors), [colors])
  const isOT = variant.testament === 'ot'
  const badgeColor = VARIANT_BADGE_COLOR[variant.variant_source] ?? colors.accent
  const hasReadings = !!(variant.main_english || variant.variant_english ||
                         variant.main_hebrew || variant.variant_hebrew)

  return (
    <View style={vari.card}>
      <View style={vari.header}>
        <View style={[vari.badge, { backgroundColor: badgeColor + '28' }]}>
          <Text style={[vari.badgeText, { color: badgeColor }]}>{variant.variant_source}</Text>
        </View>
        <Text style={vari.sourceLabel} numberOfLines={1}>{variant.variant_source_label}</Text>
        {!!variant.word_ref && <Text style={vari.wordRef}>{variant.word_ref}</Text>}
      </View>

      {!!variant.description && (
        <Text style={vari.description}>{variant.description}</Text>
      )}

      {hasReadings && (
        <View style={vari.readings}>
          {!!(variant.main_english || variant.main_hebrew) && (
            <View style={vari.readingRow}>
              <Text style={vari.readingLabel}>Standard</Text>
              <View style={vari.readingTexts}>
                {isOT && !!variant.main_hebrew && (
                  <Text style={vari.hebrew}>{variant.main_hebrew}</Text>
                )}
                {!!variant.main_english && (
                  <Text style={vari.readingText}>{variant.main_english}</Text>
                )}
              </View>
            </View>
          )}
          {!!(variant.variant_english || variant.variant_hebrew) && (
            <View style={[vari.readingRow, vari.readingRowAlt]}>
              <Text style={[vari.readingLabel, vari.readingLabelAlt]}>Variant</Text>
              <View style={vari.readingTexts}>
                {isOT && !!variant.variant_hebrew && (
                  <Text style={vari.hebrew}>{variant.variant_hebrew}</Text>
                )}
                {!!variant.variant_english && (
                  <Text style={vari.readingText}>{variant.variant_english}</Text>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

function VariantsSection({ variants }: { variants: TextualVariant[] }) {
  const { colors } = useTheme()
  const vari = useMemo(() => makeVari(colors), [colors])
  const [open, setOpen] = useState(true)
  if (variants.length === 0) return null

  return (
    <View style={vari.section}>
      <TouchableOpacity
        style={vari.sectionHeader}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.textMuted} />
        <Text style={vari.sectionTitle}>Textual Variants</Text>
        <View style={vari.sectionBadge}>
          <Text style={vari.sectionBadgeText}>{variants.length}</Text>
        </View>
      </TouchableOpacity>
      {open && variants.map(v => <VariantCard key={v.id} variant={v} />)}
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
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const hist = useMemo(() => makeHist(colors), [colors])
  const db = useSQLiteContext()
  const [josephus, setJosephus] = useState<JosephusEntry[]>([])
  const [historical, setHistorical] = useState<HistoricalSource[]>([])
  const [variants, setVariants] = useState<TextualVariant[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode !== 'verse' || !selected) {
      setJosephus([]); setHistorical([]); setVariants([]); return
    }
    setLoading(true)
    Promise.all([
      getJosephusForVerse(db, selected.book, selected.chapter, selected.verse),
      getVariantsForVerse(db, selected.book, selected.chapter, selected.verse),
    ]).then(([jos, vars]) => {
      setJosephus(jos)
      setHistorical(getHistoricalForVerse(selected.book, selected.chapter, selected.verse))
      setVariants(vars)
      setLoading(false)
    }).catch(() => setLoading(false))
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
            <Ionicons name="earth-outline" size={52} color={colors.border} />
            <Text style={styles.emptyTitle}>No verse selected</Text>
            <Text style={styles.emptyText}>Select a verse to see historical sources</Text>
          </View>
        ) : loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
        ) : josephus.length === 0 && historical.length === 0 && variants.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="earth-outline" size={52} color={colors.border} />
            <Text style={styles.emptyTitle}>No historical sources</Text>
            <Text style={styles.emptyText}>No external sources recorded for this verse</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.list, { gap: 10 }]}>
            {josephus.map((e, i) => <JosephusCard key={`jos-${i}`} entry={e} />)}
            {historical.map(e => <HistoricalCard key={e.source_key} entry={e} />)}
            <VariantsSection variants={variants} />
          </ScrollView>
        )
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { gap: 0 }]}>
          <TouchableOpacity style={hist.sectionToggle} onPress={() => setOtOpen(o => !o)} activeOpacity={0.7}>
            <Ionicons name={otOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.textMuted} />
            <Text style={hist.sectionHeader}>Old Testament</Text>
            <Text style={hist.sectionCount}>{browseOT.length} sources</Text>
          </TouchableOpacity>
          {otOpen && browseOT.map(e => <HistoricalCard key={e.source_key} entry={e} />)}

          <TouchableOpacity style={[hist.sectionToggle, { marginTop: 12 }]} onPress={() => setNtOpen(o => !o)} activeOpacity={0.7}>
            <Ionicons name={ntOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.textMuted} />
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
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const db = useSQLiteContext()
  const { selected, setSelected } = useSelectedVerse()
  const navigation = useNavigation<NavProp>()

  const [activeTab, setActiveTab] = useState<StudyTab>('fathers')
  const { wordFocus } = useWordFocus()

  useEffect(() => {
    if (wordFocus && activeTab !== 'words') setActiveTab('words')
  }, [wordFocus, activeTab])
  const [entries, setEntries] = useState<CommentaryEntry[]>([])
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([])
  const [histMode, setHistMode] = useState<HistMode>('verse')
  const [loadingFathers, setLoadingFathers] = useState(false)
  const [loadingRefs, setLoadingRefs] = useState(false)
  const [verseText, setVerseText] = useState<string | null>(null)
  const [maxVerse, setMaxVerse] = useState(1)

  useEffect(() => {
    if (!selected) { setVerseText(null); return }
    Promise.all([
      getVerseText(db, selected.book, selected.chapter, selected.verse),
      getMaxVerse(db, selected.book, selected.chapter),
    ]).then(([text, max]) => {
      setVerseText(text ? stripUsfm(text).replace(/¶\s*/g, '') : text)
      setMaxVerse(max ?? 1)
    }).catch(() => {})
  }, [selected?.book, selected?.chapter, selected?.verse])

  const stepVerse = useCallback((delta: number) => {
    if (!selected) return
    const next = selected.verse + delta
    if (next < 1 || next > maxVerse) return
    setSelected({ book: selected.book, chapter: selected.chapter, verse: next })
  }, [selected, maxVerse, setSelected])

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

  const goToVerse = useCallback((ref: CrossRef) => {
    setSelected({ book: ref.ref_book, chapter: ref.ref_chapter, verse: ref.ref_verse })
    try {
      // In split-pane mode this screen runs in an independent NavigationContainer
      // and can't reach the Bible tab — setSelected above handles the Reader update.
      navigation.navigate('Bible' as any, {
        screen: 'Reader',
        params: { book: ref.ref_book, chapter: ref.ref_chapter, verse: ref.ref_verse },
      })
    } catch {}
  }, [navigation, setSelected])

  const loading = activeTab === 'fathers' ? loadingFathers : activeTab === 'crossrefs' ? loadingRefs : false
  const count   = activeTab === 'fathers' ? entries.length : crossRefs.length

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Study</Text>
          {verseRef && (
            <View style={styles.verseRefRow}>
              <TouchableOpacity
                onPress={() => stepVerse(-1)}
                disabled={!selected || selected.verse <= 1}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={14}
                  color={selected && selected.verse > 1 ? colors.accent : colors.border}
                />
              </TouchableOpacity>
              <Text style={styles.verseRef}>{verseRef}</Text>
              <TouchableOpacity
                onPress={() => stepVerse(1)}
                disabled={!selected || selected.verse >= maxVerse}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={selected && selected.verse < maxVerse ? colors.accent : colors.border}
                />
              </TouchableOpacity>
            </View>
          )}
          {verseText && (
            <Text style={styles.versePreview} numberOfLines={2}>{verseText}</Text>
          )}
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
            { key: 'overview',   label: 'Overview' },
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
                <View style={[styles.tabIndicator, { backgroundColor: active ? colors.accent : 'transparent' }]} />
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {/* Loading */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {/* Fathers list */}
        {!loading && activeTab === 'fathers' && (
          !selected ? (
            <View style={styles.center}>
              <Ionicons name="book-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>No verse selected</Text>
              <Text style={styles.emptyText}>Tap a verse in the Bible tab to see Church Fathers commentary</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="chatbubble-ellipses-outline" size={52} color={colors.border} />
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
              <Ionicons name="book-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>No verse selected</Text>
              <Text style={styles.emptyText}>Tap a verse in the Bible tab to see cross-references</Text>
            </View>
          ) : crossRefs.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="git-branch-outline" size={52} color={colors.border} />
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
              <Ionicons name="book-outline" size={52} color={colors.border} />
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

        {/* Overview */}
        {activeTab === 'overview' && <OverviewPanel selected={selected} />}

        {/* Councils */}
        {activeTab === 'councils' && <CouncilsPanel />}

        {/* Heresies */}
        {activeTab === 'heresies' && <HeresiesPanel />}
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title:        { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  verseRefRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  verseRef:     { fontSize: 13, color: c.accent, fontWeight: '600' },
  versePreview: { fontSize: 13, color: c.textMuted, fontStyle: 'italic', lineHeight: 19, marginTop: 5 },
  headerLeft:   { flex: 1, marginRight: 12 },
  entryCount: {
    fontSize: 12, color: c.textMuted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4,
  },

  tabBar: {
    height: 48,
    backgroundColor: c.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
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
  tabLabel:      { fontSize: 13, fontWeight: '600', color: c.textMuted },
  tabLabelActive:{ color: c.accent },
  tabBadge: {
    backgroundColor: c.bgTertiary, borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  tabBadgeActive:    { backgroundColor: c.accentDim },
  tabBadgeText:      { fontSize: 11, fontWeight: '700', color: c.textMuted },
  tabBadgeTextActive:{ color: c.accent },

  list: { padding: 12, paddingBottom: 40, gap: 10 },

  card: {
    backgroundColor: c.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  fatherInfo: { flex: 1 },
  fatherName: { fontSize: 15, fontWeight: '700', color: c.textAccent },
  fatherEra:  { fontSize: 12, color: c.textMuted, marginTop: 2 },

  cardText: { fontSize: 15, lineHeight: 24, color: c.textPrimary },
  source:   { fontSize: 12, color: c.textMuted, marginTop: 8, fontStyle: 'italic' },

  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-start',
  },
  expandLabel: { fontSize: 13, color: c.accent, fontWeight: '600' },

  crossRefLabel: { fontSize: 15, fontWeight: '700', color: c.textAccent, marginBottom: 6 },
  crossRefText:  { fontSize: 14, lineHeight: 22, color: c.textPrimary },
  crossRefArrow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-end',
  },
  crossRefGo: { fontSize: 12, color: c.accent, fontWeight: '600' },

  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
})

const makeHist = (c: ThemeColors) => StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    margin: 12,
    backgroundColor: c.bgTertiary,
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
  },
  toggleBtnActive:   { backgroundColor: c.bgCard },
  toggleLabel:       { fontSize: 13, fontWeight: '600', color: c.textMuted },
  toggleLabelActive: { color: c.textPrimary },

  card: {
    backgroundColor: c.bgCard,
    borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    marginBottom: 10, gap: 8,
  },
  cardTop:   { gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.textAccent },
  cardAuthor:{ fontSize: 12, color: c.textMuted },

  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaText:  { fontSize: 11, color: c.textMuted },

  body: { fontSize: 14, lineHeight: 22, color: c.textPrimary },

  significance: { backgroundColor: c.bgTertiary, borderRadius: 8, padding: 10, gap: 4 },
  significanceLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  significanceText:  { fontSize: 13, lineHeight: 20, color: c.textSecondary },

  citation: { fontSize: 11, color: c.textMuted, fontStyle: 'italic' },

  sectionToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionCount: {
    fontSize: 12, color: c.textMuted, marginLeft: 'auto',
  },
  josephusNote: {
    backgroundColor: c.bgTertiary, borderRadius: 10,
    padding: 12, marginTop: 10,
  },
  josephusNoteText: { fontSize: 13, lineHeight: 20, color: c.textMuted },
})

const makeVari = (c: ThemeColors) => StyleSheet.create({
  section: { marginTop: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionBadge: {
    backgroundColor: c.bgTertiary, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2, marginLeft: 'auto',
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: c.textMuted },

  card: {
    backgroundColor: c.bgCard,
    borderRadius: 12, padding: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    marginBottom: 8, gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  sourceLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '600', flex: 1 },
  wordRef: { fontSize: 11, color: c.textMuted, fontStyle: 'italic' },

  description: { fontSize: 13, lineHeight: 20, color: c.textSecondary },

  readings: {
    borderRadius: 8, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  readingRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 10, backgroundColor: c.bgTertiary,
  },
  readingRowAlt: {
    backgroundColor: c.bgCard,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  readingLabel: {
    fontSize: 10, fontWeight: '800', color: c.accent,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, width: 64,
  },
  readingLabelAlt: { color: c.textMuted },
  readingTexts: { flex: 1, gap: 2 },
  hebrew: { fontSize: 15, color: c.textPrimary, textAlign: 'right' },
  readingText: { fontSize: 13, lineHeight: 20, color: c.textPrimary },
})

