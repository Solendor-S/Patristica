import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, TextInput, ActivityIndicator,
  Keyboard, StatusBar, Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSQLiteContext } from 'expo-sqlite'
import { useUserDb } from '../db/UserDbProvider'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { searchVerses, searchVersesAll, searchVersesFuzzy, searchOriginalLanguage, detectQueryScript, normalizeForSearch, normalizeStrongsNumber, getSearchHistory, addSearchHistory, deleteSearchHistory, getStrongsEntry, getStrongsConcordance, searchStrongsByEnglishWord, searchAnnotatedByStrongs, SEARCH_STOP_WORDS, TRANSLATION_PACK_SLUG } from '../db/queries'
import type { StrongsEntry, StrongsConcordanceResult, StrongsWordMatch } from '../db/queries'
import { StrongsConcordanceModal, TranslationVariantsModal } from './WordStudyPanel'
import { useTranslation, TRANSLATIONS, ANNOTATED_TRANSLATIONS, API_TRANSLATIONS } from '../context/TranslationContext'
import { useStrongsInSearch } from '../context/StrongsInSearchContext'
import { useSearchOrder } from '../context/SearchOrderContext'
import type { SearchMode } from '../context/SearchOrderContext'
import { BOOKS, BOOK_ORDER } from '../data/books'
import { matchBookRefs, type BookRef } from '../lib/parsePassage'
import { useTheme } from '../context/ThemeContext'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { useWordFocus } from '../context/WordFocusContext'
import { usePacks } from '../context/PackContext'
import { stripUsfm } from '../data/redLetter'
import type { ThemeColors } from '../theme/themes'

