import React, { useMemo, useState } from 'react'
import {
  LayoutAnimation, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'

// ── Types ────────────────────────────────────────────────

type BookStatus = 'Accepted' | 'Disputed' | 'Rejected'
type Era = 'Pre-Nicene' | 'Nicene' | 'Post-Nicene'

interface DisputedBook {
  name: string
  testament: 'NT' | 'OT'
  status: Record<Era, BookStatus>
  notes: string
}

interface CanonMilestone {
  yearNum: number
  year: string
  event: string
  significance: string
}

interface PrimarySource {
  title: string
  year: string
  text: string
}

// ── Data ─────────────────────────────────────────────────

const DISPUTED_BOOKS: DisputedBook[] = [
  {
    name: 'Hebrews',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Disputed', 'Nicene': 'Disputed', 'Post-Nicene': 'Accepted' },
    notes: 'Authorship contested (Pauline? Apollos? Priscilla?). Accepted in the East before the West; doubted by Origen ("only God knows who wrote it"). Athanasius included it; Jerome resolved Western doubts.',
  },
  {
    name: 'James',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Disputed', 'Nicene': 'Disputed', 'Post-Nicene': 'Accepted' },
    notes: 'Eusebius listed it as disputed. Some questioned apostolic authorship. Luther famously called it "an epistle of straw" for its emphasis on works, but it was universally accepted by the 5th century.',
  },
  {
    name: '2 Peter',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Disputed', 'Nicene': 'Disputed', 'Post-Nicene': 'Accepted' },
    notes: 'Most disputed NT letter. Origen knew it was questioned. Eusebius listed it as disputed (antilegomena). Its vocabulary and style differ markedly from 1 Peter. Accepted by the late 4th century.',
  },
  {
    name: '2 John',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Disputed', 'Nicene': 'Disputed', 'Post-Nicene': 'Accepted' },
    notes: 'Questioned because of its brief length and the anonymous authorial title "the elder." Eusebius classified both 2 and 3 John as disputed. Universally accepted by Chalcedon.',
  },
  {
    name: '3 John',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Disputed', 'Nicene': 'Disputed', 'Post-Nicene': 'Accepted' },
    notes: 'Same questions as 2 John. The shortest NT book. Listed among the antilegomena by Eusebius. Accepted by the late 4th century.',
  },
  {
    name: 'Jude',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Disputed', 'Nicene': 'Disputed', 'Post-Nicene': 'Accepted' },
    notes: 'Questioned because it quotes 1 Enoch (v. 14) and the Assumption of Moses (v. 9), non-canonical Jewish texts. Origen knew it was doubted. Accepted by Athanasius and the later councils.',
  },
  {
    name: 'Revelation',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Disputed', 'Nicene': 'Disputed', 'Post-Nicene': 'Accepted' },
    notes: 'The most contested book in church history. Rejected by Dionysius of Alexandria, Eusebius, and most Eastern churches well into the 4th century. Rejected as non-apostolic by some Eastern churches until the 9th century. Athanasius\'s 367 letter was decisive in the West. Still not read in the Eastern Orthodox lectionary.',
  },
  {
    name: 'Shepherd of Hermas',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Accepted', 'Nicene': 'Disputed', 'Post-Nicene': 'Rejected' },
    notes: 'Widely read and treated as Scripture by Irenaeus, Clement of Alexandria, and Origen. Included in the Codex Sinaiticus (4th century). Eusebius listed it as disputed. Athanasius\'s 367 letter excluded it. Gradually removed from the canon.',
  },
  {
    name: '1 Clement',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Accepted', 'Nicene': 'Disputed', 'Post-Nicene': 'Rejected' },
    notes: 'Treated as Scripture by some early fathers. Included in the Codex Alexandrinus (5th century). Eusebius listed it as disputed. Excluded by Athanasius\'s 367 letter. Valuable as the earliest post-apostolic Christian letter (c. 96 AD).',
  },
  {
    name: 'Didache',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Accepted', 'Nicene': 'Disputed', 'Post-Nicene': 'Rejected' },
    notes: 'Referred to as Scripture by Clement of Alexandria and Origen. Eusebius listed it as a rejected spurious book. Athanasius excluded it. Rediscovered in 1873 in Constantinople after being lost for centuries.',
  },
  {
    name: 'Epistle of Barnabas',
    testament: 'NT',
    status: { 'Pre-Nicene': 'Accepted', 'Nicene': 'Rejected', 'Post-Nicene': 'Rejected' },
    notes: 'Quoted as Scripture by Clement of Alexandria. Included in the Codex Sinaiticus after Revelation. Origen and Eusebius regarded it as spurious. Excluded by Athanasius.',
  },
  {
    name: 'Wisdom of Solomon',
    testament: 'OT',
    status: { 'Pre-Nicene': 'Accepted', 'Nicene': 'Disputed', 'Post-Nicene': 'Disputed' },
    notes: 'Part of the Greek LXX but absent from the Hebrew canon. Quoted as Scripture by Irenaeus. Jerome excluded it from his Hebrew-only Vulgate canon. Augustine and the Council of Carthage (397) included it. Remains in Catholic and Orthodox OT; excluded in Protestant.',
  },
  {
    name: 'Sirach (Ecclesiasticus)',
    testament: 'OT',
    status: { 'Pre-Nicene': 'Accepted', 'Nicene': 'Disputed', 'Post-Nicene': 'Disputed' },
    notes: 'Present in the LXX. Frequently quoted by early fathers. Jerome\'s Vulgate placed it among the "ecclesiastical books" (useful but not canonical). Status remains divided between Catholic/Orthodox (canonical) and Protestant (Apocrypha).',
  },
]

const MILESTONES: CanonMilestone[] = [
  {
    yearNum: 170,
    year: 'c. 170 AD',
    event: 'Muratorian Fragment',
    significance:
      'Earliest surviving canon list, discovered by Ludovico Muratori in 1740. Lists the 4 Gospels, Acts, 13 Pauline epistles, Jude, 1-2 John, Revelation, and Wisdom of Solomon as accepted. Explicitly rejects the Shepherd of Hermas for public reading (but allows private reading) and rejects the Epistle to the Laodiceans. Excludes Hebrews, James, 1-2 Peter, 3 John.',
  },
  {
    yearNum: 250,
    year: 'c. 250 AD',
    event: "Origen's Canon Discussion",
    significance:
      'Origen (c. 184–253) was the first to distinguish clearly between "acknowledged" books and "disputed" books (antilegomena). He accepted as undisputed: the four Gospels, Acts, 13 Pauline epistles, 1 Peter, 1 John, Revelation. He noted Hebrews, 2 Peter, 2-3 John, Jude, James, Barnabas, Hermas, and Didache were disputed. His work Hexapla also established critical OT text scholarship.',
  },
  {
    yearNum: 325,
    year: 'c. 313–325 AD',
    event: "Eusebius's Three Categories",
    significance:
      "In his Ecclesiastical History (c. 313–325), Eusebius of Caesarea proposed a three-part classification: (1) Accepted (homologoumena): the four Gospels, Acts, Pauline epistles, 1 John, 1 Peter, possibly Revelation; (2) Disputed (antilegomena): James, Jude, 2 Peter, 2-3 John; (3) Rejected (notha): Acts of Paul, Shepherd of Hermas, Apocalypse of Peter, Epistle of Barnabas, Didache, possibly Revelation. Eusebius's framework became the standard reference for subsequent canon discussions.",
  },
  {
    yearNum: 367,
    year: '367 AD',
    event: "Athanasius's 39th Festal Letter",
    significance:
      "In his annual Easter letter to Egyptian churches, Athanasius of Alexandria listed exactly the 27 books now in the NT—the first document to do so. He explicitly named them as 'canonized' (kanonizomena) and distinguished them from 'apocryphal' writings. He included the 39 OT books of the Hebrew canon. His list is the first to match the modern Protestant Bible exactly. This letter was decisive for the Western churches.",
  },
  {
    yearNum: 397,
    year: '393–397 AD',
    event: 'North African Councils (Hippo & Carthage)',
    significance:
      "The Council of Hippo (393) and Council of Carthage (397), attended by Augustine of Hippo, ratified the 27-book NT canon and an OT canon including the deuterocanonical books (Tobit, Judith, 1-2 Maccabees, Wisdom, Sirach, Baruch). These councils gave formal regional authority to what Athanasius had established. Their canon became the standard for the Western Latin church and was confirmed at Trent (1546) for the Catholic Church.",
  },
]

const PRIMARY_SOURCES: PrimarySource[] = [
  {
    title: "Athanasius's 39th Festal Letter (367 AD) — NT canon",
    year: '367 AD',
    text:
      'Again it is not tedious to speak of the [books] of the New Testament. These are, the four Gospels, according to Matthew, Mark, Luke, and John. Afterwards, the Acts of the Apostles and Epistles (called Catholic), seven, viz. of James, one; of Peter, two; of John, three; after these, one of Jude. In addition, there are fourteen Epistles of Paul, written in this order. The first, to the Romans; then two to the Corinthians; after these, to the Galatians; next, to the Ephesians; then to the Philippians; then to the Colossians; after these, two to the Thessalonians, and that to the Hebrews; and again, two to Timothy; one to Titus; and lastly, that to Philemon. And besides, the Revelation of John.\n\nThese are fountains of salvation, that they who thirst may be satisfied with the living words they contain. In these alone is proclaimed the doctrine of godliness. Let no man add to these, neither let him take ought from these.',
  },
  {
    title: 'Muratorian Fragment (c. 170 AD) — excerpt',
    year: 'c. 170 AD',
    text:
      '…at which nevertheless he was present, and so he placed [them in his narrative]. The third book of the Gospel is that according to Luke. Luke, the well-known physician, after the ascension of Christ, when Paul had taken with him as one zealous for the law, composed it in his own name, according to [the general] belief. Yet he himself had not seen the Lord in the flesh; and therefore, as he was able to ascertain events, so indeed he begins to tell the story from the birth of John.\n\nThe fourth of the Gospels is that of John, [one] of the disciples…\n\nThe Shepherd [of Hermas] he wrote quite lately, in our times, in the city of Rome, while bishop Pius, his brother, was occupying the [episcopal] chair of the church of the city of Rome. And therefore it ought indeed to be read; but it cannot be read publicly to the people in church either among the Prophets, whose number is complete, or among the Apostles, for it is after [their] time.',
  },
]

// ── Status chip colors ────────────────────────────────────

const STATUS_COLOR: Record<BookStatus, { bg: string; text: string }> = {
  Accepted: { bg: 'rgba(90,168,120,0.20)', text: '#5aa878' },
  Disputed: { bg: 'rgba(196,164,90,0.20)', text: '#c4a45a' },
  Rejected: { bg: 'rgba(196,90,90,0.20)',  text: '#c45a5a' },
}

const ERAS: Era[] = ['Pre-Nicene', 'Nicene', 'Post-Nicene']

// ── Sub-components ────────────────────────────────────────

function SectionHeader({ title, s }: { title: string; s: ReturnType<typeof makeStyles> }) {
  return <Text style={s.sectionHeader}>{title}</Text>
}

function DisputedBookRow({
  book, s,
}: {
  book: DisputedBook
  s: ReturnType<typeof makeStyles>
}) {
  const [expanded, setExpanded] = useState(false)
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }

  return (
    <TouchableOpacity style={s.disputedRow} onPress={toggle} activeOpacity={0.7}>
      <View style={s.disputedTop}>
        <Text style={s.disputedName}>{book.name}</Text>
        <View style={s.eraChips}>
          {ERAS.map(era => {
            const chip = STATUS_COLOR[book.status[era]]
            return (
              <View key={era} style={[s.eraChip, { backgroundColor: chip.bg }]}>
                <Text style={[s.eraChipText, { color: chip.text }]}>
                  {era.replace('Pre-Nicene', 'Pre').replace('Post-Nicene', 'Post')}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
      {expanded && <Text style={s.disputedNotes}>{book.notes}</Text>}
    </TouchableOpacity>
  )
}

function MilestoneRow({
  milestone, s, isLast,
}: {
  milestone: CanonMilestone
  s: ReturnType<typeof makeStyles>
  isLast: boolean
}) {
  return (
    <View style={s.milestoneRow}>
      <View style={s.milestoneLeft}>
        <View style={s.milestoneDot} />
        {!isLast && <View style={s.milestoneLine} />}
      </View>
      <View style={[s.milestoneContent, isLast && { paddingBottom: 0 }]}>
        <Text style={s.milestoneYear}>{milestone.year}</Text>
        <Text style={s.milestoneEvent}>{milestone.event}</Text>
        <Text style={s.milestoneText}>{milestone.significance}</Text>
      </View>
    </View>
  )
}

function SourceCard({
  source, s, colors,
}: {
  source: PrimarySource
  s: ReturnType<typeof makeStyles>
  colors: import('../theme/themes').ThemeColors
}) {
  const [expanded, setExpanded] = useState(false)
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }

  return (
    <View style={s.sourceCard}>
      <View style={s.sourceTop}>
        <Text style={s.sourceTitle}>{source.title}</Text>
        <Text style={s.sourceYear}>{source.year}</Text>
      </View>
      {expanded && (
        <ScrollView style={s.sourceScroll} nestedScrollEnabled>
          <Text style={s.sourceText}>{source.text}</Text>
        </ScrollView>
      )}
      <TouchableOpacity style={s.expandBtn} onPress={toggle} activeOpacity={0.7}>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accent} />
        <Text style={s.expandLabel}>{expanded ? 'Hide text' : 'Show primary source'}</Text>
      </TouchableOpacity>
    </View>
  )
}

// ── Era chip legend ───────────────────────────────────────

function EraLegend({ s }: { s: ReturnType<typeof makeStyles> }) {
  return (
    <View style={s.legend}>
      {(['Accepted', 'Disputed', 'Rejected'] as BookStatus[]).map(status => {
        const chip = STATUS_COLOR[status]
        return (
          <View key={status} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: chip.bg, borderColor: chip.text }]} />
            <Text style={[s.legendText, { color: chip.text }]}>{status}</Text>
          </View>
        )
      })}
      <Text style={s.legendEras}>  Pre / Nicene / Post</Text>
    </View>
  )
}

