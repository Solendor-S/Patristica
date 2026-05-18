import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import {
  getOverviewVerse, getOverviewChapter, getBiblehubChapter,
  getBiblesummaryChapter, getOverviewPericope, getBiblehubPassage,
} from '../db/queries'
import type {
  OverviewVerse, OverviewChapter, BiblehubChapter,
  BiblesummaryChapter, OverviewPericope, BiblehubPassage,
} from '../db/queries'
import type { SelectedVerse } from '../types'

type Scope = 'verse' | 'chapter' | 'context'

const HTML_ENTITIES: Record<string, string> = {
  '&ndash;': '–', '&mdash;': '—', '&lsquo;': '‘', '&rsquo;': '’',
  '&ldquo;': '“', '&rdquo;': '”', '&quot;': '"', '&apos;': "'",
  '&hellip;': '…', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
}
function decode(s: string): string {
  return s
    .replace(/&[a-z]+;/gi, e => HTML_ENTITIES[e] ?? e)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

const COLLAPSE_H = 180

function SourceSection({ name, children }: { name: string; children: React.ReactNode }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  return (
    <View style={s.sourceSection}>
      <View style={s.sourceLabelRow}>
        <View style={s.sourceLine} />
        <Text style={s.sourceLabel}>{name}</Text>
        <View style={s.sourceLine} />
      </View>
      <View style={!expanded && overflows ? { maxHeight: COLLAPSE_H, overflow: 'hidden' } : undefined}>
        <View
          onLayout={({ nativeEvent: { layout } }) => {
            if (!overflows && layout.height > COLLAPSE_H) setOverflows(true)
          }}
        >
          {children}
        </View>
      </View>
      {overflows && (
        <TouchableOpacity style={s.showMoreBtn} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
          <Text style={s.showMoreLabel}>{expanded ? 'Show less ↑' : 'Show more ↓'}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

interface Props {
  selected: SelectedVerse | null
}

export default function OverviewPanel({ selected }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const db = useSQLiteContext()
  const [scope, setScope] = useState<Scope>('verse')

  const [verseData,       setVerseData]       = useState<OverviewVerse | null>(null)
  const [chapterData,     setChapterData]      = useState<OverviewChapter | null>(null)
  const [biblehubData,    setBiblehubData]     = useState<BiblehubChapter | null>(null)
  const [biblesummary,    setBiblesummary]     = useState<BiblesummaryChapter | null>(null)
  const [pericope,        setPericope]         = useState<OverviewPericope | null>(null)
  const [passage,         setPassage]          = useState<BiblehubPassage | null>(null)
  const [loadingChapter,  setLoadingChapter]   = useState(false)
  const [loadingVerse,    setLoadingVerse]     = useState(false)

  useEffect(() => {
    if (!selected?.book || !selected?.chapter) return
    let ignore = false
    setLoadingChapter(true)
    setChapterData(null); setBiblehubData(null); setBiblesummary(null)
    const { book, chapter } = selected
    Promise.all([
      getOverviewChapter(db, book, chapter).catch(() => null),
      getBiblehubChapter(db, book, chapter).catch(() => null),
      getBiblesummaryChapter(db, book, chapter).catch(() => null),
    ]).then(([ch, bh, bs]) => {
      if (ignore) return
      setChapterData(ch); setBiblehubData(bh); setBiblesummary(bs)
      setLoadingChapter(false)
    })
    return () => { ignore = true }
  }, [selected?.book, selected?.chapter])

  useEffect(() => {
    if (!selected?.book || !selected?.chapter || !selected?.verse) {
      setVerseData(null); setPericope(null); setPassage(null)
      return
    }
    let ignore = false
    setLoadingVerse(true)
    setVerseData(null); setPericope(null); setPassage(null)
    const { book, chapter, verse } = selected
    Promise.all([
      getOverviewVerse(db, book, chapter, verse!).catch(() => null),
      getOverviewPericope(db, book, chapter, verse!).catch(() => null),
      getBiblehubPassage(db, book, chapter, verse!).catch(() => null),
    ]).then(([v, p, bp]) => {
      if (ignore) return
      setVerseData(v); setPericope(p); setPassage(bp)
      setLoadingVerse(false)
    })
    return () => { ignore = true }
  }, [selected?.book, selected?.chapter, selected?.verse])

  if (!selected?.book) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>Select a verse to see overview.</Text>
      </View>
    )
  }

  const loading = scope === 'chapter' ? loadingChapter : loadingVerse
  const themes: string[] = useMemo(() => {
    if (!chapterData?.themes) return []
    try { return JSON.parse(chapterData.themes) } catch { return [] }
  }, [chapterData?.themes])
  const verseRef = `${selected.book} ${selected.chapter}${selected.verse ? `:${selected.verse}` : ''}`

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Scope selector */}
      <View style={s.scopeRow}>
        {(['verse', 'chapter', 'context'] as Scope[]).map(sc => (
          <TouchableOpacity
            key={sc}
            style={[s.scopeBtn, scope === sc && s.scopeBtnActive]}
            onPress={() => setScope(sc)}
            activeOpacity={0.7}
          >
            <Text style={[s.scopeLabel, scope === sc && s.scopeLabelActive]}>
              {sc.charAt(0).toUpperCase() + sc.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={s.loadingRow}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      )}

      {/* Verse scope */}
      {!loading && scope === 'verse' && (
        <>
          <Text style={s.heading}>{verseRef}</Text>
          <SourceSection name="bibleref">
            {verseData?.note
              ? <Text style={s.bodyText}>{decode(verseData.note)}</Text>
              : <Text style={s.emptyText}>{selected.verse ? 'No overview available for this verse.' : 'Select a verse.'}</Text>
            }
          </SourceSection>
        </>
      )}

      {/* Chapter scope */}
      {!loading && scope === 'chapter' && (
        <>
          <Text style={s.heading}>{selected.book} {selected.chapter}</Text>
          {themes.length > 0 && (
            <View style={s.themeRow}>
              {themes.map(t => (
                <View key={t} style={s.themeChip}>
                  <Text style={s.themeChipText}>{t}</Text>
                </View>
              ))}
            </View>
          )}
          <SourceSection name="bibleref">
            {chapterData?.summary
              ? <Text style={s.bodyText}>{decode(chapterData.summary)}</Text>
              : <Text style={s.emptyText}>No chapter summary available.</Text>
            }
          </SourceSection>
          {!!biblehubData?.essay && (
            <SourceSection name="biblehub">
              {biblehubData.essay.split('\n\n').map((para, i) => (
                <Text key={i} style={s.bodyText}>{decode(para)}</Text>
              ))}
            </SourceSection>
          )}
          {!!biblesummary?.summary && (
            <SourceSection name="biblesummary">
              <Text style={[s.bodyText, s.tagline]}>{decode(biblesummary.summary)}</Text>
            </SourceSection>
          )}
        </>
      )}

      {/* Context scope */}
      {!loading && scope === 'context' && (
        <>
          <SourceSection name="bibleref">
            {pericope ? (
              <>
                <Text style={s.pericopeTitle}>
                  {decode(pericope.title || `${selected.book} ${selected.chapter}:${pericope.verse_start}–${pericope.verse_end}`)}
                </Text>
                <Text style={s.pericopeRange}>
                  {selected.book} {selected.chapter}:{pericope.verse_start}–{pericope.verse_end}
                </Text>
                {!!pericope.description && (
                  <Text style={s.bodyText}>{decode(pericope.description)}</Text>
                )}
              </>
            ) : (
              <Text style={s.emptyText}>
                {selected.verse ? 'No passage grouping found for this verse.' : 'Select a verse.'}
              </Text>
            )}
          </SourceSection>
          {!!passage && (
            <SourceSection name="biblehub">
              <Text style={s.pericopeTitle}>{decode(passage.heading)}</Text>
              <Text style={s.pericopeRange}>
                {selected.book} {selected.chapter}:{passage.verse_start}–{passage.verse_end}
              </Text>
              {!!passage.text && (
                <Text style={s.bodyText}>{decode(passage.text)}</Text>
              )}
            </SourceSection>
          )}
        </>
      )}
    </ScrollView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: c.bgPrimary },
  content:      { padding: 16, gap: 12, paddingBottom: 32 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText:    { color: c.textMuted, fontSize: 14, textAlign: 'center' },
  loadingRow:   { alignItems: 'center', paddingVertical: 24 },

  scopeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  scopeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgCard,
  },
  scopeBtnActive: {
    backgroundColor: c.accentDim,
    borderColor: c.accent,
  },
  scopeLabel:       { color: c.textMuted, fontSize: 13, fontWeight: '500' },
  scopeLabelActive: { color: c.accent },

  heading: {
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },

  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  themeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: c.accentDim,
    borderWidth: 1,
    borderColor: c.accent + '44',
  },
  themeChipText: { color: c.accent, fontSize: 12, fontWeight: '500' },

  sourceSection: { gap: 10 },
  sourceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sourceLine:  { flex: 1, height: 1, backgroundColor: c.border },
  sourceLabel: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  showMoreBtn:   { alignSelf: 'flex-start', marginTop: 4 },
  showMoreLabel: { color: c.accent, fontSize: 13 },

  bodyText: {
    color: c.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 6,
  },
  tagline: {
    fontStyle: 'italic',
  },

  pericopeTitle: {
    color: c.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  pericopeRange: {
    color: c.accent,
    fontSize: 12,
    marginBottom: 6,
  },
})