const STRONGS_RE = /([HG]\d+)/g
const STRONGS_TOKEN_RE = /^[HG]\d+$/
const WORD_TOKEN_RE = /[hg]\d+|[a-z']+/gi

function matchesQueryWords(text: string, qWords: string[]): boolean {
  const tokens = text.toLowerCase().match(WORD_TOKEN_RE) ?? []
  return qWords.some(w => {
    if (tokens.includes(w)) return true
    const m = w.match(/^([hg])(\d+)$/i)
    if (!m) return false
    const padded = (m[1] + String(parseInt(m[2])).padStart(4, '0')).toLowerCase()
    return tokens.includes(padded)
  })
}

function sigWords(qWords: string[]): string[] {
  const sig = qWords.filter(w => !SEARCH_STOP_WORDS.has(w))
  return sig.length > 0 ? sig : qWords
}

// ── Book breakdown ─────────────────────────────────────────

interface BookBreakdown {
  book: string
  verseCount: number
  matchCount: number
}

function computeBreakdown(results: SearchResult[], queryWords: string[]): BookBreakdown[] {
  const map = new Map<string, { verseCount: number; matchCount: number }>()
  for (const r of results) {
    const tokens = r.text.toLowerCase().match(WORD_TOKEN_RE) ?? []
    let matches = 0
    for (const w of queryWords) {
      matches += tokens.filter(t => t === w).length
    }
    const entry = map.get(r.book) ?? { verseCount: 0, matchCount: 0 }
    entry.verseCount++
    entry.matchCount += matches
    map.set(r.book, entry)
  }
  return [...map.entries()]
    .map(([book, { verseCount, matchCount }]) => ({ book, verseCount, matchCount }))
    .sort((a, b) => (BOOK_ORDER.get(a.book) ?? 999) - (BOOK_ORDER.get(b.book) ?? 999))
}

function BookBreakdownModal({
  visible, onClose, data, loading, results, colors, onVersePress, highlightRegex,
  searchedStrongsTags, showStrongs,
}: {
  visible: boolean
  onClose: () => void
  data: BookBreakdown[]
  loading: boolean
  results: SearchResult[]
  colors: ThemeColors
  onVersePress: (r: SearchResult) => void
  highlightRegex: RegExp | null
  searchedStrongsTags: Set<string>
  showStrongs: boolean
}) {
  const { bottom } = useSafeAreaInsets()
  const [selectedBook, setSelectedBook] = useState<string | null>(null)

  useEffect(() => { if (!visible) setSelectedBook(null) }, [visible])

  const totalVerses  = data.reduce((s, r) => s + r.verseCount, 0)
  const totalMatches = data.reduce((s, r) => s + r.matchCount, 0)
  const bookVerses   = selectedBook ? results.filter(r => r.book === selectedBook) : []

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => { if (selectedBook) setSelectedBook(null); else onClose() }}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: colors.bgSecondary,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          paddingTop: 20, height: '80%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: 20, paddingBottom: 12,
            borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
          }}>
            {selectedBook ? (
              <TouchableOpacity
                onPress={() => setSelectedBook(null)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={20} color={colors.accent} />
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                  {selectedBook}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>See All</Text>
            )}
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={colors.accent} size="large" />
            </View>
          ) : selectedBook ? (
            // Drill-down: verses for selected book
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottom + 16 }}>
              {bookVerses.map(r => (
                <TouchableOpacity
                  key={`${r.chapter}-${r.verse}`}
                  style={{
                    paddingHorizontal: 20, paddingVertical: 13,
                    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
                  }}
                  activeOpacity={0.7}
                  onPress={() => { onVersePress(r); onClose() }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent, marginBottom: 4, letterSpacing: 0.2 }}>
                    {r.book} {r.chapter}:{r.verse}
                  </Text>
                  <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textSecondary }}>
                    {showStrongs
                      ? stripUsfm(r.text).replace(/[{}]/g, '').split(STRONGS_RE).flatMap((seg, i) => {
                          if (STRONGS_TOKEN_RE.test(seg)) {
                            const isSearchedTag = searchedStrongsTags.has(normalizeStrongsNumber(seg.toUpperCase()))
                            return [<Text key={`s${i}`} style={{
                              color: isSearchedTag ? '#fff' : colors.accent,
                              fontWeight: '700', fontSize: 13,
                              backgroundColor: isSearchedTag ? '#4D96FF' : colors.accentDim,
                              borderRadius: 4, overflow: 'hidden', paddingHorizontal: 2,
                            }}>{seg}</Text>]
                          }
                          if (!highlightRegex) return [seg as React.ReactNode]
                          return seg.split(highlightRegex).map((p, j) =>
                            j % 2 === 1
                              ? <Text key={`s${i}h${j}`} style={{ color: colors.textPrimary, fontWeight: '700', backgroundColor: colors.accentDim }}>{p}</Text>
                              : p as React.ReactNode
                          )
                        })
                      : highlightRegex
                        ? stripUsfm(r.text).replace(/[{}]/g, '').split(highlightRegex).map((p, j) =>
                            j % 2 === 1
                              ? <Text key={j} style={{ color: colors.textPrimary, fontWeight: '700', backgroundColor: colors.accentDim }}>{p}</Text>
                              : p
                          )
                        : stripUsfm(r.text).replace(/[{}]/g, '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            // Book breakdown table
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: bottom + 16 }}>
              <Text style={{
                fontSize: 13, fontWeight: '700', color: colors.textMuted,
                textAlign: 'center', paddingVertical: 12,
                borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
              }}>
                {totalVerses} verse{totalVerses !== 1 ? 's' : ''} found, {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
              </Text>
              <View style={{
                flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 9,
                backgroundColor: colors.bgTertiary,
                borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
              }}>
                <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Book</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Verses</Text>
                <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Matches</Text>
              </View>
              {data.map((row, i) => (
                <TouchableOpacity
                  key={row.book}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingVertical: 12,
                    backgroundColor: i % 2 === 0 ? colors.bgPrimary : colors.bgSecondary,
                    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
                  }}
                  activeOpacity={0.7}
                  onPress={() => setSelectedBook(row.book)}
                >
                  <Text style={{ flex: 2, fontSize: 14, color: colors.textPrimary }}>{row.book}</Text>
                  <Text style={{ flex: 1, fontSize: 14, color: colors.textSecondary, textAlign: 'right' }}>{row.verseCount}</Text>
                  <Text style={{ flex: 1, fontSize: 14, color: colors.textSecondary, textAlign: 'right' }}>{row.matchCount}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

function formatRef(ref: BookRef): string {
  if (!ref.chapterSpecified) return ref.book
  if (!ref.verse) return `${ref.book} ${ref.chapter}`
  return `${ref.book} ${ref.chapter}:${ref.verse}${ref.verseEnd ? `–${ref.verseEnd}` : ''}`
}
import type { SearchResult, RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Search'>
type Testament = 'all' | 'OT' | 'NT'

const OT_BOOKS = BOOKS.filter(b => b.testament === 'OT').map(b => b.name)
const NT_BOOKS = BOOKS.filter(b => b.testament === 'NT').map(b => b.name)

function filterLabel(testament: Testament, selectedBooks: Set<string>): string {
  if (selectedBooks.size > 0) {
    const prefix = testament !== 'all' ? `${testament} · ` : ''
    if (selectedBooks.size <= 2) return `${prefix}${Array.from(selectedBooks).join(', ')}`
    return `${prefix}${selectedBooks.size} books`
  }
  if (testament === 'OT') return 'Old Testament'
  if (testament === 'NT') return 'New Testament'
  return 'All Books'
}

function booksForSearch(testament: Testament, selectedBooks: Set<string>): string[] {
  if (selectedBooks.size > 0) return Array.from(selectedBooks)
  if (testament === 'OT') return OT_BOOKS
  if (testament === 'NT') return NT_BOOKS
  return []
}

function extractKjvWord(kjvPlusText: string | null, num: string): string | null {
  if (!kjvPlusText) return null
  const escaped = num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = kjvPlusText.match(new RegExp('(\\S+)\\s+' + escaped + '(?:\\s|$)', 'i'))
  return m ? m[1].replace(/[^a-zA-Z'-]/g, '') || null : null
}

function HighlightedText({ text, word, baseStyle, accentColor }: { text: string; word: string | null; baseStyle: any; accentColor: string }) {
  const re = useMemo(
    () => word ? new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i') : null,
    [word],
  )
  if (!re) return <Text style={baseStyle} numberOfLines={3}>{text}</Text>
  const parts = text.split(re)
  return (
    <Text style={baseStyle} numberOfLines={3}>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <Text key={i} style={{ color: accentColor, fontWeight: '700' }}>{p}</Text>
          : p
      )}
    </Text>
  )
}

function StrongsWordMapModal({
  visible, query, data, loading, onClose, onSelectStrongs, onNavigate,
}: {
  visible: boolean
  query: string
  data: { word: string; matches: StrongsWordMatch[] }[]
  loading: boolean
  onClose: () => void
  onSelectStrongs: (num: string) => void
  onNavigate: (book: string, chapter: number, verse: number) => void
}) {
  const { colors } = useTheme()
  const modal = useMemo(() => makeModal(colors), [colors])
  const { bottom } = useSafeAreaInsets()
  const db = useSQLiteContext()
  const [selectedEntry, setSelectedEntry] = useState<StrongsWordMatch | null>(null)
  const [concResults, setConcResults]     = useState<StrongsConcordanceResult[]>([])
  const [concLoading, setConcLoading]     = useState(false)

  useEffect(() => {
    if (!visible) setSelectedEntry(null)
  }, [visible])

  useEffect(() => {
    if (!selectedEntry) return
    setConcLoading(true)
    setConcResults([])
    getStrongsConcordance(db, selectedEntry.lang, selectedEntry.number)
      .then(rows => { setConcResults(rows); setConcLoading(false) })
      .catch(() => setConcLoading(false))
  }, [selectedEntry, db])

  const handleBack = () => setSelectedEntry(null)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={selectedEntry ? handleBack : onClose}>
      <View style={modal.overlay}>
        <View style={[modal.sheet, { maxHeight: '80%', paddingBottom: bottom }]}>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
            {!!selectedEntry && (
              <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 10 }}>
                <Ionicons name="chevron-back" size={22} color={colors.accent} />
              </TouchableOpacity>
            )}
            <Text style={[modal.title, { flex: 1, marginBottom: 0, textAlign: selectedEntry ? 'left' : 'center' }]}>
              {selectedEntry ? `${selectedEntry.number}  ${selectedEntry.lemma}` : `Strong's for "${query}"`}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Level 1 — word list */}
          {!selectedEntry && (
            loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {data.map(({ word, matches }) => (
                  <View key={word}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 }}>
                      "{word}"
                    </Text>
                    {matches.length === 0 ? (
                      <Text style={{ fontSize: 13, color: colors.textMuted, fontStyle: 'italic', paddingHorizontal: 20, paddingBottom: 4 }}>
                        No Strong's found for "{word}". Try the base form (e.g. "drink" instead of "drank").
                      </Text>
                    ) : (
                      matches.map(m => (
                        <TouchableOpacity
                          key={m.number}
                          onPress={() => setSelectedEntry(m)}
                          activeOpacity={0.7}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent }}>{m.number}</Text>
                              {!!m.lemma && <Text style={{ fontSize: 15, color: colors.textPrimary }}>{m.lemma}</Text>}
                              <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>{m.lang === 'greek' ? 'Greek' : 'Hebrew'}</Text>
                            </View>
                            <Text style={{ fontSize: 13, color: colors.textSecondary }} numberOfLines={2}>
                              {m.definition?.trim().slice(0, 80) ?? ''}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                ))}
              </ScrollView>
            )
          )}

          {/* Level 2 — verse list */}
          {selectedEntry && (
            <>
              {/* Definition subheader */}
              <View style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
                {!!(selectedEntry.translit || selectedEntry.pronunciation) && (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 4 }}>
                    {[selectedEntry.translit, selectedEntry.pronunciation].filter(Boolean).join('  ·  ')}
                    {`  ·  ${selectedEntry.lang === 'greek' ? 'Greek' : 'Hebrew'}`}
                  </Text>
                )}
                <Text style={{ fontSize: 13, color: colors.textPrimary, lineHeight: 19 }} numberOfLines={3}>
                  {selectedEntry.definition?.trim()}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                  {concLoading ? '…' : `${concResults.length} occurrence${concResults.length !== 1 ? 's' : ''}`}
                </Text>
              </View>

              {concLoading ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: 32 }} />
              ) : (
                <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                  {concResults.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => { onNavigate(r.book, r.chapter, r.verse); onClose() }}
                      activeOpacity={0.7}
                      style={{ paddingHorizontal: 20, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent, marginBottom: 3 }}>
                        {r.book} {r.chapter}:{r.verse}
                      </Text>
                      <HighlightedText
                        text={stripUsfm(r.text).replace(/[{}]/g, '')}
                        word={extractKjvWord(r.kjvPlusText, selectedEntry!.number)}
                        baseStyle={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19 }}
                        accentColor={colors.accent}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TouchableOpacity
                onPress={() => onSelectStrongs(selectedEntry.number)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 16, marginVertical: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentDim }}
              >
                <Ionicons name="git-branch-outline" size={15} color={colors.accent} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>See more info</Text>
              </TouchableOpacity>
            </>
          )}

        </View>
      </View>
    </Modal>
  )
}

