import React, { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo, memo } from 'react'
import * as Clipboard from 'expo-clipboard'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getChapter, getApocryphaChapter, getEarlyTextChapter, getEarlyTextFootnotes, isBookmarked, addBookmark, removeBookmark, recordHistory,
  getChapterHighlights, setHighlight, removeHighlight,
  getNote, saveNote, deleteNote, getConcordance, getChapterFootnotes, getStrongsEntry, getEarlyTextRefs,
} from '../db/queries'
import type { ConcordanceResult, StrongsEntry, StrongsConcordanceResult, EarlyTextRef } from '../db/queries'
import { getStrongsConcordance } from '../db/queries'
import { StrongsConcordanceModal } from './WordStudyPanel'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { useTranslation, TRANSLATIONS, GREEK_TRANSLATIONS, OT_ORIGINAL_TRANSLATIONS, OT_ONLY_TRANSLATIONS, OT_TRANSLATIONS, ANNOTATED_TRANSLATIONS } from '../context/TranslationContext'
import { useWordFocus } from '../context/WordFocusContext'
import { useParallelTranslation } from '../context/ParallelTranslationContext'
import type { Translation } from '../context/TranslationContext'
import { useOnboarding } from '../context/OnboardingContext'
import { useRedLetter } from '../context/RedLetterContext'
import { isRedLetter, splitRedLetterVerse, splitByWMarkers, stripUsfm } from '../data/redLetter'
import type { Segment } from '../data/redLetter'
import { useTheme } from '../context/ThemeContext'
import { useLineSpacing } from '../context/LineSpacingContext'
import { useFontSize, FONT_SIZE_MIN, FONT_SIZE_MAX } from '../context/FontSizeContext'
import { useReaderFont } from '../context/FontFamilyContext'
import type { FontScopeKey } from '../context/FontFamilyContext'
import type { ThemeColors } from '../theme/themes'
import { BOOKS, BOOK_MAP, APOCRYPHA_BOOK_MAP, EARLY_TEXT_MAP } from '../data/books'
import { getRawBookPreface } from '../data/bookPrefaces'
import type { BookPreface } from '../data/bookPrefaces'
import { CanonicalPrefaceView, EarlyTextPrefaceView } from './PrefaceView'
import { pendingNav } from '../navigation/pendingNav'
import type { BibleVerse, BibleStackParamList, Footnote } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'Reader'>
  route: RouteProp<BibleStackParamList, 'Reader'>
}

import { HIGHLIGHT_COLORS, type ColorKey, getHighlightBg } from '../theme/highlightColors'

type TaggedWord = { w: string; red: boolean; italic?: boolean }

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

// ── KJV+ parser ──────────────────────────────────────────

type KJVToken = { word: string; strongs?: string; italic?: boolean }

function parseKJVPlus(text: string): KJVToken[] {
  const tokens: KJVToken[] = []
  const parts = text.split(' ')
  let pending: string | null = null
  let pendingItalic = false
  for (const p of parts) {
    if (p && /^[GH]\d+$/.test(p)) {
      if (pending !== null) { tokens.push({ word: pending, strongs: p, italic: pendingItalic || undefined }); pending = null; pendingItalic = false }
    } else {
      if (pending !== null) tokens.push({ word: pending, italic: pendingItalic || undefined })
      const italic = p.includes('{')
      pending = italic ? p.replace(/[{}]/g, '') : (p || null)
      pendingItalic = italic
    }
  }
  if (pending !== null) tokens.push({ word: pending, italic: pendingItalic || undefined })
  return tokens
}

function applyItalics(seg: Segment): Segment[] {
  if (!seg.t.includes('{')) return [seg]
  const result: Segment[] = []
  const re = /\{([^}]+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(seg.t)) !== null) {
    if (m.index > last) result.push({ t: seg.t.slice(last, m.index), red: seg.red })
    result.push({ t: m[1], red: seg.red, italic: true })
    last = m.index + m[0].length
  }
  if (last < seg.t.length) result.push({ t: seg.t.slice(last), red: seg.red })
  return result
}

type DssSeg = { t: string; lacuna: boolean; uncertain: boolean; supralinear: boolean }

function parseDssMarkers(text: string): DssSeg[] {
  const segs: DssSeg[] = []
  let cur = ''
  let lacuna = false, uncertain = false, supralinear = false

  const flush = (l: boolean, u: boolean, s: boolean) => {
    if (cur) segs.push({ t: cur, lacuna, uncertain, supralinear })
    cur = ''; lacuna = l; uncertain = u; supralinear = s
  }

  let i = 0
  while (i < text.length) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '#' || ch === '?') { i++; continue }           // strip noise chars

    if (ch === '(' && next === '^') {                          // (^ opens supralinear+uncertain
      flush(lacuna, true, true)
      i += 2
      if (text[i] === ' ') i++                                 // skip notation space
    } else if (ch === '^' && next === ')') {                   // ^) closes supralinear+uncertain
      if (cur.endsWith(' ')) cur = cur.slice(0, -1)            // trim trailing notation space
      flush(lacuna, false, false)
      i += 2
    } else if (ch === '[') { flush(true,  uncertain, supralinear); i++ }
      else if (ch === ']') { flush(false, uncertain, supralinear); i++ }
      else if (ch === '(') { flush(lacuna, true,  supralinear); i++ }  // bare ( = uncertain
      else if (ch === ')') { flush(lacuna, false, supralinear); i++ }  // bare ) = close uncertain
      else { cur += ch; i++ }
  }
  if (cur) segs.push({ t: cur, lacuna, uncertain, supralinear })
  return segs.filter(s => s.t)
}

function renderKJVPlusTokens(
  tokens: KJVToken[],
  containerStyle: any,
  strongsStyle: any,
  italicStyle: any,
  onStrongsPress: (s: string) => void,
): React.ReactElement {
  return (
    <Text style={containerStyle}>
      {tokens.map((tok, i) => (
        <React.Fragment key={i}>
          <Text style={tok.italic ? italicStyle : undefined}>{tok.word}</Text>
          {tok.strongs
            ? <Text style={strongsStyle} onPress={() => onStrongsPress(tok.strongs!)}> {tok.strongs}</Text>
            : null}
          <Text> </Text>
        </React.Fragment>
      ))}
    </Text>
  )
}

// ── Inline scripture ref splitter (for early texts) ───────────────────────────
// Splits prose on patterns like "Philippians 1:5", "1 Peter 1:8", "Ephesians 2:8-9"
const INLINE_SCRIPTURE_RE = /(\[\d+\]|[1-3]?\s*[A-Z][a-z]+(?:\s+[A-Za-z]+)?\s+\d+:\d+(?:-\d+)?)/

const INLINE_BOOK_RE = /^([1-3]?\s*[A-Z][a-z]+(?:\s+[A-Za-z]+)?)\s+(\d+):(\d+)/

// ── VerseRow ──────────────────────────────────────────────

