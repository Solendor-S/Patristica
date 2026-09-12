import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAquinas } from '../context/PackContext'
import type { AquinasIndex, AquinasArticle, AquinasWork } from '../lib/PackManager'
import EntryCard from '../components/EntryCard'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { CommentaryEntry } from '../types'

type Mode = 'verse' | 'browse'
const GOSPELS = new Set(['Matthew', 'Mark', 'Luke', 'John'])
const WORKS: Array<{ key: AquinasWork; name: string; sub: string }> = [
  { key: 'summa', name: 'Summa Theologica', sub: 'Part → Question → Article · 1920 Dominican translation' },
  { key: 'scg',   name: 'Summa Contra Gentiles', sub: 'Book → Chapter · Rickaby 1905 (abridged)' },
]
const PART_LABEL: Record<string, string> = {
  'I': 'First Part (Prima Pars)', 'I-II': 'First Part of the Second Part', 'II-II': 'Second Part of the Second Part',
  'III': 'Third Part', 'Suppl.': 'Supplement', 'Appendix': 'Appendix',
  '1': 'Book I — God', '2': 'Book II — Creation', '3': 'Book III — Providence', '4': 'Book IV — Salvation',
}

const PART_ORDER = ['I', 'I-II', 'II-II', 'III', 'Suppl.', 'Appendix', '1', '2', '3', '4']

interface Props { selected: { book: string; chapter: number; verse: number } | null }

