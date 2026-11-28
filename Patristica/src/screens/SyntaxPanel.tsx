import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator, StyleSheet, Linking, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { useWordFocus } from '../context/WordFocusContext'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { normalizeStrongsNumber } from '../db/queries'
import { useSyntax, hasSyntax, wordVerse, ROLE_LABEL, type Sentence, type SynWord } from '../lib/syntax'
import { FLASHPOINTS, type Flashpoint } from '../data/syntaxFlashpoints'
import { TRADITION_COLORS } from '../data/traditionColors'
import { BOOK_MAP } from '../data/books'
import type { SelectedVerse } from '../types'

interface Props { selected: SelectedVerse | null }

// "ROM 5:12!27" -> "5:12!27" (the form stored in the sentence rows)
const shortRef = (r: string) => r.slice(r.indexOf(' ') + 1)

/** Flashpoints for a book, indexed by short word ref. */
// Lookups built once at load: by book, by book + short word ref, by book:chapter:verse.
const BY_BOOK = new Map<string, Flashpoint[]>()
const BY_WORD = new Map<string, Map<string, Flashpoint>>()
const BY_VERSE = new Map<string, Flashpoint[]>()
for (const f of FLASHPOINTS) {
  if (!BY_BOOK.has(f.book)) { BY_BOOK.set(f.book, []); BY_WORD.set(f.book, new Map()) }
  BY_BOOK.get(f.book)!.push(f)
  const verses = new Set([`${f.chapter}:${f.verse}`])
  for (const w of f.words) {
    BY_WORD.get(f.book)!.set(shortRef(w), f)
    const [c, v] = wordVerse(shortRef(w))
    verses.add(`${c}:${v}`)
  }
  for (const cv of verses) {
    const k = `${f.book} ${cv}`
    BY_VERSE.set(k, [...(BY_VERSE.get(k) ?? []), f])
  }
}
const NO_FLASHPOINTS = new Map<string, Flashpoint>()

/** Hebrew morphemes of one word (no space after) shown as one unit; Strong's of the content morpheme. */
function joinMorphemes(words: SynWord[]): SynWord[] {
  const out: SynWord[] = []
  let glue = false
  for (const w of words) {
    const prev = out[out.length - 1]
    if (glue && prev && prev[0] === w[0]) {
      out[out.length - 1] = [prev[0], prev[1] + w[1], [prev[2], w[2]].filter(Boolean).join(' '), w[3] || prev[3], w[4]]
    } else {
      out.push(w)
    }
    glue = w[4] === ''
  }
  return out
}

export function flashpointsForVerse(book: string, chapter: number, verse: number): Flashpoint[] {
  return BY_VERSE.get(`${book} ${chapter}:${verse}`) ?? []
}

