import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, StatusBar, LayoutAnimation, Linking, TextInput,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { useWordFocus } from '../context/WordFocusContext'
import { getCommentary, getCrossRefs, getJosephusForVerse, getVariantsForVerse, getVerseText, getMaxVerse, getAllCommentaryByFather, getBibleVerseCitedByEarlyTexts, getEarlyTextRefs } from '../db/queries'
import type { JosephusEntry, CommentaryEntryWithRef, EarlyTextCitation, EarlyTextRef } from '../db/queries'
import type { TextualVariant } from '../types'
import { getFatherInfo, FATHER_DATES } from '../data/fatherDates'
import { EARLY_TEXT_MAP } from '../data/books'
import { getSourceUrl, getEarlyTextBook } from '../data/sourceLinks'
import { stripUsfm } from '../data/redLetter'
import { getHistoricalForVerse, HISTORICAL_SOURCES, CATEGORY_LABEL } from '../data/historicalData'
import type { HistoricalSource } from '../data/historicalData'
import CouncilsPanel from './CouncilsPanel'
import HeresiesPanel from './HeresiesPanel'
import SchismsPanel from './SchismsPanel'
import CreedPanel from './CreedPanel'
import PersecutionPanel from './PersecutionPanel'
import CanonPanel from './CanonPanel'
import TimelinePanel from './TimelinePanel'
import WordStudyPanel from './WordStudyPanel'
import OverviewPanel from './OverviewPanel'
import MapPanel from './MapPanel'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { CommentaryEntry, CrossRef, Note, RootTabParamList } from '../types'

export type StudyTab = 'fathers' | 'crossrefs' | 'historical' | 'councils' | 'heresies' | 'schisms' | 'creeds' | 'persecution' | 'canon' | 'timeline' | 'words' | 'overview' | 'map'
type HistMode = 'verse' | 'browse'
type FatherMode = 'verse' | 'browse'
type NavProp = BottomTabNavigationProp<RootTabParamList, 'Study'>

// ── Entry card ────────────────────────────────────────────

