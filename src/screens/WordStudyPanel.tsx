import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import {
  getGreekWords, getHebrewWords, getStrongsEntry,
  getBdbEntry, getThayersEntry, getVerse, getStrongsConcordance,
} from '../db/queries'
import type { GreekWord, HebrewWord, StrongsEntry, LexiconEntry, StrongsConcordanceResult } from '../db/queries'
import { decodeMorphology, TAG_DEFINITIONS } from '../utils/morphology'
import type { SelectedVerse, RootTabParamList } from '../types'
import { BOOKS } from '../data/books'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'

const NT_BOOKS = new Set(BOOKS.filter(b => b.testament === 'NT').map(b => b.name))

// ── Helpers ───────────────────────────────────────────────

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface ScriptureRef {
  book: string
  refs: Array<{ chapter: number; verse: number | null; raw: string }>
}

function processLexiconText(raw: string): { mainText: string; indexRaw: string } {
  const marker = 'BLB Scripture Index'
  const idx = raw.indexOf(marker)
  let mainText = idx >= 0 ? raw.slice(0, idx) : raw
  const indexRaw = idx >= 0 ? raw.slice(idx) : ''
  mainText = mainText.replace(/^STRONGS\s+[GH]\d+:\s*[\n\r](\s*[\n\r])+/, '')
  mainText = mainText.replace(/(\n[ \t]*){2,}/g, '\n').trim()
  return { mainText, indexRaw }
}

