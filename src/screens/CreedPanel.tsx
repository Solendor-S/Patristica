import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList, LayoutAnimation, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'

type CreedType = 'Trinitarian' | 'Christological' | 'Soteriological'

interface Creed {
  yearNum: number
  year: string
  name: string
  council: string
  heresyAddressed: string
  type: CreedType
  fullText: string
  historicalNotes: string
}

const BADGE_COLOR: Record<CreedType, { bg: string; text: string }> = {
  Trinitarian:    { bg: 'rgba(90,136,196,0.18)',  text: '#5a88c4' },
  Christological: { bg: 'rgba(201,164,90,0.18)',  text: '#c9a45a' },
  Soteriological: { bg: 'rgba(90,168,120,0.18)',  text: '#5aa878' },
}

const CREEDS: Creed[] = [
  {
    yearNum: 150,
    year: 'c. 2nd century',
    name: "Apostles' Creed",
    council: 'Developed gradually in the Western church; current form c. 8th century',
    heresyAddressed: 'Gnosticism, Docetism',
    type: 'Christological',
    fullText:
      'I believe in God, the Father Almighty,\n' +
      '  Creator of heaven and earth.\n\n' +
      'I believe in Jesus Christ, His only Son, our Lord.\n' +
      '  He was conceived by the power of the Holy Spirit\n' +
      '    and born of the Virgin Mary.\n' +
      '  He suffered under Pontius Pilate,\n' +
      '    was crucified, died, and was buried.\n' +
      '  He descended to the dead.\n' +
      '  On the third day He rose again.\n' +
      '  He ascended into heaven,\n' +
      '    and is seated at the right hand of the Father.\n' +
      '  He will come again to judge the living and the dead.\n\n' +
      'I believe in the Holy Spirit,\n' +
      '  the holy catholic Church,\n' +
      '  the communion of saints,\n' +
      '  the forgiveness of sins,\n' +
      '  the resurrection of the body,\n' +
      '  and the life everlasting. Amen.',
    historicalNotes:
      'The earliest form of this creed—the Old Roman Symbol—was used as a baptismal interrogation (question-and-answer) in Rome by the 2nd century. Its articles directly counter Gnostic denials: "Creator of heaven and earth" (against the evil Demiurge), "born of the Virgin Mary" and "suffered under Pontius Pilate" (against Docetism\'s phantom Christ), "resurrection of the body" (against the Gnostic rejection of material creation). The creed was never defined by an ecumenical council but achieved universal acceptance in the Western church.',
  },
  {
    yearNum: 325,
    year: '325 AD',
    name: 'Nicene Creed',
    council: 'First Council of Nicaea (325 AD)',
    heresyAddressed: 'Arianism',
    type: 'Trinitarian',
    fullText:
      'We believe in one God, the Father Almighty,\n' +
      '  Maker of all things visible and invisible.\n\n' +
      'And in one Lord Jesus Christ, the Son of God,\n' +
      '  begotten of the Father, Light of Light,\n' +
      '  very God of very God,\n' +
      '  begotten, not made,\n' +
      '  being of one substance (homoousios) with the Father;\n' +
      '  by whom all things were made;\n' +
      '  who for us men, and for our salvation,\n' +
      '    came down and was incarnate and was made man;\n' +
      '  he suffered, and the third day he rose again,\n' +
      '    ascended into heaven;\n' +
      '  from thence he shall come to judge the quick and the dead.\n\n' +
      'And in the Holy Ghost.\n\n' +
      '[Anathema: Those who say "There was a time when he was not," or "He was not before he was made," or "He was made out of nothing," or "He is of another substance or essence"—the Catholic and Apostolic Church anathematizes them.]',
    historicalNotes:
      'Convened by Emperor Constantine to settle the Arian controversy. The key word homoousios ("of one substance") was championed by Bishop Alexander of Alexandria and his deacon Athanasius. Arius taught that the Son was the first and greatest creature—"there was a time when he was not." The council condemned this with a near-unanimous vote (reportedly only 2 bishops refusing to sign). The anathemas at the end are part of the original 325 text; the later 381 creed dropped them. Athanasius spent the next decades defending homoousios, suffering five exiles—hence "Athanasius contra mundum" (Athanasius against the world).',
  },
  {
    yearNum: 381,
    year: '381 AD',
    name: 'Niceno-Constantinopolitan Creed',
    council: 'First Council of Constantinople (381 AD)',
    heresyAddressed: 'Arianism (refined), Macedonianism',
    type: 'Trinitarian',
    fullText:
      'We believe in one God, the Father Almighty,\n' +
      '  maker of heaven and earth,\n' +
      '  and of all things visible and invisible.\n\n' +
      'And in one Lord Jesus Christ,\n' +
      '  the only-begotten Son of God,\n' +
      '  begotten of the Father before all worlds,\n' +
      '  Light of Light, very God of very God,\n' +
      '  begotten, not made,\n' +
      '  being of one substance with the Father;\n' +
      '  by whom all things were made;\n' +
      '  who, for us men and for our salvation,\n' +
      '    came down from heaven,\n' +
      '    and was incarnate by the Holy Ghost of the Virgin Mary,\n' +
      '    and was made man;\n' +
      '  and was crucified also for us under Pontius Pilate;\n' +
      '  he suffered and was buried;\n' +
      '  and the third day he rose again, according to the Scriptures;\n' +
      '  and ascended into heaven,\n' +
      '    and sitteth on the right hand of the Father;\n' +
      '  and he shall come again, with glory,\n' +
      '    to judge the quick and the dead;\n' +
      '  whose kingdom shall have no end.\n\n' +
      'And in the Holy Ghost,\n' +
      '  the Lord and Giver of Life;\n' +
      '  who proceedeth from the Father;\n' +
      '  who with the Father and the Son together\n' +
      '    is worshipped and glorified;\n' +
      '  who spake by the Prophets.\n\n' +
      'And in one Holy Catholic and Apostolic Church.\n' +
      'We acknowledge one Baptism for the remission of sins;\n' +
      'and we look for the resurrection of the dead,\n' +
      '  and the life of the world to come. Amen.',
    historicalNotes:
      'This is the creed recited in liturgy worldwide today—what most Christians call "the Nicene Creed" is technically this 381 expansion. The council addressed two gaps left at Nicaea: (1) Apollinarianism (Christ lacked a human soul) and (2) Macedonianism—the "Spirit-fighters" who accepted the Son\'s divinity but denied the Spirit\'s. The greatly expanded third article ("the Lord and Giver of Life… worshipped and glorified with the Father and Son") directly countered this. The controversial Filioque ("and the Son") clause—affirming that the Spirit proceeds from both Father and Son—was added by Western churches by the 6th century and became a central cause of the Great Schism (1054).',
  },
  {
    yearNum: 451,
    year: '451 AD',
    name: 'Chalcedonian Definition',
    council: 'Council of Chalcedon (451 AD)',
    heresyAddressed: 'Nestorianism, Eutychianism',
    type: 'Christological',
    fullText:
      'Following, then, the holy Fathers, we all unanimously teach that our Lord Jesus Christ is to us\n' +
      '  One and the same Son,\n' +
      '  the Self-same Perfect in Godhead,\n' +
      '  the Self-same Perfect in Manhood;\n' +
      '  truly God and truly Man;\n' +
      '  the Self-same of a rational soul and body;\n' +
      '  co-essential with the Father according to the Godhead,\n' +
      '  the Self-same co-essential with us according to the Manhood;\n' +
      '  like us in all things, sin apart;\n' +
      '  before the ages begotten of the Father as to the Godhead,\n' +
      '  but in the last days, the Self-same,\n' +
      '    for us and for our salvation born of Mary the Virgin Theotokos\n' +
      '    as to the Manhood;\n\n' +
      'One and the Same Christ, Son, Lord, Only-begotten;\n' +
      '  acknowledged in Two Natures\n' +
      '    unconfusedly, unchangeably, indivisibly, inseparably;\n' +
      '  the difference of the Natures being in no way removed\n' +
      '    because of the Union,\n' +
      '  but rather the properties of each Nature being preserved,\n' +
      '  and both concurring into One Person and One Hypostasis;\n' +
      '  not as though He was parted or divided into Two Persons,\n' +
      '  but One and the Self-same Son\n' +
      '    and Only-begotten God, Word, Lord, Jesus Christ.',
    historicalNotes:
      'The four adverbs—"unconfusedly, unchangeably, indivisibly, inseparably"—are the theological heart of Chalcedon. The first two ("unconfusedly, unchangeably") exclude Eutychianism: the two natures are not blended or absorbed into one. The last two ("indivisibly, inseparably") exclude Nestorianism: the two natures are not split into two separate persons. The council also affirmed Mary as Theotokos (God-bearer), repudiating Nestorius\'s preferred Christotokos. Three major Eastern churches (Oriental Orthodox: Coptic, Ethiopian, Armenian) rejected Chalcedon as Nestorian and remain non-Chalcedonian to this day, though modern ecumenical dialogue has largely resolved the underlying theological differences as terminological.',
  },
  {
    yearNum: 500,
    year: 'c. 5th century',
    name: 'Athanasian Creed',
    council: 'No council; Western church composition, attributed to Athanasius but likely c. 500 AD',
    heresyAddressed: 'Arianism, Apollinarianism, Nestorianism, Eutychianism, Modalism',
    type: 'Trinitarian',
    fullText:
      'Whosoever will be saved, before all things it is necessary that he hold the Catholic Faith.\n' +
      'Which Faith except every one do keep whole and undefiled,\n' +
      '  without doubt he shall perish everlastingly.\n\n' +
      'And the Catholic Faith is this:\n' +
      '  That we worship one God in Trinity, and Trinity in Unity;\n' +
      '  Neither confounding the Persons; nor dividing the Substance.\n\n' +
      'For there is one Person of the Father;\n' +
      '  another of the Son;\n' +
      '  and another of the Holy Ghost.\n\n' +
      'But the Godhead of the Father, of the Son, and of the Holy Ghost,\n' +
      '  is all one; the Glory equal, the Majesty coeternal.\n\n' +
      'Such as the Father is; such is the Son; and such is the Holy Ghost.\n' +
      'The Father uncreated; the Son uncreated; and the Holy Ghost uncreated.\n' +
      'The Father unlimited; the Son unlimited; and the Holy Ghost unlimited.\n' +
      'The Father eternal; the Son eternal; and the Holy Ghost eternal.\n' +
      'And yet they are not three eternals; but one eternal.\n' +
      'As also there are not three uncreated; nor three infinites,\n' +
      '  but one uncreated; and one infinite.\n' +
      'So likewise the Father is Almighty; the Son Almighty;\n' +
      '  and the Holy Ghost Almighty.\n' +
      'And yet they are not three Almighties; but one Almighty.\n\n' +
      'So the Father is God; the Son is God; and the Holy Ghost is God.\n' +
      'And yet they are not three Gods; but one God.\n' +
      'So likewise the Father is Lord; the Son Lord; and the Holy Ghost Lord.\n' +
      'And yet not three Lords; but one Lord.\n\n' +
      'For like as we are compelled by the Christian verity\n' +
      '  to acknowledge every Person by himself to be God and Lord;\n' +
      'So are we forbidden by the Catholic Religion\n' +
      '  to say, There are three Gods, or three Lords.\n\n' +
      'The Father is made of none; neither created, nor begotten.\n' +
      'The Son is of the Father alone; not made, nor created; but begotten.\n' +
      'The Holy Ghost is of the Father and of the Son;\n' +
      '  neither made, nor created, nor begotten; but proceeding.\n\n' +
      'So there is one Father, not three Fathers;\n' +
      '  one Son, not three Sons;\n' +
      '  one Holy Ghost, not three Holy Ghosts.\n\n' +
      'And in this Trinity none is before, or after another;\n' +
      '  none is greater, or less than another.\n' +
      'But the whole three Persons are coeternal, and coequal.\n\n' +
      'He therefore that will be saved, let him thus think of the Trinity.\n\n' +
      'Furthermore, it is necessary to everlasting salvation\n' +
      '  that he also believe faithfully the Incarnation of our Lord Jesus Christ.\n\n' +
      'For the right Faith is, that we believe and confess\n' +
      '  that our Lord Jesus Christ, the Son of God, is God and Man;\n' +
      'God, of the Substance of the Father; begotten before the worlds;\n' +
      '  and Man, of the Substance of his Mother, born in the world.\n' +
      'Perfect God; and perfect Man,\n' +
      '  of a reasonable soul and human flesh subsisting.\n' +
      'Equal to the Father, as touching his Godhead;\n' +
      '  and inferior to the Father as touching his Manhood.\n\n' +
      'Who although he is God and Man;\n' +
      '  yet he is not two, but one Christ.\n' +
      'One; not by conversion of the Godhead into flesh;\n' +
      '  but by assumption of the Manhood into God.\n' +
      'One altogether; not by confusion of Substance;\n' +
      '  but by unity of Person.\n\n' +
      'For as the reasonable soul and flesh is one man;\n' +
      '  so God and Man is one Christ;\n' +
      'Who suffered for our salvation;\n' +
      '  descended into hell;\n' +
      '  rose again the third day from the dead.\n' +
      'He ascended into heaven,\n' +
      '  he sitteth on the right hand of the Father God Almighty.\n' +
      'From whence he will come to judge the quick and the dead.\n\n' +
      'At whose coming all men will rise again with their bodies;\n' +
      '  and shall give account for their own works.\n' +
      'And they that have done good shall go into life everlasting;\n' +
      '  and they that have done evil, into everlasting fire.\n\n' +
      'This is the Catholic Faith;\n' +
      '  which except a man believe truly and firmly, he cannot be saved.',
    historicalNotes:
      'Despite being named after Athanasius of Alexandria (d. 373), modern scholarship is unanimous that he did not write it—it is Latin in origin, and Athanasius wrote in Greek. It was likely composed in southern Gaul c. 500 AD. The creed is unique in its opening and closing damnatory clauses ("whosoever will be saved… without doubt he shall perish everlastingly"), making it the most precise and demanding of the three ecumenical creeds. It was widely used in Western liturgy from the 9th century. The creed systematically enumerates every Trinitarian and Christological error, combining elements refuted at Nicaea (Arianism), Constantinople (Macedonianism, Apollinarianism), Ephesus (Nestorianism), and Chalcedon (Eutychianism).',
  },
]

