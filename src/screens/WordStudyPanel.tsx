import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useUserDb } from '../db/UserDbProvider'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import {
  getGreekWords, getHebrewWords, getLxxWords, getStrongsEntry,
  getBdbEntry, getThayersEntry, getVerse, getStrongsConcordance, normalizeStrongsNumber,
} from '../db/queries'
import type { GreekWord, HebrewWord, StrongsEntry, LexiconEntry, StrongsConcordanceResult, GreekSource, HebrewSource, LxxSource } from '../db/queries'
import { decodeMorphology, TAG_DEFINITIONS, GREEK_TAG_EXAMPLES, HEBREW_TAG_EXAMPLES } from '../utils/morphology'
import { stripUsfm } from '../data/redLetter'
import type { SelectedVerse, RootTabParamList } from '../types'
import { BOOKS } from '../data/books'
import { useTheme } from '../context/ThemeContext'
import { useWordFocus } from '../context/WordFocusContext'
import { useReaderFont } from '../context/FontFamilyContext'
import type { FontScopeKey } from '../context/FontFamilyContext'
import type { ThemeColors } from '../theme/themes'
import { TRANSLATIONS } from '../context/TranslationContext'

const NT_BOOKS = new Set(BOOKS.filter(b => b.testament === 'NT').map(b => b.name))
const OT_BOOKS_LIST = BOOKS.filter(b => b.testament === 'OT').map(b => b.name)
const NT_BOOKS_LIST = BOOKS.filter(b => b.testament === 'NT').map(b => b.name)
type ConcTestament = 'all' | 'OT' | 'NT'

const GREEK_SOURCES = TRANSLATIONS
  .filter(t => t.greekOnly && !t.key.endsWith('+'))
  .map(t => ({ key: t.key.toLowerCase() as GreekSource, label: t.label, desc: t.full }))

type OtSource = HebrewSource | LxxSource

const OT_SOURCES: { key: OtSource; label: string; desc: string }[] = [
  { key: 'tahot', label: 'TAHOT',  desc: 'Translators Amalgamated Hebrew OT' },
  { key: 'wlc',   label: 'WLC',    desc: 'Westminster Leningrad Codex' },
  { key: 'lxx',   label: 'LXX',    desc: 'Septuagint (Rahlfs/CCAT via STEPBible)' },
  { key: 'lxx_a', label: 'LXX-A',  desc: 'Apostolic Bible LXX (Poole)' },
]

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

