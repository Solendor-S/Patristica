import React, { useMemo, useState } from 'react'
import {
  FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'

type Era = 'Pre-Nicene' | 'Nicene Era' | 'Post-Nicene'

export interface Persecution {
  yearNum: number
  dateRange: string
  emperor: string
  era: Era
  description: string
  keyTexts: string
  significance: string
}

const BADGE_COLOR: Record<Era, { bg: string; text: string }> = {
  'Pre-Nicene':  { bg: 'rgba(196,90,90,0.18)',   text: '#c45a5a' },
  'Nicene Era':  { bg: 'rgba(196,136,90,0.18)',  text: '#c4885a' },
  'Post-Nicene': { bg: 'rgba(107,101,96,0.25)',  text: '#b0a898' },
}

export const PERSECUTIONS: Persecution[] = [
  {
    yearNum: 64,
    dateRange: '64 AD',
    emperor: 'Nero',
    era: 'Pre-Nicene',
    description:
      'After the Great Fire of Rome (July 64), Nero blamed Christians to deflect suspicion. Tacitus records mass arrests, executions, and public tortures: Christians were covered in animal skins and torn apart by dogs, crucified, or burned alive as human torches to illuminate the imperial gardens at night.',
    keyTexts:
      '1 Peter (written c. 64–65, addresses suffering under state hostility); 1 Clement (c. 96) later recalls that Peter and Paul were martyred in this era; Tacitus, Annals 15.44 is the earliest non-Christian account of Christian persecution.',
    significance:
      'The first state-sponsored persecution. Established a precedent of Roman hostility and accelerated the writing of 1 Peter as pastoral encouragement. Traditional date for the martyrdoms of both Peter and Paul.',
  },
  {
    yearNum: 95,
    dateRange: 'c. 81–96 AD',
    emperor: 'Domitian',
    era: 'Pre-Nicene',
    description:
      'Domitian enforced emperor worship and demanded to be addressed as Dominus et Deus (Lord and God). Christians who refused faced execution or exile. His cousin Flavius Clemens was executed and Domitilla exiled—possibly for Christian sympathies. John the apostle was reportedly exiled to Patmos during this period.',
    keyTexts:
      'Revelation (written c. 95–96 from Patmos); 1 Clement (written from Rome c. 96, references recent "sudden calamities"); Suetonius and Pliny the Younger provide background on Domitian\'s reign of terror.',
    significance:
      'The context in which the book of Revelation was written. The imagery of the "beast" and "Babylon" is widely understood as coded language for Rome and Domitian. The first persecution to extend empire-wide.',
  },
  {
    yearNum: 112,
    dateRange: 'c. 98–117 AD',
    emperor: 'Trajan',
    era: 'Pre-Nicene',
    description:
      'Trajan\'s policy, set out in his famous rescript to Pliny the Younger (c. 112): Christians should not be sought out, but if accused and convicted they must be punished; anonymous denunciations are to be disregarded. Pliny\'s letter describes his interrogation procedure—asking three times whether defendants are Christians, and executing those who persisted.',
    keyTexts:
      'Pliny the Younger, Epistles 10.96–97 (the most detailed Roman description of early Christian worship and the persecution process); Ignatius of Antioch\'s seven letters, written c. 107 while he was transported to Rome for execution under Trajan; Justin Martyr\'s First Apology references this policy.',
    significance:
      'Ignatius of Antioch was martyred under Trajan, and his letters—written en route to Rome—are among the most important early patristic documents on ecclesiology, the Eucharist, and the office of bishop. Trajan\'s rescript established the legal framework most provinces used for the next century.',
  },
  {
    yearNum: 177,
    dateRange: 'c. 161–180 AD',
    emperor: 'Marcus Aurelius',
    era: 'Pre-Nicene',
    description:
      'Though Marcus Aurelius was a philosopher-emperor, his reign saw significant local persecutions. The most documented was the 177 AD massacre at Lyon and Vienne in Gaul: a mob lynched Christians in the streets, then survivors were arrested, tortured, and executed in the arena. The slave Blandina became famous for her extraordinary endurance under torture.',
    keyTexts:
      'The Letter of the Churches of Lyon and Vienne (c. 177, preserved in Eusebius, Ecclesiastical History 5.1); Justin Martyr was beheaded in Rome c. 165 under a prefect hostile to Christians; Tertullian began writing his Apology c. 197 partly in response to ongoing persecution rhetoric.',
    significance:
      'Justin Martyr\'s martyrdom ended the Apologist era\'s most productive voice. The Lyon massacre is the first detailed account of provincial mob violence against Christians. Irenaeus became bishop of Lyon immediately after and wrote Against Heresies partly in this context.',
  },
  {
    yearNum: 202,
    dateRange: '202–211 AD',
    emperor: 'Septimius Severus',
    era: 'Pre-Nicene',
    description:
      'An imperial edict forbade conversion to Judaism and Christianity. The persecution was intense in North Africa and Egypt. In Carthage, Perpetua (a noblewoman) and Felicitas (her slave) were arrested while catechumens and executed in the arena in 203 AD. In Alexandria, Origen\'s father Leonidas was martyred; Clement of Alexandria fled the city.',
    keyTexts:
      'The Passion of Perpetua and Felicitas (c. 203)—largely Perpetua\'s own prison diary, one of the earliest Christian texts written by a woman; Tertullian\'s To the Martyrs and Scorpiace were written as pastoral addresses to imprisoned and martyred Christians during this period.',
    significance:
      'The Passion of Perpetua is the earliest surviving first-person Christian martyrdom account and one of the most vivid documents from the early church. Tertullian\'s famous line "the blood of the martyrs is the seed of the Church" (Apologeticus 50) reflects the theology forged in this period.',
  },
  {
    yearNum: 249,
    dateRange: '249–251 AD',
    emperor: 'Decius',
    era: 'Pre-Nicene',
    description:
      'The first empire-wide, systematically enforced persecution. Decius required every citizen to sacrifice before Roman gods and obtain a libellus—a written certificate proving compliance. Christians who refused faced imprisonment, torture, and execution. Many lapsed (the "lapsi") and obtained certificates; those who stood firm faced death. Both Pope Fabian and bishop Babylas of Antioch were martyred; Origen was tortured.',
    keyTexts:
      'Cyprian of Carthage\'s On the Lapsed and On the Unity of the Catholic Church (c. 251)—the defining texts on how the church should handle apostasy and restoration; Origen\'s Exhortation to Martyrdom; the controversy over the lapsi was the direct cause of the Novatian schism.',
    significance:
      'The most theologically consequential persecution. The mass lapsing forced the church to develop a formal theology of penance, restoration, and church discipline. The Novatian schism (over whether the lapsi could ever be restored) divided Christianity for a century and directly produced Cyprian\'s ecclesiology.',
  },
  {
    yearNum: 257,
    dateRange: '257–260 AD',
    emperor: 'Valerian',
    era: 'Pre-Nicene',
    description:
      'Two edicts targeted church leaders specifically: clergy must sacrifice to Roman gods; bishops, presbyters, and deacons who refused were executed; senators and equestrians who were Christians were stripped of rank. Pope Sixtus II was beheaded; his deacon Lawrence was grilled alive three days later. Cyprian of Carthage was exiled in 257 and beheaded in 258.',
    keyTexts:
      'Cyprian\'s letters from exile (Epistles 75–81) document the persecution and his preparation for martyrdom; the Acts of Cyprian is the official proconsular record of his trial and execution; Eusebius, Ecclesiastical History 7.10–12.',
    significance:
      'Cyprian\'s martyrdom ended the most influential Western bishop of the 3rd century. The deliberate targeting of clergy was intended to decapitate the institutional church rather than rely on populist mob action. Valerian\'s capture by the Persians in 260 ended the persecution abruptly.',
  },
  {
    yearNum: 303,
    dateRange: '303–311 AD',
    emperor: 'Diocletian',
    era: 'Pre-Nicene',
    description:
      'The "Great Persecution"—the most severe and sustained of all Roman persecutions. Four successive edicts from 303: (1) destroy churches and scriptures, dismiss Christian officials; (2) arrest all clergy; (3) torture clergy who would not sacrifice; (4) all citizens must sacrifice on pain of death. Thousands were killed across the eastern empire, particularly under Galerius and Maximinus Daia. Thousands of scriptures were surrendered—the traditors ("handers-over") later became the focal point of the Donatist controversy.',
    keyTexts:
      'Lactantius, On the Deaths of the Persecutors (c. 315)—a vivid eyewitness account; Eusebius, Ecclesiastical History 8 and The Martyrs of Palestine; the Galerius Edict of Toleration (311) effectively ended the persecution; Constantine\'s Edict of Milan (313) granted full religious freedom.',
    significance:
      'The Great Persecution ended with the church\'s greatest triumph: Constantine\'s conversion and the Edict of Milan. The word "traditor" (one who handed over scriptures) is the etymological root of "traitor" and directly caused the Donatist schism in North Africa, which Augustine would combat for decades. Diocletian\'s failure proved that Christianity was too embedded to be destroyed by force.',
  },
]

function PersecutionCard({ persecution }: { persecution: Persecution }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const badge = BADGE_COLOR[persecution.era]

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.cardName}>{persecution.emperor}</Text>
        <Text style={s.cardYear}>{persecution.dateRange}</Text>
      </View>
      <View style={s.meta}>
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeText, { color: badge.text }]}>{persecution.era}</Text>
        </View>
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoLabel}>Persecution</Text>
        <Text style={s.infoText}>{persecution.description}</Text>
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoLabel}>Key texts written during this period</Text>
        <Text style={s.infoText}>{persecution.keyTexts}</Text>
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoLabel}>Significance</Text>
        <Text style={s.infoText}>{persecution.significance}</Text>
      </View>
    </View>
  )
}

export default function PersecutionPanel() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return PERSECUTIONS
    return PERSECUTIONS.filter(p =>
      p.emperor.toLowerCase().includes(q) ||
      p.dateRange.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.keyTexts.toLowerCase().includes(q) ||
      p.significance.toLowerCase().includes(q) ||
      p.era.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Filter persecutions…"
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
        keyExtractor={p => p.emperor + p.yearNum}
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <PersecutionCard persecution={item} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No persecutions match "{query}"</Text>
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

  infoBox:   { backgroundColor: c.bgTertiary, borderRadius: 8, padding: 10, gap: 3 },
  infoLabel: {
    fontSize: 10, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoText: { fontSize: 13, lineHeight: 19, color: c.textSecondary },

  empty:     { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: c.textMuted },
})
