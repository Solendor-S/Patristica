import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { useWordFocus } from '../context/WordFocusContext'
import { useCommentaryDbs } from '../context/PackContext'
import { searchCommentary, normalizeStrongsNumber } from '../db/queries'
import type { CommentaryEntryWithRef } from '../db/queries'
import { usePeople, type EntityProfile, type EntitySummary } from '../lib/people'
import { useVersePreview } from '../components/VersePreview'
import { BOOKS, APOCRYPHA_BOOKS } from '../data/books'
import type { SelectedVerse } from '../types'

export interface MapPin { id: number; name: string; lat: number; lng: number; brief?: string }

interface Props {
  selected: SelectedVerse | null       // KJV-numbered verse
  onShowOnMap: (pins: MapPin[]) => void
  /** Open a profile directly (e.g. from the reader's Strong's popup or the Guide). */
  openId?: number | null
}

const KIND_ICON = { person: 'person-outline', place: 'location-outline', other: 'pricetag-outline' } as const
const REL_LABEL: Record<string, string> = {
  father: 'Father', mother: 'Mother', spouse: 'Spouse', sibling: 'Siblings', child: 'Children',
  ancestor: 'Ancestors', descendant: 'Descendants', relative: 'Kinsmen ("brethren of the Lord")',
}
const BOOK_ORDER = new Map([...BOOKS, ...APOCRYPHA_BOOKS].map((b, i) => [b.name, i]))

