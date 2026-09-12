import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { getFatherInfo } from '../data/fatherDates'
import { TRADITION_COLORS } from '../data/traditionColors'
import { getSourceUrl, getEarlyTextBook } from '../data/sourceLinks'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { CommentaryEntry, RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Study'>

// ── Entry card ────────────────────────────────────────────

// Citation display text inside commentary paragraphs sometimes names the book
// differently from our canonical name
const REF_BOOK_VARIANTS: Record<string, string[]> = {
  'Psalms': ['Psalms', 'Psalm'],
  'Wisdom of Solomon': ['Wisdom of Solomon', 'Wisdom'],
  'Song of Solomon': ['Song of Solomon', 'Song of Songs', 'Songs'],
}

function refCoversVerse(versePart: string, verse?: number): boolean {
  if (!verse) return true // chapter-level entry — any verse of the chapter counts
  return versePart.split(',').some(part => {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/)
    if (!m) return false
    const a = parseInt(m[1], 10)
    const b = m[2] ? parseInt(m[2], 10) : a
    return verse >= a && verse <= b
  })
}

/** Split text into nodes, underlining scripture refs that match the current verse. */
function highlightVerseRefs(
  text: string, book: string, chapter: number | undefined,
  verse: number | undefined, style: object,
): React.ReactNode {
  const names = REF_BOOK_VARIANTS[book] ?? [book]
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const re = new RegExp(`(?:${escaped})\\s+(\\d+):(\\d+(?:-\\d+)?(?:,\\s*\\d+(?:-\\d+)?)*)`, 'g')
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if ((!chapter || parseInt(m[1], 10) === chapter) && refCoversVerse(m[2], verse)) {
      parts.push(text.slice(last, m.index))
      parts.push(<Text key={m.index} style={style}>{m[0]}</Text>)
      last = m.index + m[0].length
    }
  }
  if (!parts.length) return text
  parts.push(text.slice(last))
  return parts
}

export default function EntryCard({ entry, book, chapter, verse, verseRef }: {
  entry: CommentaryEntry; book: string; chapter?: number; verse?: number; verseRef?: string
}) {
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
  const displayBody = useMemo(
    () => expanded ? highlightVerseRefs(body, book, chapter, verse, styles.refHighlight) : body,
    [expanded, body, book, chapter, verse, styles.refHighlight],
  )
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

  const traditionColor = TRADITION_COLORS[info?.tradition ?? ''] ?? '#94a3b8'

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.fatherInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.consensusDot, { backgroundColor: traditionColor }]} />
            <Text style={styles.fatherName}>{entry.father_name}</Text>
          </View>
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
      <Text style={styles.cardText}>{displayBody}</Text>

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


const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
  consensusDot: { width: 8, height: 8, borderRadius: 4 },
  readFullBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.accent,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    flexShrink: 0,
  },
  readFullLabel: { fontSize: 11, fontWeight: '600', color: c.accent },
  cardText: { fontSize: 15, lineHeight: 24, color: c.textPrimary },
  refHighlight: { textDecorationLine: 'underline', color: c.accent, fontWeight: '600' },
  source:   { fontSize: 12, color: c.textMuted, marginTop: 8, fontStyle: 'italic' },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, alignSelf: 'flex-start',
  },
  expandLabel: { fontSize: 13, color: c.accent, fontWeight: '600' },
  browseVerseRef: {
    fontSize: 11, fontWeight: '700', color: c.accent,
    marginBottom: 2,
  },
})
