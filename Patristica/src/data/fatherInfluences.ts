export interface InfluenceLink {
  from: string   // father who was influenced (student/recipient)
  to: string     // father who influenced them (teacher/source)
  note?: string  // nature of the influence
}

// Well-documented influence relationships across the patristic tradition.
// "from" was shaped by "to".
export const FATHER_INFLUENCES: InfluenceLink[] = [
  // ── Apostolic & Sub-Apostolic ─────────────────────────────────────────
  { from: 'Polycarp of Smyrna',           to: 'Ignatius of Antioch',        note: 'personal correspondence, Ignatius wrote to him directly' },
  { from: 'Papias of Hierapolis',         to: 'Polycarp of Smyrna',         note: 'contemporaries, both disciples of John' },
  { from: 'Irenaeus of Lyons',            to: 'Polycarp of Smyrna',         note: 'direct disciple, heard Polycarp in youth' },

  // ── Alexandrian School ────────────────────────────────────────────────
  { from: 'Origen',                       to: 'Clement Of Alexandria',      note: 'studied under Clement at the Catechetical School' },
  { from: 'Didymus the Blind',            to: 'Origen',                     note: 'deeply shaped by Origen\'s exegetical method' },
  { from: 'Evagrius Ponticus',            to: 'Origen',                     note: 'Origenist theology, especially on the soul' },
  { from: 'Evagrius Ponticus',            to: 'Gregory the Theologian',     note: 'personal disciple in Constantinople' },
  { from: 'Gregory the Wonderworker',     to: 'Origen',                     note: 'direct student at Caesarea, wrote panegyric to Origen' },
  { from: 'Pamphilus of Caesarea',        to: 'Origen',                     note: 'devoted to preserving and defending Origen\'s works' },
  { from: 'Eusebius of Caesarea',         to: 'Pamphilus of Caesarea',      note: 'direct student, co-authored Defense of Origen' },
  { from: 'Athanasius',                   to: 'Alexander of Alexandria',    note: 'formed under Alexander, accompanied him to Nicaea' },
  { from: 'Cyril of Alexandria',         to: 'Athanasius',                  note: 'theological heir, built on Athanasius\'s Christology' },
  { from: 'Theophilus of Alexandria',    to: 'Athanasius',                  note: 'successor in the Alexandrian see' },
  { from: 'Didymus the Blind',            to: 'Jerome',                     note: 'Jerome studied under Didymus in Alexandria' },
  { from: 'Jerome',                       to: 'Origen',                     note: 'extensively used Origen\'s exegesis though later distanced himself' },

  // ── Cappadocian Fathers ───────────────────────────────────────────────
  { from: 'Gregory of Nyssa',             to: 'Basil of Caesarea',          note: 'older brother and formative teacher' },
  { from: 'Gregory of Nyssa',             to: 'Gregory the Theologian',     note: 'close friendship, mutual theological influence' },
  { from: 'Gregory of Nyssa',             to: 'Origen',                     note: 'Origen\'s mystical theology shaped Gregory\'s thought' },
  { from: 'Basil of Caesarea',            to: 'Eusebius of Caesarea',       note: 'studied his church history and ecclesiastical method' },
  { from: 'Basil of Caesarea',            to: 'Origen',                     note: 'compiled Philokalia of Origen with Gregory Nazianzus' },
  { from: 'Gregory the Theologian',       to: 'Basil of Caesarea',          note: 'close friend from Athens, shaped by Basil\'s ascetic vision' },
  { from: 'Gregory the Theologian',       to: 'Origen',                     note: 'co-compiled the Philokalia of Origen\'s writings' },

  // ── Antiochene School ─────────────────────────────────────────────────
  { from: 'John Chrysostom',              to: 'Diodorus of Tarsus',         note: 'formed in Antioch under Diodorus\'s exegetical school' },
  { from: 'Theodore of Mopsuestia',       to: 'Diodorus of Tarsus',         note: 'direct student, developed Antiochene literalism' },
  { from: 'Theodoret',                    to: 'John Chrysostom',            note: 'shaped by Chrysostom\'s preaching and pastoral theology' },
  { from: 'Theodoret',                    to: 'Theodore of Mopsuestia',     note: 'shared Antiochene exegetical method' },

  // ── Western Latin ─────────────────────────────────────────────────────
  { from: 'Augustine of Hippo',           to: 'Ambrose of Milan',           note: 'baptised by Ambrose; Ambrose\'s preaching converted Augustine' },
  { from: 'Augustine of Hippo',           to: 'Origen',                     note: 'Origen\'s allegorical method mediated via Ambrose and Hilary' },
  { from: 'Augustine of Hippo',           to: 'Cyprian',                    note: 'cited Cyprian frequently on ecclesiology and grace' },
  { from: 'Augustine of Hippo',           to: 'Tertullian',                 note: 'inherited North African theological tradition' },
  { from: 'Ambrose of Milan',             to: 'Origen',                     note: 'used Origen\'s homilies extensively in his own preaching' },
  { from: 'Ambrose of Milan',             to: 'Hilary of Poitiers',         note: 'Hilary introduced Eastern theology into the Latin West' },
  { from: 'Hilary of Poitiers',          to: 'Origen',                     note: 'Origen\'s exegesis shaped Hilary\'s biblical commentaries' },
  { from: 'Hilary of Poitiers',          to: 'Athanasius',                  note: 'met Athanasius in exile, championed Nicene theology in the West' },
  { from: 'Jerome',                       to: 'Hilary of Poitiers',         note: 'studied Hilary\'s Latin theological works' },
  { from: 'Paulinus of Nola',             to: 'Augustine of Hippo',         note: 'extensive correspondence, shaped by Augustine\'s theology' },
  { from: 'Fulgentius of Ruspe',          to: 'Augustine of Hippo',         note: 'devoted Augustinian, defended predestination and grace' },
  { from: 'Cassiodorus Senator',          to: 'Augustine of Hippo',         note: 'transmitted Augustine\'s thought through his Institutiones' },
  { from: 'Prosper of Aquitaine',         to: 'Augustine of Hippo',         note: 'defended Augustinian grace against Semi-Pelagianism' },
  { from: 'Orosius',                      to: 'Augustine of Hippo',         note: 'student of Augustine, wrote History at Augustine\'s request' },

  // ── North African ─────────────────────────────────────────────────────
  { from: 'Cyprian',                      to: 'Tertullian',                 note: 'called Tertullian "the master"; shaped by his Latin theology' },
  { from: 'Novatian',                     to: 'Tertullian',                 note: 'developed Tertullian\'s trinitarian vocabulary in Latin' },

  // ── Syrian ───────────────────────────────────────────────────────────
  { from: 'Ephrem The Syrian',            to: 'Aphrahat the Persian Sage',  note: 'Aphrahat preceded Ephrem; Ephrem developed similar themes' },
  { from: 'Jacob of Serugh',              to: 'Ephrem The Syrian',          note: 'inherited Ephrem\'s poetic homily (memra) tradition' },

  // ── Eastern Monastics ─────────────────────────────────────────────────
  { from: 'Evagrius Ponticus',            to: 'Basil of Caesarea',          note: 'formed in Basil\'s ascetic community at Annisa' },
  { from: 'John Cassian',                 to: 'Evagrius Ponticus',          note: 'transmitted Evagrian mysticism to the Latin West via Conferences' },
  { from: 'John Cassian',                 to: 'John Chrysostom',            note: 'ordained by Chrysostom in Constantinople' },
  { from: 'John Cassian',                 to: 'Origen',                     note: 'deeply shaped by Origenist spirituality in Egypt' },
  { from: 'Vincent of Lérins',            to: 'John Cassian',               note: 'both shaped the Lérins monastic tradition' },
  { from: 'Maximus the Confessor',        to: 'Origen',                     note: 'Origen\'s cosmology refracted through Dionysius the Areopagite' },
  { from: 'Maximus the Confessor',        to: 'Gregory the Theologian',     note: 'deeply shaped by Cappadocian Trinitarian theology' },
  { from: 'John of Damascus',             to: 'Maximus the Confessor',      note: 'built on Maximus\'s Christology in On the Orthodox Faith' },
  { from: 'John of Damascus',             to: 'Gregory the Theologian',     note: 'used Cappadocian framework throughout his systematic theology' },

  // ── Medieval ─────────────────────────────────────────────────────────
  { from: 'Bede',                         to: 'Gregory the Great',          note: 'Gregory\'s writings were foundational for Bede\'s theology and pastoral vision' },
  { from: 'Bede',                         to: 'Jerome',                     note: 'used Jerome\'s Vulgate and commentaries extensively' },
  { from: 'Bede',                         to: 'Augustine of Hippo',         note: 'Augustine\'s theology permeates Bede\'s biblical commentaries' },
  { from: 'Alcuin of York',               to: 'Bede',                       note: 'Bede was the dominant intellectual influence on Alcuin' },
  { from: 'Rabanus Maurus',               to: 'Alcuin of York',             note: 'direct student of Alcuin at Tours' },
  { from: 'Anselm of Canterbury',         to: 'Augustine of Hippo',         note: 'Anselm\'s method is Augustinian faith seeking understanding' },
  { from: 'Bernard of Clairvaux',         to: 'Augustine of Hippo',         note: 'Augustine\'s mystical and grace theology shaped Bernard deeply' },
  { from: 'Bernard of Clairvaux',         to: 'Origen',                     note: 'Origen\'s allegorical reading of Song of Songs inspired Bernard\'s sermons' },
  { from: 'Theophylact of Ohrid',         to: 'John Chrysostom',            note: 'compiled and condensed Chrysostom\'s homilies in his NT commentaries' },
  { from: 'Thomas Aquinas',               to: 'Augustine of Hippo',         note: 'Augustine is the most cited Father in Summa Theologica' },
  { from: 'Thomas Aquinas',               to: 'John of Damascus',           note: 'On the Orthodox Faith was a primary source for the Summa' },
]

// Build lookup at module load: O(n), queried O(1)
const _influencedBy = new Map<string, InfluenceLink[]>()  // from → links (who influenced them)
const _influenced   = new Map<string, InfluenceLink[]>()  // to → links (whom they influenced)

for (const link of FATHER_INFLUENCES) {
  if (!_influencedBy.has(link.from)) _influencedBy.set(link.from, [])
  _influencedBy.get(link.from)!.push(link)
  if (!_influenced.has(link.to)) _influenced.set(link.to, [])
  _influenced.get(link.to)!.push(link)
}

export function getFatherInfluences(name: string): {
  influencedBy: InfluenceLink[]
  influenced: InfluenceLink[]
} {
  return {
    influencedBy: _influencedBy.get(name) ?? [],
    influenced:   _influenced.get(name) ?? [],
  }
}