// ── Cross-reference link patterns ────────────────────────
const HERESY_LINK_PATTERNS = [
  'Semi-Pelagianism', 'Apollinarianism', 'Macedonianism',
  'Monothelitism', 'Eutychianism', 'Nestorianism', 'Novatianism',
  'Adoptionism', 'Gnosticism', 'Iconoclasm', 'Docetism',
  'Modalism', 'Arianism', 'Donatism', 'Pelagianism', 'Origenism',
]
const COUNCIL_LINK_PATTERNS = [
  'First Council of Constantinople',
  'Third Council of Constantinople',
  'Second Council of Constantinople',
  'Fourth Council of Constantinople',
  'Second Council of Nicaea',
  'First Council of Nicaea',
  'Second Council of Orange',
  'Council of Chalcedon',
  'Council of Alexandria',
  'Council of Carthage',
  'Council of Ephesus',
  'Council of Antioch',
  'Council of Arles',
  'Council of Hippo',
]
const _linkRe = new RegExp(
  `(${[...HERESY_LINK_PATTERNS, ...COUNCIL_LINK_PATTERNS]
    .map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'g',
)

function renderWithLinks(
  text: string,
  textStyle: any,
  accentColor: string,
  onHeresyPress?: (name: string) => void,
  onCouncilPress?: (name: string) => void,
): React.ReactElement {
  const parts = text.split(_linkRe)
  if (parts.length === 1) return <Text style={textStyle}>{text}</Text>
  return (
    <Text style={textStyle}>
      {parts.map((part, i) => {
        const linkStyle = { color: accentColor, textDecorationLine: 'underline' as const }
        if (HERESY_LINK_PATTERNS.includes(part) && onHeresyPress)
          return <Text key={i} style={linkStyle} onPress={() => onHeresyPress(part)} suppressHighlighting>{part}</Text>
        if (COUNCIL_LINK_PATTERNS.includes(part) && onCouncilPress)
          return <Text key={i} style={linkStyle} onPress={() => onCouncilPress(part)} suppressHighlighting>{part}</Text>
        return <Text key={i}>{part}</Text>
      })}
    </Text>
  )
}

function CreedCard({
  creed, s, colors, forceExpand, onHeresyPress, onCouncilPress,
}: {
  creed: Creed
  s: ReturnType<typeof makeStyles>
  colors: import('../theme/themes').ThemeColors
  forceExpand?: boolean
  onHeresyPress?: (name: string) => void
  onCouncilPress?: (name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (forceExpand && !expanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setExpanded(true)
    }
  }, [forceExpand])
  const badge = BADGE_COLOR[creed.type]

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.cardName}>{creed.name}</Text>
        <Text style={s.cardYear}>{creed.year}</Text>
      </View>

      <View style={s.meta}>
        <View style={[s.badge, { backgroundColor: badge.bg }]}>
          <Text style={[s.badgeText, { color: badge.text }]}>{creed.type}</Text>
        </View>
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoLabel}>Issued by</Text>
        {renderWithLinks(creed.council, s.infoText, colors.accent, onHeresyPress, onCouncilPress)}
      </View>

      <View style={s.infoBox}>
        <Text style={s.infoLabel}>Heresy addressed</Text>
        {renderWithLinks(creed.heresyAddressed, s.infoText, colors.accent, onHeresyPress, onCouncilPress)}
      </View>

      {expanded && (
        <>
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Creed text</Text>
            <ScrollView style={s.creedScroll} nestedScrollEnabled>
              <Text style={s.creedText}>{creed.fullText}</Text>
            </ScrollView>
          </View>

          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Historical context</Text>
            <Text style={s.infoText}>{creed.historicalNotes}</Text>
          </View>
        </>
      )}

      <TouchableOpacity style={s.expandBtn} onPress={toggle} activeOpacity={0.7}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.accent}
        />
        <Text style={s.expandLabel}>{expanded ? 'Hide creed' : 'Show creed text'}</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function CreedPanel({ jumpTo, onHeresyPress, onCouncilPress }: {
  jumpTo?: string
  onHeresyPress?: (name: string) => void
  onCouncilPress?: (name: string) => void
}) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [query, setQuery] = useState('')
  const listRef = useRef<FlatList>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CREEDS
    return CREEDS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.heresyAddressed.toLowerCase().includes(q) ||
      c.council.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q) ||
      c.year.toLowerCase().includes(q) ||
      c.historicalNotes.toLowerCase().includes(q)
    )
  }, [query])

  // Scroll to and expand the target creed when jumpTo is set
  useEffect(() => {
    if (!jumpTo) return
    const idx = filtered.findIndex(c => c.name === jumpTo)
    if (idx < 0) return
    // Small delay lets the list finish its first layout pass
    const tid = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.1 })
    }, 120)
    return () => clearTimeout(tid)
  }, [jumpTo, filtered])

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Filter creeds…"
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
        ref={listRef}
        data={filtered}
        keyExtractor={c => c.name}
        style={{ flex: 1 }}
        contentContainerStyle={s.list}
        keyboardShouldPersistTaps="handled"
        onScrollToIndexFailed={({ averageItemLength, index }) => {
          listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: false })
          setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.1 }), 100)
        }}
        renderItem={({ item }) => (
          <CreedCard
            creed={item}
            s={s}
            colors={colors}
            forceExpand={jumpTo === item.name}
            onHeresyPress={onHeresyPress}
            onCouncilPress={onCouncilPress}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyText}>No creeds match "{query}"</Text>
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

  creedScroll: { maxHeight: 280 },
  creedText: {
    fontSize: 13, lineHeight: 21, color: c.textSecondary,
    fontFamily: 'serif',
  },

  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: 2,
  },
  expandLabel: { fontSize: 13, color: c.accent, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: c.textMuted },
})
