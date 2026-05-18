import React, { useMemo, useState } from 'react'
import {
  FlatList, LayoutAnimation, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'

type Severity = 'Major' | 'Significant' | 'Regional'

interface Heresy {
  yearNum: number
  year: string
  name: string
  condemned: string
  taught: string
  why: string
  severity: Severity
}

const BADGE_COLOR: Record<Severity, { bg: string; text: string }> = {
  Major:       { bg: 'rgba(196,90,90,0.18)',  text: '#c45a5a' },
  Significant: { bg: 'rgba(196,136,90,0.18)', text: '#c4885a' },
  Regional:    { bg: 'rgba(107,101,96,0.25)', text: '#b0a898' },
}

const HERESIES: Heresy[] = [
  {
    yearNum: 50,
    year: 'c. 50–100',
    name: 'Ebionism',
    condemned: 'Broadly rejected by the apostolic church; referenced in Ignatius, Justin Martyr',
    taught: 'Jesus was a fully human man, born of Joseph and Mary, who was chosen ("adopted") as God\'s Son at his baptism due to his perfect obedience. Denied the virgin birth and the pre-existence of Christ.',
    why: 'Contradicts the Incarnation: Scripture teaches Christ is the eternal Word made flesh (John 1:14), not a man promoted to divine status.',
    severity: 'Significant',
  },
  {
    yearNum: 70,
    year: 'c. 70–200',
    name: 'Docetism',
    condemned: 'Condemned by Ignatius of Antioch (c. 107), 1 John 4:2; formally rejected in anti-Gnostic councils',
    taught: 'Christ only appeared (Greek: dokein, "to seem") to have a physical body. His birth, suffering, and death were illusions. He was purely a spiritual being who could not truly suffer.',
    why: 'Destroys the Atonement: if Christ did not truly suffer and die, there is no real sacrifice for sin. Also contradicts the resurrection of the body.',
    severity: 'Major',
  },
  {
    yearNum: 140,
    year: 'c. 140–150',
    name: 'Marcionism',
    condemned: 'Condemned by Justin Martyr, Tertullian, and multiple local synods; excluded from all Christian communion by mid-2nd century',
    taught: 'The God of the Old Testament (the Demiurge) is an inferior, wrathful deity distinct from the loving Father revealed by Jesus. Marcion rejected the entire Old Testament and most of the New Testament, keeping only a truncated Luke and ten Pauline letters.',
    why: 'Destroys the unity of Scripture and the God who is both Creator and Redeemer. Paul himself affirms the OT as inspired and the God of Abraham as the Father of Christ.',
    severity: 'Major',
  },
  {
    yearNum: 156,
    year: 'c. 156–200',
    name: 'Montanism',
    condemned: 'Condemned by councils in Asia Minor (c. 177) and by the broader church; Tertullian notably defected to it',
    taught: 'Montanus and his prophetesses Prisca and Maximilla claimed to receive new direct revelation from the Holy Spirit superseding the apostles. Imposed extreme fasting, forbade remarriage, and predicted an imminent New Jerusalem at Pepuza.',
    why: 'The canon of Scripture is closed with the apostles (Rev. 22:18–19; Jude 3). No new revelation supplements or corrects apostolic teaching. The church must test all spirits (1 John 4:1).',
    severity: 'Significant',
  },
  {
    yearNum: 175,
    year: 'c. 150–250',
    name: 'Gnosticism',
    condemned: 'Systematically refuted by Irenaeus of Lyon (Against Heresies, c. 180) and Hippolytus; rejected by all major sees',
    taught: 'The material world is evil, created by an ignorant or malevolent Demiurge, not the true God. Salvation comes through secret knowledge (gnosis) of one\'s divine spark. Christ was a purely spiritual revealer who only appeared human. Salvation bypasses bodily resurrection.',
    why: 'Denies Creation as good (Gen. 1:31), the true Incarnation, bodily resurrection, and the sole sufficiency of publicly revealed apostolic faith. Replaces grace with esoteric privilege.',
    severity: 'Major',
  },
  {
    yearNum: 200,
    year: 'c. 190–260',
    name: 'Modalism (Sabellianism)',
    condemned: 'Condemned by Hippolytus of Rome and Dionysius of Alexandria (c. 260); rejected by synods in Rome and Alexandria',
    taught: 'Father, Son, and Holy Spirit are not three distinct persons but three successive "modes" or masks of one divine person. The Father suffered on the cross ("Patripassianism"). There is no eternal distinction of persons in God.',
    why: 'Contradicts Christ\'s prayers to the Father as a distinct person (John 17), the baptism of Jesus where all three persons are simultaneously present (Matt. 3:16–17), and the Great Commission\'s Trinitarian formula.',
    severity: 'Major',
  },
  {
    yearNum: 250,
    year: 'c. 250–311',
    name: 'Novatianism',
    condemned: 'Council of Carthage (251); condemned by Pope Cornelius and Cyprian of Carthage',
    taught: 'Christians who lapsed under persecution (the lapsi) — those who sacrificed to idols or handed over scriptures — could never be readmitted to the church, even on their deathbed. The church must be a community of the perfect and cannot offer them absolution.',
    why: 'Denies the church\'s authority to bind and loose (Matt. 16:19; 18:18) and the power of repentance. Scripture teaches restoration of the repentant (2 Cor. 2:6–8; Gal. 6:1).',
    severity: 'Regional',
  },
  {
    yearNum: 268,
    year: '268',
    name: 'Adoptionism (Paul of Samosata)',
    condemned: 'Council of Antioch (268); Paul deposed as bishop',
    taught: 'Christ was a mere man who was filled with divine Logos-power at his baptism, progressively deified through moral perfection, and ultimately "adopted" as Son of God. The Logos is an impersonal divine quality, not a distinct person.',
    why: 'Denies the eternal pre-existence of the Son (John 1:1; 8:58) and reduces the Incarnation to mere divine influence on a human. Salvation requires a truly divine Saviour, not a morally elevated man.',
    severity: 'Significant',
  },
  {
    yearNum: 311,
    year: '311–411',
    name: 'Donatism',
    condemned: 'Council of Arles (314); multiple North African councils; Augustine of Hippo wrote extensively against it',
    taught: 'The validity of sacraments depends on the personal holiness of the minister who performs them. Clergy who handed over scriptures (traditores) during persecution were permanently disqualified; their baptisms and ordinations were null and void.',
    why: 'Sacramental efficacy rests on Christ\'s action, not the minister\'s moral state. Augustine\'s principle: "He who planted is nothing, he who watered is nothing, but God gives the growth" (1 Cor. 3:7). A corrupt minister cannot corrupt Christ\'s sacrament.',
    severity: 'Significant',
  },
  {
    yearNum: 318,
    year: 'c. 318–381',
    name: 'Arianism',
    condemned: 'First Council of Nicaea (325); First Council of Constantinople (381)',
    taught: 'The Son of God is the first and greatest of God\'s creatures, brought into existence from nothing before all ages. He is not co-eternal with the Father; "there was a time when he was not" (Arius). The Son is homoiousios (of similar substance) but not homoousios (of the same substance) as the Father.',
    why: 'A created saviour cannot truly save. Only God can forgive sins, conquer death, and unite humanity to the divine nature (2 Pet. 1:4). The Nicene Creed defines the Son as "of one substance (homoousios) with the Father."',
    severity: 'Major',
  },
  {
    yearNum: 360,
    year: 'c. 360–381',
    name: 'Apollinarianism',
    condemned: 'First Council of Constantinople (381)',
    taught: 'To avoid a dual-person Christ, Apollinaris of Laodicea taught that the divine Logos replaced the rational human soul (nous) of Christ. Christ had a human body and animal soul, but his mind was divine. He was not fully human.',
    why: 'Gregory of Nazianzus: "That which is not assumed is not healed." If Christ did not take on a full human nature, including a human rational soul, then human minds are not redeemed by the Incarnation.',
    severity: 'Major',
  },
  {
    yearNum: 362,
    year: 'c. 360–381',
    name: 'Macedonianism (Pneumatomachi)',
    condemned: 'First Council of Constantinople (381)',
    taught: 'While accepting the full divinity of the Son, this group ("Spirit-fighters") denied the full divinity of the Holy Spirit. The Spirit is a created being, subordinate to and of a different substance from the Father and Son.',
    why: 'Baptism is in the name of Father, Son, and Holy Spirit equally (Matt. 28:19). The Spirit searches the depths of God (1 Cor. 2:10–11), dwells in believers as God (1 Cor. 3:16), and cannot be a creature among creatures. The Creed expanded: the Spirit is "Lord and giver of life… who with the Father and Son is worshipped and glorified."',
    severity: 'Major',
  },
  {
    yearNum: 400,
    year: 'c. 400–431',
    name: 'Pelagianism',
    condemned: 'Councils of Carthage (411, 416, 418); affirmed by Pope Innocent I and Zosimus; Council of Ephesus (431)',
    taught: 'Adam\'s sin affected only himself, not human nature. All people are born with the same capacity for good as Adam. Grace is external assistance (teaching, example, forgiveness) not an internal transformation. Human free will alone can achieve righteousness and merit salvation.',
    why: 'Destroys the need for grace as Paul describes it (Rom. 5:12–21; Eph. 2:1–9). If humans are not fallen in nature, Christ\'s death is merely exemplary, not salvific. The universal practice of infant baptism for "remission of sins" also presupposes original sin.',
    severity: 'Major',
  },
  {
    yearNum: 428,
    year: '428–431',
    name: 'Nestorianism',
    condemned: 'Council of Ephesus (431)',
    taught: 'Nestorius (Patriarch of Constantinople) objected to calling Mary Theotokos (God-bearer), preferring Christotokos (Christ-bearer). In his theology, the divine and human in Christ were so distinct as to constitute two separate persons loosely conjoined — a divine person and a human person.',
    why: 'If Christ is two persons, then it was only the human person who suffered and died, not God the Son. Salvation requires the second person of the Trinity to truly suffer in human flesh. Cyril of Alexandria: the union of natures is "hypostatic" — one person in two natures, not two persons joined by will.',
    severity: 'Major',
  },
  {
    yearNum: 448,
    year: '448–451',
    name: 'Eutychianism (Monophysitism)',
    condemned: 'Council of Chalcedon (451)',
    taught: 'Eutyches of Constantinople over-corrected against Nestorianism by teaching that after the Incarnation Christ had only one nature — his human nature was absorbed into or overwhelmed by the divine, like a drop of honey in the ocean. Christ is "of two natures" before the union, but "in one nature" after.',
    why: 'If Christ\'s humanity is absorbed, he did not truly experience human suffering, temptation, or death, and cannot fully redeem what he did not truly assume. Chalcedon defined Christ in two natures "without confusion, without change, without division, without separation."',
    severity: 'Major',
  },
  {
    yearNum: 500,
    year: 'c. 500–529',
    name: 'Semi-Pelagianism',
    condemned: 'Second Council of Orange (529)',
    taught: 'A mediating position: agreed that grace is necessary for salvation, but taught that the initial movement of faith — "the beginning of faith" — arises from unaided human free will. God then responds to this first step with saving grace. Faith is initiated by man, completed by God.',
    why: 'Even the first desire toward God is itself a gift of grace (Phil. 2:13; John 6:44, 65). Orange affirmed that prevenient grace must precede and enable even the first act of turning toward God, against any notion that man takes the first step independently.',
    severity: 'Significant',
  },
  {
    yearNum: 519,
    year: 'c. 519–553',
    name: 'Origenism',
    condemned: 'Local synod of Constantinople (543); Second Council of Constantinople (553)',
    taught: 'Drawn from Origen of Alexandria: all rational souls pre-existed in a spiritual state and fell into bodies as punishment. At the end of history, all beings — including Satan and demons — will be restored to God (apokatastasis). Hell is temporary and purgatorial for all.',
    why: 'Scripture teaches eternal judgment for the wicked (Matt. 25:46; Rev. 20:10). The pre-existence of souls contradicts creation of the whole person by God. Universal restoration of demons removes moral accountability and contradicts Christ\'s explicit teaching on eternal fire.',
    severity: 'Significant',
  },
  {
    yearNum: 630,
    year: 'c. 630–681',
    name: 'Monothelitism',
    condemned: 'Third Council of Constantinople (680–681)',
    taught: 'As a political compromise to reconcile Monophysites, Monothelitism taught that while Christ has two natures (conceding Chalcedon), he has only one will — a single divine-human will. Promoted by Emperor Heraclius and endorsed, controversially, by Pope Honorius I.',
    why: 'Maximus the Confessor argued: Christ\'s human will is essential for our redemption. In Gethsemane, "not my will but yours" (Luke 22:42) shows a real human will submitting to the divine will — a genuine act of obedience that redeems human willing. A Christ without a human will cannot redeem human willing.',
    severity: 'Major',
  },
  {
    yearNum: 726,
    year: '726–787',
    name: 'Iconoclasm',
    condemned: 'Second Council of Nicaea (787)',
    taught: 'Initiated by Emperor Leo III: all images (icons) of Christ, the Virgin, and saints must be destroyed as idolatry forbidden by the second commandment. Iconoclasts argued the divine nature cannot be depicted and that veneration of images is indistinguishable from pagan idol worship.',
    why: 'John of Damascus: the Incarnation itself vindicates images. God, who forbade images of the invisible God, has made himself visible in Christ (Col. 1:15). An icon of Christ depicts his human nature, not his divine nature. The council distinguished latreia (worship due to God alone) from proskynesis (venerable honour given to icons, saints, and the Cross).',
    severity: 'Major',
  },
]

function HeresyCard({ heresy, s, colors }: { heresy: Heresy; s: ReturnType<typeof makeStyles>; colors: import('../theme/themes').ThemeColors }) {
  const [showWhy, setShowWhy] = useState(false)
  const badge = BADGE_COLOR[heresy.severity]

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setShowWhy(w => !w)
  }

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.cardName}>{heresy.name}</Text>
        <Text style={s.cardYear}>{heresy.year}</Text>
      </View>
      <View style={s.meta}>
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeText, { color: badge.text }]}>{heresy.severity}</Text>
        </View>
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoLabel}>Condemned by</Text>
        <Text style={s.infoText}>{heresy.condemned}</Text>
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoLabel}>What it taught</Text>
        <Text style={s.infoText}>{heresy.taught}</Text>
      </View>

      {showWhy && (
        <View style={s.infoBox}>
          <Text style={s.infoLabel}>Why condemned</Text>
          <Text style={s.infoText}>{heresy.why}</Text>
        </View>
      )}

      <TouchableOpacity style={s.expandBtn} onPress={toggle} activeOpacity={0.7}>
        <Ionicons
          name={showWhy ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.accent}
        />
        <Text style={s.expandLabel}>{showWhy ? 'Hide reasoning' : 'Why condemned'}</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function HeresiesPanel() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HERESIES
    return HERESIES.filter(h =>
      h.name.toLowerCase().includes(q) ||
      h.taught.toLowerCase().includes(q) ||
      h.why.toLowerCase().includes(q) ||
      h.condemned.toLowerCase().includes(q) ||
      h.year.toLowerCase().includes(q)
    )
  }, [query])

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Filter heresies…"
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
        keyExtractor={h => h.name}
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <HeresyCard heresy={item} s={s} colors={colors} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No heresies match "{query}"</Text>
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
  searchInput: {
    flex: 1, fontSize: 14, color: c.textPrimary,
  },

  list: { padding: 12, paddingTop: 8, paddingBottom: 40, gap: 10 },

  card: {
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700', color: c.textAccent, marginRight: 8 },
  cardYear: { fontSize: 12, color: c.textMuted, fontWeight: '600' },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  infoBox: { backgroundColor: c.bgTertiary, borderRadius: 8, padding: 10, gap: 3 },
  infoLabel: {
    fontSize: 10, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoText: { fontSize: 13, lineHeight: 19, color: c.textSecondary },

  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 2,
  },
  expandLabel: { fontSize: 13, color: c.accent, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: c.textMuted },
})