// ── Main panel ────────────────────────────────────────────

export default function CanonPanel() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()

  const filteredBooks = useMemo(() => {
    if (!q) return DISPUTED_BOOKS
    return DISPUTED_BOOKS.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.notes.toLowerCase().includes(q) ||
      b.testament.toLowerCase().includes(q)
    )
  }, [q])

  const filteredMilestones = useMemo(() => {
    if (!q) return MILESTONES
    return MILESTONES.filter(m =>
      m.event.toLowerCase().includes(q) ||
      m.significance.toLowerCase().includes(q) ||
      m.year.toLowerCase().includes(q)
    )
  }, [q])

  const filteredSources = useMemo(() => {
    if (!q) return PRIMARY_SOURCES
    return PRIMARY_SOURCES.filter(src =>
      src.title.toLowerCase().includes(q) ||
      src.text.toLowerCase().includes(q) ||
      src.year.toLowerCase().includes(q)
    )
  }, [q])

  const hasResults = filteredBooks.length + filteredMilestones.length + filteredSources.length > 0

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={colors.textMuted} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          placeholder="Search canon history…"
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

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* Disputed / Notable Books */}
        {filteredBooks.length > 0 && (
          <>
            <SectionHeader title="Disputed & Notable Books" s={s} />
            <Text style={s.sectionSubtitle}>
              Tap a book to see the debate. Chips show reception across three eras.
            </Text>
            <EraLegend s={s} />
            <View style={s.card}>
              {/* Column headers */}
              <View style={s.disputedHeader}>
                <Text style={s.disputedHeaderName}>Book</Text>
                <View style={s.eraChips}>
                  {ERAS.map(era => (
                    <Text key={era} style={s.eraHeaderLabel}>
                      {era.replace('Pre-Nicene', 'Pre').replace('Post-Nicene', 'Post')}
                    </Text>
                  ))}
                </View>
              </View>
              {filteredBooks.map((book, i) => (
                <React.Fragment key={book.name}>
                  {i > 0 && <View style={s.divider} />}
                  <DisputedBookRow book={book} s={s} />
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* Canon Formation Milestones */}
        {filteredMilestones.length > 0 && (
          <>
            <SectionHeader title="Canon Formation Timeline" s={s} />
            <View style={s.card}>
              {filteredMilestones.map((m, i) => (
                <MilestoneRow
                  key={m.yearNum}
                  milestone={m}
                  s={s}
                  isLast={i === filteredMilestones.length - 1}
                />
              ))}
            </View>
          </>
        )}

        {/* Primary Sources */}
        {filteredSources.length > 0 && (
          <>
            <SectionHeader title="Primary Sources" s={s} />
            {filteredSources.map(src => (
              <SourceCard key={src.title} source={src} s={s} colors={colors} />
            ))}
          </>
        )}

        {!hasResults && (
          <View style={s.empty}>
            <Text style={s.emptyText}>No results for "{query}"</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────

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

  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingTop: 8, paddingBottom: 40, gap: 8 },

  sectionHeader: {
    fontSize: 13, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: 8, marginBottom: 2,
  },
  sectionSubtitle: { fontSize: 12, color: c.textMuted, marginBottom: 4 },

  card: {
    backgroundColor: c.bgCard, borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    overflow: 'hidden',
  },

  // Legend
  legend: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: {
    width: 8, height: 8, borderRadius: 4,
    borderWidth: 1,
  },
  legendText: { fontSize: 11, fontWeight: '600' },
  legendEras: { fontSize: 11, color: c.textMuted },

  // Disputed books table
  disputedHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: c.bgTertiary,
  },
  disputedHeaderName: { flex: 1, fontSize: 11, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase' },
  eraHeaderLabel: { width: 36, textAlign: 'center', fontSize: 10, color: c.textMuted, fontWeight: '600' },

  disputedRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  disputedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  disputedName: { flex: 1, fontSize: 14, color: c.textPrimary, fontWeight: '500' },
  eraChips: { flexDirection: 'row', gap: 4 },
  eraChip: { width: 36, borderRadius: 5, paddingVertical: 3, alignItems: 'center' },
  eraChipText: { fontSize: 10, fontWeight: '700' },
  disputedNotes: { fontSize: 13, lineHeight: 19, color: c.textSecondary, paddingTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginHorizontal: 12 },

  // Milestones
  milestoneRow: { flexDirection: 'row', paddingTop: 14, paddingHorizontal: 14 },
  milestoneLeft: { width: 20, alignItems: 'center' },
  milestoneDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: c.accent, marginTop: 3,
  },
  milestoneLine: {
    flex: 1, width: 2,
    backgroundColor: c.border,
    marginTop: 4,
  },
  milestoneContent: { flex: 1, paddingLeft: 10, paddingBottom: 14, gap: 2 },
  milestoneYear: { fontSize: 11, fontWeight: '700', color: c.accent },
  milestoneEvent: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  milestoneText: { fontSize: 13, lineHeight: 19, color: c.textSecondary },

  // Primary sources
  sourceCard: {
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, gap: 8,
  },
  sourceTop: { gap: 2 },
  sourceTitle: { fontSize: 14, fontWeight: '600', color: c.textAccent },
  sourceYear: { fontSize: 12, color: c.textMuted },
  sourceScroll: { maxHeight: 260 },
  sourceText: {
    fontSize: 13, lineHeight: 21, color: c.textSecondary,
    fontStyle: 'italic',
  },
  expandBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
  },
  expandLabel: { fontSize: 13, color: c.accent, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 14, color: c.textMuted },
})