function parseScriptureIndex(raw: string): ScriptureRef[] {
  const body = raw.replace(/^[^\n]*\n/, '')
  const lines = body
    .replace(/(\n[ \t]*){2,}/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const map = new Map<string, ScriptureRef>()
  const order: string[] = []
  let currentBook = ''

  for (const line of lines) {
    if ((/^[A-Za-z]/.test(line) || /^\d\s+[A-Za-z]/.test(line)) && !line.includes(':') && !line.includes(';')) {
      currentBook = line
    } else if (currentBook) {
      const parsed = line.split(/[;,]/).map(r => r.trim()).filter(Boolean).flatMap(r => {
        const m = r.match(/^(\d+):(\d+)/)
        if (m) return [{ chapter: parseInt(m[1]), verse: parseInt(m[2]), raw: r }]
        const c = r.match(/^(\d+)$/)
        if (c) return [{ chapter: parseInt(c[1]), verse: null, raw: r }]
        return []
      })
      if (parsed.length > 0) {
        if (!map.has(currentBook)) { map.set(currentBook, { book: currentBook, refs: [] }); order.push(currentBook) }
        map.get(currentBook)!.refs.push(...parsed)
      }
    }
  }
  return order.map(b => map.get(b)!)
}

// Splits at the first match so it can live in a measurable View.
// Returns before/match/after; remaining occurrences in `after` are highlighted inline.
function splitAtFirstMatch(
  text: string,
  book: string,
  chapter: number,
  verse: number,
): { before: string; match: string | null; after: string } {
  const pattern = new RegExp(escapeRegex(`${book} ${chapter}:${verse}`) + '(?!\\d)')
  const m = pattern.exec(text)
  if (!m) return { before: text, match: null, after: '' }
  return {
    before: text.slice(0, m.index),
    match: m[0],
    after: text.slice(m.index + m[0].length),
  }
}

// Highlights all occurrences in a string as inline Text nodes.
function highlightInline(
  text: string,
  book: string,
  chapter: number,
  verse: number,
  highlightStyle: object,
): React.ReactNode[] {
  const pattern = new RegExp(escapeRegex(`${book} ${chapter}:${verse}`) + '(?!\\d)', 'g')
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(<Text key={m.index} style={highlightStyle}>{m[0]}</Text>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ── Strong's Concordance Modal ────────────────────────────

const NT_CATS: Record<string, string[]> = {
  Gospels:  ['Matthew', 'Mark', 'Luke', 'John'],
  Epistles: [
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
    'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude',
  ],
  Other:    ['Acts', 'Revelation'],
}

const OT_CATS: Record<string, string[]> = {
  Torah:      ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'],
  Historical: [
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
  ],
  Wisdom:     ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'],
  Prophets:   [
    'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
    'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
    'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  ],
}

function buildBookToCat(cats: Record<string, string[]>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [cat, books] of Object.entries(cats))
    for (const book of books) map[book] = cat
  return map
}

interface ConcordanceModalProps {
  visible: boolean
  lemma: string
  translit: string
  lang: 'greek' | 'hebrew'
  results: StrongsConcordanceResult[]
  loading: boolean
  onClose: () => void
  onNavigate: (book: string, chapter: number, verse: number) => void
}

function StrongsConcordanceModal({
  visible, lemma, translit, lang, results, loading, onClose, onNavigate,
}: ConcordanceModalProps) {
  const { colors } = useTheme()
  const sc = useMemo(() => makeConcStyles(colors), [colors])
  const [filterOpen, setFilterOpen]         = useState(false)
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [collapsedBooks, setCollapsedBooks] = useState<Set<string>>(new Set())

  const cats = lang === 'greek' ? NT_CATS : OT_CATS

  useEffect(() => {
    if (visible) {
      setFilterOpen(false)
      setActiveCategories(new Set())
      setCollapsedBooks(new Set())
    }
  }, [visible])

  const bookToCat = useMemo(() => buildBookToCat(lang === 'greek' ? NT_CATS : OT_CATS), [lang])

  const filteredResults = useMemo(() => {
    if (activeCategories.size === 0) return results
    return results.filter(r => activeCategories.has(bookToCat[r.book] ?? ''))
  }, [results, activeCategories, bookToCat])

  const listData = useMemo(() => {
    type Item =
      | { type: 'header'; book: string; count: number }
      | { type: 'row'; r: StrongsConcordanceResult }
    const counts: Record<string, number> = {}
    for (const r of filteredResults) counts[r.book] = (counts[r.book] ?? 0) + 1
    const items: Item[] = []
    let lastBook = ''
    for (const r of filteredResults) {
      if (r.book !== lastBook) {
        items.push({ type: 'header', book: r.book, count: counts[r.book] })
        lastBook = r.book
      }
      if (!collapsedBooks.has(r.book)) items.push({ type: 'row', r })
    }
    return items
  }, [filteredResults, collapsedBooks])

  function toggleCategory(cat: string) {
    setActiveCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat); else next.add(cat)
      return next
    })
  }

  function toggleBook(book: string) {
    setCollapsedBooks(prev => {
      const next = new Set(prev)
      if (next.has(book)) next.delete(book); else next.add(book)
      return next
    })
  }

  const filteredCount = filteredResults.length
  const catNames = Object.keys(cats)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sc.overlay}>
        <View style={sc.sheet}>
          {/* Header */}
          <View style={sc.header}>
            <View style={{ flex: 1 }}>
              <Text style={sc.lemma}>{lemma}</Text>
              <Text style={sc.meta}>
                {translit} · {lang === 'greek' ? 'Greek' : 'Hebrew'} ·{' '}
                {activeCategories.size > 0
                  ? `${filteredCount} of ${results.length}`
                  : filteredCount} occurrences
              </Text>
            </View>
            <View style={sc.headerBtns}>
              <TouchableOpacity
                style={[sc.filterBtn, filterOpen && sc.filterBtnActive]}
                onPress={() => setFilterOpen(f => !f)}
                activeOpacity={0.7}
              >
                <Ionicons name="filter" size={13} color={filterOpen ? colors.bgPrimary : colors.accent} />
                <Text style={[sc.filterBtnLabel, filterOpen && sc.filterBtnLabelActive]}>Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Category filter strip */}
          {filterOpen && (
            <View style={sc.filterPanel}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sc.catRow}>
                {catNames.map(cat => {
                  const active = activeCategories.has(cat)
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[sc.catChip, active && sc.catChipActive]}
                      onPress={() => toggleCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text style={[sc.catChipLabel, active && sc.catChipLabelActive]}>{cat}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* Body */}
          {loading ? (
            <View style={sc.loadingRow}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : filteredCount === 0 ? (
            <View style={sc.loadingRow}>
              <Text style={sc.emptyLabel}>No results for selected filter</Text>
            </View>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={item => item.type === 'header' ? `h-${item.book}` : `r-${item.r.book}-${item.r.chapter}-${item.r.verse}`}
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  const collapsed = collapsedBooks.has(item.book)
                  return (
                    <TouchableOpacity style={sc.bookHeader} onPress={() => toggleBook(item.book)} activeOpacity={0.7}>
                      <Text style={sc.bookLabel}>{item.book}</Text>
                      <View style={sc.bookHeaderRight}>
                        <Text style={sc.bookCount}>{item.count}</Text>
                        <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={13} color={colors.accent} />
                      </View>
                    </TouchableOpacity>
                  )
                }
                const { r } = item
                return (
                  <TouchableOpacity
                    style={sc.row}
                    onPress={() => { onNavigate(r.book, r.chapter, r.verse); onClose() }}
                    activeOpacity={0.7}
                  >
                    <Text style={sc.ref}>{r.book} {r.chapter}:{r.verse}</Text>
                    {!!r.word && <Text style={sc.word}>{r.word}  {r.translit}</Text>}
                    <Text style={sc.text} numberOfLines={3}>{r.text}</Text>
                  </TouchableOpacity>
                )
              }}
              ItemSeparatorComponent={() => <View style={sc.separator} />}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── Types ─────────────────────────────────────────────────

interface ActiveKey { strongs: string; position: number }
interface ClickedRef { book: string; chapter: number; verse: number }

interface Props {
  selected: SelectedVerse
}

// ── Component ─────────────────────────────────────────────

export default function WordStudyPanel({ selected }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const db = useSQLiteContext()
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>()
  const isNT = NT_BOOKS.has(selected.book)

  const [words, setWords]           = useState<(GreekWord | HebrewWord)[]>([])
  const [loading, setLoading]       = useState(false)
  const [activeKey, setActiveKey]   = useState<ActiveKey | null>(null)
  const [def, setDef]               = useState<StrongsEntry | null>(null)
  const [lexicon, setLexicon]       = useState<LexiconEntry | null>(null)
  const [defLoading, setDefLoading] = useState(false)
  const [activeTag, setActiveTag]   = useState<string | null>(null)
  const [clickedRef, setClickedRef] = useState<ClickedRef | null>(null)
  const [versePreview, setVersePreview] = useState<{ text: string; loading: boolean } | null>(null)
  const [concordanceOpen, setConcordanceOpen]       = useState(false)
  const [concordanceResults, setConcordanceResults] = useState<StrongsConcordanceResult[]>([])
  const [concordanceLoading, setConcordanceLoading] = useState(false)
  const verseCache      = useRef<Map<string, string>>(new Map())
  const scrollViewRef   = useRef<ScrollView>(null)
  const firstMentionRef = useRef<View>(null)

  useEffect(() => {
    if (!selected.verse) return
    setWords([])
    setActiveKey(null)
    setDef(null)
    setLexicon(null)
    setLoading(true)
    const fetch = isNT
      ? getGreekWords(db, selected.book, selected.chapter, selected.verse)
      : getHebrewWords(db, selected.book, selected.chapter, selected.verse)
    fetch.then(w => { setWords(w); setLoading(false) }).catch(() => setLoading(false))
  }, [selected.book, selected.chapter, selected.verse])

  useEffect(() => {
    if (!clickedRef) { setVersePreview(null); return }
    const key = `${clickedRef.book}:${clickedRef.chapter}:${clickedRef.verse}`
    if (verseCache.current.has(key)) {
      setVersePreview({ text: verseCache.current.get(key)!, loading: false })
      return
    }
    setVersePreview({ text: '', loading: true })
    getVerse(db, clickedRef.book, clickedRef.chapter, clickedRef.verse)
      .then(row => {
        const text = row?.text ?? 'Verse not found'
        verseCache.current.set(key, text)
        setVersePreview({ text, loading: false })
      })
      .catch(() => setVersePreview({ text: 'Error loading verse', loading: false }))
  }, [clickedRef])

  function openConcordance() {
    setConcordanceOpen(true)
    if (concordanceResults.length > 0) return
    setConcordanceLoading(true)
    getStrongsConcordance(db, isNT ? 'greek' : 'hebrew', activeKey!.strongs)
      .then(rows => { setConcordanceResults(rows); setConcordanceLoading(false) })
      .catch(() => setConcordanceLoading(false))
  }

  function handleWordPress(strongs: string, position: number) {
    if (activeKey?.strongs === strongs && activeKey?.position === position) {
      setActiveKey(null); setDef(null); setLexicon(null); setActiveTag(null)
      setClickedRef(null); setConcordanceOpen(false); setConcordanceResults([]); return
    }
    setActiveKey({ strongs, position })
    setActiveTag(null)
    setClickedRef(null)
    setConcordanceOpen(false)
    setConcordanceResults([])
    setDefLoading(true)
    const lang = isNT ? 'greek' : 'hebrew'
    Promise.all([
      getStrongsEntry(db, lang, strongs),
      isNT ? getThayersEntry(db, strongs) : getBdbEntry(db, strongs),
    ])
      .then(([entry, lex]) => {
        setDef(entry)
        setLexicon(lex)
        setDefLoading(false)
      })
      .catch(() => { setDef(null); setLexicon(null); setDefLoading(false) })
  }

  function handleRefPress(book: string, ref: { chapter: number; verse: number }) {
    const same =
      clickedRef?.book === book &&
      clickedRef?.chapter === ref.chapter &&
      clickedRef?.verse === ref.verse
    setClickedRef(same ? null : { book, chapter: ref.chapter, verse: ref.verse })
  }

  function goToVerse(ref: ClickedRef) {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: ref.book, chapter: ref.chapter, verse: ref.verse },
    })
  }

  const lexText = lexicon?.thayers_text ?? lexicon?.bdb_text ?? ''
  const { mainText, indexRaw } = useMemo(
    () => lexText ? processLexiconText(lexText) : { mainText: '', indexRaw: '' },
    [lexText],
  )
  const scriptureIndex = useMemo(
    () => indexRaw ? parseScriptureIndex(indexRaw) : [],
    [indexRaw],
  )
  const splitResult = useMemo(
    () => mainText
      ? splitAtFirstMatch(mainText, selected.book, selected.chapter, selected.verse ?? 1)
      : { before: '', match: null, after: '' },
    [mainText, selected.book, selected.chapter, selected.verse],
  )
  const afterNodes = useMemo(
    () => splitResult.after
      ? highlightInline(splitResult.after, selected.book, selected.chapter, selected.verse ?? 1, s.verseHighlight)
      : [],
    [splitResult.after, selected.book, selected.chapter, selected.verse, s],
  )

  const activeWord = activeKey
    ? words.find(w => w.strongs === activeKey.strongs && w.position === activeKey.position)
    : undefined
  const gloss = activeWord?.gloss
  const morph = decodeMorphology(activeWord?.morph ?? '', isNT ? 'greek' : 'hebrew')

  function jumpToFirstMention() {
    firstMentionRef.current?.measureLayout(
      scrollViewRef.current as any,
      (_x, y) => scrollViewRef.current?.scrollTo({ y: y - 16, animated: true }),
      () => {},
    )
  }

  // ── Empty / loading states ────────────────────────────────

  if (!selected.verse) {
    return (
      <View style={s.center}>
        <Ionicons name="language-outline" size={52} color={colors.border} />
        <Text style={s.emptyTitle}>No verse selected</Text>
        <Text style={s.emptyText}>Tap a verse to view its original language words</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  if (!words.length) {
    return (
      <View style={s.center}>
        <Ionicons name="language-outline" size={52} color={colors.border} />
        <Text style={s.emptyTitle}>No words found</Text>
        <Text style={s.emptyText}>No {isNT ? 'Greek' : 'Hebrew'} data for this verse</Text>
      </View>
    )
  }

  // ── Main render ───────────────────────────────────────────

  return (
    <ScrollView ref={scrollViewRef} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Text style={s.langLabel}>{isNT ? 'Greek New Testament' : 'Hebrew Old Testament'}</Text>

      {/* Word pills */}
      <View style={[s.pillsRow, !isNT && s.pillsRowRTL]}>
        {words.map((w, i) => {
          const text = isNT ? (w as GreekWord).greek : (w as HebrewWord).hebrew
          const active = activeKey?.strongs === w.strongs && activeKey?.position === w.position
          return (
            <TouchableOpacity
              key={i}
              style={[s.pill, active && s.pillActive]}
              onPress={() => handleWordPress(w.strongs, w.position)}
              activeOpacity={0.7}
            >
              <Text style={[s.pillText, active && s.pillTextActive, !isNT && s.pillTextHebrew]}>
                {text}
              </Text>
              <Text style={[s.pillTranslit, active && s.pillTranslitActive]}>
                {w.translit}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Concordance modal */}
      <StrongsConcordanceModal
        visible={concordanceOpen}
        lemma={def?.lemma ?? activeKey?.strongs ?? ''}
        translit={def?.translit ?? ''}
        lang={isNT ? 'greek' : 'hebrew'}
        results={concordanceResults}
        loading={concordanceLoading}
        onClose={() => setConcordanceOpen(false)}
        onNavigate={(book, chapter, verse) => {
          navigation.navigate('Bible' as any, { screen: 'Reader', params: { book, chapter, verse, _ts: Date.now() } })
        }}
      />

      {/* Definition card */}
      {activeKey && (
        <View style={s.defCard}>
          {defLoading && <ActivityIndicator color={colors.accent} style={{ padding: 12 }} />}

          {!defLoading && !def && (
            <Text style={s.defEmpty}>No definition found for {activeKey.strongs}</Text>
          )}

          {!defLoading && def && (
              <>
                {/* Strong's header */}
                <View style={s.defHeader}>
                  <View style={s.defHeaderRow}>
                    <View>
                      <Text style={s.defNum}>{def.number}</Text>
                      <Text style={s.defLemma}>{def.lemma}</Text>
                      <Text style={s.defTranslit}>
                        {def.translit}{def.pronunciation ? ` · ${def.pronunciation}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity style={s.allUsesBtn} onPress={openConcordance} activeOpacity={0.7}>
                      <Text style={s.allUsesBtnLabel}>
                        {concordanceResults.length > 0
                          ? `All ${concordanceResults.length} uses`
                          : 'All uses'} →
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Gloss in this verse */}
                {!!gloss && (
                  <View style={s.glossRow}>
                    <Text style={s.glossLabel}>Use in this verse  </Text>
                    <Text style={s.glossValue}>{gloss}</Text>
                  </View>
                )}

                {morph && (
                  <View style={s.morphRow}>
                    <Text style={s.morphPos}>{morph.partOfSpeech}</Text>
                    {morph.tags.length > 0 && (
                      <View style={s.morphChips}>
                        {morph.tags.map(tag => (
                          <TouchableOpacity
                            key={tag}
                            style={[s.morphChip, activeTag === tag && s.morphChipActive]}
                            onPress={() => setActiveTag(prev => prev === tag ? null : tag)}
                            activeOpacity={0.7}
                          >
                            <Text style={[s.morphChipText, activeTag === tag && s.morphChipTextActive]}>
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    {activeTag && TAG_DEFINITIONS[activeTag] && (
                      <Text style={s.morphChipDef}>{TAG_DEFINITIONS[activeTag]}</Text>
                    )}
                  </View>
                )}

                {/* Strong's definition */}
                {!!def.definition && (
                  <Text style={s.defBody}>{def.definition.trim()}</Text>
                )}

                {/* KJV usage */}
                {!!def.kjv_usage && (
                  <View style={s.kjvRow}>
                    <Text style={s.kjvLabel}>KJV uses  </Text>
                    <Text style={s.kjvText}>{def.kjv_usage}</Text>
                  </View>
                )}

                {/* BDB / Thayer's lexicon section */}
                {!!mainText && (
                  <View style={s.lexiconSection}>
                    {/* Label + jump button */}
                    <View style={s.lexiconHeader}>
                      <Text style={s.lexiconLabel}>
                        {isNT ? "Thayer's Greek Lexicon" : 'Brown-Driver-Briggs'}
                      </Text>
                      {splitResult.match ? (
                        <TouchableOpacity
                          style={s.jumpBtn}
                          onPress={jumpToFirstMention}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="arrow-down" size={11} color={colors.accent} />
                          <Text style={s.jumpBtnLabel}>jump to verse</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={s.jumpBtnMuted}>
                          <Text style={s.jumpBtnMutedLabel}>not mentioned</Text>
                        </View>
                      )}
                    </View>

                    {/* Outline */}
                    {!!lexicon?.outline && lexicon.outline.split('•').filter(s => s.trim()).map((item, i) => (
                      <Text key={i} style={s.lexiconOutlineItem}>• {item.trim()}</Text>
                    ))}

                    {/* Main text — split so first match is in a measurable View */}
                    {splitResult.match ? (
                      <>
                        {!!splitResult.before && (
                          <Text style={s.lexiconBody}>{splitResult.before}</Text>
                        )}
                        <View ref={firstMentionRef}>
                          <Text style={s.lexiconBody}>
                            <Text style={s.verseHighlight}>{splitResult.match}</Text>
                            {afterNodes}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <Text style={s.lexiconBody}>{mainText}</Text>
                    )}

                    {/* Scripture Index */}
                    {scriptureIndex.length > 0 && (
                      <View style={s.siSection}>
                        <Text style={s.siLabel}>Scripture Index</Text>
                        {scriptureIndex.map(({ book, refs }) => (
                          <View key={book} style={s.siBookRow}>
                            <Text style={s.siBookName}>{book}</Text>
                            <View style={s.siRefs}>
                              {refs.map((ref, i) => {
                                if (ref.verse === null) {
                                  return <Text key={i} style={s.siRefChapter}>{ref.raw}</Text>
                                }
                                const isCurrent =
                                  book === selected.book &&
                                  ref.chapter === selected.chapter &&
                                  ref.verse === selected.verse
                                const isClicked =
                                  clickedRef?.book === book &&
                                  clickedRef?.chapter === ref.chapter &&
                                  clickedRef?.verse === ref.verse
                                return (
                                  <TouchableOpacity
                                    key={i}
                                    onPress={() => handleRefPress(book, ref as { chapter: number; verse: number })}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={[
                                      s.siRef,
                                      isCurrent && s.siRefCurrent,
                                      isClicked && s.siRefClicked,
                                    ]}>
                                      {ref.raw}
                                    </Text>
                                  </TouchableOpacity>
                                )
                              })}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Verse preview */}
                    {clickedRef && versePreview && (
                      <View style={s.versePreviewCard}>
                        <Text style={s.versePreviewRef}>
                          {clickedRef.book} {clickedRef.chapter}:{clickedRef.verse}
                        </Text>
                        <Text style={s.versePreviewText}>
                          {versePreview.loading ? 'Loading…' : versePreview.text}
                        </Text>
                        <TouchableOpacity
                          onPress={() => goToVerse(clickedRef)}
                          activeOpacity={0.7}
                          style={s.versePreviewGoBtn}
                        >
                          <Text style={s.versePreviewGo}>Go to verse →</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </>
          )}
        </View>
      )}
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { padding: 14, paddingBottom: 40, gap: 14 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },

  langLabel: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },

  pillsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillsRowRTL: { flexDirection: 'row-reverse' },

  pill: {
    backgroundColor: c.bgCard,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 3,
  },
  pillActive:        { backgroundColor: c.accentDim, borderColor: c.accent },
  pillText:          { fontSize: 18, color: c.textPrimary, fontWeight: '500' },
  pillTextActive:    { color: c.accent },
  pillTextHebrew:    { fontSize: 20 },
  pillTranslit:      { fontSize: 11, color: c.textMuted },
  pillTranslitActive:{ color: c.accent },

  defCard: {
    backgroundColor: c.bgCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.accent,
    padding: 14,
    gap: 10,
  },
  defHeader: { gap: 2 },
  defHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  allUsesBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.accentDim,
    marginTop: 4,
  },
  allUsesBtnLabel: { fontSize: 12, fontWeight: '600', color: c.accent },
  defNum: {
    fontSize: 12, fontWeight: '700', color: c.accent,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  defLemma:    { fontSize: 22, fontWeight: '700', color: c.textPrimary },
  defTranslit: { fontSize: 13, color: c.textMuted, fontStyle: 'italic' },
  defBody:     { fontSize: 14, lineHeight: 22, color: c.textPrimary },
  defEmpty:    { fontSize: 14, color: c.textMuted, fontStyle: 'italic' },

  morphRow: {
    backgroundColor: c.bgTertiary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7, gap: 6,
  },
  morphPos: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  morphChips:         { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  morphChip: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSecondary,
  },
  morphChipActive:     { borderColor: c.accent, backgroundColor: c.accentDim },
  morphChipText:       { fontSize: 12, color: c.textSecondary },
  morphChipTextActive: { color: c.accent, fontWeight: '600' },
  morphChipDef: {
    fontSize: 12, color: c.textSecondary, lineHeight: 18,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
    paddingTop: 5,
  },

  glossRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    backgroundColor: c.accentDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  glossLabel: { fontSize: 11, fontWeight: '700', color: c.accent, textTransform: 'uppercase', letterSpacing: 0.4 },
  glossValue: { fontSize: 15, fontWeight: '600', color: c.accent },

  kjvRow:   { flexDirection: 'row', flexWrap: 'wrap' },
  kjvLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kjvText:  { fontSize: 13, color: c.textSecondary, flex: 1 },

  // ── Lexicon section ───────────────────────────────────────

  lexiconSection: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  lexiconHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  lexiconLabel: {
    fontSize: 11, fontWeight: '700', color: c.accent,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  jumpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  jumpBtnLabel: {
    fontSize: 11, fontWeight: '700', color: c.accent, letterSpacing: 0.3,
  },
  jumpBtnMuted: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.border,
  },
  jumpBtnMutedLabel: {
    fontSize: 11, color: c.textMuted,
  },
  lexiconOutlineItem: {
    fontSize: 13, lineHeight: 20, color: c.textSecondary,
  },
  lexiconBody: {
    fontSize: 13, lineHeight: 21, color: c.textSecondary,
  },
  verseHighlight: {
    color: c.accent, fontWeight: '700',
  },

  // ── Scripture Index ───────────────────────────────────────

  siSection: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  siLabel: {
    fontSize: 10, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  siBookRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    alignItems: 'flex-start', gap: 4, marginBottom: 4,
  },
  siBookName: {
    fontSize: 12, fontWeight: '700', color: c.textMuted,
    minWidth: 72, paddingTop: 3,
  },
  siRefs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  siRef: {
    fontSize: 12, color: c.textSecondary,
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgCard,
  },
  siRefCurrent: {
    backgroundColor: c.accentDim,
    borderColor: c.accent,
    color: c.accent,
    fontWeight: '700',
  },
  siRefClicked: {
    backgroundColor: c.bgTertiary,
    borderColor: c.textMuted,
  },
  siRefChapter: {
    fontSize: 12, color: c.textMuted,
    paddingHorizontal: 4, paddingVertical: 3,
  },

  // ── Verse preview ─────────────────────────────────────────

  versePreviewCard: {
    backgroundColor: c.bgSecondary,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 12,
    gap: 6,
  },
  versePreviewRef: {
    fontSize: 13, fontWeight: '700', color: c.accent,
  },
  versePreviewText: {
    fontSize: 13, lineHeight: 20, color: c.textMuted, fontStyle: 'italic',
  },
  versePreviewGoBtn: { alignSelf: 'flex-end' },
  versePreviewGo: {
    fontSize: 13, fontWeight: '600', color: c.accent,
  },
})

// ── Concordance modal styles ───────────────────────────────

const makeConcStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  lemma: { fontSize: 20, fontWeight: '700', color: c.textPrimary },
  meta:  { fontSize: 13, color: c.textMuted, marginTop: 3 },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  filterBtnActive: {
    backgroundColor: c.accent,
  },
  filterBtnLabel:       { fontSize: 12, fontWeight: '600', color: c.accent },
  filterBtnLabelActive: { color: c.bgPrimary },

  // Filter panel
  filterPanel: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    paddingVertical: 10,
  },
  catRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
  },
  catChipActive: { borderColor: c.accent, backgroundColor: c.accentDim },
  catChipLabel:       { fontSize: 13, fontWeight: '500', color: c.textMuted },
  catChipLabelActive: { color: c.accent, fontWeight: '600' },

  // List
  loadingRow: { alignItems: 'center', paddingVertical: 40 },
  emptyLabel: { fontSize: 14, color: c.textMuted, fontStyle: 'italic' },

  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: c.bgPrimary,
  },
  bookLabel: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6,
    color: c.accent,
  },
  bookHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bookCount: { fontSize: 11, color: c.accent, fontWeight: '600' },

  row: { paddingHorizontal: 20, paddingVertical: 12 },
  ref:  { fontSize: 13, fontWeight: '700', color: c.accent, marginBottom: 2 },
  word: { fontSize: 13, color: c.accent, fontStyle: 'italic', marginBottom: 3 },
  text: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginLeft: 20,
  },
})