export function FlashpointSheet({ fp, onClose }: { fp: Flashpoint | null; onClose: () => void }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  if (!fp) return null
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.sheetBackdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Ionicons name="git-branch-outline" size={18} color={colors.accent} />
            <Text style={s.sheetTitle} numberOfLines={2}>{fp.title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <Text style={s.fpRef}>{fp.book} {fp.chapter}:{fp.verse} · {fp.category}</Text>
            <Text style={s.body}>{fp.summary}</Text>
            {fp.readings.map((r, i) => (
              <View key={i} style={[s.reading, fp.maculaFollows === i && { borderColor: colors.accent }]}>
                <Text style={s.readingLabel}>{String.fromCharCode(65 + i)}. {r.label}</Text>
                <Text style={s.rendering}>"{r.rendering}"</Text>
                <Text style={s.grammar}>{r.grammar}</Text>
                {!!r.traditions && Object.entries(r.traditions).map(([t, txt]) => (
                  <Text key={t} style={s.tradition}><Text style={{ fontWeight: '700' }}>{t[0].toUpperCase() + t.slice(1)}: </Text>{txt}</Text>
                ))}
                {!!r.modern && <Text style={s.modern}>Modern: {r.modern}</Text>}
                {r.fathers.map((f, j) => (
                  <TouchableOpacity key={j} style={s.father} onPress={() => Linking.openURL(f.url)} activeOpacity={0.8}>
                    <Text style={s.fatherName}>{f.father} · {f.work}, {f.ref} (c. {f.year})</Text>
                    <Text style={s.fatherQuote}>“{f.quote}”</Text>
                  </TouchableOpacity>
                ))}
                {!r.fathers.length && <Text style={s.noFathers}>No Father found explicitly taking this reading.</Text>}
              </View>
            ))}
            <Text style={s.follows}>
              {fp.maculaFollows == null
                ? 'The MACULA tree shown here does not decide between these readings.'
                : `The tree shown here follows reading ${String.fromCharCode(65 + fp.maculaFollows)} (MACULA, Biblica).`}
            </Text>
            {!!fp.sources.length && <Text style={s.sources}>Sources: {fp.sources.join('; ')}</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export default function SyntaxPanel({ selected }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const loadSyntax = useSyntax()
  const { setWordFocus } = useWordFocus()
  const { setSelected } = useSelectedVerse()
  const [sentences, setSentences] = useState<Sentence[] | null>(null)
  const [gloss, setGloss] = useState(true)
  const [openFp, setOpenFp] = useState<Flashpoint | null>(null)
  const [showIndex, setShowIndex] = useState(false)

  useEffect(() => {
    if (!selected || !hasSyntax(selected.book)) { setSentences([]); return }
    let off = false
    setSentences(null)
    loadSyntax(selected.book, selected.chapter, selected.verse ?? 0).then(r => { if (!off) setSentences(r) }).catch(() => { if (!off) setSentences([]) })
    return () => { off = true }
  }, [selected, loadSyntax])

  const fpIdx = (selected && BY_WORD.get(selected.book)) || NO_FLASHPOINTS
  const verseFps = useMemo(() => (selected ? flashpointsForVerse(selected.book, selected.chapter, selected.verse ?? 0) : []), [selected])
  const hebrew = !!selected && BOOK_MAP[selected.book]?.testament === 'OT'

  const header = (
    <View style={s.toolbar}>
      <TouchableOpacity style={s.toolBtn} onPress={() => setShowIndex(v => !v)} activeOpacity={0.7}>
        <Ionicons name={showIndex ? 'git-merge-outline' : 'list-outline'} size={16} color={colors.accent} />
        <Text style={s.link}>{showIndex ? 'Back to clause view' : `Disputed constructions (${FLASHPOINTS.length})`}</Text>
      </TouchableOpacity>
      {!showIndex && (
        <View style={s.toggle}>
          <Text style={s.toggleLabel}>Gloss</Text>
          <Switch value={gloss} onValueChange={setGloss} />
        </View>
      )}
    </View>
  )

  if (showIndex) {
    const byBook = Object.fromEntries(BY_BOOK)
    return (
      <View style={{ flex: 1 }}>
        {header}
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {Object.entries(byBook).map(([book, list]) => (
            <View key={book}>
              <Text style={s.indexBook}>{book} · {list.length}</Text>
              {list.map(f => (
                <TouchableOpacity key={f.id} style={s.indexRow} activeOpacity={0.7}
                  onPress={() => { setSelected({ book: f.book, chapter: f.chapter, verse: f.verse }); setShowIndex(false); setOpenFp(f) }}>
                  <Text style={s.indexRef}>{f.chapter}:{f.verse}</Text>
                  <Text style={s.indexTitle} numberOfLines={2}>{f.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
        <FlashpointSheet fp={openFp} onClose={() => setOpenFp(null)} />
      </View>
    )
  }

  if (!selected) {
    return (
      <View style={{ flex: 1 }}>
        {header}
        <View style={s.center}><Text style={s.muted}>Select a verse to see its sentence structure.</Text></View>
      </View>
    )
  }
  if (!hasSyntax(selected.book)) {
    return (
      <View style={{ flex: 1 }}>
        {header}
        <View style={s.center}><Text style={s.muted}>No syntax tree for {selected.book} — MACULA covers the Hebrew OT and Greek NT only.</Text></View>
      </View>
    )
  }

  const renderWord = (w: SynWord, key: string) => {
    const [c, v] = wordVerse(w[0])
    const here = c === selected.chapter && v === selected.verse
    const fp = fpIdx.get(w[0])
    return (
      <TouchableOpacity key={key} activeOpacity={0.6} disabled={!w[3]}
        onPress={() => { if (here) setWordFocus(normalizeStrongsNumber(w[3])) }}
        onLongPress={() => fp && setOpenFp(fp)}>
        <View style={s.word}>
          <Text style={[s.orig, hebrew && s.hebrew, here && s.here, !!fp && s.flagged]}>{w[1]}</Text>
          {gloss && <Text style={[s.gloss, here && { color: colors.textSecondary }]} numberOfLines={1}>{w[2] || ' '}</Text>}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {header}
      {sentences === null ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} /></View>
      ) : !sentences.length ? (
        <View style={s.center}><Text style={s.muted}>Couldn't load the tree for this verse (offline? install the Clause View pack in Library).</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          {verseFps.map(f => (
            <TouchableOpacity key={f.id} style={s.fpBanner} onPress={() => setOpenFp(f)} activeOpacity={0.8}>
              <Ionicons name="warning-outline" size={16} color={colors.bgPrimary} />
              <Text style={s.fpBannerText} numberOfLines={2}>Disputed construction: {f.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.bgPrimary} />
            </TouchableOpacity>
          ))}
          {sentences.map(sen => (
            <View key={sen.id} style={s.sentence}>
              <Text style={s.span}>
                {selected.book} {sen.startCh}:{sen.startV}{sen.endCh !== sen.startCh ? `–${sen.endCh}:${sen.endV}` : sen.endV !== sen.startV ? `–${sen.endV}` : ''}
              </Text>
              {sen.rows.map(([depth, role, words], i) => {
                const flagged = words.some(w => fpIdx.has(w[0]))
                return (
                  <View key={i} style={[s.row, { marginLeft: depth * 16 }, hebrew && { flexDirection: 'row-reverse' }]}>
                    {depth > 0 && <View style={s.rail} />}
                    <View style={{ flex: 1 }}>
                      {!!role && <Text style={s.role}>{ROLE_LABEL[role] ?? role}</Text>}
                      <View style={[s.words, hebrew && { flexDirection: 'row-reverse' }]}>
                        {joinMorphemes(words).map((w, j) => renderWord(w, `${i}-${j}`))}
                      </View>
                    </View>
                    {flagged && (
                      <TouchableOpacity onPress={() => setOpenFp(fpIdx.get(words.find(w => fpIdx.has(w[0]))![0])!)} style={s.flagBtn}>
                        <Ionicons name="warning" size={16} color={colors.accent} />
                      </TouchableOpacity>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
          <Text style={s.hint}>Tap a highlighted word for its word study. ⚠ marks a construction that can be read more than one way.</Text>
          <Text style={s.credit}>Syntax trees: MACULA {hebrew ? 'Hebrew (WLC)' : 'Greek (SBLGNT)'}, © Biblica, CC BY 4.0.</Text>
        </ScrollView>
      )}
      <FlashpointSheet fp={openFp} onClose={() => setOpenFp(null)} />
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  muted: { color: c.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  link: { color: c.accent, fontSize: 13, fontWeight: '600' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLabel: { color: c.textMuted, fontSize: 12 },
  fpBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: c.accent, marginBottom: 10 },
  fpBannerText: { flex: 1, color: c.bgPrimary, fontWeight: '700', fontSize: 13 },
  sentence: { marginBottom: 16, padding: 10, borderRadius: 10, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border },
  span: { color: c.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 3 },
  rail: { width: 2, alignSelf: 'stretch', backgroundColor: c.border, marginRight: 8, borderRadius: 1 },
  role: { color: c.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  word: { alignItems: 'center' },
  orig: { color: c.textSecondary, fontSize: 17 },
  hebrew: { fontSize: 19 },
  here: { color: c.textPrimary, fontWeight: '700' },
  flagged: { textDecorationLine: 'underline', textDecorationColor: c.accent },
  gloss: { color: c.textMuted, fontSize: 11, maxWidth: 90 },
  flagBtn: { paddingLeft: 6, paddingTop: 2 },
  hint: { color: c.textMuted, fontSize: 12, marginTop: 4 },
  credit: { color: c.textMuted, fontSize: 11, marginTop: 10 },
  indexBook: { color: c.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 16 },
  indexRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  indexRef: { color: c.accent, fontSize: 13, fontWeight: '700', width: 48 },
  indexTitle: { flex: 1, color: c.textPrimary, fontSize: 14 },
  sheetBackdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
  sheet: { maxHeight: '88%', backgroundColor: c.bgPrimary, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  sheetTitle: { flex: 1, color: c.textPrimary, fontSize: 16, fontWeight: '700' },
  fpRef: { color: c.textMuted, fontSize: 12, marginBottom: 6 },
  body: { color: c.textSecondary, fontSize: 15, lineHeight: 22 },
  reading: { marginTop: 14, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard },
  readingLabel: { color: c.textPrimary, fontSize: 15, fontWeight: '700' },
  rendering: { color: c.textAccent, fontSize: 15, fontStyle: 'italic', marginTop: 4 },
  grammar: { color: c.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 19 },
  tradition: { color: c.textSecondary, fontSize: 13, marginTop: 4 },
  modern: { color: c.textMuted, fontSize: 12, marginTop: 4 },
  father: { marginTop: 8, paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: TRADITION_COLORS?.Eastern ?? c.accent },
  fatherName: { color: c.textAccent, fontSize: 12, fontWeight: '700' },
  fatherQuote: { color: c.textPrimary, fontSize: 14, lineHeight: 20, marginTop: 2 },
  noFathers: { color: c.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  follows: { color: c.textMuted, fontSize: 12, marginTop: 16, fontStyle: 'italic' },
  sources: { color: c.textMuted, fontSize: 11, marginTop: 8 },
})
