import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useChapterText } from '../context/PackContext'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { stripUsfm } from '../data/redLetter'
import { pendingNav } from '../navigation/pendingNav'
import {
  parallelsForVerse, formatRange, isGospel, CANON_LABELS, ROMAN, CARPIANUS,
  type EusebianSection,
} from '../data/eusebianCanons'

interface Props {
  selected: { book: string; chapter: number; verse: number } | null
  translation: string
  onGoTo: (book: string, chapter: number, verse: number) => void
}

type VerseText = { chapter: number; verse: number; text: string }

function canonLine(s: EusebianSection): string {
  if (s.canons.length === 0) return 'Outside the canon tables'
  return s.canons
    .map(c => `Canon ${ROMAN[c]} · ${c === 10 ? `Unique to ${s.gospel}` : CANON_LABELS[c]}`)
    .join('\n')
}

export default function ParallelsPanel({ selected, translation, onGoTo }: Props) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const navigation = useNavigation<any>()
  const loadChapter = useChapterText()
  const [texts, setTexts] = useState<Record<string, VerseText[] | null>>({})
  const [aboutOpen, setAboutOpen] = useState(false)

  const blocks = useMemo(
    () => selected ? parallelsForVerse(selected.book, selected.chapter, selected.verse) : [],
    [selected?.book, selected?.chapter, selected?.verse],
  )

  // Load the text of every parallel passage. The ESV is API-only and has no chapter
  // text here, so an empty result falls back to the KJV.
  useEffect(() => {
    let cancelled = false
    const sections = blocks.flatMap(b => b.parallels)
    if (sections.length === 0) { setTexts({}); return }
    setTexts({})
    const chapterCache = new Map<string, Promise<VerseText[]>>()
    const chapter = (book: string, ch: number) => {
      const key = `${book}|${ch}`
      if (!chapterCache.has(key)) {
        chapterCache.set(key, (async () => {
          let rows = await loadChapter(book, ch, translation).catch(() => [])
          if (rows.length === 0 && translation !== 'KJV') rows = await loadChapter(book, ch, 'KJV').catch(() => [])
          return rows.map(r => ({ chapter: ch, verse: r.verse, text: r.text }))
        })())
      }
      return chapterCache.get(key)!
    }
    for (const s of sections) {
      const key = `${s.gospel}|${s.section}`
      const chs: number[] = []
      for (let c = s.startCh; c <= s.endCh; c++) chs.push(c)
      Promise.all(chs.map(c => chapter(s.gospel, c))).then(all => {
        if (cancelled) return
        const verses = all.flat().filter(v =>
          v.chapter * 1000 + v.verse >= s.startCh * 1000 + s.startV &&
          v.chapter * 1000 + v.verse <= s.endCh * 1000 + s.endV)
        setTexts(prev => ({ ...prev, [key]: verses }))
      }).catch(() => { if (!cancelled) setTexts(prev => ({ ...prev, [key]: null })) })
    }
    return () => { cancelled = true }
  }, [blocks, translation, loadChapter])

  const sideBySide = (s: EusebianSection) => {
    if (!selected) return
    pendingNav.current = {
      book: selected.book, chapter: selected.chapter, verse: selected.verse,
      apocrypha: false, earlyText: false,
      split: { book: s.gospel, chapter: s.startCh, verse: s.startV },
    }
    try {
      navigation.navigate('Bible', { screen: 'Reader' })
    } catch {
      // Tablet split layout: Study lives in its own navigator and can't reach the Reader.
      pendingNav.current = null
    }
  }

  const empty = (icon: keyof typeof Ionicons.glyphMap, title: string, text: string) => (
    <View style={styles.center}>
      <Ionicons name={icon} size={52} color={colors.border} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )

  const about = (
    <View style={styles.card}>
      <TouchableOpacity style={styles.aboutHeader} onPress={() => setAboutOpen(o => !o)} activeOpacity={0.7}>
        <Text style={styles.aboutTitle}>About the Eusebian Canons</Text>
        <Ionicons name={aboutOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>
      {aboutOpen && (
        <>
          <Text style={styles.note}>
            In the 4th century Eusebius of Caesarea divided each Gospel into numbered sections and drew up
            ten tables listing which sections tell of the same things. Copied into the margins of Gospel
            manuscripts for over a thousand years, they were the Church's harmony of the Gospels. He explains
            the system in this letter:
          </Text>
          {CARPIANUS.map((p, i) => <Text key={i} style={styles.para}>{p}</Text>)}
          <Text style={styles.note}>
            Eusebius, Letter to Carpianus, tr. Mark DelCogliano (public domain). Section and table data: INTF,
            via the CrossWire Eusebian modules (public domain).
          </Text>
        </>
      )}
    </View>
  )

  if (!selected) return empty('book-outline', 'No verse selected', 'Tap a Gospel verse in the Bible tab to see its parallels')
  if (!isGospel(selected.book)) {
    return (
      <ScrollView contentContainerStyle={styles.list}>
        {empty('git-compare-outline', 'Gospels only', 'Gospel parallels cover Matthew, Mark, Luke and John.')}
        {about}
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {blocks.map(b => (
        <View key={`${b.gospel}${b.section}`} style={styles.block}>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>
              {b.gospel} §{b.section} · {formatRange(b)}
            </Text>
            <Text style={styles.headerSub}>{canonLine(b)}</Text>
            {b.canons.length === 0 && (
              <Text style={styles.note}>
                Mark 16:9–20, the longer ending, is numbered in modern editions but lies outside
                Eusebius' tables.
              </Text>
            )}
            {b.canons.length === 1 && b.canons[0] === 10 && (
              <Text style={styles.note}>Eusebius found no parallel to this section in the other Gospels.</Text>
            )}
          </View>

          {b.parallels.map(p => {
            const key = `${p.gospel}|${p.section}`
            const verses = texts[key]
            return (
              <View key={key} style={styles.card}>
                <Text style={styles.cardTitle}>{p.gospel} §{p.section} · {formatRange(p)}</Text>
                {verses === undefined ? (
                  <ActivityIndicator color={colors.accent} style={{ alignSelf: 'flex-start' }} />
                ) : verses === null || verses.length === 0 ? (
                  <Text style={styles.note}>Text unavailable offline</Text>
                ) : (
                  <Text style={styles.para}>
                    {verses.map(v => (
                      <Text key={`${v.chapter}:${v.verse}`}>
                        <Text style={styles.verseNum}>
                          {v.chapter !== p.startCh || p.startCh !== p.endCh ? `${v.chapter}:${v.verse}` : v.verse}{' '}
                        </Text>
                        {stripUsfm(v.text).replace(/¶\s*/g, '').replace(/[{}]/g, '')}{' '}
                      </Text>
                    ))}
                  </Text>
                )}
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.action} onPress={() => onGoTo(p.gospel, p.startCh, p.startV)} activeOpacity={0.7}>
                    <Ionicons name="arrow-forward" size={13} color={colors.accent} />
                    <Text style={styles.actionText}>Go to passage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.action} onPress={() => sideBySide(p)} activeOpacity={0.7}>
                    <Ionicons name="albums-outline" size={13} color={colors.accent} />
                    <Text style={styles.actionText}>Side by side</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          })}
        </View>
      ))}
      {about}
    </ScrollView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 48, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
  list: { padding: 12, paddingBottom: 40, gap: 10 },
  block: { gap: 10 },
  headerCard: {
    backgroundColor: c.accentDim, borderRadius: 12, padding: 14, gap: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: c.textAccent },
  headerSub: { fontSize: 13, fontWeight: '600', color: c.accent, lineHeight: 19 },
  card: {
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: c.textAccent },
  para: { fontSize: 15, lineHeight: 24, color: c.textPrimary },
  verseNum: { fontSize: 11, fontWeight: '700', color: c.accent },
  note: { fontSize: 12, color: c.textMuted, fontStyle: 'italic', lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 18 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 13, fontWeight: '600', color: c.accent },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aboutTitle: { fontSize: 15, fontWeight: '700', color: c.textAccent },
})