function EntryCard({ entry, book, verseRef }: { entry: CommentaryEntry; book: string; verseRef?: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const navigation = useNavigation<NavProp>()
  const [expanded, setExpanded] = useState(false)

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }

  const hasMore = entry.full_text.length > entry.excerpt.length
  const body = expanded ? entry.full_text : entry.excerpt
  const info = useMemo(() => getFatherInfo(entry.father_name), [entry.father_name])
  const dateLabel = info?.dates ?? entry.father_era

  // Check if the source is an early text we have in-app
  const earlyTextNav = useMemo(
    () => getEarlyTextBook(entry.father_name, entry.source),
    [entry.father_name, entry.source],
  )

  const sourceUrl = useMemo(
    () => earlyTextNav ? null : getSourceUrl(entry.father_name, book, entry.source_url, entry.excerpt),
    [earlyTextNav, entry.father_name, book, entry.source_url, entry.excerpt],
  )

  const handleReadInApp = useCallback(() => {
    if (!earlyTextNav) return
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: earlyTextNav.book, chapter: earlyTextNav.chapter, earlyText: true, apocrypha: false },
    })
  }, [earlyTextNav, navigation])

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.fatherInfo}>
          <Text style={styles.fatherName}>{entry.father_name}</Text>
          {!!dateLabel && <Text style={styles.fatherEra}>{dateLabel}</Text>}
        </View>
        {earlyTextNav ? (
          <TouchableOpacity
            style={styles.readFullBtn}
            onPress={handleReadInApp}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          >
            <Text style={styles.readFullLabel}>Read in app</Text>
            <Ionicons name="book-outline" size={12} color={colors.accent} />
          </TouchableOpacity>
        ) : !!sourceUrl && (
          <TouchableOpacity
            style={styles.readFullBtn}
            onPress={() => Linking.openURL(sourceUrl)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          >
            <Text style={styles.readFullLabel}>Read full text</Text>
            <Ionicons name="open-outline" size={12} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {!!verseRef && <Text style={styles.browseVerseRef}>{verseRef}</Text>}
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
  const hist   = useMemo(() => makeHist(colors), [colors])
  const db = useSQLiteContext()
  const { selected, setSelected } = useSelectedVerse()
  const navigation = useNavigation<NavProp>()

  const [activeTab, setActiveTab] = useState<StudyTab>('fathers')
  const [creedJumpTo, setCreedJumpTo] = useState<string | undefined>()
  const [heresyJumpTo, setHeresyJumpTo] = useState<string | undefined>()
  const [councilJumpTo, setCouncilJumpTo] = useState<string | undefined>()
  const { wordFocus } = useWordFocus()

  useEffect(() => {
    if (wordFocus && activeTab !== 'words') setActiveTab('words')
  }, [wordFocus, activeTab])
  const [entries, setEntries] = useState<CommentaryEntry[]>([])
  const [crossRefs, setCrossRefs] = useState<CrossRef[]>([])
  const [earlyCitations, setEarlyCitations] = useState<EarlyTextCitation[]>([])
  const [earlyTextRefs, setEarlyTextRefs] = useState<EarlyTextRef[]>([])
  const [crossRefPanel, setCrossRefPanel] = useState<'bible' | 'early'>('bible')
  const [histMode, setHistMode] = useState<HistMode>('verse')
  const [fatherMode, setFatherMode] = useState<FatherMode>('verse')
  const [browseFather, setBrowseFather] = useState<string | null>(null)
  const [browseEntries, setBrowseEntries] = useState<CommentaryEntryWithRef[]>([])
  const [loadingBrowse, setLoadingBrowse] = useState(false)
  const [fatherQuery, setFatherQuery] = useState('')
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
    if (!selected) {
      setEntries([]); setCrossRefs([]); setEarlyCitations([]); setEarlyTextRefs([])
      return
    }

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

    const isEarlyBook = !!EARLY_TEXT_MAP[selected.book]
    setLoadingRefs(true)
    Promise.all([
      getCrossRefs(db, selected.book, selected.chapter, selected.verse),
      isEarlyBook
        ? getEarlyTextRefs(db, selected.book, selected.chapter)
        : getBibleVerseCitedByEarlyTexts(db, selected.book, selected.chapter, selected.verse),
    ])
      .then(([refs, earlyData]) => {
        setCrossRefs(refs)
        const byType = (a: { ref_type: string }, b: { ref_type: string }) =>
          (a.ref_type === 'quote' ? 0 : 1) - (b.ref_type === 'quote' ? 0 : 1)
        if (isEarlyBook) {
          setEarlyTextRefs([...(earlyData as EarlyTextRef[])].sort(byType))
          setEarlyCitations([])
        } else {
          setEarlyCitations([...(earlyData as EarlyTextCitation[])].sort(byType))
          setEarlyTextRefs([])
        }
        setLoadingRefs(false)
      })
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
            { key: 'schisms',    label: 'Schisms' },
            { key: 'creeds',       label: 'Creeds' },
            { key: 'persecution',  label: 'Persecution' },
            { key: 'canon',        label: 'Canon' },
            { key: 'timeline',     label: 'Timeline' },
            { key: 'map',          label: 'Map' },
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
        {!loading && activeTab === 'fathers' && (() => {
          // ── Browse mode: father list ──
          if (fatherMode === 'browse' && !browseFather) {
            const q = fatherQuery.trim().toLowerCase()
            const fatherList = Object.entries(FATHER_DATES)
              .filter(([, info]) => info.sort >= 30 && info.sort <= 800)
              // deduplicate by sort+first-word key
              .filter(([name], _, arr) => {
                const key = `${FATHER_DATES[name].sort}-${name.split(' ')[0]}`
                return arr.findIndex(([n]) => `${FATHER_DATES[n].sort}-${n.split(' ')[0]}` === key) === arr.findIndex(([n]) => n === name)
              })
              .filter(([name, info]) => !q ||
                name.toLowerCase().includes(q) ||
                (info.role?.toLowerCase().includes(q) ?? false) ||
                (info.location?.toLowerCase().includes(q) ?? false) ||
                (info.tradition?.toLowerCase().includes(q) ?? false)
              )
              .sort(([, a], [, b]) => a.sort - b.sort)
            return (
              <View style={{ flex: 1 }}>
                <View style={styles.modeToggle}>
                  <TouchableOpacity style={[styles.modeBtn]} onPress={() => setFatherMode('verse')} activeOpacity={0.7}>
                    <Text style={[styles.modeBtnText]}>This Verse</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modeBtn, styles.modeBtnActive]} onPress={() => setFatherMode('browse')} activeOpacity={0.7}>
                    <Text style={[styles.modeBtnText, styles.modeBtnTextActive]}>Browse Fathers</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.fatherSearchRow}>
                  <Ionicons name="search" size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.fatherSearchInput}
                    placeholder="Search fathers…"
                    placeholderTextColor={colors.textMuted}
                    value={fatherQuery}
                    onChangeText={setFatherQuery}
                    returnKeyType="search"
                    autoCorrect={false}
                  />
                  {!!fatherQuery && (
                    <TouchableOpacity onPress={() => setFatherQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
                <FlatList
                  data={fatherList}
                  keyExtractor={([name]) => name}
                  ListEmptyComponent={
                    <View style={styles.center}>
                      <Text style={styles.emptyText}>No fathers match "{fatherQuery}"</Text>
                    </View>
                  }
                  contentContainerStyle={styles.list}
                  renderItem={({ item: [name, info] }) => (
                    <TouchableOpacity
                      style={styles.fatherBrowseRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        setBrowseFather(name)
                        setLoadingBrowse(true)
                        getAllCommentaryByFather(db, name)
                          .then(rows => { setBrowseEntries(rows); setLoadingBrowse(false) })
                          .catch(() => setLoadingBrowse(false))
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fatherBrowseName}>{name}</Text>
                        {!!info.role && <Text style={styles.fatherBrowseRole}>{info.role}</Text>}
                        {!!info.location && <Text style={styles.fatherBrowseMeta}>{info.location} · {info.dates}</Text>}
                        {!info.location && <Text style={styles.fatherBrowseMeta}>{info.dates}</Text>}
                      </View>
                      {!!info.tradition && (
                        <View style={styles.traditionBadge}>
                          <Text style={styles.traditionText}>{info.tradition}</Text>
                        </View>
                      )}
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                />
              </View>
            )
          }

          // ── Browse mode: father detail ──
          if (fatherMode === 'browse' && browseFather) {
            const info = FATHER_DATES[browseFather]
            return (
              <View style={{ flex: 1 }}>
                <View style={styles.browseHeader}>
                  <TouchableOpacity onPress={() => { setBrowseFather(null); setBrowseEntries([]) }} hitSlop={8} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={18} color={colors.accent} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.browseHeaderName}>{browseFather}</Text>
                    {!!info?.role && <Text style={styles.browseHeaderRole}>{info.role}{info.location ? ` · ${info.location}` : ''}</Text>}
                  </View>
                </View>
                {!!info?.keyWorks && (
                  <View style={styles.browseKeyWorks}>
                    <Text style={styles.browseKeyWorksLabel}>Key works</Text>
                    <Text style={styles.browseKeyWorksText}>{info.keyWorks}</Text>
                  </View>
                )}
                {loadingBrowse ? (
                  <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
                ) : browseEntries.length === 0 ? (
                  <View style={styles.center}>
                    <Text style={styles.emptyText}>No commentary entries found for {browseFather}</Text>
                  </View>
                ) : (
                  <FlatList
                    data={browseEntries}
                    keyExtractor={e => e.id.toString()}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                      <EntryCard
                        entry={item}
                        book={item.book}
                        verseRef={`${item.book} ${item.chapter}:${item.verse}`}
                      />
                    )}
                  />
                )}
              </View>
            )
          }

          // ── Verse mode (existing) ──
          return (
            <View style={{ flex: 1 }}>
              <View style={styles.modeToggle}>
                <TouchableOpacity style={[styles.modeBtn, styles.modeBtnActive]} onPress={() => setFatherMode('verse')} activeOpacity={0.7}>
                  <Text style={[styles.modeBtnText, styles.modeBtnTextActive]}>This Verse</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modeBtn]} onPress={() => setFatherMode('browse')} activeOpacity={0.7}>
                  <Text style={[styles.modeBtnText]}>Browse Fathers</Text>
                </TouchableOpacity>
              </View>
              {!selected ? (
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
                  renderItem={({ item }) => <EntryCard entry={item} book={selected.book} />}
                />
              )}
            </View>
          )
        })()}

        {/* Cross-refs: segmented panel */}
        {!loading && activeTab === 'crossrefs' && (
          !selected ? (
            <View style={styles.center}>
              <Ionicons name="book-outline" size={52} color={colors.border} />
              <Text style={styles.emptyTitle}>No verse selected</Text>
              <Text style={styles.emptyText}>Tap a verse in the Bible tab to see cross-references</Text>
            </View>
          ) : (() => {
            const isEarlyBook = !!EARLY_TEXT_MAP[selected.book]
            const earlyCount  = isEarlyBook ? earlyTextRefs.length : earlyCitations.length
            const earlyLabel  = isEarlyBook ? 'Scripture Refs' : 'Early Church'
            return (
              <View style={{ flex: 1 }}>
                {/* Segmented toggle */}
                <View style={hist.toggle}>
                  <TouchableOpacity
                    style={[hist.toggleBtn, crossRefPanel === 'bible' && hist.toggleBtnActive]}
                    onPress={() => setCrossRefPanel('bible')} activeOpacity={0.7}
                  >
                    <Text style={[hist.toggleLabel, crossRefPanel === 'bible' && hist.toggleLabelActive]}>
                      Cross-Refs{crossRefs.length > 0 ? ` (${crossRefs.length})` : ''}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[hist.toggleBtn, crossRefPanel === 'early' && hist.toggleBtnActive]}
                    onPress={() => setCrossRefPanel('early')} activeOpacity={0.7}
                  >
                    <Text style={[hist.toggleLabel, crossRefPanel === 'early' && hist.toggleLabelActive]}>
                      {earlyLabel}{earlyCount > 0 ? ` (${earlyCount})` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Panel: Bible cross-refs */}
                {crossRefPanel === 'bible' && (
                  crossRefs.length === 0 ? (
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

                {/* Panel: Early text refs or citations */}
                {crossRefPanel === 'early' && (
                  earlyCount === 0 ? (
                    <View style={styles.center}>
                      <Ionicons name="time-outline" size={52} color={colors.border} />
                      <Text style={styles.emptyTitle}>
                        {isEarlyBook ? 'No scripture references' : 'Not cited in early texts'}
                      </Text>
                      <Text style={styles.emptyText}>
                        {isEarlyBook
                          ? 'No mapped scripture references for this chapter'
                          : 'This verse is not cited in Didache, 1 Clement, or 2 Clement'}
                      </Text>
                    </View>
                  ) : isEarlyBook ? (
                    <FlatList
                      data={earlyTextRefs}
                      keyExtractor={(r, i) => `${r.ref_book}-${r.ref_chapter}-${r.ref_verse}-${i}`}
                      contentContainerStyle={styles.list}
                      renderItem={({ item: r }) => (
                        <TouchableOpacity
                          style={styles.earlyCitationRow}
                          onPress={() => goToVerse({ ref_book: r.ref_book, ref_chapter: r.ref_chapter, ref_verse: r.ref_verse } as CrossRef)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.earlyCitationMain}>
                            <Text style={styles.earlyCitationBook}>{r.ref_book}</Text>
                            <Text style={styles.earlyCitationRef}> {r.ref_chapter}:{r.ref_verse}</Text>
                          </View>
                          <View style={[styles.earlyCitationBadge, r.ref_type === 'quote' && styles.earlyCitationBadgeQuote]}>
                            <Text style={styles.earlyCitationBadgeText}>{r.ref_type}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    />
                  ) : (
                    <FlatList
                      data={earlyCitations}
                      keyExtractor={(c, i) => `${c.book}-${c.chapter}-${i}`}
                      contentContainerStyle={styles.list}
                      renderItem={({ item: c }) => (
                        <TouchableOpacity
                          style={styles.earlyCitationRow}
                          onPress={() => {
                            try {
                              navigation.navigate('Bible' as any, {
                                screen: 'Reader',
                                params: { book: c.book, chapter: c.chapter, verse: c.verse, earlyText: true },
                              })
                            } catch {}
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.earlyCitationMain}>
                            <Text style={styles.earlyCitationBook}>{c.book}</Text>
                            <Text style={styles.earlyCitationRef}> ch. {c.chapter}</Text>
                          </View>
                          <View style={[styles.earlyCitationBadge, c.ref_type === 'quote' && styles.earlyCitationBadgeQuote]}>
                            <Text style={styles.earlyCitationBadgeText}>{c.ref_type}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    />
                  )
                )}
              </View>
            )
          })()
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
        {activeTab === 'councils' && (
          <CouncilsPanel
            onCreedPress={name => { setCreedJumpTo(name); setActiveTab('creeds') }}
            onHeresyPress={name => { setHeresyJumpTo(name); setActiveTab('heresies') }}
            jumpTo={councilJumpTo}
          />
        )}

        {/* Heresies */}
        {activeTab === 'heresies' && (
          <HeresiesPanel
            onCouncilPress={name => { setCouncilJumpTo(name); setActiveTab('councils') }}
            jumpTo={heresyJumpTo}
          />
        )}

        {/* Schisms */}
        {activeTab === 'schisms' && (
          <SchismsPanel
            onCreedPress={name => { setCreedJumpTo(name); setActiveTab('creeds') }}
            onHeresyPress={name => { setHeresyJumpTo(name); setActiveTab('heresies') }}
            onCouncilPress={name => { setCouncilJumpTo(name); setActiveTab('councils') }}
          />
        )}

        {/* Creeds */}
        {activeTab === 'creeds' && (
          <CreedPanel
            jumpTo={creedJumpTo}
            onHeresyPress={name => { setHeresyJumpTo(name); setActiveTab('heresies') }}
            onCouncilPress={name => { setCouncilJumpTo(name); setActiveTab('councils') }}
          />
        )}

        {/* Persecution */}
        {activeTab === 'persecution' && <PersecutionPanel />}

        {/* Canon */}
        {activeTab === 'canon' && <CanonPanel />}

        {/* Timeline */}
        {activeTab === 'timeline' && (
          <TimelinePanel onNavigate={tab => setActiveTab(tab)} />
        )}

        {/* Map */}
        {activeTab === 'map' && <MapPanel selected={selected} />}
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
  fatherInfo: { flex: 1, marginRight: 8 },
  fatherName: { fontSize: 15, fontWeight: '700', color: c.textAccent },
  fatherEra:  { fontSize: 12, color: c.textMuted, marginTop: 2 },

  readFullBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.accent,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    flexShrink: 0,
  },
  readFullLabel: { fontSize: 11, fontWeight: '600', color: c.accent },

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

  earlyCitationRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 7, gap: 8,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  earlyCitationMain: { flex: 1, flexDirection: 'row', alignItems: 'baseline' },
  earlyCitationBook: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  earlyCitationRef:  { fontSize: 13, color: c.textSecondary },
  earlyCitationBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, backgroundColor: c.bgCard,
  },
  earlyCitationBadgeQuote: { backgroundColor: c.accent + '28' },
  earlyCitationBadgeText: { fontSize: 10, fontWeight: '700', color: c.textMuted },

  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },

  // Father browse mode
  modeToggle: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6,
  },
  modeBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14, borderWidth: 1.5, borderColor: c.border,
  },
  modeBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  modeBtnTextActive: { color: '#fff' },

  fatherSearchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginBottom: 6,
    backgroundColor: c.bgCard,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    paddingHorizontal: 10, height: 36,
  },
  fatherSearchInput: { flex: 1, fontSize: 14, color: c.textPrimary },

  fatherBrowseRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, gap: 8,
  },
  fatherBrowseName: { fontSize: 15, fontWeight: '700', color: c.textAccent },
  fatherBrowseRole: { fontSize: 13, color: c.textSecondary, marginTop: 1 },
  fatherBrowseMeta: { fontSize: 12, color: c.textMuted, marginTop: 1 },
  traditionBadge: {
    backgroundColor: c.bgTertiary, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  traditionText: { fontSize: 11, fontWeight: '600', color: c.textMuted },

  browseHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  browseHeaderName: { fontSize: 16, fontWeight: '700', color: c.textAccent },
  browseHeaderRole: { fontSize: 13, color: c.textSecondary, marginTop: 2 },

  browseKeyWorks: {
    marginHorizontal: 14, marginTop: 8, marginBottom: 2,
    backgroundColor: c.bgTertiary, borderRadius: 8, padding: 10, gap: 2,
  },
  browseKeyWorksLabel: {
    fontSize: 10, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  browseKeyWorksText: { fontSize: 13, lineHeight: 19, color: c.textSecondary },

  browseVerseRef: {
    fontSize: 11, fontWeight: '700', color: c.accent,
    marginBottom: 2,
  },
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

