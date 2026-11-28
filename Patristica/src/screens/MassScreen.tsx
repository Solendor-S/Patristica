import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import { useUserDb } from '../db/UserDbProvider'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { TRANSLATIONS, GREEK_TRANSLATIONS, OT_TRANSLATIONS } from '../context/TranslationContext'
import { FATHER_DATES } from '../data/fatherDates'
import {
  getNoDay, getTlmDay, isoDate, noGospels, tlmGospelRef, GRADE_LABEL, LITURGICAL_COLOR, MASS_CALENDARS,
  type MassCalendar, type MassRite, type NoDay, type NoReading, type TlmMass,
} from '../lib/mass'
import { usePassage, type PassageVerse, type Seg } from '../lib/passage'

type TlmLang = 'en' | 'la' | 'both'
const SETTINGS = { rite: 'mass_rite', cal: 'mass_calendar', tr: 'mass_translation', lang: 'mass_tlm_lang' }
// English translations that can carry the readings (originals and OT-only texts can't)
const MASS_TRANSLATIONS = TRANSLATIONS.filter(t => !GREEK_TRANSLATIONS.has(t.key) && !OT_TRANSLATIONS.has(t.key) && !t.apiOnly)

const segLabel = (s: Seg) => `${s.book} ${s.ch}:${s.v1}`

/** The Church Father a saint's day honours, if he's in our Fathers list. */
function fatherFor(title: string): string | null {
  const t = title.replace(/^Saints?\s+/i, '').replace(/^St\.?\s+/i, '')
  const keys = Object.keys(FATHER_DATES).filter(k => k.length > 5 && FATHER_DATES[k].sort <= 800)
  return keys.find(k => t.startsWith(k)) ?? null
}

function useSetting<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const db = useUserDb()
  const [v, setV] = useState<T>(fallback)
  useEffect(() => {
    db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])
      .then(r => { if (r?.value) setV(r.value as T) }).catch(() => {})
  }, [db, key])
  const set = useCallback((nv: T) => {
    setV(nv)
    db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, nv]).catch(() => {})
  }, [db, key])
  return [v, set]
}