export default function AquinasPanel({ selected }: Props) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { loadVerse, loadIndex, loadQuestion } = useAquinas()
  const [mode, setMode] = useState<Mode>('verse')

  // ── verse mode ──
  const [entries, setEntries] = useState<CommentaryEntry[]>([])
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(false)
  const isGospel = !!selected && GOSPELS.has(selected.book)

  useEffect(() => {
    if (!selected || !isGospel) { setEntries([]); return }
    let cancelled = false
    setLoading(true)
    loadVerse(selected.book, selected.chapter, selected.verse).then(r => {
      if (cancelled) return
      setEntries(r.entries); setOffline(r.offline); setLoading(false)
    })
    return () => { cancelled = true }
  }, [selected?.book, selected?.chapter, selected?.verse, isGospel, loadVerse])

  // ── browse mode ──
  const [index, setIndex] = useState<AquinasIndex | null | undefined>(undefined)
  const [work, setWork] = useState<AquinasWork | null>(null)
  const [part, setPart] = useState<string | null>(null)
  const [question, setQuestion] = useState<number | null>(null)
  const [articles, setArticles] = useState<AquinasArticle[] | null | undefined>(undefined)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (mode !== 'browse' || index !== undefined) return
    loadIndex().then(setIndex)
  }, [mode, index, loadIndex])

  useEffect(() => {
    if (!work || !part || question === null) { setArticles(undefined); return }
    let cancelled = false
    setArticles(undefined)
    loadQuestion(work, part, question).then(a => { if (!cancelled) setArticles(a) })
    return () => { cancelled = true }
  }, [work, part, question, loadQuestion])

  const back = () => {
    if (question !== null) setQuestion(null)
    else if (part) { setPart(null); setFilter('') }
    else setWork(null)
  }

  const modeToggle = (
    <View style={styles.modeToggle}>
      {(['verse', 'browse'] as Mode[]).map(m => (
        <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
          onPress={() => setMode(m)} activeOpacity={0.7}>
          <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
            {m === 'verse' ? 'This Verse' : 'Browse Works'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const empty = (icon: keyof typeof Ionicons.glyphMap, title: string, text: string) => (
    <View style={styles.center}>
      <Ionicons name={icon} size={52} color={colors.border} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )

  // ── verse mode render ──
  if (mode === 'verse') {
    const ref = selected ? `${selected.book} ${selected.chapter}:${selected.verse}` : ''
    return (
      <View style={{ flex: 1 }}>
        {modeToggle}
        {!selected ? empty('book-outline', 'No verse selected', 'Tap a verse in the Bible tab to see the Catena Aurea')
        : !isGospel ? empty('link-outline', 'Gospels only', `Aquinas' Catena Aurea covers Matthew, Mark, Luke and John. Browse the Summa for ${selected.book} themes.`)
        : loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
        : entries.length === 0 ? (
          offline
            ? empty('cloud-offline-outline', 'Catena unavailable offline', `Reconnect to read the Catena Aurea for ${ref}, or install the Aquinas pack from Library → Downloads.`)
            : empty('chatbubble-ellipses-outline', 'No Catena entry', `Nothing recorded for ${ref}`)
        ) : (
          <FlatList
            data={entries}
            keyExtractor={e => e.id.toString()}
            ListHeaderComponent={
              <Text style={styles.note}>
                Catena Aurea — the Fathers on {ref}, as compiled by Thomas Aquinas ({entries.length})
              </Text>
            }
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <EntryCard entry={item} book={selected.book} chapter={selected.chapter} verse={selected.verse} />
            )}
          />
        )}
      </View>
    )
  }

  // ── browse mode render ──
  const crumb = work && (
    <View style={styles.crumb}>
      <TouchableOpacity onPress={back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={20} color={colors.accent} />
      </TouchableOpacity>
      <Text style={styles.crumbText} numberOfLines={1}>
        {WORKS.find(w => w.key === work)!.name}
        {part ? ` › ${work === 'scg' ? 'Book ' + part : part}` : ''}
        {question !== null ? ` › ${work === 'scg' ? 'Ch.' : 'Q.'} ${question}` : ''}
      </Text>
    </View>
  )

  let body: React.ReactNode
  if (index === undefined) {
    body = <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
  } else if (index === null) {
    body = empty('cloud-offline-outline', 'Unavailable offline', 'Reconnect to browse, or install the Aquinas pack from Library → Downloads.')
  } else if (!work) {
    body = (
      <View style={styles.list}>
        {WORKS.map(w => (
          <TouchableOpacity key={w.key} style={styles.row} onPress={() => setWork(w.key)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{w.name}</Text>
              <Text style={styles.rowSub}>{w.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    )
  } else if (!part) {
    const parts = Object.keys(index[work]).sort((a, b) => PART_ORDER.indexOf(a) - PART_ORDER.indexOf(b))
    body = (
      <View style={styles.list}>
        {parts.map(p => (
          <TouchableOpacity key={p} style={styles.row} onPress={() => setPart(p)} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{PART_LABEL[p] ?? p}</Text>
              <Text style={styles.rowSub}>{index[work][p].length} {work === 'scg' ? 'chapters' : 'questions'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    )
  } else if (question === null) {
    const qs = index[work][part] ?? []
    const f = filter.trim().toLowerCase()
    const shown = f
      ? qs.filter(q => q.t.toLowerCase().includes(f) || !!q.a?.some(a => a.t.toLowerCase().includes(f)))
      : qs
    body = (
      <FlatList
        data={shown}
        keyExtractor={q => String(q.q)}
        ListHeaderComponent={
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={work === 'scg' ? 'Filter chapters…' : 'Filter questions and articles…'}
              placeholderTextColor={colors.textMuted}
              value={filter} onChangeText={setFilter} autoCorrect={false}
            />
            {!!filter && (
              <TouchableOpacity onPress={() => setFilter('')}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={empty('search-outline', 'No matches', `Nothing matches “${filter}”`)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => setQuestion(item.q)} activeOpacity={0.7}>
            <Text style={styles.rowNum}>{item.q}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.t}</Text>
              {!!item.a?.length && (
                <Text style={styles.rowSub}>{item.a.length} article{item.a.length === 1 ? '' : 's'}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    )
  } else if (articles === undefined) {
    body = <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
  } else if (articles === null) {
    body = empty('cloud-offline-outline', 'Unavailable offline', 'Reconnect to read this section.')
  } else {
    body = <ArticleList articles={articles} isScg={work === 'scg'} styles={styles} />
  }

  return (
    <View style={{ flex: 1 }}>
      {modeToggle}
      {crumb}
      {body}
    </View>
  )
}

/** Question prologue + articles; each article collapses to its title. */
function ArticleList({ articles, isScg, styles }: {
  articles: AquinasArticle[]; isScg: boolean; styles: ReturnType<typeof makeStyles>
}) {
  const { colors } = useTheme()
  const [open, setOpen] = useState<number | null>(isScg || articles.length === 1 ? articles[0]?.a ?? null : null)
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {articles.map(art => {
        const isOpen = open === art.a || art.a === 0
        return (
          <View key={art.a} style={styles.card}>
            <TouchableOpacity
              disabled={art.a === 0}
              onPress={() => setOpen(isOpen ? null : art.a)}
              activeOpacity={0.7}
              style={styles.cardHeader}
            >
              <Text style={styles.cardTitle}>
                {art.a > 0 && !isScg ? `Art. ${art.a} — ` : ''}{art.t}
              </Text>
              {art.a > 0 && (
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.accent} />
              )}
            </TouchableOpacity>
            {isOpen && art.x.split('\n\n').map((p, i) => (
              <Text key={i} style={styles.para}>{p}</Text>
            ))}
          </View>
        )
      })}
    </ScrollView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: c.textSecondary, textAlign: 'center' },
  emptyText:  { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
  list: { padding: 12, paddingBottom: 40, gap: 10 },
  note: { fontSize: 11, color: c.textMuted, fontStyle: 'italic', paddingHorizontal: 2 },

  modeToggle: {
    flexDirection: 'row', gap: 6,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1.5, borderColor: c.border },
  modeBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  modeBtnTextActive: { color: '#fff' },

  crumb: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  crumbText: { flex: 1, fontSize: 13, fontWeight: '600', color: c.textSecondary },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  rowNum: { fontSize: 13, fontWeight: '700', color: c.accent, minWidth: 28 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: c.textAccent },
  rowSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.bgCard, borderRadius: 10, paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: c.textPrimary, paddingVertical: 10 },

  card: {
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: c.textAccent, lineHeight: 21 },
  para: { fontSize: 15, lineHeight: 24, color: c.textPrimary },
})
