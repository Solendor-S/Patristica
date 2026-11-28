import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSQLiteContext } from 'expo-sqlite'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { useUserDb } from '../db/UserDbProvider'
import { getVariantsForVerse, getJosephusForVerse, getNote } from '../db/queries'
import type { EarlyTextCitation } from '../db/queries'
import { parallelsForVerse } from '../data/eusebianCanons'
import { DOCTRINE_ENTRIES } from '../data/doctrineEntries'
import { TRADITION_COLORS } from '../data/traditionColors'
import { stripUsfm } from '../data/redLetter'
import { usePeople, type EntitySummary } from '../lib/people'
import { flashpointsForVerse, FlashpointSheet } from './SyntaxPanel'
import type { Flashpoint } from '../data/syntaxFlashpoints'
import type { CommentaryEntry, CrossRef, SelectedVerse } from '../types'
import type { StudyTab } from './StudyScreen'

interface Props {
  selected: SelectedVerse | null
  /** KJV-numbered verse (what commentary / cross-refs are keyed on) */
  studyVerse: number
  entries: CommentaryEntry[]
  consensus: Record<string, number>
  crossRefs: CrossRef[]
  earlyCitations: EarlyTextCitation[]
  onOpenTab: (tab: StudyTab) => void
  onOpenPerson: (id: number) => void
  onGoToRef: (r: CrossRef) => void
}

// Doctrine passages keyed by the verse they expound ("Book C:V"), built once.
const DOCTRINE_BY_VERSE = new Map<string, (typeof DOCTRINE_ENTRIES)[string]>()
for (const e of Object.values(DOCTRINE_ENTRIES).flat()) {
  if (e.verse) DOCTRINE_BY_VERSE.set(e.verse, [...(DOCTRINE_BY_VERSE.get(e.verse) ?? []), e])
}