export default function PeoplePanel({ selected, onShowOnMap, openId }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const people = usePeople()
  const { setWordFocus } = useWordFocus()
  const { fathers } = useCommentaryDbs()
  const [preview, openPreview] = useVersePreview()

  const [inVerse, setInVerse] = useState<EntitySummary[]>([])
  const [all, setAll] = useState<EntitySummary[] | null>(null)
  const [query, setQuery] = useState('')
  const [stack, setStack] = useState<number[]>([])
  const [profile, setProfile] = useState<EntityProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [fatherHits, setFatherHits] = useState<CommentaryEntryWithRef[]>([])
  const [expandedBook, setExpandedBook] = useState<string | null>(null)

  useEffect(() => { if (openId) setStack([openId]) }, [openId])

  useEffect(() => {
    if (!selected) { setInVerse([]); return }
    let off = false
    people.forVerse(selected.book, selected.chapter, selected.verse ?? 0).then(r => { if (!off) setInVerse(r) }).catch(() => {})
    return () => { off = true }
  }, [selected, people.forVerse]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (query.length < 2 && selected) return
    if (all) return
    people.index().then(setAll).catch(() => setAll([]))
  }, [query, selected, all, people.index]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = stack[stack.length - 1]
  useEffect(() => {
    if (current == null) { setProfile(null); return }
    let off = false
    setLoading(true)
    setFatherHits([])
    setExpandedBook(null)
    people.profile(current).then(p => {
      if (off) return
      setProfile(p)
      setLoading(false)
      if (p && p.kind !== 'other' && fathers) {
        searchCommentary(fathers, p.name).then(h => { if (!off) setFatherHits(h.slice(0, 5)) }).catch(() => {})
      }
    }).catch(() => { if (!off) setLoading(false) })
    return () => { off = true }
  }, [current, fathers, people.profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = (id: number) => setStack(st => [...st, id])
  const back = () => setStack(st => st.slice(0, -1))

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!all) return []
    if (q.length < 2) return all
    return all.filter(e => e.name.toLowerCase().startsWith(q)).concat(
      all.filter(e => !e.name.toLowerCase().startsWith(q) && e.name.toLowerCase().includes(q)))
  }, [all, query])

  const row = (e: EntitySummary) => (
    <TouchableOpacity key={e.id} style={s.row} onPress={() => open(e.id)} activeOpacity={0.7}>
      <Ionicons name={KIND_ICON[e.kind]} size={18} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowName}>{e.name}</Text>
        {!!e.brief && <Text style={s.rowBrief} numberOfLines={2}>{e.brief}</Text>}
      </View>
      {!!e.refCount && <Text style={s.rowCount}>{e.refCount}</Text>}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  )

  // ── Profile ──
  if (current != null) {
    if (loading || !profile) {
      return (
        <View style={s.center}>
          {loading ? <ActivityIndicator color={colors.accent} /> : <Text style={s.muted}>Couldn't load this profile (offline?)</Text>}
          {!loading && <TouchableOpacity onPress={back}><Text style={s.link}>Back</Text></TouchableOpacity>}
        </View>
      )
    }
    const p = profile
    const rels = Object.entries(p.rel.reduce<Record<string, { id: number; name: string }[]>>((acc, r) => {
      ;(acc[r.rel] ??= []).push(r)
      return acc
    }, {})).sort((a, b) => Object.keys(REL_LABEL).indexOf(a[0]) - Object.keys(REL_LABEL).indexOf(b[0]))
    const byBook = Object.entries(p.refs.reduce<Record<string, [number, number][]>>((acc, [b, c, v]) => {
      ;(acc[b] ??= []).push([c, v])
      return acc
    }, {})).sort((a, b) => (BOOK_ORDER.get(a[0]) ?? 999) - (BOOK_ORDER.get(b[0]) ?? 999))
    const strongs = [...new Set(p.names.map(([, st]) => st).filter(Boolean))]
    const otherNames = [...new Set(p.names.map(([f]) => f))].filter(f => f !== p.name)
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.profile}>
          <TouchableOpacity style={s.backRow} onPress={back} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={18} color={colors.accent} />
            <Text style={s.link}>Back</Text>
          </TouchableOpacity>
          <View style={s.titleRow}>
            <Ionicons name={KIND_ICON[p.kind]} size={22} color={colors.accent} />
            <Text style={s.title}>{p.name}</Text>
          </View>
          {!!otherNames.length && <Text style={s.aka}>Also: {otherNames.join(', ')}</Text>}
          {!!p.brief && <Text style={s.brief}>{p.brief}</Text>}
          {!!p.short && <Text style={s.body}>{p.short}</Text>}

          {!!strongs.length && (
            <View style={s.chips}>
              {strongs.map(st => (
                <TouchableOpacity key={st} style={s.chip} onPress={() => setWordFocus(normalizeStrongsNumber(st))} activeOpacity={0.7}>
                  <Text style={s.chipText}>{st}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {p.lat != null && p.lng != null && (
            <TouchableOpacity style={s.mapBtn} activeOpacity={0.7}
              onPress={() => onShowOnMap([{ id: p.id, name: p.name, lat: p.lat!, lng: p.lng!, brief: p.brief }])}>
              <Ionicons name="map-outline" size={16} color={colors.bgPrimary} />
              <Text style={s.mapBtnText}>Show on map</Text>
            </TouchableOpacity>
          )}

          {rels.map(([rel, list]) => (
            <View key={rel} style={s.section}>
              <Text style={s.sectionTitle}>{REL_LABEL[rel] ?? rel}</Text>
              <View style={s.chips}>
                {list.map(r => (
                  <TouchableOpacity key={`${rel}-${r.id}`} style={s.chip} onPress={() => open(r.id)} activeOpacity={0.7}>
                    <Text style={s.chipText}>{r.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <View style={s.section}>
            <Text style={s.sectionTitle}>References ({p.refs.length})</Text>
            {byBook.map(([book, refs]) => {
              const showAll = expandedBook === book || refs.length <= 24
              return (
                <View key={book} style={s.bookBlock}>
                  <Text style={s.bookName}>{book} · {refs.length}</Text>
                  <View style={s.chips}>
                    {(showAll ? refs : refs.slice(0, 24)).map(([c, v]) => (
                      <TouchableOpacity key={`${c}:${v}`} style={s.refChip} onPress={() => openPreview({ book, chapter: c, verse: v })}>
                        <Text style={s.refText}>{c}:{v}</Text>
                      </TouchableOpacity>
                    ))}
                    {!showAll && (
                      <TouchableOpacity style={s.refChip} onPress={() => setExpandedBook(book)}>
                        <Text style={[s.refText, { color: colors.accent }]}>+{refs.length - 24} more</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )
            })}
          </View>

          {!!fatherHits.length && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>The Fathers on {p.name}</Text>
              {fatherHits.map(h => (
                <TouchableOpacity key={h.id} style={s.quote} onPress={() => openPreview({ book: h.book, chapter: h.chapter, verse: h.verse })}>
                  <Text style={s.quoteFather}>{h.father_name} · {h.book} {h.chapter}:{h.verse}</Text>
                  <Text style={s.quoteText} numberOfLines={4}>{h.excerpt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={s.credit}>Names and references: STEPBible TIPNR (CC BY 4.0) · coordinates: OpenBible.info (CC BY 4.0)</Text>
        </ScrollView>
        {preview}
      </View>
    )
  }

  // ── List ──
  const showVerse = selected && query.length < 2
  return (
    <View style={{ flex: 1 }}>
      <View style={s.searchBar}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search people and places…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={16} color={colors.textMuted} /></TouchableOpacity>
        )}
      </View>
      {showVerse ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={s.headerRow}>
            <Text style={s.sectionTitle}>In {selected!.book} {selected!.chapter}:{selected!.verse}</Text>
            {inVerse.some(e => e.kind === 'place') && (
              <TouchableOpacity onPress={() => {
                people.forChapter(selected!.book, selected!.chapter).then(async list => {
                  const pins: MapPin[] = []
                  for (const e of list.filter(x => x.kind === 'place').slice(0, 40)) {
                    const pr = await people.profile(e.id)
                    if (pr?.lat != null && pr.lng != null) pins.push({ id: pr.id, name: pr.name, lat: pr.lat, lng: pr.lng, brief: pr.brief })
                  }
                  onShowOnMap(pins)
                })
              }}>
                <Text style={s.link}>Map this chapter</Text>
              </TouchableOpacity>
            )}
          </View>
          {inVerse.length ? inVerse.map(row) : (
            <Text style={[s.muted, { padding: 16 }]}>No named people or places in this verse. Search above to browse all {all ? all.length : ''} entries.</Text>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={e => String(e.id)}
          renderItem={({ item }) => row(item)}
          initialNumToRender={30}
          ListEmptyComponent={<View style={s.center}>{all ? <Text style={s.muted}>No matches</Text> : <ActivityIndicator color={colors.accent} />}</View>}
        />
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  muted: { color: c.textMuted, fontSize: 14, lineHeight: 20 },
  link: { color: c.accent, fontSize: 14, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: c.bgSecondary, borderWidth: 1, borderColor: c.border },
  searchInput: { flex: 1, color: c.textPrimary, fontSize: 15, padding: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  rowName: { color: c.textPrimary, fontSize: 16, fontWeight: '600' },
  rowBrief: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
  rowCount: { color: c.textMuted, fontSize: 12 },
  profile: { padding: 16, paddingBottom: 40 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: c.textPrimary, fontSize: 24, fontWeight: '700' },
  aka: { color: c.textMuted, fontSize: 13, marginTop: 4 },
  brief: { color: c.textAccent, fontSize: 15, marginTop: 10, fontWeight: '600' },
  body: { color: c.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: c.bgTertiary, borderWidth: 1, borderColor: c.border },
  chipText: { color: c.textPrimary, fontSize: 13 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: c.accent },
  mapBtnText: { color: c.bgPrimary, fontWeight: '700', fontSize: 13 },
  section: { marginTop: 20 },
  sectionTitle: { color: c.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  bookBlock: { marginTop: 10 },
  bookName: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  refChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: c.bgSecondary },
  refText: { color: c.textPrimary, fontSize: 12 },
  quote: { marginTop: 10, padding: 12, borderRadius: 10, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border },
  quoteFather: { color: c.textAccent, fontSize: 12, fontWeight: '700' },
  quoteText: { color: c.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  credit: { color: c.textMuted, fontSize: 11, marginTop: 28 },
})