export default function SearchScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const modal = useMemo(() => makeModal(colors), [colors])
  const { bottom } = useSafeAreaInsets()
  const db = useSQLiteContext()
  const userDb = useUserDb()
  const navigation = useNavigation<NavProp>()
  const { translation: activeTranslation, setTranslation } = useTranslation()
  // Search runs against the local FTS index. API-only translations (ESV) have no
  // local text, so every read below falls back to the KJV rather than finding nothing.
  const translation = API_TRANSLATIONS.has(activeTranslation) ? 'KJV' as const : activeTranslation
  const { getPackDb, isInstalled } = usePacks()
  const { strongsInSearch } = useStrongsInSearch()
  const { biblicalOrder, searchMode } = useSearchOrder()
  const { setSelected } = useSelectedVerse()
  const { setWordFocus } = useWordFocus()

  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState<SearchResult[]>([])
  const [loading, setLoading]         = useState(false)
  const [searched, setSearched]       = useState(false)
  const [isFuzzy, setIsFuzzy]         = useState(false)
  const [correctedTerms, setCorrectedTerms] = useState<string[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [searchScript, setSearchScript] = useState<'latin' | 'greek' | 'hebrew'>('latin')

  // Committed filter state
  const [testament, setTestament]         = useState<Testament>('all')
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())

  // Draft filter state (inside picker, committed on Apply)
  const [draftTestament, setDraftTestament]         = useState<Testament>('all')
  const [draftBooks, setDraftBooks]                 = useState<Set<string>>(new Set())

  const [history, setHistory] = useState<string[]>([])
  const [breakdownVisible, setBreakdownVisible]   = useState(false)
  const [breakdownData, setBreakdownData]         = useState<BookBreakdown[]>([])
  const [breakdownResults, setBreakdownResults]   = useState<SearchResult[]>([])
  const [breakdownLoading, setBreakdownLoading]   = useState(false)
  const [strongsMapVisible, setStrongsMapVisible] = useState(false)
  const [strongsMapData, setStrongsMapData]       = useState<{ word: string; matches: StrongsWordMatch[] }[]>([])
  const [strongsMapLoading, setStrongsMapLoading] = useState(false)
  const lastQueryRef = useRef('')
  const [strongsPopup, setStrongsPopup] = useState<{
    num: string
    entry: StrongsEntry | null
    loading: boolean
    book: string
    chapter: number
    verse: number
    fromMap: boolean
  } | null>(null)
  const [strongsConcResults, setStrongsConcResults]     = useState<StrongsConcordanceResult[]>([])
  const [strongsConcLoading, setStrongsConcLoading]     = useState(false)
  const [strongsWordTranslit, setStrongsWordTranslit]   = useState('')
  const [concModalVisible,   setConcModalVisible]       = useState(false)
  const [transVariantsVisible, setTransVariantsVisible] = useState(false)
  const inputRef = useRef<TextInput>(null)

  useEffect(() => {
    getSearchHistory(userDb).then(setHistory).catch(() => {})
  }, [])

  const removeHistoryItem = useCallback((item: string) => {
    deleteSearchHistory(userDb, item).catch(() => {})
    setHistory(prev => prev.filter(h => h !== item))
  }, [userDb])

  const clearHistory = useCallback(() => {
    deleteSearchHistory(userDb).catch(() => {})
    setHistory([])
  }, [userDb])

  const queryTrimmed = query.trim()
  const bookRefs = useMemo(() => matchBookRefs(queryTrimmed), [queryTrimmed])
  const searchNeedsInstall = useMemo(() => {
    const slug = TRANSLATION_PACK_SLUG[translation]
    return !!slug && !isInstalled(slug)
  }, [translation, isInstalled])

  const displayResults = useMemo(() => {
    if (!biblicalOrder) return results
    return [...results].sort((a, b) => {
      const ai = BOOK_ORDER.get(a.book) ?? 999
      const bi = BOOK_ORDER.get(b.book) ?? 999
      if (ai !== bi) return ai - bi
      if (a.chapter !== b.chapter) return a.chapter - b.chapter
      return a.verse - b.verse
    })
  }, [results, biblicalOrder])

  const highlightRegex = useMemo(() => {
    if (searchScript !== 'latin') return null
    let terms = isFuzzy && correctedTerms.length > 0
      ? correctedTerms
      : queryTrimmed.split(/\s+/).filter(Boolean)
    if (terms.length === 0) return null
    const wordBoundary = searchMode === 'exact_words' || searchMode === 'exact_all_words'
    if (wordBoundary) {
      const sig = terms.filter(w => !SEARCH_STOP_WORDS.has(w.toLowerCase()))
      if (sig.length > 0) terms = sig
    }
    const escaped = terms.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    return wordBoundary
      ? new RegExp(`(\\b(?:${escaped})\\b)`, 'gi')
      : new RegExp(`(${escaped})`, 'gi')
  }, [queryTrimmed, isFuzzy, correctedTerms, searchScript, searchMode])

  const normSearchTerms = useMemo(() => {
    if (searchScript === 'latin') return []
    return queryTrimmed.split(/\s+/).filter(Boolean).map(normalizeForSearch).filter(Boolean)
  }, [queryTrimmed, searchScript])

  // Set of Strong's tag numbers from the current query (uppercase, bare form e.g. 'G746')
  // used to highlight searched tags differently from other tags in the results list.
  const searchedStrongsTags = useMemo(() => {
    const tags = new Set<string>()
    queryTrimmed.split(/\s+/).filter(Boolean).forEach(w => {
      const m = w.match(/^([hgHG])(\d+)$/)
      if (m) tags.add(`${m[1].toUpperCase()}${parseInt(m[2])}`)
    })
    return tags
  }, [queryTrimmed])

  const doSearch = useCallback(async (
    q: string,
    trans = translation,
    test = testament,
    selBooks = selectedBooks,
  ) => {
    const trimmed = q.trim()
    if (!trimmed) return
    Keyboard.dismiss()
    setLoading(true)
    setSearched(true)
    setIsFuzzy(false)
    lastQueryRef.current = trimmed
    setCorrectedTerms([])
    addSearchHistory(userDb, trimmed).catch(() => {})
    setHistory(prev => [trimmed, ...prev.filter(h => h !== trimmed)].slice(0, 20))
    const books = booksForSearch(test, selBooks)

    // Open pack DB for translations that live in pack files (ASV, WEB, BSB, etc.)
    const packSlug = TRANSLATION_PACK_SLUG[trans]
    const packDb = (packSlug && isInstalled(packSlug)) ? (await getPackDb(packSlug) ?? undefined) : undefined

    const script = detectQueryScript(trimmed)
    if (script !== 'latin') {
      setSearchScript(script)
      setResults(await searchOriginalLanguage(db, trimmed, script, books, trans))
      setLoading(false)
      return
    }
    setSearchScript('latin')

    // Strongs number search on word-table translations (TR+, WLC+, LXX+)
    if (/^[hgHG]\d+$/.test(trimmed) && (trans === 'TR+' || trans === 'WLC+' || trans === 'LXX+')) {
      const rows = await searchAnnotatedByStrongs(db, trimmed, trans, books)
      setResults(rows)
      setLoading(false)
      return
    }

    const isWordBoundary = searchMode === 'exact_words' || searchMode === 'exact_all_words'
    const rows = await searchVerses(db, trimmed, trans, books, 200, isWordBoundary, packDb)
    const qWords = trimmed.toLowerCase().split(/\s+/).filter(Boolean)

    if (searchMode === 'exact_words') {
      const sw = sigWords(qWords)
      setResults(rows.filter(r => matchesQueryWords(r.text, sw)))
      setLoading(false)
      return
    }

    if (searchMode === 'exact_all_words') {
      const sw = sigWords(qWords)
      setResults(rows.filter(r => {
        const tokens = r.text.toLowerCase().match(WORD_TOKEN_RE) ?? []
        return sw.every(w => tokens.includes(w))
      }))
      setLoading(false)
      return
    }

    if (searchMode === 'exact_phrase') {
      const phraseLower = trimmed.toLowerCase()
      setResults(rows.filter(r => r.text.toLowerCase().includes(phraseLower)))
      setLoading(false)
      return
    }

    const hasTypo = qWords.some(w => w.length >= 4 && !rows.some(r => r.text.toLowerCase().includes(w)))
    if (hasTypo || rows.length === 0) {
      // Correct each typo word individually via single-word fuzzy, then re-search
      const correctedWords = await Promise.all(qWords.map(async w => {
        if (w.length < 4) return w
        if (rows.some(r => r.text.toLowerCase().includes(w))) return w
        const wordFuzzy = await searchVersesFuzzy(db, w, trans, books)
        return wordFuzzy[0]?.closestWords[0] ?? w
      }))
      const anyChanged = correctedWords.some((cw, i) => cw !== qWords[i])
      if (anyChanged) {
        const correctedRows = await searchVerses(db, correctedWords.join(' '), trans, books, 200, false, packDb)
        setResults(correctedRows.length > 0 ? correctedRows : rows)
        if (correctedRows.length > 0) {
          setIsFuzzy(true)
          setCorrectedTerms(correctedWords)
        }
      } else {
        setResults(rows)
      }
    } else {
      setResults(rows)
    }
    setLoading(false)
  }, [db, translation, testament, selectedBooks, searchMode, getPackDb, isInstalled])

  const navigateToVerse = (result: SearchResult) => {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: result.book, chapter: result.chapter, verse: result.verse, _ts: Date.now() },
    })
  }

  const navigateToBook = (book: string, chapter: number, verse?: number) => {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book, chapter, verse, _ts: Date.now() },
    })
  }

  function openBookPicker() {
    setDraftTestament(testament)
    setDraftBooks(new Set(selectedBooks))
    setBookPickerOpen(true)
  }

  function applyFilter() {
    setTestament(draftTestament)
    setSelectedBooks(draftBooks)
    setBookPickerOpen(false)
    if (searched && queryTrimmed) doSearch(query, translation, draftTestament, draftBooks)
  }

  function clearFilter() {
    setDraftTestament('all')
    setDraftBooks(new Set())
  }

  function openStrongs(num: string, book: string, chapter: number, verse: number, fromMap = false) {
    setStrongsPopup({ num, entry: null, loading: true, book, chapter, verse, fromMap })
    setStrongsConcResults([])
    setStrongsConcLoading(true)
    setStrongsWordTranslit('')
    const lang: 'greek' | 'hebrew' = num.startsWith('H') ? 'hebrew' : 'greek'
    getStrongsEntry(db, lang, num)
      .then(entry => setStrongsPopup(prev => prev?.num === num ? { ...prev, entry, loading: false } : prev))
      .catch(() => setStrongsPopup(prev => prev?.num === num ? { ...prev, loading: false } : prev))
    getStrongsConcordance(db, lang, num)
      .then(rows => {
        setStrongsConcResults(rows)
        setStrongsConcLoading(false)
        setStrongsWordTranslit(rows.find(r => r.translit)?.translit ?? '')
      })
      .catch(() => setStrongsConcLoading(false))
  }

  function openInWordStudy() {
    if (!strongsPopup) return
    setSelected({ book: strongsPopup.book, chapter: strongsPopup.chapter, verse: strongsPopup.verse })
    setWordFocus(strongsPopup.num)
    setStrongsPopup(null)
    navigation.navigate('Study' as any)
  }

  const handleOpenBreakdown = useCallback(async () => {
    setBreakdownVisible(true)
    setBreakdownLoading(true)
    try {
      const books = booksForSearch(testament, selectedBooks)
      const isWordBoundary = searchMode === 'exact_words' || searchMode === 'exact_all_words'
      const bkSlug = TRANSLATION_PACK_SLUG[translation]
      const bkPackDb = (bkSlug && isInstalled(bkSlug)) ? (await getPackDb(bkSlug) ?? undefined) : undefined
      const allResults = await searchVersesAll(db, lastQueryRef.current, translation, books, isWordBoundary, bkPackDb)
      const qWords = lastQueryRef.current.toLowerCase().split(/\s+/).filter(Boolean)
      const sw = isWordBoundary ? sigWords(qWords) : null
      const filtered = !sw ? allResults
        : searchMode === 'exact_all_words'
          ? allResults.filter(r => { const tokens = r.text.toLowerCase().match(WORD_TOKEN_RE) ?? []; return sw.every(w => tokens.includes(w)) })
          : allResults.filter(r => matchesQueryWords(r.text, sw))
      setBreakdownResults(filtered)
      setBreakdownData(computeBreakdown(filtered, qWords))
    } catch (e) {
      console.error('Breakdown error:', e)
    } finally {
      setBreakdownLoading(false)
    }
  }, [db, translation, testament, selectedBooks, searchMode, getPackDb, isInstalled])

  const handleOpenStrongsMap = useCallback(async () => {
    setStrongsMapVisible(true)
    setStrongsMapLoading(true)
    const words = [...new Set(queryTrimmed.toLowerCase().split(/\s+/).filter(w => w && !SEARCH_STOP_WORDS.has(w)))]
    const data = await Promise.all(
      words.map(async word => ({ word, matches: await searchStrongsByEnglishWord(db, word) }))
    )
    setStrongsMapData(data)
    setStrongsMapLoading(false)
  }, [db, queryTrimmed])

  function toggleDraftBook(book: string) {
    setDraftBooks(prev => {
      const next = new Set(prev)
      if (next.has(book)) next.delete(book); else next.add(book)
      return next
    })
  }

  function selectDraftTestament(t: Testament) {
    setDraftTestament(t)
    setDraftBooks(new Set())
  }

  const visibleBooks = draftTestament === 'OT' ? OT_BOOKS
    : draftTestament === 'NT' ? NT_BOOKS
    : null  // null = no book chips (all selected)

  const hasFilter = testament !== 'all' || selectedBooks.size > 0
  const label = filterLabel(testament, selectedBooks)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={[styles.versionBtn, hasFilter && styles.versionBtnActive]}
            onPress={openBookPicker}
            activeOpacity={0.7}
          >
            <Ionicons name="filter" size={12} color={hasFilter ? colors.accent : colors.textMuted} />
            <Text style={[styles.versionLabel, hasFilter && styles.versionLabelActive]} numberOfLines={1}>
              {label}
            </Text>
            <Ionicons name="chevron-down" size={11} color={hasFilter ? colors.accent : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.versionBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
            <Text style={styles.versionLabel}>{translation}</Text>
            <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Translation picker modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)} />
          <View style={modal.sheet}>
            <Text style={modal.title}>Bible Translation</Text>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 4 }}>
              {/* apiOnly excluded: search runs against the local FTS index, and the ESV has no local text. */}
              {TRANSLATIONS.filter(t => !t.apiOnly).map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={modal.row}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTranslation(t.key)
                    setPickerOpen(false)
                    if (searched && queryTrimmed) doSearch(query, t.key)
                  }}
                >
                  <View style={modal.info}>
                    <Text style={[modal.key, translation === t.key && modal.keyActive]}>{t.label}</Text>
                    <Text style={modal.full}>{t.full}</Text>
                  </View>
                  {translation === t.key && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Book / testament filter modal */}
      <Modal visible={bookPickerOpen} transparent animationType="slide" onRequestClose={() => setBookPickerOpen(false)}>
        <View style={modal.overlay}>
          <View style={modal.filterSheet}>
            {/* Header */}
            <View style={modal.filterHeader}>
              <Text style={modal.title}>Filter by Scope</Text>
              <TouchableOpacity onPress={() => setBookPickerOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Testament toggle */}
            <View style={modal.testamentRow}>
              {(['all', 'OT', 'NT'] as Testament[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[modal.testamentBtn, draftTestament === t && modal.testamentBtnActive]}
                  onPress={() => selectDraftTestament(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[modal.testamentLabel, draftTestament === t && modal.testamentLabelActive]}>
                    {t === 'all' ? 'All' : t === 'OT' ? 'Old Testament' : 'New Testament'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Book chips */}
            {visibleBooks && (
              <ScrollView style={modal.bookScroll} contentContainerStyle={modal.bookChips} showsVerticalScrollIndicator={false}>
                {visibleBooks.map(book => {
                  const active = draftBooks.has(book)
                  return (
                    <TouchableOpacity
                      key={book}
                      style={[modal.bookChip, active && modal.bookChipActive]}
                      onPress={() => toggleDraftBook(book)}
                      activeOpacity={0.7}
                    >
                      <Text style={[modal.bookChipLabel, active && modal.bookChipLabelActive]}>{book}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            )}

            {!visibleBooks && (
              <View style={modal.allBooksNote}>
                <Text style={modal.allBooksText}>Searching all 66 books</Text>
              </View>
            )}

            {/* Footer */}
            <View style={modal.filterFooter}>
              <TouchableOpacity style={modal.clearBtn} onPress={clearFilter} activeOpacity={0.7}>
                <Text style={modal.clearBtnLabel}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.applyBtn} onPress={applyFilter} activeOpacity={0.7}>
                <Text style={modal.applyBtnLabel}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search the Bible…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => doSearch(query)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.searchBtn, !queryTrimmed && styles.searchBtnDisabled]}
          onPress={() => doSearch(query)}
          activeOpacity={0.7}
          disabled={!queryTrimmed}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Search history */}
      {!queryTrimmed && history.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyLabel}>RECENT SEARCHES</Text>
            <TouchableOpacity onPress={clearHistory} activeOpacity={0.7}>
              <Text style={styles.historyClear}>Clear</Text>
            </TouchableOpacity>
          </View>
          {history.map(item => (
            <TouchableOpacity
              key={item}
              style={styles.historyRow}
              activeOpacity={0.7}
              onPress={() => { setQuery(item); doSearch(item) }}
            >
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={styles.historyText}>{item}</Text>
              <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => removeHistoryItem(item)}>
                <Ionicons name="close" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results count */}
      {queryTrimmed !== '' && searched && !loading && (
        <Text style={styles.resultCount}>
          {searchNeedsInstall
            ? 'Pack not installed — search unavailable'
            : results.length === 0
            ? 'No results'
            : isFuzzy
              ? `~${results.length} fuzzy match${results.length === 1 ? '' : 'es'}`
              : `${results.length}${results.length === 200 ? '+' : ''} result${results.length === 1 ? '' : 's'}`}
          {hasFilter && <Text style={styles.resultCountFilter}> · {label}</Text>}
        </Text>
      )}

      {/* See Tags/Translations button */}
      {queryTrimmed !== '' && searched && !loading && results.length > 0 && (
        <TouchableOpacity
          style={styles.breakdownBtn}
          onPress={handleOpenBreakdown}
          activeOpacity={0.7}
        >
          <Ionicons name="bar-chart-outline" size={14} color={colors.accent} />
          <Text style={styles.breakdownBtnText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {queryTrimmed !== '' && searched && !loading && results.length > 0 && (
        <TouchableOpacity
          style={styles.breakdownBtn}
          onPress={handleOpenStrongsMap}
          activeOpacity={0.7}
        >
          <Ionicons name="language-outline" size={14} color={colors.accent} />
          <Text style={styles.breakdownBtnText}>See Strongs</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Fuzzy banner */}
      {isFuzzy && correctedTerms.length > 0 && (
        <View style={styles.fuzzyBanner}>
          <Text style={styles.fuzzyBannerText}>
            No exact matches — showing fuzzy results for:{' '}
            <Text style={styles.fuzzyBannerTerms}>{correctedTerms.join(' ')}</Text>
          </Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      )}

      {/* Results list */}
      {!loading && queryTrimmed !== '' && (
        <FlatList
          data={displayResults}
          keyExtractor={item => `${item.book}-${item.chapter}-${item.verse}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListHeaderComponent={bookRefs.length > 0 && queryTrimmed.length >= 2 ? (
            <View style={styles.jumpSection}>
              <Text style={styles.jumpLabel}>JUMP TO</Text>
              <View style={styles.jumpChips}>
                {bookRefs.map(ref => (
                  <TouchableOpacity
                    key={`${ref.book}-${ref.chapter}`}
                    style={styles.jumpChip}
                    activeOpacity={0.7}
                    onPress={() => navigateToBook(ref.book, ref.chapter, ref.verse)}
                  >
                    <Ionicons name="book-outline" size={13} color={colors.accent} />
                    <Text style={styles.jumpChipText}>{formatRef(ref)}</Text>
                    <Ionicons name="arrow-forward" size={13} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
          renderItem={({ item }) => {
            const displayText = stripUsfm(item.text).replace(/[{}]/g, '')
            const showStrongs = strongsInSearch && ANNOTATED_TRANSLATIONS.has(translation)
            let content: React.ReactNode
            if (searchScript !== 'latin') {
              content = displayText.split(/(\s+)/).map((token, i) => {
                const norm = normalizeForSearch(token)
                const isMatch = normSearchTerms.some(t => norm.includes(t))
                return isMatch ? <Text key={i} style={styles.matchText}>{token}</Text> : token
              })
            } else if (showStrongs) {
              content = displayText.split(STRONGS_RE).flatMap((seg, i) => {
                if (STRONGS_TOKEN_RE.test(seg)) {
                  const isSearchedTag = searchedStrongsTags.has(normalizeStrongsNumber(seg.toUpperCase()))
                  return [<Text key={`s${i}`} style={isSearchedTag ? styles.strongsTagMatch : styles.strongsTag} onPress={() => openStrongs(seg, item.book, item.chapter, item.verse)}>{seg}</Text>]
                }
                if (!highlightRegex) return [seg as React.ReactNode]
                return seg.split(highlightRegex).map((p, j) =>
                  j % 2 === 1 ? <Text key={`s${i}h${j}`} style={styles.matchText}>{p}</Text> : p as React.ReactNode
                )
              })
            } else {
              const parts = highlightRegex
                ? displayText.split(highlightRegex).map((p, i) => ({ text: p, match: i % 2 === 1 }))
                : [{ text: displayText, match: false }]
              content = parts.map((p, i) =>
                p.match ? <Text key={i} style={styles.matchText}>{p.text}</Text> : p.text
              )
            }
            return (
              <TouchableOpacity style={styles.resultRow} activeOpacity={0.7} onPress={() => navigateToVerse(item)}>
                <Text style={styles.ref}>{item.book} {item.chapter}:{item.verse}</Text>
                <Text style={styles.verseText}>{content}</Text>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            searched ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>
                  {searchNeedsInstall
                    ? `Search requires the ${translation} pack to be installed`
                    : `No verses found for "${query}"`}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Book breakdown modal */}
      <BookBreakdownModal
        visible={breakdownVisible}
        onClose={() => setBreakdownVisible(false)}
        data={breakdownData}
        loading={breakdownLoading}
        results={breakdownResults}
        colors={colors}
        onVersePress={navigateToVerse}
        highlightRegex={highlightRegex}
        searchedStrongsTags={searchedStrongsTags}
        showStrongs={strongsInSearch && ANNOTATED_TRANSLATIONS.has(translation)}
      />

      <StrongsWordMapModal
        visible={strongsMapVisible}
        query={queryTrimmed}
        data={strongsMapData}
        loading={strongsMapLoading}
        onClose={() => setStrongsMapVisible(false)}
        onSelectStrongs={num => {
          openStrongs(num, results[0]?.book ?? 'Genesis', results[0]?.chapter ?? 1, results[0]?.verse ?? 1, true)
        }}
        onNavigate={(book, chapter, verse) => {
          setStrongsMapVisible(false)
          navigateToBook(book, chapter, verse)
        }}
      />

      {/* Strong's definition popup */}
      <Modal
        visible={!!strongsPopup}
        transparent
        animationType="slide"
        onRequestClose={() => setStrongsPopup(null)}
      >
        <View style={modal.overlay}>
          <View style={modal.strongsSheet}>
            <View style={modal.strongsHeader}>
              {!!strongsPopup?.fromMap && (
                <TouchableOpacity
                  onPress={() => setStrongsPopup(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginRight: 8 }}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.accent} />
                </TouchableOpacity>
              )}
              <Text style={modal.title}>{strongsPopup?.num}</Text>
              <TouchableOpacity
                onPress={() => { setStrongsPopup(null); setStrongsMapVisible(false) }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {strongsPopup?.loading ? (
              <View style={modal.strongsCenter}>
                <ActivityIndicator color={colors.accent} size="large" />
              </View>
            ) : strongsPopup?.entry ? (
              <>
                <ScrollView
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={modal.strongsBody}
                >
                  <Text style={modal.strongsLemma}>{strongsPopup.entry.lemma}</Text>
                  <View style={modal.strongsSubRow}>
                    <Text style={modal.strongsTranslit}>
                      {strongsPopup.entry.translit || strongsWordTranslit}
                      {strongsPopup.entry.pronunciation ? ` · ${strongsPopup.entry.pronunciation}` : ''}
                      {' · '}{strongsPopup.num.startsWith('H') ? 'Hebrew' : 'Greek'}
                    </Text>
                    <TouchableOpacity style={modal.occBtn} onPress={() => setConcModalVisible(true)} activeOpacity={0.7}>
                      <Text style={modal.occBtnLabel}>
                        {strongsConcLoading ? '…' : `${strongsConcResults.length} occurrence${strongsConcResults.length !== 1 ? 's' : ''}`} →
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {!!strongsPopup.entry.definition && (
                    <Text style={modal.strongsDef}>{strongsPopup.entry.definition.trim()}</Text>
                  )}
                  {!!strongsPopup.entry.kjv_usage && (
                    <View style={modal.kjvRow}>
                      <Text style={modal.kjvLabel}>KJV uses  </Text>
                      <Text style={modal.kjvText}>{strongsPopup.entry.kjv_usage}</Text>
                    </View>
                  )}
                </ScrollView>
                <View style={[modal.strongsFooter, { paddingBottom: Math.max(16, 8 + bottom) }]}>
                  <TouchableOpacity style={modal.translationsBtn} onPress={() => setTransVariantsVisible(true)} activeOpacity={0.7}>
                    <Ionicons name="git-branch-outline" size={16} color={colors.accent} />
                    <Text style={modal.translationsBtnLabel}>See uses / translations</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={modal.wordStudyBtn} onPress={openInWordStudy} activeOpacity={0.7}>
                    <Ionicons name="library-outline" size={16} color={colors.bgPrimary} />
                    <Text style={modal.wordStudyBtnLabel}>Open in Word Study</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={modal.strongsCenter}>
                <Text style={modal.strongsEmpty}>No definition found for {strongsPopup?.num}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <StrongsConcordanceModal
        visible={concModalVisible}
        lemma={strongsPopup?.entry?.lemma ?? ''}
        translit={strongsPopup?.entry?.translit ?? ''}
        lang={strongsPopup?.num.startsWith('H') ? 'hebrew' : 'greek'}
        results={strongsConcResults}
        loading={strongsConcLoading}
        onClose={() => setConcModalVisible(false)}
        onNavigate={(book, ch, v) => { setConcModalVisible(false); navigateToBook(book, ch, v) }}
      />
      <TranslationVariantsModal
        visible={transVariantsVisible}
        onClose={() => setTransVariantsVisible(false)}
        results={strongsConcResults}
        entry={strongsPopup?.entry ?? null}
        strongs={strongsPopup?.num ?? ''}
        onNavigate={(book, ch, v) => { setTransVariantsVisible(false); navigateToBook(book, ch, v) }}
      />
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  versionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: c.bgTertiary, borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    maxWidth: 160,
  },
  versionBtnActive: {
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  versionLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.5, flexShrink: 1 },
  versionLabelActive: { color: c.accent },

  searchRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: c.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  input: {
    flex: 1,
    backgroundColor: c.bgTertiary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: c.textPrimary,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  searchBtn: {
    backgroundColor: c.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: c.bgPrimary, fontWeight: '700', fontSize: 14 },

  resultCount: {
    fontSize: 12,
    color: c.textMuted,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  resultCountFilter: { color: c.accent },

  breakdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  breakdownBtnText: {
    flex: 1, fontSize: 12, fontWeight: '600', color: c.accent,
    letterSpacing: 0.2,
  },

  list: { paddingBottom: 40 },
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  ref: { fontSize: 12, fontWeight: '700', color: c.accent, marginBottom: 4, letterSpacing: 0.2 },
  verseText: { fontSize: 15, lineHeight: 23, color: c.textSecondary },
  matchText: { color: c.textPrimary, fontWeight: '700', backgroundColor: c.accentDim },
  emptyText: { color: c.textMuted, fontSize: 15 },
  strongsTag: {
    color: c.accent, fontWeight: '700', fontSize: 13,
    backgroundColor: c.accentDim,
    borderRadius: 4, overflow: 'hidden',
    paddingHorizontal: 2,
  },
  strongsTagMatch: {
    color: '#fff', fontWeight: '700', fontSize: 13,
    backgroundColor: '#4D96FF',
    borderRadius: 4, overflow: 'hidden',
    paddingHorizontal: 2,
  },

  fuzzyBanner: {
    backgroundColor: c.bgCard,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  fuzzyBannerText: { fontSize: 13, color: c.textMuted },
  fuzzyBannerTerms: { color: c.accent, fontWeight: '600' },

  historySection: {
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  historyLabel: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  historyClear: { fontSize: 13, color: c.accent, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  historyText: { flex: 1, fontSize: 15, color: c.textSecondary },

  jumpSection: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  jumpLabel: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  jumpChips: { flexDirection: 'column', gap: 6 },
  jumpChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: c.bgSecondary, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  jumpChipText: { flex: 1, fontSize: 14, fontWeight: '600', color: c.textPrimary },
})

const makeModal = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },

  // Translation picker
  sheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, maxHeight: '80%',
  },
  title: { fontSize: 17, fontWeight: '700', color: c.textPrimary, textAlign: 'center', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  info: { gap: 2 },
  key: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  keyActive: { color: c.accent },
  full: { fontSize: 12, color: c.textMuted },

  // Book / testament filter
  filterSheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  filterHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },

  testamentRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  testamentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
    alignItems: 'center',
  },
  testamentBtnActive: { borderColor: c.accent, backgroundColor: c.accentDim },
  testamentLabel:       { fontSize: 12, fontWeight: '600', color: c.textMuted },
  testamentLabelActive: { color: c.accent },

  bookScroll: { maxHeight: 280 },
  bookChips: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, padding: 16,
  },
  bookChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
  },
  bookChipActive: { borderColor: c.accent, backgroundColor: c.accentDim },
  bookChipLabel:       { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
  bookChipLabelActive: { color: c.accent, fontWeight: '700' },

  allBooksNote: { alignItems: 'center', paddingVertical: 32 },
  allBooksText: { fontSize: 14, color: c.textMuted, fontStyle: 'italic' },

  filterFooter: {
    flexDirection: 'row', gap: 12,
    padding: 16, paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  clearBtn: {
    flex: 1, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
    alignItems: 'center',
  },
  clearBtnLabel: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
  applyBtn: {
    flex: 2, paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.accent,
    alignItems: 'center',
  },
  applyBtnLabel: { fontSize: 15, fontWeight: '700', color: c.bgPrimary },

  // Strong's definition popup
  strongsSheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, maxHeight: '70%',
  },
  strongsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  strongsBody: { padding: 20, gap: 10, paddingBottom: 40 },
  strongsCenter: { alignItems: 'center', paddingVertical: 40 },
  strongsEmpty: { fontSize: 14, color: c.textMuted, fontStyle: 'italic' },
  strongsLemma: { fontSize: 26, fontWeight: '700', color: c.textPrimary, fontFamily: 'serif' },
  strongsTranslit: { fontSize: 13, color: c.textSecondary, fontStyle: 'italic' },
  strongsDef: { fontSize: 14, lineHeight: 22, color: c.textPrimary },
  kjvRow: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  kjvLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  kjvText: { fontSize: 13, color: c.textSecondary, flex: 1 },

  strongsSubRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 3, marginBottom: 2,
  },
  occBtn: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  occBtnLabel: { fontSize: 12, fontWeight: '600', color: c.accent },

  strongsFooter: {
    padding: 16, gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  translationsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: c.accent, backgroundColor: c.accentDim,
  },
  translationsBtnLabel: { fontSize: 15, fontWeight: '700', color: c.accent },
  wordStudyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.accent, borderRadius: 12, paddingVertical: 13,
  },
  wordStudyBtnLabel: { fontSize: 15, fontWeight: '700', color: c.bgPrimary },
})