/** Everything the app knows about the selected verse, one card per source. */
export default function GuidePanel({ selected, studyVerse, entries, consensus, crossRefs, earlyCitations, onOpenTab, onOpenPerson, onGoToRef }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const db = useSQLiteContext()
  const userDb = useUserDb()
  const people = usePeople()
  const [variants, setVariants] = useState(0)
  const [josephus, setJosephus] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const [named, setNamed] = useState<EntitySummary[]>([])
  const [fp, setFp] = useState<Flashpoint | null>(null)

  useEffect(() => {
    if (!selected) return
    let off = false
    const { book, chapter } = selected
    Promise.all([
      getVariantsForVerse(db, book, chapter, studyVerse).then(r => r.length).catch(() => 0),
      getJosephusForVerse(db, book, chapter, studyVerse).then(r => r.length).catch(() => 0),
      getNote(userDb, book, chapter, selected.verse ?? 0).then(n => n?.text ?? null).catch(() => null),
      people.forVerse(book, chapter, studyVerse).catch(() => []),
    ]).then(([v, j, n, p]) => {
      if (off) return
      setVariants(v); setJosephus(j); setNote(n); setNamed(p)
    })
    return () => { off = true }
  }, [selected, studyVerse, db, userDb, people.forVerse]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!selected) {
    return (
      <View style={s.center}>
        <Ionicons name="compass-outline" size={52} color={colors.border} />
        <Text style={s.emptyTitle}>No verse selected</Text>
        <Text style={s.muted}>Tap a verse in the Bible tab for a summary of everything on it</Text>
      </View>
    )
  }

  const ref = `${selected.book} ${selected.chapter}:${studyVerse}`
  const parallels = parallelsForVerse(selected.book, selected.chapter, studyVerse)
  const parallelCount = parallels.reduce((n, p) => n + p.parallels.length, 0)
  const flashpoints = flashpointsForVerse(selected.book, selected.chapter, studyVerse)
  const doctrine = DOCTRINE_BY_VERSE.get(ref) ?? []
  const total = Object.values(consensus).reduce((a, b) => a + b, 0)

  const card = (icon: keyof typeof Ionicons.glyphMap, title: string, count: number | string, tab: StudyTab | null, body?: React.ReactNode) => (
    <View style={s.card}>
      <TouchableOpacity style={s.cardHead} disabled={!tab} onPress={() => tab && onOpenTab(tab)} activeOpacity={0.7}>
        <Ionicons name={icon} size={18} color={colors.accent} />
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={s.count}>{count}</Text>
        {!!tab && <Text style={s.seeAll}>See all ›</Text>}
      </TouchableOpacity>
      {body}
    </View>
  )

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
      <Text style={s.heading}>{selected.book} {selected.chapter}:{selected.verse}</Text>

      {!!flashpoints.length && flashpoints.map(f => (
        <TouchableOpacity key={f.id} style={s.fp} onPress={() => setFp(f)} activeOpacity={0.8}>
          <Ionicons name="git-branch-outline" size={16} color={colors.bgPrimary} />
          <Text style={s.fpText} numberOfLines={2}>Disputed construction: {f.title}</Text>
        </TouchableOpacity>
      ))}

      {!!entries.length && card('people-outline', 'Church Fathers', entries.length, 'fathers', (
        <View>
          {total > 0 && (
            <View style={s.bar}>
              {Object.entries(consensus).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <View key={t} style={{ flex: n, backgroundColor: TRADITION_COLORS[t] ?? colors.textMuted }} />
              ))}
            </View>
          )}
          {entries.slice(0, 2).map(e => (
            <View key={e.id} style={s.item}>
              <Text style={s.itemHead}>{e.father_name}</Text>
              <Text style={s.itemText} numberOfLines={3}>{e.excerpt}</Text>
            </View>
          ))}
        </View>
      ))}

      {!!crossRefs.length && card('git-network-outline', 'Cross-references', crossRefs.length, 'crossrefs', (
        <View>
          {crossRefs.slice(0, 5).map(r => (
            <TouchableOpacity key={`${r.ref_book}${r.ref_chapter}:${r.ref_verse}`} style={s.item} onPress={() => onGoToRef(r)}>
              <Text style={s.itemHead}>{r.ref_book} {r.ref_chapter}:{r.ref_verse}</Text>
              {!!r.text && <Text style={s.itemText} numberOfLines={2}>{stripUsfm(r.text)}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {parallelCount > 0 && card('copy-outline', 'Gospel parallels', parallelCount, 'parallels', (
        <Text style={s.itemText}>{parallels.flatMap(p => p.parallels.map(q => `${q.gospel} ${q.startCh}:${q.startV}`)).slice(0, 6).join(' · ')}</Text>
      ))}

      {!!named.length && card('person-outline', 'People & places', named.length, 'people', (
        <View style={s.chips}>
          {named.map(e => (
            <TouchableOpacity key={e.id} style={s.chip} onPress={() => onOpenPerson(e.id)}>
              <Text style={s.chipText}>{e.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {card('text-outline', 'Original language', 'Words · Clause', 'words', (
        <TouchableOpacity onPress={() => onOpenTab('syntax')}><Text style={s.link}>Open the sentence structure (Clause view) ›</Text></TouchableOpacity>
      ))}

      {!!doctrine.length && card('school-outline', 'Doctrine', doctrine.length, 'doctrine', (
        doctrine.slice(0, 2).map((d, i) => (
          <View key={i} style={s.item}>
            <Text style={s.itemHead}>{d.father} · {d.work}</Text>
            <Text style={s.itemText} numberOfLines={3}>{d.quote}</Text>
          </View>
        ))
      ))}

      {variants > 0 && card('document-text-outline', 'Textual variants', variants, 'historical')}
      {josephus > 0 && card('library-outline', 'Josephus & historical sources', josephus, 'historical')}
      {!!earlyCitations.length && card('book-outline', 'Cited by early Christian texts', earlyCitations.length, 'crossrefs')}
      {!!note && card('create-outline', 'Your note', '', null, <Text style={s.itemText}>{note}</Text>)}

      <FlashpointSheet fp={fp} onClose={() => setFp(null)} />
    </ScrollView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '600' },
  muted: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
  heading: { color: c.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 10, marginLeft: 4 },
  fp: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: c.accent, marginBottom: 10 },
  fpText: { flex: 1, color: c.bgPrimary, fontWeight: '700', fontSize: 13 },
  card: { marginBottom: 10, padding: 12, borderRadius: 12, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, color: c.textPrimary, fontSize: 15, fontWeight: '700' },
  count: { color: c.textMuted, fontSize: 13 },
  seeAll: { color: c.accent, fontSize: 13, fontWeight: '600', marginLeft: 6 },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
  item: { marginTop: 10 },
  itemHead: { color: c.textAccent, fontSize: 13, fontWeight: '700' },
  itemText: { color: c.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: c.bgTertiary, borderWidth: 1, borderColor: c.border },
  chipText: { color: c.textPrimary, fontSize: 13 },
  link: { color: c.accent, fontSize: 14, marginTop: 8 },
})