const VerseRow = memo(function VerseRow({
  verse, text, isSelected, hlColor, onPress, onWordPress, onFnPress, redLetterOn, book, chapter, footnotes, compareText, compareLabel, isAnnotated, compareIsAnnotated, onStrongsPress, isDss, dssAllReadings, isHebrew, useHeuristicRedLetter, isEarlyText, onEarlyFnPress, onInlineRefPress,
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
  isAnnotated?: boolean
  compareIsAnnotated?: boolean
  onStrongsPress?: (verse: number, strongs: string) => void
  isDss?: boolean
  dssAllReadings?: boolean
  isHebrew?: boolean
  useHeuristicRedLetter?: boolean
  isEarlyText?: boolean
  onEarlyFnPress?: (marker: number) => void
  onInlineRefPress?: (book: string, chapter: number, verse: number) => void
}) {
  const { colors } = useTheme()
  const { lineHeight } = useLineSpacing()
  const { fontSize } = useFontSize()
  const { fontFamily, fontScope } = useReaderFont()
  const styles = useMemo(() => makeStyles(colors, lineHeight, fontSize, fontFamily, fontScope), [colors, lineHeight, fontSize, fontFamily, fontScope])

  const cleanText = stripUsfm(text)
  const cleanCompareText = compareText ? stripUsfm(compareText) : null
  const hebrewTextStyle = isHebrew ? styles.hebrewText : undefined

  const compareEl = cleanCompareText ? (
    compareIsAnnotated
      ? renderKJVPlusTokens(parseKJVPlus(cleanCompareText), styles.compareText, styles.strongsNum, styles.italicText, s => onStrongsPress?.(verse, s))
      : <Text style={styles.compareText}>{cleanCompareText}</Text>
  ) : null

  if (isDss) {
    const allReadings = text.split(/\s*׃\s*/).map(s => s.trim()).filter(Boolean)
    const readings = dssAllReadings ? allReadings : allReadings.slice(0, 1)
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(verse)}
        style={[styles.verseRow, isSelected && styles.verseRowSelected, hlColor ? { backgroundColor: getHighlightBg(hlColor) } : undefined]}
      >
        <Text style={styles.verseNum}>{verse}</Text>
        <View style={styles.verseBody}>
          {readings.map((reading, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={styles.dssReadingDivider} />}
              <Text style={[styles.verseText, styles.hebrewText, isSelected && styles.verseTextSelected]}>
                {parseDssMarkers(reading).map((seg, j) => {
                  if (seg.lacuna)
                    return <Text key={j} style={styles.dssLacunaText}>{seg.t}</Text>
                  if (seg.supralinear && seg.uncertain)
                    return <Text key={j} style={styles.dssUncertainSupraText}>{seg.t}</Text>
                  if (seg.supralinear)
                    return <Text key={j} style={styles.dssSupralinearText}>{seg.t}</Text>
                  if (seg.uncertain)
                    return <Text key={j} style={styles.dssUncertainText}>{seg.t}</Text>
                  return <Text key={j}>{seg.t}</Text>
                })}
              </Text>
            </React.Fragment>
          ))}
        </View>
      </TouchableOpacity>
    )
  }

  const earlyParagraphs = useMemo(
    () => isEarlyText ? text.split(/\n{2,}/).map(para => para.split(INLINE_SCRIPTURE_RE)) : null,
    [isEarlyText, text]
  )

  if (isEarlyText && earlyParagraphs) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(verse)}
        style={[styles.verseRow, isSelected && styles.verseRowSelected, hlColor ? { backgroundColor: getHighlightBg(hlColor) } : null]}
      >
        <Text style={styles.verseNum}>{verse}</Text>
        <View style={styles.verseBody}>
          {earlyParagraphs.map((parts, pi) => (
            <Text key={pi} style={[styles.verseText, isSelected && styles.verseTextSelected, pi > 0 && styles.earlyTextParagraph]}>
              {parts.map((part, i) => {
                const fnMatch = part.match(/^\[(\d+)\]$/)
                if (fnMatch) {
                  return <Text key={i} style={styles.fnMarker} onPress={() => onEarlyFnPress?.(parseInt(fnMatch[1], 10))} suppressHighlighting>{part}</Text>
                }
                const refMatch = part.match(INLINE_BOOK_RE)
                if (refMatch) {
                  const refBook = refMatch[1].replace(/\s+/g, ' ').trim()
                  const refCh   = parseInt(refMatch[2], 10)
                  const refV    = parseInt(refMatch[3], 10)
                  return (
                    <Text key={i} style={styles.inlineScriptureRef}
                      onPress={() => onInlineRefPress?.(refBook, refCh, refV)}
                      suppressHighlighting>
                      {part}
                    </Text>
                  )
                }
                return <Text key={i}>{part}</Text>
              })}
            </Text>
          ))}
        </View>
      </TouchableOpacity>
    )
  }

  if (isAnnotated) {
    const annotatedText = renderKJVPlusTokens(
      parseKJVPlus(cleanText),
      [styles.verseText, isSelected && styles.verseTextSelected],
      [styles.strongsNum, isSelected && styles.strongsNumSelected],
      styles.italicText,
      s => onStrongsPress?.(verse, s),
    )
    return (
      <TouchableOpacity
        style={[styles.verseRow, isSelected && styles.verseRowSelected, hlColor ? { backgroundColor: getHighlightBg(hlColor) } : undefined]}
        activeOpacity={0.7}
        onPress={() => onPress(verse)}
      >
        <Text style={styles.verseNum}>{verse}</Text>
        <View style={styles.verseBody}>
          {compareText ? (
            <View style={styles.verseBodyRow}>
              <View style={styles.comparePrimary}>{annotatedText}</View>
              <View style={styles.compareDivider} />
              <View style={styles.compareSecondary}>
                {!!compareLabel && <Text style={styles.compareLabel}>{compareLabel}</Text>}
                {compareEl}
              </View>
            </View>
          ) : annotatedText}
        </View>
      </TouchableOpacity>
    )
  }

  const hasItalics = cleanText.includes('{')
  const isRL = redLetterOn && isRedLetter(book, chapter, verse)

  // Marker-based coloring (\+w) takes priority over the heuristic — markers are
  // authoritative; the heuristic is a fallback for translations without markers.
  // splitByWMarkers strips USFM tags internally so segments are already clean.
  const markerSegs = redLetterOn ? splitByWMarkers(text) : null
  const baseSegments = markerSegs
    ?? (isRL && useHeuristicRedLetter ? splitRedLetterVerse(cleanText) : [{ t: cleanText, red: false }])
  const segments: Segment[] = hasItalics ? baseSegments.flatMap(applyItalics) : baseSegments
  const fnByWord = footnotes?.length ? buildFnByWord(cleanText, footnotes) : null

  if (isSelected) {
    const tagged: TaggedWord[] = segments.flatMap(seg =>
      seg.t.trim().split(/\s+/).filter(Boolean).map(w => ({ w, red: seg.red, italic: seg.italic }))
    )
    const elems: React.ReactNode[] = []
    tagged.forEach((tw, i) => {
      const wordIdx = i + 1
      const hasSpace = i < tagged.length - 1
      elems.push(
        <Text key={`w${i}`} onPress={() => onWordPress(tw.w)} suppressHighlighting
          style={[styles.verseText, hebrewTextStyle, styles.verseTextSelected, tw.red ? styles.redLetterSelected : undefined, tw.italic ? styles.italicText : undefined]}>
          {tw.w}{hasSpace ? ' ' : ''}
        </Text>
      )
      const fn = fnByWord?.get(wordIdx)
      if (fn) elems.push(
        <Text key={`fn${i}`} onPress={() => onFnPress(fn)} suppressHighlighting style={[styles.fnMarker, styles.fnMarkerSelected]}>
          {toSuperscript(fn.marker)}{' '}
        </Text>
      )
    })
    // Use View+flexWrap instead of Text parent so each word is a bounded flex item.
    // Text onPress inside a Text parent uses line-metric hit areas on Android, causing
    // taps below the last line to fire the last word's handler instead of deselecting.
    const wordWrapStyle = [styles.verseWordWrap, isHebrew && { direction: 'rtl' as const }]
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
                <View style={wordWrapStyle}>{elems}</View>
              </View>
              <View style={styles.compareDivider} />
              <View style={styles.compareSecondary}>
                {!!compareLabel && <Text style={styles.compareLabel}>{compareLabel}</Text>}
                {compareEl}
              </View>
            </View>
          ) : (
            <View style={wordWrapStyle}>{elems}</View>
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
                {segments.length === 1 && !segments[0].red && !segments[0].italic ? (
                  <Text style={[styles.verseText, hebrewTextStyle]}>{text}</Text>
                ) : (
                  <Text style={[styles.verseText, hebrewTextStyle]}>
                    {segments.map((seg, i) => (
                      <Text key={i} style={[seg.red ? styles.redLetterText : undefined, seg.italic ? styles.italicText : undefined]}>{seg.t}</Text>
                    ))}
                  </Text>
                )}
              </View>
              <View style={styles.compareDivider} />
              <View style={styles.compareSecondary}>
                {!!compareLabel && <Text style={styles.compareLabel}>{compareLabel}</Text>}
                {compareEl}
              </View>
            </View>
          ) : segments.length === 1 && !segments[0].red && !segments[0].italic ? (
            <Text style={[styles.verseText, hebrewTextStyle]}>{text}</Text>
          ) : (
            <Text style={[styles.verseText, hebrewTextStyle]}>
              {segments.map((seg, i) => (
                <Text key={i} style={[seg.red ? styles.redLetterText : undefined, seg.italic ? styles.italicText : undefined]}>{seg.t}</Text>
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
      elems.push(<Text key={key} style={[seg.red ? styles.redLetterText : undefined, seg.italic ? styles.italicText : undefined]}>{token}</Text>)
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
              <Text style={[styles.verseText, hebrewTextStyle]}>{elems}</Text>
            </View>
            <View style={styles.compareDivider} />
            <View style={styles.compareSecondary}>
              <Text style={styles.compareLabel}>{compareLabel}</Text>
              {compareEl}
            </View>
          </View>
        ) : (
          <Text style={[styles.verseText, hebrewTextStyle]}>{elems}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
})

// ── Verse stepper ─────────────────────────────────────────

function VerseStepper({ value, min, max, onChange, label, colors }: {
  value: number; min: number; max: number
  onChange: (v: number) => void; label: string; colors: ThemeColors
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, flex: 1 }}>{label}</Text>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - 1))}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 20, lineHeight: 24, color: value <= min ? colors.textMuted : colors.textPrimary, fontWeight: '300' }}>−</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, minWidth: 28, textAlign: 'center' }}>{value}</Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + 1))}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.bgTertiary, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 20, lineHeight: 24, color: value >= max ? colors.textMuted : colors.textPrimary, fontWeight: '300' }}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const stripMarkers = (t: string) => t.replace(/[{}]/g, '')

