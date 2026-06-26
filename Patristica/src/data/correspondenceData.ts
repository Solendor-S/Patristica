export interface FatherLetter {
  id: string
  fromCity: string    // must match FATHER_CITY_COORDS displayName in mapData.ts
  toCity: string      // must match FATHER_CITY_COORDS displayName
  fromFather: string  // sender
  toLabel: string     // recipient label
  label: string       // letter/epistle name
  year: string        // e.g., "c. 96 AD"
  tradition: string   // sender's tradition (drives line color)
}

// Well-documented patristic correspondence with known from/to cities.
// Cities must match displayName values in FATHER_CITY_COORDS.
export const FATHER_LETTERS: FatherLetter[] = [
  // ── Clement of Rome ──────────────────────────────────────────────────
  {
    id: 'clement-corinth',
    fromCity: 'Rome', toCity: 'Corinth',
    fromFather: 'Clement Of Rome', toLabel: 'Church at Corinth',
    label: '1 Clement (First Epistle to the Corinthians)',
    year: 'c. 96 AD', tradition: 'Western',
  },

  // ── Ignatius of Antioch (7 letters on his way to martyrdom) ──────────
  {
    id: 'ignatius-ephesus',
    fromCity: 'Antioch', toCity: 'Ephesus',
    fromFather: 'Ignatius of Antioch', toLabel: 'Church at Ephesus',
    label: 'Epistle to the Ephesians',
    year: 'c. 108 AD', tradition: 'Eastern',
  },
  {
    id: 'ignatius-magnesia',
    fromCity: 'Antioch', toCity: 'Smyrna',
    fromFather: 'Ignatius of Antioch', toLabel: 'Church at Magnesia',
    label: 'Epistle to the Magnesians',
    year: 'c. 108 AD', tradition: 'Eastern',
  },
  {
    id: 'ignatius-rome',
    fromCity: 'Antioch', toCity: 'Rome',
    fromFather: 'Ignatius of Antioch', toLabel: 'Church at Rome',
    label: 'Epistle to the Romans',
    year: 'c. 108 AD', tradition: 'Eastern',
  },
  {
    id: 'ignatius-philadelphia',
    fromCity: 'Antioch', toCity: 'Smyrna',
    fromFather: 'Ignatius of Antioch', toLabel: 'Church at Philadelphia',
    label: 'Epistle to the Philadelphians',
    year: 'c. 108 AD', tradition: 'Eastern',
  },
  {
    id: 'ignatius-smyrna',
    fromCity: 'Antioch', toCity: 'Smyrna',
    fromFather: 'Ignatius of Antioch', toLabel: 'Church at Smyrna',
    label: 'Epistle to the Smyrnaeans',
    year: 'c. 108 AD', tradition: 'Eastern',
  },
  {
    id: 'ignatius-polycarp',
    fromCity: 'Antioch', toCity: 'Smyrna',
    fromFather: 'Ignatius of Antioch', toLabel: 'Polycarp of Smyrna',
    label: 'Epistle to Polycarp',
    year: 'c. 108 AD', tradition: 'Eastern',
  },

  // ── Polycarp of Smyrna ───────────────────────────────────────────────
  {
    id: 'polycarp-philippi',
    fromCity: 'Smyrna', toCity: 'Corinth',
    fromFather: 'Polycarp of Smyrna', toLabel: 'Church at Philippi',
    label: 'Epistle to the Philippians',
    year: 'c. 110 AD', tradition: 'Eastern',
  },

  // ── Dionysius of Corinth ─────────────────────────────────────────────
  {
    id: 'dionysius-rome',
    fromCity: 'Corinth', toCity: 'Rome',
    fromFather: 'Dionysius of Corinth', toLabel: 'Church at Rome (Pope Soter)',
    label: 'Letter to the Romans',
    year: 'c. 170 AD', tradition: 'Eastern',
  },
  {
    id: 'dionysius-athens',
    fromCity: 'Corinth', toCity: 'Athens',
    fromFather: 'Dionysius of Corinth', toLabel: 'Church at Athens',
    label: 'Letter to the Athenians',
    year: 'c. 170 AD', tradition: 'Eastern',
  },

  // ── Victor of Rome / Easter Controversy ─────────────────────────────
  {
    id: 'polycrates-victor',
    fromCity: 'Ephesus', toCity: 'Rome',
    fromFather: 'Polycrates Of Ephesus', toLabel: 'Pope Victor I',
    label: 'Letter on the Easter Controversy',
    year: 'c. 190 AD', tradition: 'Eastern',
  },
  {
    id: 'irenaeus-victor',
    fromCity: 'Lyon', toCity: 'Rome',
    fromFather: 'Irenaeus of Lyons', toLabel: 'Pope Victor I',
    label: 'Letter urging peace on Easter controversy',
    year: 'c. 190 AD', tradition: 'Western',
  },

  // ── Origen ───────────────────────────────────────────────────────────
  {
    id: 'origen-julius',
    fromCity: 'Alexandria', toCity: 'Jerusalem',
    fromFather: 'Origen', toLabel: 'Julius Africanus',
    label: 'Letter to Julius Africanus (on Susanna)',
    year: 'c. 240 AD', tradition: 'Alexandrian',
  },

  // ── Cyprian of Carthage ──────────────────────────────────────────────
  {
    id: 'cyprian-rome-cornelius',
    fromCity: 'Carthage', toCity: 'Rome',
    fromFather: 'Cyprian', toLabel: 'Pope Cornelius',
    label: 'Letters to Cornelius of Rome (multiple)',
    year: 'c. 251–253 AD', tradition: 'North African',
  },
  {
    id: 'cyprian-rome-stephen',
    fromCity: 'Carthage', toCity: 'Rome',
    fromFather: 'Cyprian', toLabel: 'Pope Stephen I (on rebaptism)',
    label: 'Letters on the rebaptism controversy',
    year: 'c. 255–256 AD', tradition: 'North African',
  },
  {
    id: 'cyprian-africa',
    fromCity: 'Carthage', toCity: 'Caesarea Maritima',
    fromFather: 'Cyprian', toLabel: 'African bishops',
    label: 'Synodal letters on the lapsed',
    year: 'c. 251 AD', tradition: 'North African',
  },

  // ── Athanasius ───────────────────────────────────────────────────────
  {
    id: 'athanasius-monks',
    fromCity: 'Alexandria', toCity: 'Egyptian Desert',
    fromFather: 'Athanasius', toLabel: 'Egyptian monks',
    label: 'Festal Letters (annual Easter letters)',
    year: '329–373 AD', tradition: 'Alexandrian',
  },
  {
    id: 'alexander-encyclical',
    fromCity: 'Alexandria', toCity: 'Constantinople',
    fromFather: 'Alexander of Alexandria', toLabel: 'Alexander of Thessalonica and bishops',
    label: 'Encyclical Letter Against Arius',
    year: 'c. 320 AD', tradition: 'Alexandrian',
  },

  // ── Basil the Great ──────────────────────────────────────────────────
  {
    id: 'basil-gregory-naz',
    fromCity: 'Caesarea, Cappadocia', toCity: 'Constantinople',
    fromFather: 'Basil of Caesarea', toLabel: 'Gregory the Theologian',
    label: 'Letters to Gregory Nazianzus (friendship and theology)',
    year: 'c. 360–375 AD', tradition: 'Eastern',
  },
  {
    id: 'basil-west',
    fromCity: 'Caesarea, Cappadocia', toCity: 'Rome',
    fromFather: 'Basil of Caesarea', toLabel: 'Pope Damasus I',
    label: 'Letters seeking western support against Arianism',
    year: 'c. 371–376 AD', tradition: 'Eastern',
  },
  {
    id: 'basil-ambrose',
    fromCity: 'Caesarea, Cappadocia', toCity: 'Milan',
    fromFather: 'Basil of Caesarea', toLabel: 'Ambrose of Milan',
    label: 'Letter on theological questions',
    year: 'c. 374 AD', tradition: 'Eastern',
  },

  // ── Jerome ───────────────────────────────────────────────────────────
  {
    id: 'jerome-damasus',
    fromCity: 'Bethlehem', toCity: 'Rome',
    fromFather: 'Jerome', toLabel: 'Pope Damasus I',
    label: 'Letters requesting biblical guidance; Vulgate commission',
    year: 'c. 382–384 AD', tradition: 'Western',
  },
  {
    id: 'jerome-augustine',
    fromCity: 'Bethlehem', toCity: 'Hippo Regius',
    fromFather: 'Jerome', toLabel: 'Augustine of Hippo',
    label: 'Correspondence with Augustine (on Galatians 2, translation)',
    year: '394–419 AD', tradition: 'Western',
  },
  {
    id: 'jerome-rufinus',
    fromCity: 'Bethlehem', toCity: 'Aquileia',
    fromFather: 'Jerome', toLabel: 'Rufinus of Aquileia',
    label: 'Polemical letters in the Origenist controversy',
    year: 'c. 394–402 AD', tradition: 'Western',
  },

  // ── Augustine of Hippo ───────────────────────────────────────────────
  {
    id: 'augustine-jerome',
    fromCity: 'Hippo Regius', toCity: 'Bethlehem',
    fromFather: 'Augustine of Hippo', toLabel: 'Jerome',
    label: 'Letters to Jerome on Scripture and translation',
    year: '394–419 AD', tradition: 'North African',
  },
  {
    id: 'augustine-paulinus',
    fromCity: 'Hippo Regius', toCity: 'Nola',
    fromFather: 'Augustine of Hippo', toLabel: 'Paulinus of Nola',
    label: 'Correspondence on prayer, the soul, and Christian life',
    year: 'c. 408–423 AD', tradition: 'North African',
  },
  {
    id: 'augustine-rome',
    fromCity: 'Hippo Regius', toCity: 'Rome',
    fromFather: 'Augustine of Hippo', toLabel: 'Pope Innocent I and clergy',
    label: 'Letters on Pelagianism (seeking Roman condemnation)',
    year: 'c. 416 AD', tradition: 'North African',
  },
  {
    id: 'augustine-orosius',
    fromCity: 'Hippo Regius', toCity: 'Braga',
    fromFather: 'Augustine of Hippo', toLabel: 'Orosius',
    label: 'Letters commissioning Orosius\'s History Against the Pagans',
    year: 'c. 415 AD', tradition: 'North African',
  },

  // ── Chrysostom from exile ────────────────────────────────────────────
  {
    id: 'chrysostom-olympias',
    fromCity: 'Caesarea, Cappadocia', toCity: 'Constantinople',
    fromFather: 'John Chrysostom', toLabel: 'Olympias (deaconess)',
    label: 'Letters to Olympias from exile (17 surviving)',
    year: '404–407 AD', tradition: 'Eastern',
  },
  {
    id: 'chrysostom-innocentius',
    fromCity: 'Caesarea, Cappadocia', toCity: 'Rome',
    fromFather: 'John Chrysostom', toLabel: 'Pope Innocent I',
    label: 'Letters appealing to Rome from exile',
    year: '404–407 AD', tradition: 'Eastern',
  },

  // ── Leo the Great ────────────────────────────────────────────────────
  {
    id: 'leo-flavian',
    fromCity: 'Rome', toCity: 'Constantinople',
    fromFather: 'Leo the Great', toLabel: 'Flavian of Constantinople',
    label: 'Tome of Leo (on the two natures of Christ)',
    year: '449 AD', tradition: 'Western',
  },
  {
    id: 'leo-theodosius',
    fromCity: 'Rome', toCity: 'Constantinople',
    fromFather: 'Leo the Great', toLabel: 'Emperor Theodosius II',
    label: 'Letters on the Eutychian controversy',
    year: '449–451 AD', tradition: 'Western',
  },

  // ── Cyril of Alexandria ──────────────────────────────────────────────
  {
    id: 'cyril-nestorius',
    fromCity: 'Alexandria', toCity: 'Constantinople',
    fromFather: 'Cyril of Alexandria', toLabel: 'Nestorius of Constantinople',
    label: 'Twelve Anathemas against Nestorius',
    year: '430 AD', tradition: 'Alexandrian',
  },
  {
    id: 'cyril-rome',
    fromCity: 'Alexandria', toCity: 'Rome',
    fromFather: 'Cyril of Alexandria', toLabel: 'Pope Celestine I',
    label: 'Letter seeking Roman condemnation of Nestorius',
    year: '430 AD', tradition: 'Alexandrian',
  },

  // ── Gregory the Great ────────────────────────────────────────────────
  {
    id: 'gregory-augustine-england',
    fromCity: 'Rome', toCity: 'Canterbury',
    fromFather: 'Gregory the Great', toLabel: 'Augustine of Canterbury',
    label: 'Libellus Responsionum (answers on English church practices)',
    year: '601 AD', tradition: 'Western',
  },
  {
    id: 'gregory-leander',
    fromCity: 'Rome', toCity: 'Seville',
    fromFather: 'Gregory the Great', toLabel: 'Leander of Seville',
    label: 'Letters accompanying the Moralia in Job',
    year: 'c. 595 AD', tradition: 'Western',
  },
]

// City coords for correspondence cities not already in FATHER_CITY_COORDS.
// Key = city displayName. These supplement the father map's existing coords.
export const CORRESPONDENCE_EXTRA_COORDS: Record<string, { lat: number; lng: number }> = {
  'Corinth': { lat: 37.94, lng: 22.93 },
  'Athens':  { lat: 37.98, lng: 23.73 },
}