export function StrongsConcordanceModal({
  visible, lemma, translit, lang, results, loading, onClose, onNavigate,
}: ConcordanceModalProps) {
  const { colors } = useTheme()
  const sc = useMemo(() => makeConcStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const [filterOpen, setFilterOpen] = useState(false)
  const [collapsedBooks, setCollapsedBooks] = useState<Set<string>>(new Set())

  // Committed filter state
  const [testament, setTestament]         = useState<ConcTestament>('all')
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  // Draft state (inside filter modal, committed on Apply)
  const [draftTestament, setDraftTestament] = useState<ConcTestament>('all')
  const [draftBooks, setDraftBooks]         = useState<Set<string>>(new Set())

  useEffect(() => {
    if (visible) {
      setFilterOpen(false)
      setTestament('all')
      setSelectedBooks(new Set())
      setDraftTestament('all')
      setDraftBooks(new Set())
      setCollapsedBooks(new Set())
    }
  }, [visible])

  const filteredResults = useMemo(() => {
    if (selectedBooks.size > 0) return results.filter(r => selectedBooks.has(r.book))
    if (testament === 'NT') return results.filter(r => NT_BOOKS.has(r.book))
    if (testament === 'OT') return results.filter(r => !NT_BOOKS.has(r.book))
    return results
  }, [results, testament, selectedBooks])

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

  function openFilter() {
    setDraftTestament(testament)
    setDraftBooks(new Set(selectedBooks))
    setFilterOpen(true)
  }

  function selectDraftTestament(t: ConcTestament) {
    setDraftTestament(t)
    setDraftBooks(new Set())
  }

  function toggleDraftBook(book: string) {
    setDraftBooks(prev => {
      const next = new Set(prev)
      if (next.has(book)) next.delete(book); else next.add(book)
      return next
    })
  }

  function applyFilter() {
    setTestament(draftTestament)
    setSelectedBooks(draftBooks)
    setFilterOpen(false)
  }

  function clearFilter() {
    setDraftTestament('all')
    setDraftBooks(new Set())
    setTestament('all')
    setSelectedBooks(new Set())
    setFilterOpen(false)
  }

  function toggleBook(book: string) {
    setCollapsedBooks(prev => {
      const next = new Set(prev)
      if (next.has(book)) next.delete(book); else next.add(book)
      return next
    })
  }

  const filteredCount = filteredResults.length
  const hasFilter = testament !== 'all' || selectedBooks.size > 0
  const visibleBooks = draftTestament === 'OT' ? OT_BOOKS_LIST
    : draftTestament === 'NT' ? NT_BOOKS_LIST
    : null

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
                {hasFilter ? `${filteredCount} of ${results.length}` : filteredCount} occurrences
              </Text>
            </View>
            <View style={sc.headerBtns}>
              <TouchableOpacity
                style={[sc.filterBtn, hasFilter && sc.filterBtnActive]}
                onPress={openFilter}
                activeOpacity={0.7}
              >
                <Ionicons name="filter" size={13} color={hasFilter ? colors.bgPrimary : colors.accent} />
                <Text style={[sc.filterBtnLabel, hasFilter && sc.filterBtnLabelActive]}>Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

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
              contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
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
                    <Text style={sc.text} numberOfLines={3}>{stripUsfm(r.text)}</Text>
                  </TouchableOpacity>
                )
              }}
              ItemSeparatorComponent={() => <View style={sc.separator} />}
            />
          )}
        </View>
      </View>

      {/* Filter modal */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={sc.overlay}>
          <View style={sc.filterSheet}>
            <View style={sc.filterHeader}>
              <Text style={sc.filterTitle}>Filter by Scope</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={sc.testamentRow}>
              {(['all', 'OT', 'NT'] as ConcTestament[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[sc.testamentBtn, draftTestament === t && sc.testamentBtnActive]}
                  onPress={() => selectDraftTestament(t)}
                  activeOpacity={0.7}
                >
                  <Text style={[sc.testamentLabel, draftTestament === t && sc.testamentLabelActive]}>
                    {t === 'all' ? 'All' : t === 'OT' ? 'Old Testament' : 'New Testament'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {visibleBooks ? (
              <ScrollView style={sc.bookScroll} contentContainerStyle={sc.bookChips} showsVerticalScrollIndicator={false}>
                {visibleBooks.map(book => {
                  const active = draftBooks.has(book)
                  return (
                    <TouchableOpacity
                      key={book}
                      style={[sc.bookChip, active && sc.bookChipActive]}
                      onPress={() => toggleDraftBook(book)}
                      activeOpacity={0.7}
                    >
                      <Text style={[sc.bookChipLabel, active && sc.bookChipLabelActive]}>{book}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            ) : (
              <View style={sc.allBooksNote}>
                <Text style={sc.allBooksText}>Searching all 66 books</Text>
              </View>
            )}

            <View style={sc.filterFooter}>
              <TouchableOpacity style={sc.clearBtn} onPress={clearFilter} activeOpacity={0.7}>
                <Text style={sc.clearBtnLabel}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sc.applyBtn} onPress={applyFilter} activeOpacity={0.7}>
                <Text style={sc.applyBtnLabel}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  )
}

// ── TranslationVariantsModal ──────────────────────────────

// Accepts a pre-built RegExp so callers can hoist construction out of tight loops.
function extractKjvTranslation(kjvPlusText: string | null, re: RegExp): string | null {
  if (!kjvPlusText) return null
  const m = kjvPlusText.match(re)
  if (!m) return null
  // Skip if the preceding token is itself a Strong's number (e.g. "G123 G746" → "g")
  if (/^[GH]\d+$/i.test(m[1])) return null
  // Strip italic braces {}, punctuation, lowercase
  const word = m[1].replace(/[{}()[\]]/g, '').replace(/[^a-z']/gi, '').toLowerCase()
  return word || null
}

function HighlightedVerse({
  text, word, textStyle, highlightStyle, numberOfLines,
}: { text: string; word: string | null; textStyle: object; highlightStyle: object; numberOfLines?: number }) {
  const re = useMemo(
    () => word ? new RegExp(`(${escapeRegex(word)})`, 'gi') : null,
    [word],
  )
  if (!re) return <Text style={textStyle} numberOfLines={numberOfLines}>{text}</Text>
  const parts = text.split(re)
  return (
    <Text style={textStyle} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        i % 2 === 1 ? <Text key={i} style={highlightStyle}>{part}</Text> : part
      )}
    </Text>
  )
}

export function TranslationVariantsModal({
  visible, onClose, results, entry, strongs, onNavigate,
}: {
  visible: boolean
  onClose: () => void
  results: StrongsConcordanceResult[]
  entry: StrongsEntry | null
  strongs: string
  onNavigate: (book: string, chapter: number, verse: number) => void
}) {
  const { colors } = useTheme()
  const sc = useMemo(() => makeConcStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const [selectedGloss, setSelectedGloss] = useState<string | null>(null)

  useEffect(() => { if (!visible) setSelectedGloss(null) }, [visible])

  // Group results by the KJV word that precedes the strongs tag, sorted by count desc.
  // Build regex once here; extractKjvTranslation reuses it for every row.
  const { groups, groupMap } = useMemo(() => {
    const re = strongs ? new RegExp(`(\\S+)\\s+${strongs.toUpperCase()}(?=\\s|$)`, 'i') : null
    const map = new Map<string, StrongsConcordanceResult[]>()
    for (const r of results) {
      const key = re ? extractKjvTranslation(r.kjvPlusText, re) ?? '(other)' : '(other)'
      const arr = map.get(key)
      if (arr) arr.push(r)
      else map.set(key, [r])
    }
    return { groups: [...map.entries()].sort((a, b) => b[1].length - a[1].length), groupMap: map }
  }, [results, strongs])

  const drillVerses = selectedGloss ? (groupMap.get(selectedGloss) ?? []) : []
  const highlightWord = selectedGloss === '(other)' ? null : selectedGloss

  const title = entry ? `${entry.lemma}  ${strongs}` : strongs

  return (
    <Modal visible={visible} transparent animationType="slide"
      onRequestClose={() => { if (selectedGloss) setSelectedGloss(null); else onClose() }}>
      <View style={sc.overlay}>
        <View style={[sc.sheet, { height: '80%' }]}>
          {/* Header */}
          <View style={sc.header}>
            {selectedGloss ? (
              <TouchableOpacity
                onPress={() => setSelectedGloss(null)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={20} color={colors.accent} />
                <Text style={sc.lemma} numberOfLines={1}>"{selectedGloss}"</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={sc.lemma}>{title}</Text>
                <Text style={sc.meta}>Translation variants · {results.length} occurrence{results.length !== 1 ? 's' : ''}</Text>
              </View>
            )}
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {selectedGloss ? (
            // Drill-down: verses for the selected gloss
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              showsVerticalScrollIndicator={false}>
              {drillVerses.map((r, i) => (
                <TouchableOpacity
                  key={`${r.book}-${r.chapter}-${r.verse}`}
                  style={[sc.row, i === drillVerses.length - 1 && { borderBottomWidth: 0 }]}
                  activeOpacity={0.7}
                  onPress={() => { onNavigate(r.book, r.chapter, r.verse); onClose() }}
                >
                  <Text style={sc.ref}>{r.book} {r.chapter}:{r.verse}</Text>
                  {!!r.word && <Text style={sc.word}>{r.word}  {r.translit}</Text>}
                  <HighlightedVerse
                    text={stripUsfm(r.text)}
                    word={highlightWord}
                    textStyle={sc.text}
                    highlightStyle={{ backgroundColor: '#4D96FF', color: '#fff', borderRadius: 2 }}
                    numberOfLines={3}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            // Overview: gloss groups
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
              showsVerticalScrollIndicator={false}>
              {groups.map(([gloss, verses], i) => (
                <TouchableOpacity
                  key={gloss}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
                  }}
                  activeOpacity={0.7}
                  onPress={() => setSelectedGloss(gloss)}
                >
                  <Text style={{ flex: 1, fontSize: 16, color: colors.textPrimary, fontWeight: '500' }}>
                    {gloss}
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.textMuted, marginRight: 6 }}>
                    {verses.length}×
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}

// Strong's numbers that are alternate forms of a root lemma.
// Some sources (e.g. KJV+ interlinear) use the inflected-form number while
// greek_words tables use the canonical lemma number — resolve before matching.
const STRONGS_REDIRECTS: Record<string, string> = {
  G2258: 'G1510', // ἦν (imperfect "was/were") → εἰμί
  G5607: 'G1510', // ὤν  (participle "being")  → εἰμί
  G5600: 'G1510', // ὦ   (subjunctive)          → εἰμί
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
  const { fontFamily, fontScope } = useReaderFont()
  const s = useMemo(() => makeStyles(colors, fontFamily, fontScope), [colors, fontFamily, fontScope])

  const db = useSQLiteContext()
  const userDb = useUserDb()
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>()
  const isNT = NT_BOOKS.has(selected.book)

  const { wordFocus, setWordFocus } = useWordFocus()

  const [source, setSource]         = useState<GreekSource>('sblgnt')
  const [favSource, setFavSource]   = useState<GreekSource | null>(null)
  const [otSource, setOtSource]     = useState<OtSource>('tahot')
  const [favOtSource, setFavOtSource] = useState<OtSource | null>(null)

  useEffect(() => {
    userDb.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'greek_source_fav'"
    ).then(row => {
      const val = row?.value as GreekSource | undefined
      if (val && GREEK_SOURCES.some(s => s.key === val)) {
        setFavSource(val)
        setSource(val)
      }
    }).catch(() => {})
    userDb.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'ot_source_fav'"
    ).then(row => {
      const val = row?.value as OtSource | undefined
      if (val && OT_SOURCES.some(s => s.key === val)) {
        setFavOtSource(val)
        setOtSource(val)
      }
    }).catch(() => {})
  }, [userDb])
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
  const verseCache        = useRef<Map<string, string>>(new Map())
  const scrollViewRef     = useRef<ScrollView>(null)
  const firstMentionRef   = useRef<View>(null)
  const handleWordPressRef = useRef(handleWordPress)
  useLayoutEffect(() => { handleWordPressRef.current = handleWordPress })

  const isLxx = !isNT && (otSource === 'lxx' || otSource === 'lxx_a')

  useEffect(() => {
    if (!selected.verse) return
    setWords([])
    setActiveKey(null)
    setDef(null)
    setLexicon(null)
    setConcordanceResults([])
    setLoading(true)
    const fetch = isNT
      ? getGreekWords(db, selected.book, selected.chapter, selected.verse, source)
      : isLxx
        ? getLxxWords(db, selected.book, selected.chapter, selected.verse, otSource as LxxSource)
        : getHebrewWords(db, selected.book, selected.chapter, selected.verse, otSource as HebrewSource)
    fetch.then(w => { setWords(w); setLoading(false) }).catch(() => setLoading(false))
  }, [selected.book, selected.chapter, selected.verse, source, otSource])

  useEffect(() => {
    if (!wordFocus || loading || !words.length) return
    const canonical = STRONGS_REDIRECTS[wordFocus] ?? wordFocus
    const match = words.find(w => {
      const n = normalizeStrongsNumber(w.strongs)
      return n === wordFocus || n === canonical
    })
    if (match) handleWordPressRef.current(match.strongs, match.position)
    setWordFocus(null)
  }, [wordFocus, words, loading, setWordFocus])

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
    getStrongsConcordance(
      db,
      isNT ? 'greek' : isLxx ? (otSource as LxxSource) : 'hebrew',
      activeKey!.strongs,
      source,
      otSource as HebrewSource,
    )
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
    const lang = (isNT || isLxx) ? 'greek' : 'hebrew'
    Promise.all([
      getStrongsEntry(db, lang, strongs),
      (isNT || isLxx) ? getThayersEntry(db, strongs) : getBdbEntry(db, strongs),
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
  const morph = decodeMorphology(activeWord?.morph ?? '', (isNT || isLxx) ? 'greek' : 'hebrew')

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
        <Text style={s.emptyText}>No {isNT ? 'Greek' : isLxx ? 'LXX Greek' : 'Hebrew'} data for this verse</Text>
      </View>
    )
  }

  // ── Main render ───────────────────────────────────────────

  return (
    <ScrollView ref={scrollViewRef} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.langRow}>
        <Text style={s.langLabel}>
          {isNT ? 'Interlinear · Greek NT' : isLxx ? 'Interlinear · LXX' : 'Interlinear · Hebrew OT'}
        </Text>
        {!isNT && (
          <View style={s.textBadge}>
            <Text style={s.textBadgeLabel}>{OT_SOURCES.find(o => o.key === otSource)?.label ?? otSource.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Source picker — NT uses Greek sources, OT uses Hebrew/LXX sources */}
      {isNT ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sourcePicker}>
          {GREEK_SOURCES.map(opt => {
            const active = opt.key === source
            const isFav  = opt.key === favSource
            return (
              <View key={opt.key} style={s.sourceChipWrapper}>
                <TouchableOpacity
                  style={[s.sourceChip, active && s.sourceChipActive]}
                  onPress={() => setSource(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.sourceChipLabel, active && s.sourceChipLabelActive]}>{opt.label}</Text>
                  <Text style={[s.sourceChipDesc, active && s.sourceChipDescActive]}>{opt.desc}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.sourceStarBtn}
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                  onPress={() => {
                    const next = isFav ? null : opt.key
                    setFavSource(next)
                    if (next) {
                      userDb.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('greek_source_fav', ?)", [next]).catch(() => {})
                    } else {
                      userDb.runAsync("DELETE FROM settings WHERE key = 'greek_source_fav'").catch(() => {})
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={isFav ? 'star' : 'star-outline'} size={14} color={isFav ? colors.accent : colors.textMuted} />
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sourcePicker}>
          {OT_SOURCES.map(opt => {
            const active = opt.key === otSource
            const isFav  = opt.key === favOtSource
            return (
              <View key={opt.key} style={s.sourceChipWrapper}>
                <TouchableOpacity
                  style={[s.sourceChip, active && s.sourceChipActive]}
                  onPress={() => setOtSource(opt.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.sourceChipLabel, active && s.sourceChipLabelActive]}>{opt.label}</Text>
                  <Text style={[s.sourceChipDesc, active && s.sourceChipDescActive]}>{opt.desc}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.sourceStarBtn}
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                  onPress={() => {
                    const next = isFav ? null : opt.key
                    setFavOtSource(next)
                    if (next) {
                      userDb.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('ot_source_fav', ?)", [next]).catch(() => {})
                    } else {
                      userDb.runAsync("DELETE FROM settings WHERE key = 'ot_source_fav'").catch(() => {})
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name={isFav ? 'star' : 'star-outline'} size={14} color={isFav ? colors.accent : colors.textMuted} />
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>
      )}

      <View style={[s.pillsRow, !isNT && !isLxx && s.pillsRowRTL]}>
        {words.map((w, i) => {
          const text = (isNT || isLxx) ? (w as GreekWord).greek : (w as HebrewWord).hebrew
          const active = activeKey?.strongs === w.strongs && activeKey?.position === w.position
          return (
            <TouchableOpacity
              key={i}
              style={[s.pill, active && s.pillActive]}
              onPress={() => handleWordPress(w.strongs, w.position)}
              activeOpacity={0.7}
            >
              <Text style={[s.pillText, active && s.pillTextActive, !isNT && !isLxx && s.pillTextHebrew]}>
                {text}
              </Text>
              <Text style={[s.pillTranslit, active && s.pillTranslitActive]}>
                {w.translit}
              </Text>
              {!!w.gloss && (
                <Text style={[s.pillGloss, active && s.pillGlossActive]}>
                  {w.gloss}
                </Text>
              )}
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
                      <View style={s.morphDefCard}>
                        <Text style={s.morphDefTag}>{activeTag}</Text>
                        <Text style={s.morphDefText}>{TAG_DEFINITIONS[activeTag]}</Text>
                        {(isNT ? GREEK_TAG_EXAMPLES : HEBREW_TAG_EXAMPLES)[activeTag] && (
                          <View style={s.morphDefExampleRow}>
                            <Text style={s.morphDefExampleLabel}>Example  </Text>
                            <Text style={s.morphDefExample}>{(isNT ? GREEK_TAG_EXAMPLES : HEBREW_TAG_EXAMPLES)[activeTag]}</Text>
                          </View>
                        )}
                      </View>
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

const _styleCache = new WeakMap<object, Map<string, any>>()

const makeStyles = (c: ThemeColors, fontFamily?: string, fontScope: FontScopeKey = 'verses') => {
  let m = _styleCache.get(c)
  if (!m) _styleCache.set(c, m = new Map())
  const k = `${fontFamily ?? ''}|${fontScope}`
  if (m.has(k)) return m.get(k)!
  const allFont = fontScope === 'all' ? fontFamily : undefined
  const s = StyleSheet.create({
  container: { padding: 14, paddingBottom: 40, gap: 14 },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },

  langRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  langLabel: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  textBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.accentDim,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: c.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  textBadgeLabel: {
    fontSize: 10, fontWeight: '800', color: c.accent,
    letterSpacing: 0.4,
  },

  sourcePicker: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceChipWrapper: {
    width: 148,
    position: 'relative',
  },
  sourceChip: {
    flex: 1,
    backgroundColor: c.bgCard,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  sourceChipActive: {
    backgroundColor: c.accentDim,
    borderColor: c.accent,
  },
  sourceChipLabel: {
    fontSize: 12, fontWeight: '800', color: c.textSecondary, letterSpacing: 0.4,
  },
  sourceChipLabelActive: { color: c.accent },
  sourceChipDesc: {
    fontSize: 10, color: c.textMuted, lineHeight: 14,
  },
  sourceChipDescActive: { color: c.accent },
  sourceStarBtn: {
    position: 'absolute', top: 6, right: 6,
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
  pillTranslit:      { fontSize: 10, color: c.textMuted, fontStyle: 'italic' },
  pillTranslitActive:{ color: c.accent },
  pillGloss:         { fontSize: 11, color: c.textSecondary, fontWeight: '500' },
  pillGlossActive:   { color: c.accent },

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
  defBody:     { fontSize: 14, lineHeight: 22, color: c.textPrimary, fontFamily: allFont },
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
  morphDefCard: {
    backgroundColor: c.bgSecondary,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 12,
    gap: 6,
    marginTop: 2,
  },
  morphDefTag: {
    fontSize: 13, fontWeight: '700', color: c.accent, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  morphDefText: {
    fontSize: 13, color: c.textPrimary, lineHeight: 20, fontFamily: allFont,
  },
  morphDefExampleRow: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
    paddingTop: 6, marginTop: 2,
  },
  morphDefExampleLabel: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  morphDefExample: {
    fontSize: 12, color: c.textSecondary, lineHeight: 18, fontStyle: 'italic', flex: 1,
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
    fontSize: 13, lineHeight: 20, color: c.textSecondary, fontFamily: allFont,
  },
  lexiconBody: {
    fontSize: 13, lineHeight: 21, color: c.textSecondary, fontFamily: allFont,
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
    fontSize: 13, lineHeight: 20, color: c.textMuted, fontStyle: 'italic', fontFamily: allFont,
  },
  versePreviewGoBtn: { alignSelf: 'flex-end' },
  versePreviewGo: {
    fontSize: 13, fontWeight: '600', color: c.accent,
  },
  })
  m.set(k, s)
  return s
}

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

  // Filter modal
  filterSheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20,
  },
  filterHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  filterTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  testamentRow: {
    flexDirection: 'row', gap: 8,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  testamentBtn: {
    flex: 1, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.bgCard,
    alignItems: 'center',
  },
  testamentBtnActive: { borderColor: c.accent, backgroundColor: c.accentDim },
  testamentLabel:       { fontSize: 12, fontWeight: '600', color: c.textMuted },
  testamentLabelActive: { color: c.accent },
  bookScroll: { maxHeight: 280 },
  bookChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  bookChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.bgCard,
  },
  bookChipActive: { borderColor: c.accent, backgroundColor: c.accentDim },
  bookChipLabel:       { fontSize: 13, color: c.textSecondary, fontWeight: '500' },
  bookChipLabelActive: { color: c.accent, fontWeight: '700' },
  allBooksNote: { alignItems: 'center', paddingVertical: 32 },
  allBooksText: { fontSize: 14, color: c.textMuted, fontStyle: 'italic' },
  filterFooter: {
    flexDirection: 'row', gap: 12,
    padding: 16, paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  clearBtn: {
    flex: 1, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
    borderColor: c.border, backgroundColor: c.bgCard,
    alignItems: 'center',
  },
  clearBtnLabel: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
  applyBtn: {
    flex: 2, paddingVertical: 12,
    borderRadius: 12, backgroundColor: c.accent,
    alignItems: 'center',
  },
  applyBtnLabel: { fontSize: 15, fontWeight: '700', color: c.bgPrimary },

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
