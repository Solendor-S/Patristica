import React, { useEffect, useState, useCallback, useRef, useMemo, memo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, Share, Modal, ScrollView,
  StyleSheet, ActivityIndicator, StatusBar, Animated, TextInput,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useUserDb } from '../db/UserDbProvider'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import {
  getChapter, getApocryphaChapter, isBookmarked, addBookmark, removeBookmark, recordHistory,
  getChapterHighlights, setHighlight, removeHighlight,
  getNote, saveNote, deleteNote, getConcordance, getChapterFootnotes,
} from '../db/queries'
import type { ConcordanceResult } from '../db/queries'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { useTranslation, TRANSLATIONS } from '../context/TranslationContext'
import { useOnboarding } from '../context/OnboardingContext'
import { useRedLetter } from '../context/RedLetterContext'
import { isRedLetter, splitRedLetterVerse } from '../data/redLetter'
import type { Segment } from '../data/redLetter'
import { useTheme } from '../context/ThemeContext'
import { useLineSpacing } from '../context/LineSpacingContext'
import { useFontSize, FONT_SIZE_MIN, FONT_SIZE_MAX } from '../context/FontSizeContext'
import type { ThemeColors } from '../theme/themes'
import { BOOKS, BOOK_MAP } from '../data/books'
import type { BibleVerse, BibleStackParamList, Footnote } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'Reader'>
  route: RouteProp<BibleStackParamList, 'Reader'>
}

import { HIGHLIGHT_COLORS, type ColorKey, getHighlightBg } from '../theme/highlightColors'

type TaggedWord = { w: string; red: boolean }

const SUPERSCRIPT: Record<string, string> = {
  a:'ᵃ', b:'ᵇ', c:'ᶜ', d:'ᵈ', e:'ᵉ', f:'ᶠ', g:'ᵍ', h:'ʰ', i:'ⁱ', j:'ʲ',
  k:'ᵏ', l:'ˡ', m:'ᵐ', n:'ⁿ', o:'ᵒ', p:'ᵖ', r:'ʳ', s:'ˢ', t:'ᵗ', u:'ᵘ',
  v:'ᵛ', w:'ʷ', x:'ˣ', y:'ʸ', z:'ᶻ',
  '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
}
function toSuperscript(s: string): string {
  return s.split('').map(c => SUPERSCRIPT[c] ?? c).join('')
}