// ── Share range modal ─────────────────────────────────────

function ShareModal({
  visible, onClose, book, chapter, verses, anchorVerse, translation,
}: {
  visible: boolean; onClose: () => void; book: string; chapter: number
  verses: BibleVerse[]; anchorVerse: number; translation: string
}) {
  const { colors } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const modal = useMemo(() => makeModal(colors), [colors])
  const [fromVerse, setFromVerse] = useState(anchorVerse)
  const [toVerse, setToVerse]     = useState(anchorVerse)

  useEffect(() => {
    if (visible) { setFromVerse(anchorVerse); setToVerse(anchorVerse) }
  }, [visible, anchorVerse])

  const maxVerse = verses.length > 0 ? verses[verses.length - 1].verse : 1

  const setFrom = useCallback((v: number) => { setFromVerse(v); if (v > toVerse) setToVerse(v) }, [toVerse])
  const setTo   = useCallback((v: number) => { setToVerse(v);   if (v < fromVerse) setFromVerse(v) }, [fromVerse])

  const rangeVerses = verses.filter(v => v.verse >= fromVerse && v.verse <= toVerse)
  const refLabel = fromVerse === toVerse
    ? `${book} ${chapter}:${fromVerse}`
    : `${book} ${chapter}:${fromVerse}–${toVerse}`

  const body = useMemo(
    () => rangeVerses
      .map(v => { const t = stripMarkers(stripUsfm(v.text)).replace(/¶\s*/g, ''); return fromVerse === toVerse ? t : `[${v.verse}] ${t}` })
      .join(' '),
    [rangeVerses, fromVerse, toVerse],
  )

  const doShare = async () => { onClose(); await Share.share({ message: `${refLabel} — ${body}` }) }
  const doCopy  = async () => {
    await Clipboard.setStringAsync(`${refLabel} ${translation} — ${body}`)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <View style={[modal.shareSheet, { paddingBottom: Math.max(24, 12 + bottom) }]}>
          <Text style={modal.title}>Copy / Share Verses</Text>
          <VerseStepper min={1} max={maxVerse} value={fromVerse} onChange={setFrom} label="From" colors={colors} />
          <VerseStepper min={1} max={maxVerse} value={toVerse}   onChange={setTo}   label="To"   colors={colors} />
          <ScrollView style={modal.sharePreview} contentContainerStyle={{ padding: 12 }}>
            <Text style={modal.previewRef}>{refLabel}</Text>
            {rangeVerses.map(v => (
              <Text key={v.verse} style={modal.previewText}>
                {fromVerse !== toVerse && <Text style={modal.previewNum}>[{v.verse}] </Text>}
                {stripMarkers(stripUsfm(v.text)).replace(/¶\s*/g, '')}{' '}
              </Text>
            ))}
          </ScrollView>
          <View style={modal.shareBtnRow}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={modal.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.copyBtn} onPress={doCopy} activeOpacity={0.7}>
              <Ionicons name="copy-outline" size={15} color={colors.accent} />
              <Text style={modal.copyLabel}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.shareBtn} onPress={doShare} activeOpacity={0.7}>
              <Ionicons name="share-outline" size={15} color={colors.bgPrimary} />
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

// ── Strongs modal ─────────────────────────────────────────

function StrongsModal({
  visible, entry, loading, concordanceCount, concordanceLoading, onClose, onGoToWords, onSeeOccurrences,
}: {
  visible: boolean
  entry: StrongsEntry | null
  loading: boolean
  concordanceCount: number
  concordanceLoading: boolean
  onClose: () => void
  onGoToWords: () => void
  onSeeOccurrences: () => void
}) {
  const { colors } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const conc = useMemo(() => makeConc(colors), [colors])
  const occLabel = concordanceLoading
    ? '…'
    : `${concordanceCount} occurrence${concordanceCount !== 1 ? 's' : ''}`
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={conc.overlay}>
        <View style={[conc.sheet, { paddingBottom: Math.max(24, 12 + bottom) }]}>
          <View style={conc.header}>
            {entry
              ? <View style={{ flex: 1 }}>
                  <Text style={conc.word}>{entry.lemma}  {entry.number}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <Text style={conc.count}>{entry.translit}{entry.pronunciation ? ` · ${entry.pronunciation}` : ''}</Text>
                    <TouchableOpacity
                      onPress={onSeeOccurrences}
                      activeOpacity={0.7}
                      style={conc.occBtn}
                    >
                      <Text style={conc.occBtnLabel}>{occLabel} →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              : <Text style={conc.word}>{loading ? 'Loading…' : 'Not found'}</Text>
            }
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {loading
            ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 32 }} />
            : entry
              ? <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Text style={conc.text}>{entry.definition}</Text>
                  {!!entry.kjv_usage && (
                    <Text style={[conc.count, { marginTop: 12 }]}>KJV: {entry.kjv_usage}</Text>
                  )}
                </ScrollView>
              : null
          }
          {!loading && entry && (
            <TouchableOpacity style={conc.goToWordsBtn} onPress={onGoToWords} activeOpacity={0.7}>
              <Ionicons name="language-outline" size={15} color={colors.bgPrimary} />
              <Text style={conc.goToWordsBtnLabel}>Open in Word Study</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ── DSS Key modal ─────────────────────────────────────────

const DSS_KEY_ENTRIES: Array<{ label: string; desc: string; color?: string; small?: boolean }> = [
  { label: 'Normal text',              desc: 'Clearly preserved consonants' },
  { label: 'Reconstructed',           desc: 'Lacuna — letters restored by scholars from context', color: '#808080', small: true },
  { label: 'Uncertain',               desc: 'Letter is readable but not fully certain in the manuscript', color: '#5B9BD5' },
  { label: 'Supralinear',             desc: 'Added above the main line — scribal correction or insertion (shown smaller)', small: true },
  { label: 'Uncertain + supralinear', desc: 'Both unclear and written above the line (shown smaller, in blue)', color: '#5B9BD5', small: true },
]

function DssKeyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme()
  const { bottom } = useSafeAreaInsets()
  const conc = useMemo(() => makeConc(colors), [colors])
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={conc.overlay}>
        <View style={[conc.sheet, { paddingBottom: Math.max(24, 12 + bottom) }]}>
          <View style={conc.header}>
            <Text style={conc.word}>DSS Text Key</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
            {DSS_KEY_ENTRIES.map(entry => (
              <View key={entry.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: entry.color ?? colors.textPrimary, opacity: entry.color ? 1 : 0.9 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: entry.small ? 11 : 14, fontWeight: '700', color: entry.color ?? colors.textPrimary }}>
                    {entry.label}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{entry.desc}</Text>
                </View>
              </View>
            ))}
            <Text style={{ fontSize: 12, color: colors.textMuted, fontStyle: 'italic', marginTop: 4 }}>
              Multiple readings per verse reflect different scroll manuscripts attesting the same passage.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Early text scripture refs section ────────────────────────────────────────

const EARLY_REF_BOOK_ABBREV: Record<string, string> = {
  'Matthew': 'Matt', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
  'Acts': 'Acts', 'Romans': 'Rom', '1 Corinthians': '1 Cor',
  '2 Corinthians': '2 Cor', 'Galatians': 'Gal', 'Ephesians': 'Eph',
  'Philippians': 'Phil', 'Colossians': 'Col', '1 Thessalonians': '1 Thess',
  '2 Thessalonians': '2 Thess', '1 Timothy': '1 Tim', '2 Timothy': '2 Tim',
  'Titus': 'Tit', 'Philemon': 'Phlm', 'Hebrews': 'Heb', 'James': 'Jas',
  '1 Peter': '1 Pet', '2 Peter': '2 Pet', '1 John': '1 Jn', '2 John': '2 Jn',
  '3 John': '3 Jn', 'Jude': 'Jude', 'Revelation': 'Rev',
  'Genesis': 'Gen', 'Exodus': 'Ex', 'Leviticus': 'Lev', 'Numbers': 'Num',
  'Deuteronomy': 'Deut', 'Psalms': 'Ps', 'Proverbs': 'Prov', 'Isaiah': 'Isa',
  'Jeremiah': 'Jer', 'Ezekiel': 'Ezek', 'Daniel': 'Dan', 'Malachi': 'Mal',
}

function shortEarlyRef(r: EarlyTextRef) {
  const short = EARLY_REF_BOOK_ABBREV[r.ref_book] ?? r.ref_book
  return `${short} ${r.ref_chapter}:${r.ref_verse}`
}

const RefChips = memo(function RefChips({
  list, accent, onPress,
}: {
  list: EarlyTextRef[]
  accent: string
  onPress: (book: string, chapter: number, verse: number) => void
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {list.map((r, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onPress(r.ref_book, r.ref_chapter, r.ref_verse)}
          style={{
            paddingHorizontal: 8, paddingVertical: 3,
            borderRadius: 10, borderWidth: 1, borderColor: accent,
          }}
        >
          <Text style={{ fontSize: 12, color: accent, fontWeight: '600' }}>{shortEarlyRef(r)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
})

const EarlyRefsSection = memo(function EarlyRefsSection({
  refs, colors, onPress,
}: {
  refs: EarlyTextRef[]
  colors: ThemeColors
  onPress: (book: string, chapter: number, verse: number) => void
}) {
  const quotes    = refs.filter(r => r.ref_type === 'quote')
  const allusions = refs.filter(r => r.ref_type === 'allusion')

  return (
    <View style={{
      marginHorizontal: 16, marginTop: 20, marginBottom: 8,
      paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 6 }}>
        SCRIPTURE REFERENCES
      </Text>
      {quotes.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Quotes</Text>
          <RefChips list={quotes} accent={colors.accent} onPress={onPress} />
        </View>
      )}
      {allusions.length > 0 && (
        <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 2 }}>Allusions</Text>
      )}
      {allusions.length > 0 && (
        <RefChips list={allusions} accent={colors.textSecondary} onPress={onPress} />
      )}
    </View>
  )
})

// ── Reader screen ─────────────────────────────────────────

export default function ReaderScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const { bottom: bottomInset } = useSafeAreaInsets()
  const { lineHeight } = useLineSpacing()
  const { fontSize, setFontSize } = useFontSize()
  const { fontFamily, fontScope } = useReaderFont()
  const styles = useMemo(() => makeStyles(colors, lineHeight, fontSize, fontFamily, fontScope), [colors, lineHeight, fontSize, fontFamily, fontScope])
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
  const [prefaceData, setPrefaceData] = useState<BookPreface | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [translationPickerOpen, setTranslationPickerOpen] = useState(false)
  const [transPickerTab, setTransPickerTab] = useState<'primary' | 'parallel'>('primary')
  const [notesOpen, setNotesOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState('')
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Highlights: verse number → color key
  const [highlights, setHighlights] = useState<Record<number, string>>({})
  const [showColorPicker, setShowColorPicker] = useState(false)

  const [footnotesByVerse, setFootnotesByVerse] = useState<Map<number, Footnote[]>>(new Map())
  const [activeFn, setActiveFn] = useState<Footnote | null>(null)
  const earlyFnMapRef = useRef(new Map<number, string>())
  const [earlyRefs, setEarlyRefs] = useState<EarlyTextRef[]>([])
  const { compareTrans, setCompareTrans, parallelOn, setParallelOn } = useParallelTranslation()
  const [compareMap, setCompareMap] = useState<Map<number, string>>(new Map())

  const [concordanceWord, setConcordanceWord]       = useState('')
  const [concordanceResults, setConcordanceResults] = useState<ConcordanceResult[]>([])
  const [concordanceLoading, setConcordanceLoading] = useState(false)
  const [concordanceOpen, setConcordanceOpen]       = useState(false)

  const [dssAllReadings, setDssAllReadings] = useState(true)
  const [dssKeyOpen, setDssKeyOpen] = useState(false)

  // ── Browser-style reading history ─────────────────────────
  type NavEntry = { book: string; chapter: number; earlyText: boolean; apocrypha: boolean }
  const navHistoryRef = useRef<NavEntry[]>([])
  const navIndexRef   = useRef(-1)
  const isNavJumpRef  = useRef(false)   // true when back/fwd button triggered the params change
  const prevLocationRef = useRef<{ book: string; chapter: number } | null>(null)
  const [canGoBack,    setCanGoBack]    = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  // When BookPicker / ChapterPicker / VersePicker pop back to Reader they write
  // their selection to pendingNav and dispatch popToTop() instead of calling
  // navigate('Reader', params) — which doesn't reliably re-render a suspended
  // screen.  We consume the inbox here and call setParams() ourselves, which
  // is the same path that cross-ref navigation uses and correctly fires the
  // reading-history logic.
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      const pending = pendingNav.current
      if (!pending) return
      pendingNav.current = null
      navigation.setParams({
        book:      pending.book,
        chapter:   pending.chapter,
        verse:     pending.verse,
        apocrypha: pending.apocrypha,
        earlyText: pending.earlyText,
      })
    })
    return unsub
  }, [navigation])

  const [strongsOpen, setStrongsOpen]       = useState(false)
  const [strongsEntry, setStrongsEntry]     = useState<StrongsEntry | null>(null)
  const [strongsLoading, setStrongsLoading] = useState(false)
  const currentStrongsRef = useRef<string>('')
  const currentStrongsVerseRef = useRef<number>(0)
  const { setWordFocus } = useWordFocus()

  const [strongsConcOpen, setStrongsConcOpen]       = useState(false)
  const [strongsConcResults, setStrongsConcResults] = useState<StrongsConcordanceResult[]>([])
  const [strongsConcLoading, setStrongsConcLoading] = useState(false)
  const strongsConcLangRef   = useRef<'greek' | 'hebrew'>('greek')
  const strongsConcLemmaRef  = useRef('')
  const strongsConcTranslitRef = useRef('')

  const openStrongs = useCallback((verse: number, strongs: string) => {
    currentStrongsRef.current = strongs
    currentStrongsVerseRef.current = verse
    setStrongsEntry(null)
    setStrongsOpen(true)
    setStrongsLoading(true)
    setStrongsConcResults([])
    setStrongsConcLoading(true)
    const type = strongs.startsWith('G') ? 'greek' : 'hebrew'
    strongsConcLangRef.current = type
    getStrongsEntry(db, type, strongs)
      .then(entry => {
        setStrongsEntry(entry)
        setStrongsLoading(false)
        strongsConcLemmaRef.current  = entry?.lemma ?? strongs
        strongsConcTranslitRef.current = entry?.translit ?? ''
      })
      .catch(() => setStrongsLoading(false))
    getStrongsConcordance(db, type, strongs)
      .then(rows => { setStrongsConcResults(rows); setStrongsConcLoading(false) })
      .catch(() => setStrongsConcLoading(false))
  }, [db])

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
  const isEarlyText = route.params?.earlyText ?? false
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
    pendingScrollIdxRef.current = null   // clear stale scroll target before new chapter loads
    Animated.spring(actionBarAnim, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
    Animated.spring(colorPickerAnim, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
    setLoadError(null)
    setActiveFn(null)
    setFootnotesByVerse(new Map())
    setEarlyRefs([])

    // Chapter 0 = preface — serve from hardcoded data, no DB query needed
    if (chapter === 0) {
      // Canonical books get structured preface data; early texts use plain string paragraphs
      setPrefaceData(!isEarlyText && !isApocrypha ? (getRawBookPreface(book) ?? null) : null)
      setVerses([])
      setHighlights({})
      setFootnotesByVerse(new Map())
      earlyFnMapRef.current = new Map()
      setEarlyRefs([])
      setLoading(false)
      return
    }
    // Not a preface chapter — clear any leftover preface data
    setPrefaceData(null)

    const shouldFetchFootnotes = !isApocrypha && !isEarlyText && translation === 'KJV'
    const highlightsWithTimeout = new Promise<Awaited<ReturnType<typeof getChapterHighlights>>>(resolve => {
      const tid = setTimeout(() => resolve([]), 3000)
      getChapterHighlights(userDb, book, chapter)
        .then(r => { clearTimeout(tid); resolve(r) })
        .catch(() => { clearTimeout(tid); resolve([]) })
    })
    Promise.all([
      isEarlyText  ? getEarlyTextChapter(db, book, chapter)
      : isApocrypha ? getApocryphaChapter(db, book, chapter)
      :               getChapter(db, book, chapter, translation),
      highlightsWithTimeout,
      shouldFetchFootnotes
        ? getChapterFootnotes(db, book, chapter).catch(() => [] as Awaited<ReturnType<typeof getChapterFootnotes>>)
        : Promise.resolve([]),
      isEarlyText
        ? getEarlyTextFootnotes(db, book, chapter).catch(() => null)
        : Promise.resolve(null),
      isEarlyText
        ? getEarlyTextRefs(db, book, chapter).catch(() => [])
        : Promise.resolve([]),
    ]).then(([rows, hl, fns, efns, erefs]) => {
      earlyFnMapRef.current = (efns as Map<number, string> | null) ?? new Map()
      setEarlyRefs(erefs as EarlyTextRef[])
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
  }, [book, chapter, translation, isApocrypha, isEarlyText])

  useEffect(() => {
    recordHistory(userDb, book, chapter)
  }, [book, chapter])

  // Track reading history for back/forward nav
  useEffect(() => {
    if (isNavJumpRef.current) {
      // This change was triggered by our own back/fwd — don't push a new entry
      isNavJumpRef.current = false
      prevLocationRef.current = { book, chapter }
      return
    }
    const prev = prevLocationRef.current
    const entry: NavEntry = { book, chapter, earlyText: isEarlyText, apocrypha: isApocrypha }
    if (prev === null) {
      // First mount — seed history
      navHistoryRef.current = [entry]
      navIndexRef.current   = 0
    } else if (prev.book !== book || prev.chapter !== chapter) {
      // New location — truncate forward entries and push
      const newHist = navHistoryRef.current.slice(0, navIndexRef.current + 1)
      newHist.push(entry)
      navHistoryRef.current = newHist
      navIndexRef.current   = newHist.length - 1
    } else {
      // Same book/chapter (verse or translation changed) — update in place, no new entry
      if (navIndexRef.current >= 0)
        navHistoryRef.current[navIndexRef.current] = entry
    }
    prevLocationRef.current = { book, chapter }
    setCanGoBack(navIndexRef.current > 0)
    setCanGoForward(navIndexRef.current < navHistoryRef.current.length - 1)
  }, [book, chapter, isEarlyText, isApocrypha])

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
    let cancelled = false
    userDb.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'dss_all_readings'"
    ).then(row => {
      if (!cancelled && row) setDssAllReadings(row.value !== '0')
    }).catch(() => {})
    return () => { cancelled = true }
  }, [userDb])

  const toggleDssAllReadings = useCallback(() => {
    setDssAllReadings(prev => {
      const next = !prev
      userDb.runAsync(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('dss_all_readings', ?)",
        [next ? '1' : '0']
      ).catch(() => {})
      return next
    })
  }, [userDb])

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

  const isOutsideCanon = isApocrypha || isEarlyText
  const bookIndex    = useMemo(() => isOutsideCanon ? -1 : BOOKS.findIndex(b => b.name === book), [book, isOutsideCanon])
  const isNT         = useMemo(() => !isOutsideCanon && BOOK_MAP[book]?.testament === 'NT', [book, isOutsideCanon])
  const isGreekTrans    = useMemo(() => GREEK_TRANSLATIONS.has(translation as any), [translation])
  const isOTTrans       = useMemo(() => OT_TRANSLATIONS.has(translation as any), [translation])
  const isAnnotatedTrans = useMemo(() => ANNOTATED_TRANSLATIONS.has(translation as any), [translation])
  const isDss           = translation === 'DSS'
  const isHebrew        = translation === 'DSS' || translation === 'WLC' || translation === 'TAHOT'

  const goChapter = useCallback((delta: number) => {
    if (isApocrypha) {
      const total = APOCRYPHA_BOOK_MAP[book]?.chapters ?? 1
      const next  = chapter + delta
      if (next < 1 || next > total) return
      navigation.setParams({ book, chapter: next, verse: undefined, apocrypha: true })
      return
    }
    if (isEarlyText) {
      const total = EARLY_TEXT_MAP[book]?.chapters ?? 1
      const next  = chapter + delta
      if (next < 0 || next > total) return   // 0 = preface, allowed
      navigation.setParams({ book, chapter: next, verse: undefined, earlyText: true })
      return
    }
    const totalChapters = BOOK_MAP[book]?.chapters ?? 1

    if (delta > 0 && chapter >= totalChapters) {
      const nextBook = BOOKS[bookIndex + 1]
      if (nextBook) navigation.setParams({ book: nextBook.name, chapter: 1, verse: undefined, apocrypha: false })
    } else if (delta < 0 && chapter <= 0) {
      const prevBook = BOOKS[bookIndex - 1]
      if (prevBook) navigation.setParams({ book: prevBook.name, chapter: prevBook.chapters, verse: undefined, apocrypha: false })
    } else {
      navigation.setParams({ book, chapter: chapter + delta, verse: undefined, apocrypha: isApocrypha })
    }
  }, [book, chapter, isApocrypha, isEarlyText, bookIndex])
  const totalChaptersForBook = useMemo(
    () => isEarlyText  ? (EARLY_TEXT_MAP[book]?.chapters    ?? 1)
        : isApocrypha  ? (APOCRYPHA_BOOK_MAP[book]?.chapters ?? 1)
        :                (BOOK_MAP[book]?.chapters            ?? 1),
    [isEarlyText, isApocrypha, book]
  )
  const canGoPrev = chapter > (isApocrypha ? 1 : 0) || (!isOutsideCanon && bookIndex > 0)
  const canGoNext = chapter < totalChaptersForBook || (!isOutsideCanon && bookIndex < BOOKS.length - 1)
  const currentHighlightColor = selectedVerse !== null ? highlights[selectedVerse] : undefined

  const openEarlyFn = useCallback((marker: number) => {
    const note = earlyFnMapRef.current.get(marker)
    if (note) setActiveFn({ verse: 0, marker: `[${marker}]`, word_index: 0, content: note })
  }, [])

  const onEarlyRefPress = useCallback((b: string, ch: number, v: number) => {
    navigation.setParams({
      book: b, chapter: ch, verse: v,
      earlyText: !!EARLY_TEXT_MAP[b],
      apocrypha: !EARLY_TEXT_MAP[b] && !!APOCRYPHA_BOOK_MAP[b],
    } as any)
  }, [navigation])

  const navBack = useCallback(() => {
    const idx = navIndexRef.current - 1
    if (idx < 0) return
    const entry = navHistoryRef.current[idx]
    navIndexRef.current = idx
    isNavJumpRef.current = true
    setCanGoBack(idx > 0)
    setCanGoForward(true)
    navigation.setParams({
      book: entry.book, chapter: entry.chapter,
      earlyText: entry.earlyText, apocrypha: entry.apocrypha,
      verse: undefined,
    } as any)
  }, [navigation])

  const navForward = useCallback(() => {
    const idx = navIndexRef.current + 1
    if (idx >= navHistoryRef.current.length) return
    const entry = navHistoryRef.current[idx]
    navIndexRef.current = idx
    isNavJumpRef.current = true
    setCanGoBack(true)
    setCanGoForward(idx < navHistoryRef.current.length - 1)
    navigation.setParams({
      book: entry.book, chapter: entry.chapter,
      earlyText: entry.earlyText, apocrypha: entry.apocrypha,
      verse: undefined,
    } as any)
  }, [navigation])

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
      compareText={parallelOn && compareTrans ? compareMap.get(item.verse) : undefined}
      compareLabel={undefined}
      isAnnotated={isAnnotatedTrans}
      compareIsAnnotated={parallelOn && compareTrans ? ANNOTATED_TRANSLATIONS.has(compareTrans as Translation) : false}
      onStrongsPress={openStrongs}
      isDss={isDss}
      dssAllReadings={dssAllReadings}
      isHebrew={isHebrew}
      useHeuristicRedLetter={translation !== 'KJV' && translation !== 'WEB'}
      isEarlyText={isEarlyText}
      onEarlyFnPress={openEarlyFn}
      onInlineRefPress={onEarlyRefPress}
    />
  ), [selectedVerse, highlights, selectVerse, openConcordance, redLetterOn, book, chapter, footnotesByVerse, compareTrans, parallelOn, compareMap, isAnnotatedTrans, openStrongs, isDss, dssAllReadings, isHebrew, translation, isEarlyText, openEarlyFn, onEarlyRefPress])
  const flatListExtraData = useMemo(
    () => ({ selectedVerse, highlights, dssAllReadings, redLetterOn }),
    [selectedVerse, highlights, dssAllReadings, redLetterOn]
  )
  const currentSwatch = currentHighlightColor
    ? HIGHLIGHT_COLORS.find(c => c.key === currentHighlightColor)?.swatch
    : undefined

  const renderTransRow = useCallback((t: typeof TRANSLATIONS[number], active: boolean, onPress: () => void) => (
    <TouchableOpacity key={t.key} style={modal.translationRow} activeOpacity={0.7} onPress={onPress}>
      <View style={modal.translationInfo}>
        <Text style={[modal.translationKey, active && modal.translationKeyActive]}>{t.label}</Text>
        <Text style={modal.translationFull}>{t.full}</Text>
      </View>
      {active && <Ionicons name="checkmark" size={18} color={colors.accent} />}
    </TouchableOpacity>
  ), [modal, colors.accent])

  return (
    <GestureDetector gesture={pinchGesture}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerTitle}
          onPress={() => navigation.navigate('BookPicker', {
            initialTab: isEarlyText ? 'EARLY' : isApocrypha ? 'APOC' : (BOOK_MAP[book]?.testament ?? 'OT') as 'OT' | 'NT',
          })}
          activeOpacity={0.7}
        >
          <Text style={styles.bookName}>{book}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4, marginTop: 2 }} />
        </TouchableOpacity>
        {isOutsideCanon ? (
          <View style={styles.apocBadge}>
            <Text style={styles.apocBadgeText}>{isEarlyText ? 'Early Text' : 'Apocrypha'}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.translationBtn}
            onPress={() => { setTransPickerTab('primary'); setTranslationPickerOpen(true) }}
            activeOpacity={0.7}
          >
            <Text style={styles.translationLabel}>
              {parallelOn && compareTrans ? `${translation} ∥ ${compareTrans}` : translation}
            </Text>
            <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
          </TouchableOpacity>
        )}
        {isDss && (
          <TouchableOpacity
            style={styles.dssKeyBtn}
            onPress={() => setDssKeyOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dssKeyLabel}>Key</Text>
          </TouchableOpacity>
        )}
        {/* Back / chapter number / forward */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
          <TouchableOpacity
            onPress={navBack}
            disabled={!canGoBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            style={{ padding: 4 }}
          >
            <Ionicons name="chevron-back" size={16}
              color={canGoBack ? colors.textSecondary : colors.border} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chapterBtn, { marginLeft: 0 }]}
            onPress={() => navigation.navigate('ChapterPicker', { book, apocrypha: isApocrypha, earlyText: isEarlyText })}
            activeOpacity={0.7}
          >
            <Text style={styles.chapterNum}>{chapter === 0 ? 'P' : chapter}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={navForward}
            disabled={!canGoForward}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
            style={{ padding: 4 }}
          >
            <Ionicons name="chevron-forward" size={16}
              color={canGoForward ? colors.textSecondary : colors.border} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Translation picker modal */}
      <Modal visible={translationPickerOpen} transparent animationType="fade" onRequestClose={() => setTranslationPickerOpen(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setTranslationPickerOpen(false)} />
          <View style={[modal.sheet, { paddingBottom: Math.max(32, 16 + bottomInset) }]}>
            <View style={modal.tabs}>
              <TouchableOpacity
                style={[modal.tab, transPickerTab === 'primary' && modal.tabActive]}
                onPress={() => setTransPickerTab('primary')}
                activeOpacity={0.7}
              >
                <Text style={[modal.tabLabel, transPickerTab === 'primary' && modal.tabLabelActive]}>Primary</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modal.tab, transPickerTab === 'parallel' && modal.tabActive]}
                onPress={() => setTransPickerTab('parallel')}
                activeOpacity={0.7}
              >
                <Text style={[modal.tabLabel, transPickerTab === 'parallel' && modal.tabLabelActive]}>Parallel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 4 }}>
              {transPickerTab === 'primary' ? (
                <>
                  <Text style={modal.sectionTitle}>English</Text>
                  {TRANSLATIONS.filter(t => !t.greekOnly && !t.otOriginal && !t.otOnly).map(t =>
                    renderTransRow(t, translation === t.key, () => {
                      setTranslation(t.key)
                      if (compareTrans === t.key) setCompareTrans(null)
                      setTranslationPickerOpen(false)
                    })
                  )}
                  <View style={modal.sectionDivider} />
                  <Text style={modal.sectionTitle}>Greek New Testament</Text>
                  {TRANSLATIONS.filter(t => t.greekOnly).map(t =>
                    renderTransRow(t, translation === t.key, () => {
                      setTranslation(t.key)
                      if (compareTrans === t.key) setCompareTrans(null)
                      setTranslationPickerOpen(false)
                    })
                  )}
                  <View style={modal.sectionDivider} />
                  <Text style={modal.sectionTitle}>Old Testament Originals</Text>
                  {TRANSLATIONS.filter(t => t.otOriginal).map(t =>
                    renderTransRow(t, translation === t.key, () => {
                      setTranslation(t.key)
                      if (compareTrans === t.key) setCompareTrans(null)
                      setTranslationPickerOpen(false)
                    })
                  )}
                  <View style={modal.sectionDivider} />
                  <Text style={modal.sectionTitle}>English Old Testament</Text>
                  {TRANSLATIONS.filter(t => t.otOnly).map(t =>
                    renderTransRow(t, translation === t.key, () => {
                      setTranslation(t.key)
                      if (compareTrans === t.key) setCompareTrans(null)
                      setTranslationPickerOpen(false)
                    })
                  )}
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
                  {isDss && (
                    <TouchableOpacity style={modal.rlRow} onPress={toggleDssAllReadings} activeOpacity={0.7}>
                      <View style={modal.translationInfo}>
                        <Text style={modal.translationKey}>DSS: All Readings</Text>
                        <Text style={modal.translationFull}>Show all manuscript attestations per verse</Text>
                      </View>
                      <View style={[modal.rlToggle, dssAllReadings && modal.rlToggleOn]}>
                        <View style={[modal.rlThumb, dssAllReadings && modal.rlThumbOn]} />
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={modal.rlRow}
                    activeOpacity={0.7}
                    onPress={() => setParallelOn(v => !v)}
                    disabled={!compareTrans}
                  >
                    <View style={modal.translationInfo}>
                      <Text style={[modal.translationKey, !compareTrans && modal.disabledText]}>Show Parallel</Text>
                      <Text style={modal.translationFull}>
                        {compareTrans ? `Currently: ${compareTrans}` : 'Select a translation below'}
                      </Text>
                    </View>
                    <View style={[modal.rlToggle, parallelOn && compareTrans && modal.rlToggleOn]}>
                      <View style={[modal.rlThumb, parallelOn && compareTrans && modal.rlThumbOn]} />
                    </View>
                  </TouchableOpacity>
                  <View style={modal.sectionDivider} />
                  <Text style={modal.sectionTitle}>English</Text>
                  {TRANSLATIONS.filter(t => !t.greekOnly && !t.otOriginal && !t.otOnly && t.key !== translation).map(t =>
                    renderTransRow(t, compareTrans === t.key, () => {
                      setCompareTrans(t.key); setParallelOn(true); setTranslationPickerOpen(false)
                    })
                  )}
                  <View style={modal.sectionDivider} />
                  <Text style={modal.sectionTitle}>Greek New Testament</Text>
                  {TRANSLATIONS.filter(t => t.greekOnly && t.key !== translation).map(t =>
                    renderTransRow(t, compareTrans === t.key, () => {
                      setCompareTrans(t.key); setParallelOn(true); setTranslationPickerOpen(false)
                    })
                  )}
                  <View style={modal.sectionDivider} />
                  <Text style={modal.sectionTitle}>Old Testament Originals</Text>
                  {TRANSLATIONS.filter(t => t.otOriginal && t.key !== translation).map(t =>
                    renderTransRow(t, compareTrans === t.key, () => {
                      setCompareTrans(t.key); setParallelOn(true); setTranslationPickerOpen(false)
                    })
                  )}
                  <View style={modal.sectionDivider} />
                  <Text style={modal.sectionTitle}>English Old Testament</Text>
                  {TRANSLATIONS.filter(t => t.otOnly && t.key !== translation).map(t =>
                    renderTransRow(t, compareTrans === t.key, () => {
                      setCompareTrans(t.key); setParallelOn(true); setTranslationPickerOpen(false)
                    })
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
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
      ) : isGreekTrans && !isNT ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{translation} is a Greek New Testament only.</Text>
          <Text style={styles.errorSubText}>Switch to a different translation to read the Old Testament.</Text>
        </View>
      ) : isOTTrans && isNT ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{translation} is an Old Testament only translation.</Text>
          <Text style={styles.errorSubText}>Switch to a different translation to read the New Testament.</Text>
        </View>
      ) : chapter === 0 && !isApocrypha && prefaceData ? (
        <CanonicalPrefaceView
          book={book}
          preface={prefaceData}
          fontSize={fontSize}
          onNavigate={(b, ch, v, et) =>
            navigation.setParams({ book: b, chapter: ch, verse: v, earlyText: et, apocrypha: false })
          }
        />
      ) : chapter === 0 && isEarlyText ? (
        <EarlyTextPrefaceView
          book={book}
          fontSize={fontSize}
          onNavigate={(b, ch, v, et) =>
            navigation.setParams({ book: b, chapter: ch, verse: v, earlyText: et, apocrypha: false })
          }
        />
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
          extraData={flatListExtraData}
          windowSize={5}
          maxToRenderPerBatch={8}
          initialNumToRender={20}
          removeClippedSubviews={!isDss}
          ListFooterComponent={isEarlyText && earlyRefs.length > 0 ? (
            <EarlyRefsSection
              refs={earlyRefs}
              colors={colors}
              onPress={onEarlyRefPress}
            />
          ) : null}
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
            <Text style={styles.actionLabel}>Copy / Share</Text>
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
          translation={translation}
        />
      )}

      <DssKeyModal visible={dssKeyOpen} onClose={() => setDssKeyOpen(false)} />

      <ConcordanceModal
        visible={concordanceOpen}
        word={concordanceWord}
        results={concordanceResults}
        loading={concordanceLoading}
        onClose={() => setConcordanceOpen(false)}
        onNavigate={(b, ch, v) => navigation.setParams({ book: b, chapter: ch, verse: v, apocrypha: false })}
      />

      <StrongsModal
        visible={strongsOpen}
        entry={strongsEntry}
        loading={strongsLoading}
        concordanceCount={strongsConcResults.length}
        concordanceLoading={strongsConcLoading}
        onClose={() => setStrongsOpen(false)}
        onSeeOccurrences={() => { setStrongsOpen(false); setStrongsConcOpen(true) }}
        onGoToWords={() => {
          setStrongsOpen(false)
          const v = currentStrongsVerseRef.current
          setSelectedVerse(v)
          setSelected({ book, chapter, verse: v })
          setWordFocus(currentStrongsRef.current)
          navigation.getParent()?.navigate('Study' as never)
        }}
      />

      <StrongsConcordanceModal
        visible={strongsConcOpen}
        lemma={strongsConcLemmaRef.current}
        translit={strongsConcTranslitRef.current}
        lang={strongsConcLangRef.current}
        results={strongsConcResults}
        loading={strongsConcLoading}
        onClose={() => setStrongsConcOpen(false)}
        onNavigate={(b, ch, v) => {
          setStrongsConcOpen(false)
          navigation.setParams({ book: b, chapter: ch, verse: v, apocrypha: false } as any)
        }}
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

const _styleCache = new WeakMap<object, Map<string, any>>()

const makeStyles = (c: ThemeColors, verseLineHeight = 28, verseFontSize = 17, fontFamily?: string, fontScope: FontScopeKey = 'verses') => {
  let m = _styleCache.get(c)
  if (!m) _styleCache.set(c, m = new Map())
  const k = `${verseLineHeight}|${verseFontSize}|${fontFamily ?? ''}|${fontScope}`
  if (m.has(k)) return m.get(k)!
  const globalFont = fontScope === 'all' ? fontFamily : undefined
  const s = StyleSheet.create({
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
  bookName: { fontSize: 18, fontWeight: '700', color: c.textPrimary, letterSpacing: 0.2, fontFamily: globalFont },
  translationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: c.bgTertiary, borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    marginLeft: 10,
  },
  translationLabel: { fontSize: 12, fontWeight: '700', color: c.textSecondary, letterSpacing: 0.5, fontFamily: globalFont },

  chapterBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    backgroundColor: c.accentDim, borderRadius: 8, marginLeft: 8,
  },
  chapterNum: { fontSize: 16, fontWeight: '700', color: c.accent, fontFamily: globalFont },

  errorText:    { color: c.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
  errorSubText: { color: c.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 24, marginTop: 8, opacity: 0.6 },

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
  earlyTextParagraph: { marginTop: 10 },
  verseText: { fontSize: verseFontSize, lineHeight: verseLineHeight, color: c.textPrimary, fontFamily },
  verseWordWrap: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, flex: 1, alignContent: 'flex-start' },
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
  compareText: { fontSize: verseFontSize - 2, lineHeight: verseLineHeight - 2, color: c.textPrimary, fontStyle: 'italic', fontFamily },
  verseTextSelected: { color: c.textAccent },
  redLetterText: { color: '#D03030' },
  redLetterSelected: { color: '#FF6B6B' },
  italicText: { fontStyle: 'italic' },
  fnMarker: { color: c.accent, fontSize: 14, fontWeight: '700' },
  fnMarkerSelected: { color: '#7ab8e8' },
  inlineScriptureRef: { color: c.accent, textDecorationLine: 'underline' },
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
  fnPopupContent: { flex: 1, color: c.textSecondary, fontSize: 13, lineHeight: 19, fontFamily: globalFont },

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
  footerLabel:         { fontSize: 14, fontWeight: '600', color: c.textSecondary, fontFamily: globalFont },
  footerLabelDisabled: { color: c.textMuted },
  studyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: c.accent, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  studyBtnLabel: { fontSize: 14, fontWeight: '700', color: c.bgPrimary },
  strongsNum:         { fontSize: 10, color: c.accent, fontWeight: '700' },
  strongsNumSelected: { color: '#7ab8e8' },
  dssReadingDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: 6,
  },
  hebrewText: {
    textAlign: 'right' as const,
    writingDirection: 'rtl' as const,
  },
  dssLacunaText:        { color: c.textMuted, fontSize: verseFontSize * 0.85 },
  dssUncertainText:     { color: '#5B9BD5' },
  dssSupralinearText:   { fontSize: verseFontSize * 0.85 },
  dssUncertainSupraText:{ color: '#5B9BD5', fontSize: verseFontSize * 0.85 },
  dssKeyBtn: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, marginLeft: 8,
    borderWidth: 1.5, borderColor: '#D4A843',
  },
  dssKeyLabel: { fontSize: 12, fontWeight: '700', color: '#D4A843', letterSpacing: 0.5 },
  })
  m.set(k, s)
  return s
}