function Reading({ r, translation, colors }: { r: NoReading; translation: string; colors: ThemeColors }) {
  const s = useMemo(() => makeStyles(colors), [colors])
  const passage = usePassage()
  const [alt, setAlt] = useState(0)
  const [verses, setVerses] = useState<PassageVerse[] | null>(null)
  const isAcclamation = r.label === 'Gospel Acclamation'
  useEffect(() => {
    if (isAcclamation || !r.alts[alt]) { setVerses([]); return }
    let off = false
    setVerses(null)
    passage(r.alts[alt], translation).then(v => { if (!off) setVerses(v) }).catch(() => { if (!off) setVerses([]) })
    return () => { off = true }
  }, [r, alt, translation, passage, isAcclamation])

  const cites = r.cite.split('|').map(x => x.trim())
  return (
    <View style={s.reading}>
      <Text style={s.readingLabel}>{r.label}</Text>
      <Text style={s.cite}>{cites[Math.min(alt, cites.length - 1)] ?? r.cite}</Text>
      {r.alts.length > 1 && (
        <View style={s.altRow}>
          {r.alts.map((a, i) => (
            <TouchableOpacity key={i} style={[s.altChip, i === alt && s.altChipOn]} onPress={() => setAlt(i)}>
              <Text style={[s.altText, i === alt && s.altTextOn]}>{i === 0 ? 'Reading' : `or ${a[0] ? segLabel(a[0]) : i + 1}`}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {!isAcclamation && (verses === null ? <ActivityIndicator color={colors.accent} style={{ marginTop: 8 }} />
        : verses.length ? (
          <Text style={s.text}>
            {verses.map((v, i) => (
              <Text key={`${v.chapter}:${v.verse}:${i}`}>
                <Text style={s.vnum}>{i > 0 && verses[i - 1].chapter !== v.chapter ? `${v.chapter}:` : ''}{v.verse} </Text>
                {v.text}{' '}
              </Text>
            ))}
          </Text>
        ) : <Text style={s.muted}>Text unavailable offline for this passage — the citation above is the reading.</Text>)}
    </View>
  )
}

export default function MassScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const userDb = useUserDb()
  const navigation = useNavigation()
  const { setSelected } = useSelectedVerse()
  const [rite, setRite] = useSetting<MassRite>(SETTINGS.rite, 'no')
  const [cal, setCal] = useSetting<MassCalendar>(SETTINGS.cal, 'VA')
  const [translation, setTranslation] = useSetting<string>(SETTINGS.tr, 'WEBC')
  const [lang, setLang] = useSetting<TlmLang>(SETTINGS.lang, 'en')
  const [date, setDate] = useState(() => new Date())
  const [no, setNo] = useState<NoDay | null>(null)
  const [tlm, setTlm] = useState<TlmMass[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [massIdx, setMassIdx] = useState(0)
  const [optIdx, setOptIdx] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const iso = isoDate(date)

  useEffect(() => {
    let off = false
    setLoading(true)
    setMassIdx(0)
    setOptIdx(null)
    const job = rite === 'no'
      ? getNoDay(userDb, cal, iso).then(d => { if (!off) { setNo(d); setTlm(null) } })
      : getTlmDay(userDb, iso).then(d => { if (!off) { setTlm(d); setNo(null) } })
    job.catch(() => {}).finally(() => { if (!off) setLoading(false) })
    return () => { off = true }
  }, [rite, cal, iso, userDb])

  const shift = (days: number) => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + days); return n })
  const isToday = iso === isoDate(new Date())

  const openInStudy = (book: string, chapter: number, verse: number) => {
    setSelected({ book, chapter, verse })
    navigation.navigate('Study' as never)
  }

  const title = rite === 'no' ? no?.title : tlm?.[massIdx]?.title
  const colorKeys = rite === 'no' ? no?.color ?? [] : tlm?.[massIdx]?.colors ?? []
  const stripe = LITURGICAL_COLOR[colorKeys[0] ?? ''] ?? colors.border
  const father = title ? fatherFor(title) : null
  const gospels: { book: string; chapter: number; verse: number }[] = rite === 'no'
    ? (no ? noGospels(no).map(g => ({ book: g.book, chapter: g.ch, verse: g.v1 })) : [])
    : (() => { const g = tlm?.[massIdx] && tlmGospelRef(tlm[massIdx]); return g ? [g] : [] })()

  const noReadings = no
    ? (optIdx != null ? no.optional[optIdx]?.readings : no.masses[massIdx]?.readings) ?? null
    : null

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.dateRow}>
          <TouchableOpacity onPress={() => shift(-1)} style={s.iconBtn}><Ionicons name="chevron-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setDate(new Date())} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.date}>{date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            {!isToday && <Text style={s.today}>Back to today</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => shift(1)} style={s.iconBtn}><Ionicons name="chevron-forward" size={22} color={colors.textPrimary} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setSettingsOpen(true)} style={s.iconBtn}><Ionicons name="options-outline" size={20} color={colors.textMuted} /></TouchableOpacity>
        </View>
        <View style={s.segment}>
          {([['no', 'Novus Ordo'], ['tlm', 'Latin Mass (1962)']] as const).map(([k, label]) => (
            <TouchableOpacity key={k} style={[s.segBtn, rite === k && s.segOn]} onPress={() => setRite(k)}>
              <Text style={[s.segText, rite === k && s.segTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={[s.stripe, { backgroundColor: stripe }]} />

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : !(no || tlm?.length) ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.border} />
          <Text style={s.muted}>Couldn't load this day's Mass. It needs a connection the first time each {rite === 'no' ? 'year' : 'month'} is opened; after that it works offline.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.title}>{title}</Text>
          {rite === 'no' && no && (
            <Text style={s.sub}>{[GRADE_LABEL[no.grade], no.season.replace(/_/g, ' ').toLowerCase()].filter(Boolean).join(' · ')} · {MASS_CALENDARS.find(c => c.key === cal)?.label}</Text>
          )}
          {rite === 'tlm' && !!tlm?.[massIdx]?.commemorations.length && (
            <Text style={s.sub}>Commemoration: {tlm[massIdx].commemorations.join('; ')}</Text>
          )}

          {/* Mass selector (Christmas, vigils, several Masses) */}
          {((rite === 'no' && (no?.masses.length ?? 0) > 1) || (rite === 'tlm' && (tlm?.length ?? 0) > 1)) && (
            <View style={s.altRow}>
              {(rite === 'no' ? no!.masses.map(m => m.label || 'Mass of the Day') : tlm!.map(m => m.title)).map((l, i) => (
                <TouchableOpacity key={i} style={[s.altChip, i === massIdx && optIdx == null && s.altChipOn]} onPress={() => { setMassIdx(i); setOptIdx(null) }}>
                  <Text style={[s.altText, i === massIdx && optIdx == null && s.altTextOn]} numberOfLines={1}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {rite === 'no' && !!no?.optional.length && (
            <View style={s.optBox}>
              <Text style={s.optLabel}>Optional memorial{no.optional.length > 1 ? 's' : ''}</Text>
              <View style={s.altRow}>
                {no.optional.map((o, i) => (
                  <TouchableOpacity key={i} disabled={!o.readings} style={[s.altChip, optIdx === i && s.altChipOn, !o.readings && { opacity: 0.6 }]}
                    onPress={() => setOptIdx(optIdx === i ? null : i)}>
                    <Text style={[s.altText, optIdx === i && s.altTextOn]} numberOfLines={1}>{o.title}{o.readings ? '' : ' (readings of the day)'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {rite === 'no' && (noReadings ?? []).map((r, i) => (
            <Reading key={`${iso}-${massIdx}-${optIdx}-${i}`} r={r} translation={translation} colors={colors} />
          ))}
          {rite === 'no' && (
            <Text style={s.note}>Responsorial refrains and acclamation texts are not included (the official wording is copyrighted); the psalm verses are given from {translation}.</Text>
          )}

          {rite === 'tlm' && tlm?.[massIdx]?.sections.map(sec => (
            <View key={sec.id} style={s.reading}>
              <Text style={s.readingLabel}>{sec.label}</Text>
              {(lang === 'en' || lang === 'both') && <Text style={s.text}>{sec.en.replace(/\*/g, '')}</Text>}
              {(lang === 'la' || lang === 'both') && <Text style={[s.text, s.latin]}>{sec.la.replace(/\*/g, '')}</Text>}
            </View>
          ))}

          {/* The Fathers on today's Gospel */}
          {!!gospels.length && (
            <View style={s.footer}>
              <Text style={s.footerTitle}>The Fathers on today's Gospel</Text>
              {gospels.slice(0, 3).map(g => (
                <TouchableOpacity key={`${g.book}${g.chapter}:${g.verse}`} style={s.footerBtn} onPress={() => openInStudy(g.book, g.chapter, g.verse)}>
                  <Ionicons name="people-outline" size={16} color={colors.accent} />
                  <Text style={s.footerText}>{g.book} {g.chapter}:{g.verse} — commentary, Catena Aurea and more in Study</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!!father && (
            <View style={s.fatherCard}>
              <Text style={s.footerTitle}>A Church Father's feast</Text>
              <Text style={s.fatherName}>{father}</Text>
              <Text style={s.muted}>{[FATHER_DATES[father].dates, FATHER_DATES[father].role].filter(Boolean).join(' · ')}</Text>
              {!!FATHER_DATES[father].keyWorks && <Text style={s.muted}>{FATHER_DATES[father].keyWorks}</Text>}
            </View>
          )}
          <Text style={s.credit}>
            {rite === 'no'
              ? 'Calendar: Liturgical Calendar API. Lectionary citations: Felix Just SJ (catholic-resources.org) and LitCal.'
              : 'Propers: Missale Meum / Divinum Officium (MIT).'}
          </Text>
        </ScrollView>
      )}

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setSettingsOpen(false)}>
          <View style={s.sheet}>
            <ScrollView>
              <Text style={s.sheetTitle}>Novus Ordo calendar</Text>
              {MASS_CALENDARS.map(c => (
                <TouchableOpacity key={c.key} style={s.opt} onPress={() => setCal(c.key)}>
                  <Ionicons name={cal === c.key ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.accent} />
                  <Text style={s.optText}>{c.label}</Text>
                </TouchableOpacity>
              ))}
              <Text style={s.sheetTitle}>Translation for the readings</Text>
              {MASS_TRANSLATIONS.map(t => (
                <TouchableOpacity key={t.key} style={s.opt} onPress={() => setTranslation(t.key)}>
                  <Ionicons name={translation === t.key ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.accent} />
                  <Text style={s.optText}>{t.full}</Text>
                </TouchableOpacity>
              ))}
              <Text style={s.sheetTitle}>Latin Mass text</Text>
              {([['en', 'English'], ['la', 'Latin'], ['both', 'English and Latin']] as const).map(([k, l]) => (
                <TouchableOpacity key={k} style={s.opt} onPress={() => setLang(k)}>
                  <Ionicons name={lang === k ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.accent} />
                  <Text style={s.optText}>{l}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  header: { paddingTop: (StatusBar.currentHeight ?? 0) + 8, paddingHorizontal: 8, paddingBottom: 8, backgroundColor: c.bgSecondary },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },
  date: { color: c.textPrimary, fontSize: 16, fontWeight: '700' },
  today: { color: c.accent, fontSize: 12, marginTop: 2 },
  segment: { flexDirection: 'row', marginTop: 8, marginHorizontal: 8, borderRadius: 10, backgroundColor: c.bgTertiary, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 8 },
  segOn: { backgroundColor: c.accent },
  segText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  segTextOn: { color: c.bgPrimary },
  stripe: { height: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  body: { padding: 16, paddingBottom: 48 },
  title: { color: c.textPrimary, fontSize: 22, fontWeight: '700' },
  sub: { color: c.textMuted, fontSize: 13, marginTop: 4, textTransform: 'capitalize' },
  altRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  altChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: c.border, maxWidth: '100%' },
  altChipOn: { backgroundColor: c.accent, borderColor: c.accent },
  altText: { color: c.textSecondary, fontSize: 12 },
  altTextOn: { color: c.bgPrimary, fontWeight: '700' },
  optBox: { marginTop: 12 },
  optLabel: { color: c.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  reading: { marginTop: 20 },
  readingLabel: { color: c.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  cite: { color: c.textAccent, fontSize: 15, fontWeight: '600', marginTop: 2 },
  text: { color: c.textPrimary, fontSize: 16, lineHeight: 26, marginTop: 8 },
  latin: { color: c.textSecondary, fontStyle: 'italic' },
  vnum: { color: c.textMuted, fontSize: 11 },
  muted: { color: c.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'left' },
  note: { color: c.textMuted, fontSize: 11, marginTop: 16, fontStyle: 'italic' },
  footer: { marginTop: 28, padding: 12, borderRadius: 12, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border },
  footerTitle: { color: c.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  footerText: { flex: 1, color: c.textPrimary, fontSize: 14 },
  fatherCard: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, gap: 2 },
  fatherName: { color: c.textAccent, fontSize: 16, fontWeight: '700' },
  credit: { color: c.textMuted, fontSize: 11, marginTop: 24 },
  backdrop: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: 24 },
  sheet: { maxHeight: '80%', backgroundColor: c.bgPrimary, borderRadius: 14, padding: 16 },
  sheetTitle: { color: c.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 4 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  optText: { color: c.textPrimary, fontSize: 14, flex: 1 },
})