function buildFnByWord(text: string, footnotes: Footnote[]): Map<number, Footnote> {
  const rawWords = text.split(/\s+/).filter(w => w)
  const normWords = rawWords.map(w => w.toLowerCase().replace(/[^a-z'-]/g, ''))
  const map = new Map<number, Footnote>()
  for (const fn of footnotes) {
    const colonIdx = fn.content.indexOf(':')
    let insertAt = -1
    if (colonIdx > 0) {
      const anchor = fn.content.slice(0, colonIdx).replace(/[……â\xa6]+/g, '').trim()
      const anchorWords = anchor.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z'-]/g, '')).filter(w => w)
      if (anchorWords.length) {
        const last = anchorWords[anchorWords.length - 1]
        for (let i = normWords.length - 1; i >= 0; i--) {
          if (normWords[i] !== last) continue
          if (anchorWords.length === 1) { insertAt = i + 1; break }
          let match = true
          for (let j = 0; j < anchorWords.length; j++) {
            const vi = i - (anchorWords.length - 1 - j)
            if (vi < 0 || normWords[vi] !== anchorWords[j]) { match = false; break }
          }
          if (match) { insertAt = i + 1; break }
        }
      }
    }
    if (insertAt < 0 && fn.word_index <= normWords.length) insertAt = fn.word_index
    if (insertAt > 0 && !map.has(insertAt)) map.set(insertAt, fn)
  }
  return map
}

const VerseRow = memo(function VerseRow({
  verse, text, isSelected, hlColor, onPress, onWordPress, onFnPress, redLetterOn, book, chapter, footnotes, compareText, compareLabel,
}: {
  verse: number
  text: string
  isSelected: boolean
  hlColor: string | undefined
  onPress: (v: number) => void
  onWordPress: (word: string) => void
  onFnPress: (fn: Footnote) => void
  redLetterOn: boolean
  book: string
  chapter: number
  footnotes?: Footnote[]
  compareText?: string
  compareLabel?: string
}) {
  const { colors } = useTheme()
  const { lineHeight } = useLineSpacing()
  const { fontSize } = useFontSize()
  const styles = useMemo(() => makeStyles(colors, lineHeight, fontSize), [colors, lineHeight, fontSize])
  const isRL = redLetterOn && isRedLetter(book, chapter, verse)
  const segments: Segment[] = isRL ? splitRedLetterVerse(text) : [{ t: text, red: false }]
  const fnByWord = footnotes?.length ? buildFnByWord(text, footnotes) : null

  if (isSelected) {
    const tagged: TaggedWord[] = segments.flatMap(seg =>
      seg.t.trim().split(/\s+/).filter(Boolean).map(w => ({ w, red: seg.red }))
    )
    const elems: React.ReactNode[] = []
    tagged.forEach((tw, i) => {
      const wordIdx = i + 1
      const hasSpace = i < tagged.length - 1
      elems.push(
        <Text key={`w${i}`} onPress={() => onWordPress(tw.w)} suppressHighlighting
          style={tw.red ? styles.redLetterSelected : undefined}>
          {tw.w}
        </Text>
      )
      const fn = fnByWord?.get(wordIdx)
      if (fn) elems.push(
        <Text key={`fn${i}`} onPress={() => onFnPress(fn)} suppressHighlighting style={[styles.fnMarker, styles.fnMarkerSelected]}>
          {toSuperscript(fn.marker)}
        </Text>
      )
      if (hasSpace) elems.push(<Text key={`sp${i}`}>{' '}</Text>)
    })
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(verse)}
        style={[styles.verseRow, styles.verseRowSelected, hlColor ? { backgroundColor: getHighlightBg(hlColor) } : null]}
      >
        <Text style={styles.verseNum}>{verse}</Text>
        <View style={styles.verseBody}>
          {compareText ? (
            <View style={styles.verseBodyRow}>
              <View style={styles.comparePrimary}>
                <Text style={[styles.verseText, styles.verseTextSelected]}>{elems}</Text>
              </View>
              <View style={styles.compareDivider} />
              <View style={styles.compareSecondary}>
                <Text style={styles.compareLabel}>{compareLabel}</Text>
                <Text style={styles.compareText}>{compareText}</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.verseText, styles.verseTextSelected]}>{elems}</Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // Non-selected: fast path if no footnotes
  if (!fnByWord) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(verse)}
        style={[styles.verseRow, hlColor ? { backgroundColor: getHighlightBg(hlColor) } : null]}
      >
        <Text style={styles.verseNum}>{verse}</Text>
        <View style={styles.verseBody}>
          {compareText ? (
            <View style={styles.verseBodyRow}>
              <View style={styles.comparePrimary}>
                {segments.length === 1 && !segments[0].red ? (
                  <Text style={styles.verseText}>{text}</Text>
                ) : (
                  <Text style={styles.verseText}>
                    {segments.map((seg, i) => (
                      <Text key={i} style={seg.red ? styles.redLetterText : undefined}>{seg.t}</Text>
                    ))}
                  </Text>
                )}
              </View>
              <View style={styles.compareDivider} />
              <View style={styles.compareSecondary}>
                <Text style={styles.compareLabel}>{compareLabel}</Text>
                <Text style={styles.compareText}>{compareText}</Text>
              </View>
            </View>
          ) : segments.length === 1 && !segments[0].red ? (
            <Text style={styles.verseText}>{text}</Text>
          ) : (
            <Text style={styles.verseText}>
              {segments.map((seg, i) => (
                <Text key={i} style={seg.red ? styles.redLetterText : undefined}>{seg.t}</Text>
              ))}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // Non-selected with footnote markers
  let wordIdx = 0
  const elems: React.ReactNode[] = []
  segments.forEach((seg, si) => {
    seg.t.split(/(\s+)/).forEach((token, ti) => {
      const key = `${si}-${ti}`
      if (/^\s+$/.test(token) || token === '') {
        elems.push(<Text key={key}>{token}</Text>)
        return
      }
      wordIdx++
      elems.push(<Text key={key} style={seg.red ? styles.redLetterText : undefined}>{token}</Text>)
      const fn = fnByWord.get(wordIdx)
      if (fn) elems.push(
        <Text key={`fn-${key}`} onPress={() => onFnPress(fn)} suppressHighlighting style={styles.fnMarker}>
          {toSuperscript(fn.marker)}
        </Text>
      )
    })
  })
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(verse)}
      style={[styles.verseRow, hlColor ? { backgroundColor: getHighlightBg(hlColor) } : null]}
    >
      <Text style={styles.verseNum}>{verse}</Text>
      <View style={styles.verseBody}>
        {compareText ? (
          <View style={styles.verseBodyRow}>
            <View style={styles.comparePrimary}>
              <Text style={styles.verseText}>{elems}</Text>
            </View>
            <View style={styles.compareDivider} />
            <View style={styles.compareSecondary}>
              <Text style={styles.compareLabel}>{compareLabel}</Text>
              <Text style={styles.compareText}>{compareText}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.verseText}>{elems}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
})

// ── Share range modal ─────────────────────────────────────

function ShareModal({
  visible, onClose, book, chapter, verses, anchorVerse,
}: {
  visible: boolean
  onClose: () => void
  book: string
  chapter: number
  verses: BibleVerse[]
  anchorVerse: number
}) {
  const { colors } = useTheme()
  const modal = useMemo(() => makeModal(colors), [colors])
  const [fromVerse, setFromVerse] = useState(anchorVerse)
  const [toVerse, setToVerse]     = useState(anchorVerse)

  useEffect(() => {
    if (visible) { setFromVerse(anchorVerse); setToVerse(anchorVerse) }
  }, [visible, anchorVerse])

  const maxVerse = verses.length > 0 ? verses[verses.length - 1].verse : 1
  const adjustFrom = (d: number) => setFromVerse(v => Math.max(1, Math.min(toVerse, v + d)))
  const adjustTo   = (d: number) => setToVerse(v => Math.max(fromVerse, Math.min(maxVerse, v + d)))

  const rangeVerses = verses.filter(v => v.verse >= fromVerse && v.verse <= toVerse)

  const buildShareText = () => {
    const ref = fromVerse === toVerse
      ? `${book} ${chapter}:${fromVerse}`
      : `${book} ${chapter}:${fromVerse}–${toVerse}`
    const body = rangeVerses
      .map(v => (fromVerse === toVerse ? v.text : `[${v.verse}] ${v.text}`))
      .join(' ')
    return `${ref} — ${body}`
  }

  const doShare = async () => { onClose(); await Share.share({ message: buildShareText() }) }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={modal.sheet}>
          <Text style={modal.title}>Share Verse Range</Text>
          <View style={modal.row}>
            <Text style={modal.rowLabel}>From</Text>
            <View style={modal.stepper}>
              <TouchableOpacity onPress={() => adjustFrom(-1)} style={modal.stepBtn} activeOpacity={0.7}>
                <Ionicons name="remove" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={modal.stepValue}>{fromVerse}</Text>
              <TouchableOpacity onPress={() => adjustFrom(1)} style={modal.stepBtn} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={modal.row}>
            <Text style={modal.rowLabel}>To</Text>
            <View style={modal.stepper}>
              <TouchableOpacity onPress={() => adjustTo(-1)} style={modal.stepBtn} activeOpacity={0.7}>
                <Ionicons name="remove" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <Text style={modal.stepValue}>{toVerse}</Text>
              <TouchableOpacity onPress={() => adjustTo(1)} style={modal.stepBtn} activeOpacity={0.7}>
                <Ionicons name="add" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={modal.preview} contentContainerStyle={{ padding: 12 }}>
            <Text style={modal.previewRef}>
              {fromVerse === toVerse
                ? `${book} ${chapter}:${fromVerse}`
                : `${book} ${chapter}:${fromVerse}–${toVerse}`}
            </Text>
            {rangeVerses.map(v => (
              <Text key={v.verse} style={modal.previewText}>
                {fromVerse !== toVerse && <Text style={modal.previewNum}>[{v.verse}] </Text>}
                {v.text}{' '}
              </Text>
            ))}
          </ScrollView>
          <View style={modal.btnRow}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={modal.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.shareBtn} onPress={doShare} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={16} color={colors.bgPrimary} />
              <Text style={modal.shareLabel}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Concordance modal ─────────────────────────────────────

function ConcordanceModal({
  visible, word, results, loading, onClose, onNavigate,
}: {
  visible: boolean
  word: string
  results: ConcordanceResult[]
  loading: boolean
  onClose: () => void
  onNavigate: (book: string, chapter: number, verse: number) => void
}) {
  const { colors } = useTheme()
  const conc = useMemo(() => makeConc(colors), [colors])
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={conc.overlay}>
        <View style={conc.sheet}>
          <View style={conc.header}>
            <View>
              <Text style={conc.word}>"{word}"</Text>
              {!loading && (
                <Text style={conc.count}>
                  {results.length === 300
                    ? 'Showing first 300 matches'
                    : `${results.length} verse${results.length !== 1 ? 's' : ''}`}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: 40 }} />
          ) : results.length === 0 ? (
            <Text style={conc.empty}>No results found</Text>
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => `${item.book}-${item.chapter}-${item.verse}`}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={conc.row}
                  onPress={() => { onClose(); onNavigate(item.book, item.chapter, item.verse) }}
                  activeOpacity={0.7}
                >
                  <Text style={conc.ref}>{item.book} {item.chapter}:{item.verse}</Text>
                  <Text style={conc.text} numberOfLines={2}>{item.text}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={conc.separator} />}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── Reader screen ─────────────────────────────────────────

export default function ReaderScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const { lineHeight } = useLineSpacing()
  const { fontSize, setFontSize } = useFontSize()
  const styles = useMemo(() => makeStyles(colors, lineHeight, fontSize), [colors, lineHeight, fontSize])
  const modal = useMemo(() => makeModal(colors), [colors])
  const noteModal = useMemo(() => makeNoteModal(colors), [colors])

  const fontSizeRef = useRef(fontSize)
  fontSizeRef.current = fontSize
  const pinchBaseSizeRef = useRef(fontSize)
  const pinchGesture = useMemo(() =>
    Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => { pinchBaseSizeRef.current = fontSizeRef.current })
      .onUpdate(e => {
        const next = Math.round(
          Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, pinchBaseSizeRef.current * e.scale))
        )
        if (next !== fontSizeRef.current) setFontSize(next)
      }),
    [setFontSize]
  )

  const db = useSQLiteContext()
  const userDb = useUserDb()
  const { setSelected } = useSelectedVerse()
  const { translation, setTranslation } = useTranslation()
  const { showFab, openTutorial } = useOnboarding()
  const { redLetterOn, toggleRedLetter } = useRedLetter()
  const [verses, setVerses] = useState<BibleVerse[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [translationPickerOpen, setTranslationPickerOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState('')
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Highlights: verse number → color key
  const [highlights, setHighlights] = useState<Record<number, string>>({})
  const [showColorPicker, setShowColorPicker] = useState(false)

  const [footnotesByVerse, setFootnotesByVerse] = useState<Map<number, Footnote[]>>(new Map())
  const [activeFn, setActiveFn] = useState<Footnote | null>(null)
  const [compareTrans, setCompareTrans] = useState<Translation | null>(null)
  const [compareMap, setCompareMap] = useState<Map<number, string>>(new Map())

  const [concordanceWord, setConcordanceWord]       = useState('')
  const [concordanceResults, setConcordanceResults] = useState<ConcordanceResult[]>([])
  const [concordanceLoading, setConcordanceLoading] = useState(false)
  const [concordanceOpen, setConcordanceOpen]       = useState(false)

  const openConcordance = useCallback((rawWord: string) => {
    const word = rawWord.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '')
    if (!word) return
    setConcordanceWord(word)
    setConcordanceOpen(true)
    setConcordanceLoading(true)
    getConcordance(db, word)
      .then(rows => { setConcordanceResults(rows); setConcordanceLoading(false) })
      .catch(() => setConcordanceLoading(false))
  }, [db])

  const actionBarAnim   = useRef(new Animated.Value(0)).current
  const colorPickerAnim = useRef(new Animated.Value(0)).current

  const book        = route.params?.book      ?? 'Genesis'
  const chapter     = route.params?.chapter   ?? 1
  const isApocrypha = route.params?.apocrypha ?? false
  const listRef = useRef<FlatList>(null)
  const pendingScrollIdxRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const selectedVerseRef = useRef<number | null>(null)
  selectedVerseRef.current = selectedVerse

  const totalBarHeight = useMemo(
    () => Animated.add(
      actionBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }),
      colorPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 56] }),
    ),
    [], // actionBarAnim and colorPickerAnim are stable refs
  )

  useEffect(() => {
    setLoading(true)
    setSelectedVerse(null)
    setShowColorPicker(false)
    Animated.spring(actionBarAnim, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
    Animated.spring(colorPickerAnim, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
    setLoadError(null)
    setActiveFn(null)
    setFootnotesByVerse(new Map())
    Promise.all([
      isApocrypha
        ? getApocryphaChapter(db, book, chapter)
        : getChapter(db, book, chapter, translation),
      getChapterHighlights(userDb, book, chapter),
      (!isApocrypha && translation === 'KJV')
        ? getChapterFootnotes(db, book, chapter)
        : Promise.resolve([]),
    ]).then(([rows, hl, fns]) => {
      setVerses(rows)
      const hlMap: Record<number, string> = {}
      hl.forEach(h => { hlMap[h.verse] = h.color })
      setHighlights(hlMap)
      const fnMap = new Map<number, Footnote[]>()
      fns.forEach(fn => {
        const arr = fnMap.get(fn.verse) ?? []
        arr.push(fn)
        fnMap.set(fn.verse, arr)
      })
      setFootnotesByVerse(fnMap)
      setLoading(false)
    }).catch((e: any) => {
      setLoadError(String(e?.message ?? e))
      setLoading(false)
    })
  }, [book, chapter, translation, isApocrypha])

  useEffect(() => {
    recordHistory(userDb, book, chapter)
  }, [book, chapter])

  useEffect(() => {
    if (!compareTrans) {
      setCompareMap(prev => prev.size > 0 ? new Map() : prev)
      return
    }
    getChapter(db, book, chapter, compareTrans).then(rows => {
      const m = new Map<number, string>()
      rows.forEach(v => m.set(v.verse, v.text))
      setCompareMap(m)
    }).catch(() => setCompareMap(prev => prev.size > 0 ? new Map() : prev))
  }, [compareTrans, book, chapter])

  useEffect(() => {
    if (route.params?.verse && verses.length > 0) {
      const v = route.params.verse
      const idx = verses.findIndex(vv => vv.verse === v)
      if (idx >= 0) {
        pendingScrollIdxRef.current = idx
        setSelectedVerse(v)
        setSelected({ book, chapter, verse: v })
      }
    }
  }, [verses, route.params?.verse, route.params?._ts, book, chapter, setSelected])

  useEffect(() => {
    const open = selectedVerse !== null
    Animated.spring(actionBarAnim, { toValue: open ? 1 : 0, useNativeDriver: false, bounciness: 0 }).start()
    if (!open) {
      setShowColorPicker(false)
      Animated.spring(colorPickerAnim, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
    }
    if (open) {
      isBookmarked(userDb, book, chapter, selectedVerse!).then(setBookmarked)
      getNote(userDb, book, chapter, selectedVerse!).then(n => {
        const t = n?.text ?? ''
        setNoteText(t)
        setNoteSaved(t)
      })
    }
  }, [selectedVerse, book, chapter])

  useEffect(() => {
    Animated.spring(colorPickerAnim, {
      toValue: showColorPicker ? 1 : 0,
      useNativeDriver: false,
      bounciness: 0,
    }).start()
  }, [showColorPicker])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])
  useEffect(() => () => { if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current) }, [])

  const selectVerse = useCallback((verse: number) => {
    const next = selectedVerseRef.current === verse ? null : verse
    setSelectedVerse(next)
    setSelected(next !== null ? { book, chapter, verse: next } : null)
    setShowColorPicker(false)
    setActiveFn(null)
  }, [book, chapter, setSelected])

  const toggleBookmark = async () => {
    if (selectedVerse === null) return
    if (bookmarked) {
      await removeBookmark(userDb, book, chapter, selectedVerse)
      setBookmarked(false)
    } else {
      await addBookmark(userDb, book, chapter, selectedVerse)
      setBookmarked(true)
    }
  }

  const pickColor = async (colorKey: ColorKey) => {
    if (selectedVerse === null) return
    const current = highlights[selectedVerse]
    if (current === colorKey) {
      // Tapping same color removes it
      await removeHighlight(userDb, book, chapter, selectedVerse)
      setHighlights(prev => { const next = { ...prev }; delete next[selectedVerse]; return next })
    } else {
      await setHighlight(userDb, book, chapter, selectedVerse, colorKey)
      setHighlights(prev => ({ ...prev, [selectedVerse]: colorKey }))
    }
    setShowColorPicker(false)
  }

  const handleNoteChange = (val: string) => {
    setNoteText(val)
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current)
    noteSaveTimer.current = setTimeout(async () => {
      if (selectedVerse === null) return
      if (val.trim()) {
        await saveNote(userDb, book, chapter, selectedVerse, val)
      } else {
        await deleteNote(userDb, book, chapter, selectedVerse)
      }
      setNoteSaved(val)
    }, 800)
  }

  const handleNoteDelete = () => {
    if (!noteSaved.trim()) return
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (selectedVerse === null) return
          await deleteNote(userDb, book, chapter, selectedVerse)
          setNoteText('')
          setNoteSaved('')
        },
      },
    ])
  }

  const bookIndex  = isApocrypha ? -1 : BOOKS.findIndex(b => b.name === book)

  const goChapter = useCallback((delta: number) => {
    if (isApocrypha) {
      navigation.setParams({ book, chapter: chapter + delta, verse: undefined, apocrypha: true })
      return
    }
    const totalChapters = BOOK_MAP[book]?.chapters ?? 1

    if (delta > 0 && chapter >= totalChapters) {
      const nextBook = BOOKS[bookIndex + 1]
      if (nextBook) navigation.setParams({ book: nextBook.name, chapter: 1, verse: undefined, apocrypha: false })
    } else if (delta < 0 && chapter <= 1) {
      const prevBook = BOOKS[bookIndex - 1]
      if (prevBook) navigation.setParams({ book: prevBook.name, chapter: prevBook.chapters, verse: undefined, apocrypha: false })
    } else {
      navigation.setParams({ book, chapter: chapter + delta, verse: undefined, apocrypha: isApocrypha })
    }
  }, [book, chapter, isApocrypha, bookIndex])
  const canGoPrev  = chapter > 1 || bookIndex > 0
  const canGoNext  = isApocrypha || chapter < (BOOK_MAP[book]?.chapters ?? 1) || bookIndex < BOOKS.length - 1
  const currentHighlightColor = selectedVerse !== null ? highlights[selectedVerse] : undefined

  const renderVerseRow = useCallback(({ item }: { item: BibleVerse }) => (
    <VerseRow
      verse={item.verse}
      text={item.text}
      isSelected={selectedVerse === item.verse}
      hlColor={highlights[item.verse]}
      onPress={selectVerse}
      onWordPress={openConcordance}
      onFnPress={setActiveFn}
      redLetterOn={redLetterOn}
      book={book}
      chapter={chapter}
      footnotes={footnotesByVerse.get(item.verse)}
      compareText={compareTrans ? compareMap.get(item.verse) : undefined}
      compareLabel={compareTrans ?? undefined}
    />
  ), [selectedVerse, highlights, selectVerse, openConcordance, redLetterOn, book, chapter, footnotesByVerse, compareTrans, compareMap])
  const currentSwatch = currentHighlightColor
    ? HIGHLIGHT_COLORS.find(c => c.key === currentHighlightColor)?.swatch
    : undefined

  return (
    <GestureDetector gesture={pinchGesture}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerTitle}
          onPress={() => navigation.navigate('BookPicker')}
          activeOpacity={0.7}
        >
          <Text style={styles.bookName}>{book}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4, marginTop: 2 }} />
        </TouchableOpacity>
        {isApocrypha ? (
          <View style={styles.apocBadge}>
            <Text style={styles.apocBadgeText}>Apocrypha</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.translationBtn}
            onPress={() => setTranslationPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.translationLabel}>
              {compareTrans ? `${translation} ∥ ${compareTrans}` : translation}
            </Text>
            <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.chapterBtn}
          onPress={() => navigation.navigate('ChapterPicker', { book, apocrypha: isApocrypha })}
          activeOpacity={0.7}
        >
          <Text style={styles.chapterNum}>{chapter}</Text>
        </TouchableOpacity>
      </View>

      {/* Translation picker modal */}
      <Modal visible={translationPickerOpen} transparent animationType="fade" onRequestClose={() => setTranslationPickerOpen(false)}>
        <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setTranslationPickerOpen(false)}>
          <View style={modal.sheet}>
            <Text style={modal.title}>Bible Translation</Text>
            {TRANSLATIONS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={modal.translationRow}
                activeOpacity={0.7}
                onPress={() => {
                  setTranslation(t.key)
                  if (compareTrans === t.key) setCompareTrans(null)
                  setTranslationPickerOpen(false)
                }}
              >
                <View style={modal.translationInfo}>
                  <Text style={[modal.translationKey, translation === t.key && modal.translationKeyActive]}>{t.label}</Text>
                  <Text style={modal.translationFull}>{t.full}</Text>
                </View>
                {translation === t.key && (
                  <Ionicons name="checkmark" size={18} color={colors.accent} />
                )}
              </TouchableOpacity>
            ))}
            <View style={modal.sectionDivider} />
            <Text style={modal.sectionTitle}>Parallel Translation</Text>
            {TRANSLATIONS.filter(t => t.key !== translation).map(t => {
              const active = compareTrans === t.key
              return (
                <TouchableOpacity
                  key={t.key}
                  style={modal.translationRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setCompareTrans(active ? null : t.key)
                    setTranslationPickerOpen(false)
                  }}
                >
                  <View style={modal.translationInfo}>
                    <Text style={[modal.translationKey, active && modal.translationKeyActive]}>{t.label}</Text>
                    <Text style={modal.translationFull}>{t.full}</Text>
                  </View>
                  {active && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                </TouchableOpacity>
              )
            })}
            <View style={modal.sectionDivider} />
            <TouchableOpacity style={modal.rlRow} onPress={toggleRedLetter} activeOpacity={0.7}>
              <View style={modal.translationInfo}>
                <Text style={modal.translationKey}>Red Letter</Text>
                <Text style={modal.translationFull}>Highlight words of Jesus in red</Text>
              </View>
              <View style={[modal.rlToggle, redLetterOn && modal.rlToggleOn]}>
                <View style={[modal.rlThumb, redLetterOn && modal.rlThumbOn]} />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Verses */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : verses.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>No verses found for {book} {chapter}</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={verses}
          keyExtractor={v => `${v.verse}`}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => {
            const idx = pendingScrollIdxRef.current
            if (idx !== null) {
              pendingScrollIdxRef.current = null
              listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 })
            }
          }}
          onScrollToIndexFailed={({ averageItemLength, index }) => {
            listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: false })
            setTimeout(() => {
              if (mountedRef.current)
                listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 })
            }, 100)
          }}
          renderItem={renderVerseRow}
        />
      )}

      {/* Footnote popup */}
      {activeFn && (
        <View style={styles.fnPopup}>
          <Text style={styles.fnPopupMarker}>{activeFn.marker}</Text>
          <View style={styles.fnPopupDivider} />
          <Text style={styles.fnPopupContent}>{activeFn.content}</Text>
          <TouchableOpacity onPress={() => setActiveFn(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Action bar */}
      <Animated.View style={[styles.actionBar, { height: totalBarHeight, overflow: 'hidden' }]}>
        {/* Main button row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={toggleBookmark} activeOpacity={0.7}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={bookmarked ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.actionLabel, bookmarked && styles.actionLabelActive]}>
              {bookmarked ? 'Bookmarked' : 'Bookmark'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowColorPicker(p => !p)}
            activeOpacity={0.7}
          >
            <View style={styles.highlightIconWrap}>
              <Ionicons name="color-fill-outline" size={22} color={currentSwatch ?? colors.textSecondary} />
              {currentSwatch && (
                <View style={[styles.highlightDot, { backgroundColor: currentSwatch }]} />
              )}
            </View>
            <Text style={[styles.actionLabel, !!currentHighlightColor && styles.actionLabelActive]}>
              Highlight
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setShareModalOpen(true)} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setNotesOpen(true)} activeOpacity={0.7}>
            <Ionicons
              name={noteSaved.trim() ? 'pencil' : 'pencil-outline'}
              size={22}
              color={noteSaved.trim() ? colors.accent : colors.textSecondary}
            />
            <Text style={[styles.actionLabel, noteSaved.trim() && styles.actionLabelActive]}>Notes</Text>
          </TouchableOpacity>
        </View>

        {/* Color picker row */}
        <View style={styles.colorRow}>
          {HIGHLIGHT_COLORS.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.colorSwatch,
                { backgroundColor: c.swatch },
                currentHighlightColor === c.key && styles.colorSwatchActive,
              ]}
              onPress={() => pickColor(c.key)}
              activeOpacity={0.75}
            />
          ))}
          {currentHighlightColor && (
            <TouchableOpacity
              style={styles.colorRemove}
              onPress={async () => {
                if (selectedVerse === null) return
                await removeHighlight(userDb, book, chapter, selectedVerse)
                setHighlights(prev => { const next = { ...prev }; delete next[selectedVerse]; return next })
                setShowColorPicker(false)
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
              <Text style={styles.colorRemoveLabel}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, !canGoPrev && styles.footerBtnDisabled]}
          onPress={() => canGoPrev && goChapter(-1)}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color={canGoPrev ? colors.textSecondary : colors.textMuted} />
          <Text style={[styles.footerLabel, !canGoPrev && styles.footerLabelDisabled]}>Prev</Text>
        </TouchableOpacity>

        {selectedVerse !== null && (
          <TouchableOpacity
            style={styles.studyBtn}
            onPress={() => navigation.getParent()?.navigate('Study' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="school-outline" size={15} color={colors.bgPrimary} />
            <Text style={styles.studyBtnLabel}>Study</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.footerBtn, !canGoNext && styles.footerBtnDisabled]}
          onPress={() => canGoNext && goChapter(1)}
          activeOpacity={0.7}
        >
          <Text style={[styles.footerLabel, !canGoNext && styles.footerLabelDisabled]}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={canGoNext ? colors.textSecondary : colors.textMuted} />
        </TouchableOpacity>
      </View>

      {showFab && selectedVerse === null && (
        <TouchableOpacity style={styles.tourFab} onPress={openTutorial} activeOpacity={0.85}>
          <Text style={styles.tourFabText}>?</Text>
        </TouchableOpacity>
      )}

      {selectedVerse !== null && (
        <ShareModal
          visible={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          book={book}
          chapter={chapter}
          verses={verses}
          anchorVerse={selectedVerse}
        />
      )}

      <ConcordanceModal
        visible={concordanceOpen}
        word={concordanceWord}
        results={concordanceResults}
        loading={concordanceLoading}
        onClose={() => setConcordanceOpen(false)}
        onNavigate={(b, ch, v) => navigation.setParams({ book: b, chapter: ch, verse: v, apocrypha: false })}
      />

      {/* Notes modal */}
      <Modal visible={notesOpen} transparent animationType="slide" onRequestClose={() => setNotesOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setNotesOpen(false)} />
          <View style={noteModal.sheet}>
            <View style={noteModal.header}>
              <Text style={noteModal.title}>
                Note — {book} {chapter}:{selectedVerse}
              </Text>
              <View style={noteModal.headerRight}>
                {!!noteSaved.trim() && (
                  <TouchableOpacity onPress={handleNoteDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setNotesOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={noteModal.hint}>
              {noteText !== noteSaved ? 'Saving…' : noteSaved.trim() ? 'Saved' : 'Start typing to add a note'}
            </Text>
            <TextInput
              style={noteModal.input}
              value={noteText}
              onChangeText={handleNoteChange}
              multiline
              placeholder="Your notes on this verse…"
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
              autoCorrect
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </GestureDetector>
  )
}

const makeStyles = (c: ThemeColors, verseLineHeight = 28, verseFontSize = 17) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

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
  headerTitle: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bookName: { fontSize: 18, fontWeight: '700', color: c.textPrimary, letterSpacing: 0.2 },
  translationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: c.bgTertiary, borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    marginLeft: 10,
  },
  translationLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.5 },

  chapterBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: c.accentDim, borderRadius: 8, marginLeft: 8,
  },
  chapterNum: { fontSize: 16, fontWeight: '700', color: c.accent },

  errorText: { color: c.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },

  tourFab: {
    position: 'absolute', bottom: 72, right: 16,
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: c.accent,
    alignItems: 'center', justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  tourFabText: { fontSize: 20, fontWeight: '700', color: c.bgPrimary, lineHeight: 24 },

  apocBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: c.bgTertiary, borderRadius: 8, marginLeft: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  apocBadgeText: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.4 },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
  verseRow: {
    flexDirection: 'row', paddingVertical: 8,
    paddingHorizontal: 10, borderRadius: 6, marginVertical: 1,
  },
  verseRowSelected: { backgroundColor: c.accentDim },
  verseNum: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    minWidth: 24, marginTop: 3, marginRight: 8,
  },
  verseBody: { flex: 1 },
  verseText: { fontSize: verseFontSize, lineHeight: verseLineHeight, color: c.textPrimary },
  verseBodyRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  comparePrimary:    { flex: 1 },
  compareDivider:    { width: StyleSheet.hairlineWidth, backgroundColor: c.border, alignSelf: 'stretch', marginHorizontal: 8 },
  compareSecondary:  { flex: 1 },
  compareLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: c.textMuted,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  compareText: { fontSize: verseFontSize - 2, lineHeight: verseLineHeight - 2, color: c.textMuted, fontStyle: 'italic' },
  verseTextSelected: { color: c.textAccent },
  redLetterText: { color: '#D03030' },
  redLetterSelected: { color: '#FF6B6B' },
  fnMarker: { color: c.accent, fontSize: 14, fontWeight: '700' },
  fnMarkerSelected: { color: '#7ab8e8' },
  fnPopup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: c.bgCard,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fnPopupMarker: { color: c.accent, fontSize: 14, fontWeight: '700', minWidth: 16 },
  fnPopupDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.border, alignSelf: 'stretch' },
  fnPopupContent: { flex: 1, color: c.textSecondary, fontSize: 13, lineHeight: 19 },

  actionBar: {
    backgroundColor: c.bgTertiary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  actionRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  actionBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 6, gap: 2 },
  actionLabel: { fontSize: 10, color: c.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  actionLabelActive: { color: c.accent },

  highlightIconWrap: { position: 'relative' },
  highlightDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1, borderColor: c.bgTertiary,
  },

  colorRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  colorSwatch: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: c.textPrimary,
    transform: [{ scale: 1.15 }],
  },
  colorRemove: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 8, paddingLeft: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: c.border,
  },
  colorRemoveLabel: { fontSize: 12, color: c.textMuted, fontWeight: '600' },

  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: c.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  footerBtn:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  footerBtnDisabled:   { opacity: 0.3 },
  footerLabel:         { fontSize: 14, fontWeight: '600', color: c.textSecondary },
  footerLabelDisabled: { color: c.textMuted },
  studyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: c.accent, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  studyBtnLabel: { fontSize: 14, fontWeight: '700', color: c.bgPrimary },
})