const makeModal = (c: ThemeColors) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingBottom: 32, maxHeight: '85%',
  },
  title: { fontSize: 17, fontWeight: '700', color: c.textPrimary, textAlign: 'center', paddingHorizontal: 20, marginBottom: 4 },
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
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: c.accent, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  shareLabel: { fontSize: 14, fontWeight: '700', color: c.bgPrimary },
  copyBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: c.bgTertiary, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.accent,
  },
  copyLabel: { fontSize: 14, fontWeight: '700', color: c.accent },
  shareSheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, height: '62%',
  },
  sharePreview: {
    flex: 1, marginHorizontal: 20, marginBottom: 16,
    backgroundColor: c.bgCard, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  shareBtnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20 },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: c.bgTertiary,
    borderRadius: 10, padding: 3,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
  },
  tabActive: { backgroundColor: c.bgSecondary },
  tabLabel: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  tabLabelActive: { color: c.textPrimary },

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
  disabledText: { color: c.textMuted },
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
  goToWordsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 20, marginTop: 4,
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: c.accent,
  },
  goToWordsBtnLabel: { fontSize: 14, fontWeight: '700', color: c.bgPrimary },
  occBtn: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: c.accentDim,
  },
  occBtnLabel: { fontSize: 12, fontWeight: '600', color: c.accent },
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

