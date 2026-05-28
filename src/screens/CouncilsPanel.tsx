import React, { useMemo, useState } from 'react'
import {
  FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'

type CouncilType = 'Ecumenical' | 'Regional' | 'Local' | 'Disputed'

export interface Council {
  yearNum: number
  year: string
  name: string
  location: string
  type: CouncilType
  decree: string
  notes?: string
}

const BADGE_COLOR: Record<CouncilType, { bg: string; text: string }> = {
  Ecumenical: { bg: 'rgba(201,164,90,0.18)', text: '#c9a45a' },
  Regional:   { bg: 'rgba(122,159,212,0.18)', text: '#7a9fd4' },
  Local:      { bg: 'rgba(107,101,96,0.25)', text: '#b0a898' },
  Disputed:   { bg: 'rgba(180,130,80,0.18)', text: '#b48250' },
}

export const COUNCILS: Council[] = [
  {
    yearNum: 49, year: 'c. 49', name: 'Council of Jerusalem', location: 'Jerusalem',
    type: 'Local',
    decree: 'Gentile inclusion without circumcision; ruled that Mosaic law is not binding on Gentile believers.',
    notes: 'Acts 15. First recorded church council.',
  },
  {
    yearNum: 155, year: 'c. 155', name: 'Council of Rome (Easter)', location: 'Rome',
    type: 'Local',
    decree: 'First recorded Easter date dispute between Anicetus of Rome and Polycarp of Smyrna; ended in mutual tolerance.',
  },
  {
    yearNum: 251, year: '251', name: 'Council of Carthage', location: 'Carthage',
    type: 'Regional',
    decree: 'Readmission of lapsed Christians under conditions of penance; opposed the rigorism of the Novatian schism.',
  },
  {
    yearNum: 268, year: '268', name: 'Council of Antioch', location: 'Antioch',
    type: 'Regional',
    decree: 'Condemned Paul of Samosata for adoptionist Christology and deposed him as bishop of Antioch.',
  },
  {
    yearNum: 306, year: '306', name: 'Council of Elvira', location: 'Elvira, Spain',
    type: 'Local',
    decree: 'Issued 81 disciplinary canons on clergy celibacy, morality, and relations with pagans; earliest surviving full canon list.',
  },
  {
    yearNum: 314, year: '314', name: 'Council of Arles', location: 'Arles, Gaul',
    type: 'Regional',
    decree: 'Condemned Donatism; affirmed the validity of sacraments administered by unworthy ministers.',
  },
  {
    yearNum: 325, year: '325', name: 'First Council of Nicaea', location: 'Nicaea, Bithynia',
    type: 'Ecumenical',
    decree: 'Condemned Arianism; defined Christ as homoousios (consubstantial) with the Father; produced the original Nicene Creed.',
    notes: '1st Ecumenical Council. ~300 bishops attended, convened by Emperor Constantine.',
  },
  {
    yearNum: 341, year: '341', name: 'Council of Antioch', location: 'Antioch',
    type: 'Regional',
    decree: 'Issued 25 canons on episcopal authority and church order; theological stance influenced by semi-Arian parties.',
  },
  {
    yearNum: 343, year: '343', name: 'Council of Serdica', location: 'Serdica (Sofia)',
    type: 'Regional',
    decree: 'Reaffirmed Nicaea; established right of appeal to the bishop of Rome; attempted East-West reconciliation.',
  },
  {
    yearNum: 363, year: 'c. 363', name: 'Council of Laodicea', location: 'Laodicea, Phrygia',
    type: 'Regional',
    decree: 'Listed canonical scriptures; banned private assemblies and Judaizing practices; issued 60 disciplinary canons.',
  },
  {
    yearNum: 381, year: '381', name: 'First Council of Constantinople', location: 'Constantinople',
    type: 'Ecumenical',
    decree: 'Condemned Macedonianism; affirmed full divinity of the Holy Spirit; expanded the Nicene Creed to its present form.',
    notes: '2nd Ecumenical Council. Convened by Emperor Theodosius I.',
  },
  {
    yearNum: 393, year: '393', name: 'Council of Hippo', location: 'Hippo, North Africa',
    type: 'Regional',
    decree: 'Ratified the 27-book New Testament canon; Augustine of Hippo was present.',
  },
  {
    yearNum: 397, year: '397', name: 'Council of Carthage', location: 'Carthage',
    type: 'Regional',
    decree: 'Confirmed the biblical canon established at Hippo; regulated clerical discipline and liturgical practice.',
  },
  {
    yearNum: 431, year: '431', name: 'Council of Ephesus', location: 'Ephesus',
    type: 'Ecumenical',
    decree: 'Condemned Nestorianism; affirmed Mary as Theotokos (God-bearer); rejected any division of Christ into two persons.',
    notes: '3rd Ecumenical Council. Presided over by Cyril of Alexandria.',
  },
  {
    yearNum: 451, year: '451', name: 'Council of Chalcedon', location: 'Chalcedon, Bithynia',
    type: 'Ecumenical',
    decree: 'Defined Christ as one person in two natures, divine and human, without confusion or separation; condemned Eutychianism.',
    notes: '4th Ecumenical Council. ~520 bishops. The Oriental Orthodox churches rejected this definition.',
  },
  {
    yearNum: 529, year: '529', name: 'Second Council of Orange', location: 'Orange, Gaul',
    type: 'Regional',
    decree: 'Condemned Semi-Pelagianism; affirmed that grace is necessary for the beginning of faith and all salvific acts.',
  },
  {
    yearNum: 553, year: '553', name: 'Second Council of Constantinople', location: 'Constantinople',
    type: 'Ecumenical',
    decree: 'Condemned the Three Chapters (writings of Theodore of Mopsuestia, Theodoret, and Ibas of Edessa) to reconcile Monophysites.',
    notes: '5th Ecumenical Council. Convened by Emperor Justinian I.',
  },
  {
    yearNum: 589, year: '589', name: 'Third Council of Toledo', location: 'Toledo, Spain',
    type: 'Regional',
    decree: 'Visigothic king Reccared converted from Arianism to Catholicism; the Filioque ("and the Son") first added to the Creed in the West.',
  },
  {
    yearNum: 680, year: '680–681', name: 'Third Council of Constantinople', location: 'Constantinople',
    type: 'Ecumenical',
    decree: 'Condemned Monothelitism; affirmed two wills in Christ (divine and human), acting without contradiction.',
    notes: '6th Ecumenical Council. Also condemned Pope Honorius I posthumously.',
  },
  {
    yearNum: 787, year: '787', name: 'Second Council of Nicaea', location: 'Nicaea, Bithynia',
    type: 'Ecumenical',
    decree: 'Condemned Iconoclasm; affirmed that veneration (proskynesis) of icons is lawful and distinct from the worship (latreia) due to God alone.',
    notes: '7th Ecumenical Council. Last council recognized by both Eastern and Western Christianity.',
  },
  {
    yearNum: 794, year: '794', name: 'Council of Frankfurt', location: 'Frankfurt',
    type: 'Regional',
    decree: 'Frankish church, under Charlemagne, rejected the icon decrees of Nicaea II; complicated East-West relations.',
  },
  {
    yearNum: 869, year: '869–870', name: 'Fourth Council of Constantinople', location: 'Constantinople',
    type: 'Disputed',
    decree: 'Deposed Patriarch Photius and condemned the Photian Schism. Recognized as the 8th Ecumenical Council by Rome; rejected as invalid by Eastern Orthodoxy.',
  },
  {
    yearNum: 879, year: '879–880', name: 'Council of Constantinople (Photian)', location: 'Constantinople',
    type: 'Disputed',
    decree: 'Restored Photius as patriarch; condemned any addition to the Nicene Creed (targeting the Filioque). Recognized as the 8th Ecumenical Council by Eastern Orthodoxy.',
  },
]

// Ordered longest-first so "Niceno-Constantinopolitan Creed" beats "Nicene Creed"
const CREED_LINK_PATTERNS = [
  'Niceno-Constantinopolitan Creed',
  'Chalcedonian Definition',
  "Apostles' Creed",
  'Athanasian Creed',
  'Nicene Creed',
]
const _creedRe = new RegExp(
  `(${CREED_LINK_PATTERNS.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  'g'
)

function renderDecree(
  text: string,
  decreeStyle: any,
  accentColor: string,
  onCreedPress?: (name: string) => void,
): React.ReactElement {
  if (!onCreedPress) return <Text style={decreeStyle}>{text}</Text>
  const parts = text.split(_creedRe)
  if (parts.length === 1) return <Text style={decreeStyle}>{text}</Text>
  return (
    <Text style={decreeStyle}>
      {parts.map((part, i) =>
        CREED_LINK_PATTERNS.includes(part)
          ? <Text key={i} style={{ color: accentColor, textDecorationLine: 'underline' }}
              onPress={() => onCreedPress(part)} suppressHighlighting>{part}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </Text>
  )
}

function CouncilCard({ council, onCreedPress }: { council: Council; onCreedPress?: (name: string) => void }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const badge = BADGE_COLOR[council.type]
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.cardName}>{council.name}</Text>
        <Text style={s.cardYear}>{council.year} AD</Text>
      </View>
      <View style={s.meta}>
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeText, { color: badge.text }]}>{council.type}</Text>
        </View>
        <Text style={s.location}>{council.location}</Text>
      </View>
      {!!council.notes && (
        <View style={s.infoBox}>
          <Text style={s.infoLabel}>Context</Text>
          <Text style={s.infoText}>{council.notes}</Text>
        </View>
      )}
      {renderDecree(council.decree, s.decree, colors.accent, onCreedPress)}
    </View>
  )
}

export default function CouncilsPanel({ onCreedPress }: { onCreedPress?: (name: string) => void }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COUNCILS
    return COUNCILS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.decree.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      c.year.toLowerCase().includes(q) ||
      (c.notes?.toLowerCase().includes(q) ?? false)
    )
  }, [query])

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Filter councils…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={c => c.yearNum + c.name}
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <CouncilCard council={item} onCreedPress={onCreedPress} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No councils match "{query}"</Text>
          </View>
        }
      />
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, marginBottom: 4,
    backgroundColor: c.bgCard,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    paddingHorizontal: 10, height: 38,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: c.textPrimary },

  list: { padding: 12, paddingTop: 8, paddingBottom: 40, gap: 10 },

  card: {
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, gap: 8,
  },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700', color: c.textAccent, marginRight: 8 },
  cardYear: { fontSize: 12, color: c.textMuted, fontWeight: '600' },

  meta:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge:     { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  location:  { fontSize: 12, color: c.textMuted },

  infoBox:   { backgroundColor: c.bgTertiary, borderRadius: 8, padding: 10, gap: 3 },
  infoLabel: {
    fontSize: 10, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoText: { fontSize: 13, lineHeight: 19, color: c.textSecondary },

  decree: { fontSize: 14, lineHeight: 21, color: c.textPrimary },

  empty:     { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: c.textMuted },
})