const makeModal = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 32, gap: 16,
  },
  title: { fontSize: 17, fontWeight: '700', color: c.textPrimary, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15, color: c.textSecondary, fontWeight: '600' },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.bgTertiary, borderRadius: 10, overflow: 'hidden',
  },
  stepBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  stepValue: { fontSize: 17, fontWeight: '700', color: c.textPrimary, minWidth: 36, textAlign: 'center' },
  preview: {
    backgroundColor: c.bgCard, borderRadius: 10, maxHeight: 180,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  previewRef:  { fontSize: 13, fontWeight: '700', color: c.accent, marginBottom: 6 },
  previewText: { fontSize: 14, lineHeight: 22, color: c.textPrimary },
  previewNum:  { fontWeight: '700', color: c.textMuted },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: c.bgTertiary, alignItems: 'center',
  },
  cancelLabel: { fontSize: 15, fontWeight: '600', color: c.textSecondary },
  shareBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: c.accent, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  shareLabel: { fontSize: 15, fontWeight: '700', color: c.bgPrimary },

  translationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },

  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: 4 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: c.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', paddingVertical: 8, paddingHorizontal: 4 },

  translationInfo: { gap: 2 },
  translationKey: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
  translationKeyActive: { color: c.accent },
  translationFull: { fontSize: 12, color: c.textMuted },

  rlRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
  },
  rlToggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: c.bgTertiary,
    borderWidth: 1, borderColor: c.border,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  rlToggleOn: {
    backgroundColor: '#D03030',
    borderColor: '#D03030',
  },
  rlThumb: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: c.textMuted,
  },
  rlThumbOn: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
})

const makeConc = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, maxHeight: '75%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  word:  { fontSize: 18, fontWeight: '700', color: c.textPrimary },
  count: { fontSize: 13, color: c.textMuted, marginTop: 3 },
  empty: { textAlign: 'center', color: c.textMuted, padding: 40 },
  row:   { paddingHorizontal: 20, paddingVertical: 12 },
  ref:   { fontSize: 13, fontWeight: '700', color: c.accent, marginBottom: 3 },
  text:  { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 20 },
})

const makeNoteModal = (c: ThemeColors) => StyleSheet.create({
  sheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingHorizontal: 16, paddingBottom: 32,
    gap: 10, minHeight: 320,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  hint:  { fontSize: 12, color: c.textMuted, fontStyle: 'italic' },
  input: {
    flex: 1,
    backgroundColor: c.bgCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 14,
    fontSize: 16,
    lineHeight: 26,
    color: c.textPrimary,
    minHeight: 200,
  },
})

