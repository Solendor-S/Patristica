export type HistoricalCategory = 'ancient_author' | 'archaeology' | 'manuscript' | 'inscription'

export interface HistoricalSource {
  source_key: string
  title: string
  category: HistoricalCategory
  author: string
  date_desc: string
  location: string
  description: string
  significance: string
  citation: string
  testament: 'ot' | 'nt'
  sort_year: number
}

export interface HistoricalRef {
  bible_book: string
  bible_chapter: number
  bible_verse: number
  source_key: string
}

export const CATEGORY_LABEL: Record<HistoricalCategory, string> = {
  ancient_author: 'Ancient Author',
  archaeology:    'Archaeology',
  manuscript:     'Manuscript',
  inscription:    'Inscription',
}

export const HISTORICAL_SOURCES: HistoricalSource[] = [
  // ── NT Ancient Authors ─────────────────────────────────────────────────────
  { testament: 'nt', sort_year: 52,
    source_key: 'thallus_africanus', category: 'ancient_author',
    title: 'Chronographia (excerpt)',
    author: 'Julius Africanus (citing Thallus)',
    date_desc: 'c. 221 AD (citing Thallus, c. 52 AD)', location: 'Palestine / Rome',
    description: '"Thallus, in the third book of his histories, explains away this darkness as an eclipse of the sun — unreasonably, as it seems to me (unreasonably, of course, because a solar eclipse could not take place at the time of the full moon, and it was at the season of the Paschal full moon that Christ died)."',
    significance: 'Julius Africanus quotes the pagan historian Thallus (writing c. 52 AD) attempting to explain the darkness at the crucifixion as a solar eclipse. The fact that Thallus felt the need to explain this event confirms the darkness was widely known and needed accounting for, even outside Christian circles — this may be the earliest non-Christian reference to the crucifixion.',
    citation: 'Julius Africanus, Chronographia (preserved in George Syncellus, Chronographia)',
  },
  { testament: 'nt', sort_year: 112,
    source_key: 'pliny_letters', category: 'ancient_author',
    title: 'Letters X.96', author: 'Pliny the Younger',
    date_desc: 'c. 112 AD', location: 'Bithynia (Asia Minor)',
    description: '"They were in the habit of meeting on a certain fixed day before it was light, when they sang in alternate verses a hymn to Christ, as to a god, and bound themselves by a solemn oath, not to do any wicked deeds, but never to commit any fraud, theft, adultery, never to falsify their word, nor deny a trust when they should be called upon to make it good."',
    significance: 'Written to Emperor Trajan around 112 AD by the governor of Bithynia, this describes early Christian worship practices — pre-dawn gatherings, hymns to Christ as God, corporate moral oaths — matching NT descriptions of church life. Confirms Christianity had spread to Asia Minor within a generation of the apostles.',
    citation: 'Pliny the Younger, Epistulae 10.96',
  },
  { testament: 'nt', sort_year: 116,
    source_key: 'tacitus_annals', category: 'ancient_author',
    title: 'Annals XV.44', author: 'Tacitus',
    date_desc: 'c. 116 AD', location: 'Rome',
    description: '"Christus, the founder of the name, had undergone the death penalty in the reign of Tiberius, by sentence of the procurator Pontius Pilatus, and the pernicious superstition was checked for a moment, only to break out once more, not merely in Judaea, the home of the disease, but in the capital itself, where all things horrible or shameful in the world collect and find a vogue."',
    significance: 'The Roman senator and historian Tacitus independently confirms the execution of Christ under Pontius Pilate during the reign of Tiberius. Written c. 116 AD, this is one of the most important non-Christian references to the crucifixion.',
    citation: 'Tacitus, Annals 15.44',
  },
  { testament: 'nt', sort_year: 121,
    source_key: 'suetonius_claudius', category: 'ancient_author',
    title: 'Life of Claudius 25.4', author: 'Suetonius',
    date_desc: 'c. 121 AD', location: 'Rome',
    description: '"Since the Jews constantly made disturbances at the instigation of Chrestus, he expelled them from Rome." (Claudius expelled the Jews from Rome, c. 49 AD)',
    significance: 'Most scholars identify "Chrestus" as Christ. This expulsion matches Acts 18:2, where Priscilla and Aquila had left Rome "because Claudius had commanded all Jews to depart." Provides independent Roman confirmation of the Acts 18 timeline.',
    citation: 'Suetonius, Life of Claudius 25.4',
  },

  // ── OT Ancient Authors ─────────────────────────────────────────────────────
  { testament: 'ot', sort_year: -280,
    source_key: 'berossus', category: 'ancient_author',
    title: 'Babyloniaca (via Josephus)', author: 'Berossus',
    date_desc: 'c. 278 BC (cited by Josephus, c. 93 AD)', location: 'Babylon',
    description: '"After the flood, Xisouthros [the flood hero] built an ark...the gods commanded him to write a history of beginnings, middle, and end, and to bury it in the City of the Sun at Sippar." Berossus also records Babylonian king-lists and describes Nebuchadnezzar\'s campaigns in detail.',
    significance: 'Berossus, a Babylonian priest-historian writing in Greek for Antiochus I, preserves a flood narrative strikingly parallel to Genesis 6–8 and Babylonian king-lists aligning with 2 Kings. Josephus uses him (Against Apion 1.19) to confirm the antiquity and reliability of Hebrew sacred history.',
    citation: 'Josephus, Against Apion 1.19; Eusebius, Praeparatio Evangelica 9',
  },
  { testament: 'ot', sort_year: -278,
    source_key: 'manetho', category: 'ancient_author',
    title: 'Aegyptiaca (via Josephus)', author: 'Manetho',
    date_desc: 'c. 280 BC (cited by Josephus, c. 93 AD)', location: 'Egypt',
    description: '"The Hyksos...a people of ignoble birth...seized our country by main force without difficulty or battle...They set on fire our cities, razed to the ground the temples of the gods...and finally they made one of their number king, his name was Salitis." (Later they were eventually driven out of Egypt.)',
    significance: 'Manetho\'s account of the Hyksos — foreign Semitic rulers who governed Egypt and were eventually expelled — provides Egyptian context for the Israelite sojourn and exodus background. Josephus (Against Apion 1.14) engages his account to defend the antiquity of the Jewish people in Egypt.',
    citation: 'Josephus, Against Apion 1.14; Eusebius, Praeparatio Evangelica 10',
  },
  { testament: 'ot', sort_year: -440,
    source_key: 'herodotus_circumcision', category: 'ancient_author',
    title: 'Histories II.104', author: 'Herodotus',
    date_desc: 'c. 440 BC', location: 'Greece (describing Palestine)',
    description: '"The Syrians of Palestine themselves confess that they learnt the custom [of circumcision] from the Egyptians... the Phoenicians and the Syrians of Palestine acknowledge that they learnt it from the Egyptians."',
    significance: 'Herodotus, the earliest Greek historian, attests circumcision among the "Syrians of Palestine" — a reference widely understood to include Israelites — confirming that the practice was ancient, recognised by outsiders, and connected to their Egyptian sojourn exactly as Genesis 17 and Exodus describe.',
    citation: 'Herodotus, Histories 2.104',
  },

  // ── NT Archaeology & Inscriptions ─────────────────────────────────────────
  { testament: 'nt', sort_year: 30,
    source_key: 'pilate_stone', category: 'inscription',
    title: 'Pilate Stone', author: '',
    date_desc: 'c. 26–36 AD (discovered 1961)', location: 'Caesarea Maritima — Israel Antiquities Authority',
    description: 'A limestone block (82 × 65 cm) discovered at the Roman theater of Caesarea Maritima in 1961, bearing a partial Latin inscription. Reconstructed text: "[Tiberieum] / [Pon]tius Pilatus / [Praef]ectus Iuda[eae] / [fecit d]e[dicavit]" — "(Pontius Pilatus, Prefect of Judaea, built and dedicated [this building in honour of Tiberius])."',
    significance: 'The only known contemporary inscription bearing the name of Pontius Pilate. It confirms his title as "Prefect" (not Procurator, as later writers used) and his governorship of Judaea — precisely as the Gospels present him. Before this discovery, some critics questioned his historicity.',
    citation: 'Discovered by Antonio Frova, 1961; now in the Israel Museum, Jerusalem',
  },
  { testament: 'nt', sort_year: 30,
    source_key: 'caiaphas_ossuary', category: 'archaeology',
    title: 'Caiaphas Ossuary', author: '',
    date_desc: 'c. 1st century AD (discovered 1990)', location: 'Jerusalem Peace Forest — Israel Museum',
    description: 'A decorated limestone ossuary (bone box) accidentally discovered in Jerusalem\'s Peace Forest in 1990, bearing an Aramaic inscription: "Yehosef bar Qayyafa" (Joseph son of Caiaphas). It contained the bones of six individuals, including a 60-year-old male.',
    significance: 'The high priest who presided over the trial of Jesus (Matthew 26:57; John 18:13) is now attested archaeologically. The full name "Joseph bar Caiapha" matches the form Josephus gives (Antiquities 18.2.2). This is direct physical evidence for the person named in the Gospel accounts.',
    citation: 'Z. Greenhut, "Burial Cave of the Caiaphas Family," Biblical Archaeology Review 18:5 (1992)',
  },
  { testament: 'nt', sort_year: 30,
    source_key: 'pool_of_siloam', category: 'archaeology',
    title: 'Pool of Siloam', author: '',
    date_desc: 'c. 100 BC – 70 AD (discovered 2004)', location: 'City of David, Jerusalem',
    description: 'In 2004, workers repairing a drainage pipe in the City of David uncovered stone steps leading to a first-century public pool. Excavations revealed a large stepped pool with three tiers of broad stairs. Coins found in the plaster date the construction to the Hasmonean/Herodian period.',
    significance: 'Directly confirms the Pool of Siloam described in John 9:7 — where Jesus sent the blind man to wash and receive his sight. The excavated pool is exactly where John 9 places it, in the lower City of David near the Kidron Valley.',
    citation: 'R. Reich & E. Shukron, Israel Exploration Journal 55 (2005)',
  },
  { testament: 'nt', sort_year: 50,
    source_key: 'erastus_inscription', category: 'inscription',
    title: 'Erastus Inscription', author: '',
    date_desc: 'c. 50–75 AD (discovered 1929)', location: 'Corinth, Greece — in situ near theater',
    description: 'A stone pavement inscription near the theater in ancient Corinth, reading: "ERASTVS PRO AEDILITATE S P STRAVIT" — "Erastus, in return for the aedileship, laid [this pavement] at his own expense."',
    significance: 'Paul\'s letter to Rome (16:23) greets "Erastus, who is the city\'s director of public works." This inscription, dated to the mid-first century AD — precisely when Paul was active in Corinth — confirms that a man named Erastus held exactly that civic office in Corinth.',
    citation: 'J.H. Kent, Corinth VIII.3 (1966)',
  },
  { testament: 'nt', sort_year: 30,
    source_key: 'jesus_boat', category: 'archaeology',
    title: '"Jesus Boat" (Sea of Galilee Boat)', author: '',
    date_desc: 'c. 100 BC – 70 AD (discovered 1986)', location: 'Kibbutz Ginosar — Yigal Allon Museum',
    description: 'During a drought in 1986, two brothers discovered an ancient wooden boat preserved in the mud at Kibbutz Ginosar. The vessel is 8.2 m long, 2.3 m wide, and could carry 13–15 people. Dendrochronology dates it to c. 100 BC – 70 AD.',
    significance: 'Provides archaeological evidence for the type of fishing vessel used on the Sea of Galilee in Jesus\'s time, matching Gospel accounts of Jesus and his disciples crossing the lake (Matthew 8:23; Mark 4:36; Luke 8:22).',
    citation: 'S. Wachsmann, The Sea of Galilee Boat (1990)',
  },
  { testament: 'nt', sort_year: 45,
    source_key: 'nazareth_inscription', category: 'inscription',
    title: 'Nazareth Inscription', author: '',
    date_desc: 'c. 41–54 AD (acquired 1878)', location: 'Bibliothèque nationale de France, Paris',
    description: 'A white marble slab bearing a Greek imperial rescript forbidding the disturbance of tombs, the removal of bodies, or the breaking of burial seals — under penalty of capital punishment.',
    significance: 'The death penalty for tomb disturbance is exceptional — Roman law normally treated it as a property offense. Many scholars argue the severity suggests the emperor had heard the Jewish claim that Jesus\'s disciples stole the body (Matthew 28:13). The Nazareth provenance connects the edict to the very city associated with Jesus.',
    citation: 'F. Cumont, Revue Historique (1930); Bibliothèque nationale de France',
  },
  { testament: 'nt', sort_year: 125,
    source_key: 'rylands_p52', category: 'manuscript',
    title: 'Rylands Library Papyrus (P52)', author: '',
    date_desc: 'c. 100–150 AD (acquired 1920)', location: 'John Rylands Library, Manchester, UK',
    description: 'A small papyrus fragment (9 × 6 cm) containing portions of John 18:31–33 and John 18:37–38 in Greek. Dated by paleography to c. 100–150 AD. Purchased in Egypt in 1920 and identified by C.H. Roberts in 1934.',
    significance: 'P52 is the earliest known manuscript fragment of any New Testament text. Its presence in Egypt by c. 125 AD means the Gospel of John was already in circulation far from its place of composition within a generation of John\'s death.',
    citation: 'C.H. Roberts, An Unpublished Fragment of the Fourth Gospel (1935); P.Rylands Greek 457',
  },
  { testament: 'nt', sort_year: 170,
    source_key: 'muratorian_fragment', category: 'manuscript',
    title: 'Muratorian Fragment', author: '',
    date_desc: 'c. 170–200 AD (manuscript copy c. 700 AD)', location: 'Biblioteca Ambrosiana, Milan',
    description: 'An 8th-century Latin manuscript preserving a Roman document from c. 170–200 AD listing the accepted books of the New Testament. It explicitly names the Gospels of Luke and John, Acts, Paul\'s thirteen letters, Jude, and two letters of John.',
    significance: 'The oldest known list of accepted NT books, produced in Rome within a century of the apostles. Shows the NT canon was not invented by councils in the 4th century but recognised from the very beginning.',
    citation: 'Edited by L. Muratori, Antiquitates Italicae Medii Aevi 3 (1740)',
  },

  // ── OT Archaeology & Inscriptions ─────────────────────────────────────────
  { testament: 'ot', sort_year: -1208,
    source_key: 'merneptah_stele', category: 'inscription',
    title: 'Merneptah Stele', author: '',
    date_desc: 'c. 1208 BC (discovered 1896)', location: 'Cairo Museum, Egypt',
    description: 'A 3.18 m granite stele of Pharaoh Merneptah discovered at Thebes in 1896. Among the conquered peoples listed: "Israel is laid waste, his seed is not." The determinative marks Israel as a people-group, not a land.',
    significance: 'The earliest extrabiblical mention of Israel by name — dated to c. 1208 BC — proving that Israel existed as a recognised people in Canaan before 1200 BC. This anchors the biblical Israel in Egyptian records centuries before critics claimed the nation was invented.',
    citation: 'W.M.F. Petrie, Six Temples at Thebes (1897); Cairo Museum stele CG 34025',
  },
  { testament: 'ot', sort_year: -841,
    source_key: 'black_obelisk', category: 'archaeology',
    title: 'Black Obelisk of Shalmaneser III', author: '',
    date_desc: '841 BC (discovered 1846)', location: 'British Museum, London',
    description: 'A black limestone obelisk (2 m tall) discovered at Nimrud in 1846. The second register shows a figure bowing before Shalmaneser III. The inscription reads: "Tribute of Iaua [Jehu], son of Omri: silver, gold, a golden bowl..." The only known contemporary image of an Israelite king.',
    significance: 'Jehu of Israel is depicted prostrating before Shalmaneser III in 841 BC — the only contemporaneous record of an Israelite royal paying tribute to Assyria. Directly confirms the Assyrian pressure on the Northern Kingdom in 2 Kings.',
    citation: 'A.H. Layard, Monuments of Nineveh (1849); British Museum ANE 118885',
  },
  { testament: 'ot', sort_year: -840,
    source_key: 'mesha_stele', category: 'inscription',
    title: 'Mesha Stele (Moabite Stone)', author: '',
    date_desc: 'c. 840 BC (discovered 1868)', location: 'Louvre Museum, Paris',
    description: 'A black basalt stele discovered at Dhiban in 1868. King Mesha of Moab: "Omri, king of Israel, he humbled Moab many years...Israel has perished for ever." The inscription also mentions "YHWH" — the divine name of Israel.',
    significance: 'Confirms King Omri, the Northern Kingdom of Israel, and the divine name YHWH from a hostile pagan perspective. The Moabite revolt in 2 Kings 3 is directly attested.',
    citation: 'C. Clermont-Ganneau (1869); Louvre AO 5066',
  },
  { testament: 'ot', sort_year: -835,
    source_key: 'tel_dan_stele', category: 'inscription',
    title: 'Tel Dan Stele', author: '',
    date_desc: '9th century BC (discovered 1993–94)', location: 'Israel Museum, Jerusalem',
    description: 'Three fragments of a basalt stele discovered at Tel Dan in 1993–94. An Aramean king boasts: "...the king of Israel, and I killed [Aha]ziyahu son of [Jehoram kin]g of the house of David." The phrase "bytdwd" — "house of David" — appears in lines 8–9.',
    significance: 'The first extrabiblical inscription mentioning the "House of David," proving the Davidic dynasty was a recognised historical entity in the 9th century BC. Before 1993, critics argued there was no evidence for a historical David outside the Bible.',
    citation: 'A. Biran & J. Naveh, Israel Exploration Journal 43 (1993) & 45 (1995)',
  },
  { testament: 'ot', sort_year: -701,
    source_key: 'sennacherib_prism', category: 'inscription',
    title: "Sennacherib's Prism (Taylor Prism)", author: '',
    date_desc: 'c. 691 BC (discovered 1830)', location: 'British Museum, London',
    description: 'A hexagonal baked clay prism bearing over 500 lines of Akkadian cuneiform. For his 701 BC campaign: "As for Hezekiah the Judahite, who did not submit to my yoke, I locked him up within Jerusalem his royal city, like a bird in a cage... Hezekiah himself was overwhelmed...and he sent me...30 talents of gold, 800 talents of silver..."',
    significance: 'Confirms Hezekiah as king of Judah and the 701 BC siege of Jerusalem — and crucially confirms Sennacherib did NOT conquer Jerusalem. This matches 2 Kings 19:35–36 exactly. An Assyrian king boasting of his failure to take a city is itself remarkable.',
    citation: 'Col. R. Taylor (1830); British Museum ANE 91032',
  },
  { testament: 'ot', sort_year: -700,
    source_key: 'siloam_inscription', category: 'inscription',
    title: 'Siloam Tunnel Inscription', author: '',
    date_desc: 'c. 700 BC (discovered 1880)', location: 'Istanbul Archaeological Museum',
    description: 'A six-line Hebrew inscription carved inside Hezekiah\'s tunnel beneath Jerusalem. It describes the moment two teams of workers heard each other through the rock and broke through: "...and the water flowed from the spring toward the reservoir for one thousand and two hundred cubits..."',
    significance: 'Directly confirms the engineering project attributed to Hezekiah in 2 Kings 20:20 and 2 Chronicles 32:30. The inscription is contemporaneous (8th century BC) and corroborates the specific detail about channelling the waters of Gihon underground.',
    citation: 'C. Clermont-Ganneau (1881); Istanbul Archaeological Museum 1',
  },
  { testament: 'ot', sort_year: -600,
    source_key: 'ketef_hinnom', category: 'archaeology',
    title: 'Ketef Hinnom Silver Scrolls', author: '',
    date_desc: 'c. 600 BC (discovered 1979)', location: 'Israel Museum, Jerusalem',
    description: 'Two tiny silver scrolls discovered in a rock-cut burial cave at Ketef Hinnom, Jerusalem in 1979. When unrolled, they carry a version of the Priestly Blessing from Numbers 6:24–26: "May YHWH bless you and keep you; may YHWH cause his face to shine upon you..."',
    significance: 'The oldest surviving Biblical text ever found — dated to c. 600 BC, approximately 400 years older than the Dead Sea Scrolls. The scrolls were worn as amulets, proving Numbers 6 was already in liturgical use before the Babylonian exile.',
    citation: 'G. Barkay, Biblical Archaeology Review 19:2 (1983); Israel Museum IAA 1992-102/A-B',
  },
  { testament: 'ot', sort_year: -588,
    source_key: 'lachish_letters', category: 'inscription',
    title: 'Lachish Letters', author: '',
    date_desc: 'c. 588 BC (discovered 1935, 1938)', location: 'British Museum; Israel Museum',
    description: '21 ostraca (pottery shards) discovered at Tel Lachish, recording military correspondence during Nebuchadnezzar\'s siege. Letter IV reads: "Let my lord know that we are watching for the signals of Lachish, according to all the signs which my lord has given, for we cannot see Azekah."',
    significance: '"We cannot see Azekah" — implying Azekah had already fallen — precisely matches Jeremiah 34:7. These are eyewitness documents from the very siege Jeremiah describes, confirming the historical setting of his prophecies.',
    citation: 'J.L. Starkey, excavations 1935 & 1938',
  },
  { testament: 'ot', sort_year: -539,
    source_key: 'cyrus_cylinder', category: 'archaeology',
    title: 'Cyrus Cylinder', author: '',
    date_desc: 'c. 539–538 BC (discovered 1879)', location: 'British Museum, London',
    description: 'A baked clay barrel cylinder discovered in Babylon in 1879. Cyrus the Great records his capture of Babylon and his policy of returning exiled peoples to their homelands and restoring their sanctuaries.',
    significance: 'Confirms Cyrus\'s actual policy of repatriating exiled peoples — directly explaining the decree in Ezra 1 that allowed Jews to return to Judah and rebuild the temple. Isaiah 44:28 names Cyrus as the one who would say "Let it be rebuilt" — written 150+ years before his birth.',
    citation: 'H. Rassam (1879); British Museum ANE 90920',
  },
  { testament: 'ot', sort_year: -450,
    source_key: 'elephantine_papyri', category: 'manuscript',
    title: 'Elephantine Papyri', author: '',
    date_desc: '5th century BC (discovered 1893–1908)', location: 'Staatliche Museen Berlin; Brooklyn Museum; Bodleian Library, Oxford',
    description: 'Aramaic papyrus documents from a Jewish military colony at Elephantine (Yeb) in southern Egypt, dated c. 495–399 BC. Includes a petition requesting permission to rebuild the Jewish temple at Yeb — addressed to "Bagavahya, governor of Judah" and the sons of Sanballat, governor of Samaria.',
    significance: 'Directly confirm names from Ezra–Nehemiah: Sanballat governor of Samaria (cf. Nehemiah 2:10), Bagoas/Bagavahya governor of Judah (cf. Nehemiah 12:22). These Persian-period details exactly match the world of Ezra and Nehemiah.',
    citation: 'A.H. Sayce & A.E. Cowley, Aramaic Papyri Discovered at Assuan (1906)',
  },
  { testament: 'ot', sort_year: -150,
    source_key: 'dead_sea_scrolls', category: 'manuscript',
    title: 'Dead Sea Scrolls (Qumran)', author: '',
    date_desc: 'c. 250 BC – 68 AD (discovered 1947–1956)', location: 'Shrine of the Book, Israel Museum, Jerusalem',
    description: '981 manuscripts discovered in 11 caves near Khirbet Qumran between 1947 and 1956, including every OT book except Esther. The Great Isaiah Scroll (1QIsa-a, c. 125–100 BC) is 7.34 m long and contains all 66 chapters of Isaiah in full.',
    significance: 'The Great Isaiah Scroll, 1,000 years older than the previously known manuscripts, differs from the Masoretic Text in only trivial ways — demonstrating extraordinary fidelity in OT transmission. Multiple Daniel scrolls push evidence to within 40 years of the alleged Maccabean forgery date, making forgery implausible.',
    citation: 'E.L. Sukenik (1947); DJD series (Oxford: Clarendon, 1955–2009)',
  },
]

export const HISTORICAL_REFS: HistoricalRef[] = [
  { bible_book: 'Matthew', bible_chapter: 27, bible_verse: 2,  source_key: 'tacitus_annals' },
  { bible_book: 'Mark',    bible_chapter: 15, bible_verse: 15, source_key: 'tacitus_annals' },
  { bible_book: 'Luke',    bible_chapter: 23, bible_verse: 24, source_key: 'tacitus_annals' },
  { bible_book: 'John',    bible_chapter: 19, bible_verse: 16, source_key: 'tacitus_annals' },

  { bible_book: 'Acts',          bible_chapter: 18, bible_verse: 2,  source_key: 'suetonius_claudius' },
  { bible_book: 'Acts',          bible_chapter: 11, bible_verse: 26, source_key: 'pliny_letters' },
  { bible_book: '1 Corinthians', bible_chapter: 16, bible_verse: 2,  source_key: 'pliny_letters' },

  { bible_book: 'Matthew', bible_chapter: 27, bible_verse: 45, source_key: 'thallus_africanus' },
  { bible_book: 'Mark',    bible_chapter: 15, bible_verse: 33, source_key: 'thallus_africanus' },
  { bible_book: 'Luke',    bible_chapter: 23, bible_verse: 44, source_key: 'thallus_africanus' },

  { bible_book: 'Genesis', bible_chapter: 6,  bible_verse: 9,  source_key: 'berossus' },
  { bible_book: 'Genesis', bible_chapter: 7,  bible_verse: 1,  source_key: 'berossus' },
  { bible_book: '2 Kings', bible_chapter: 25, bible_verse: 1,  source_key: 'berossus' },

  { bible_book: 'Genesis', bible_chapter: 47, bible_verse: 11, source_key: 'manetho' },
  { bible_book: 'Exodus',  bible_chapter: 1,  bible_verse: 8,  source_key: 'manetho' },
  { bible_book: 'Exodus',  bible_chapter: 12, bible_verse: 40, source_key: 'manetho' },

  { bible_book: 'Genesis', bible_chapter: 17, bible_verse: 11, source_key: 'herodotus_circumcision' },
  { bible_book: 'Joshua',  bible_chapter: 5,  bible_verse: 2,  source_key: 'herodotus_circumcision' },

  { bible_book: 'Matthew', bible_chapter: 27, bible_verse: 2,  source_key: 'pilate_stone' },
  { bible_book: 'Luke',    bible_chapter: 3,  bible_verse: 1,  source_key: 'pilate_stone' },
  { bible_book: 'John',    bible_chapter: 18, bible_verse: 28, source_key: 'pilate_stone' },

  { bible_book: 'Matthew', bible_chapter: 26, bible_verse: 57, source_key: 'caiaphas_ossuary' },
  { bible_book: 'John',    bible_chapter: 11, bible_verse: 49, source_key: 'caiaphas_ossuary' },
  { bible_book: 'John',    bible_chapter: 18, bible_verse: 13, source_key: 'caiaphas_ossuary' },

  { bible_book: 'John', bible_chapter: 9, bible_verse: 7,  source_key: 'pool_of_siloam' },
  { bible_book: 'John', bible_chapter: 9, bible_verse: 11, source_key: 'pool_of_siloam' },

  { bible_book: 'Romans', bible_chapter: 16, bible_verse: 23, source_key: 'erastus_inscription' },
  { bible_book: 'Acts',   bible_chapter: 19, bible_verse: 22, source_key: 'erastus_inscription' },

  { bible_book: 'John', bible_chapter: 18, bible_verse: 31, source_key: 'rylands_p52' },
  { bible_book: 'John', bible_chapter: 18, bible_verse: 33, source_key: 'rylands_p52' },
  { bible_book: 'John', bible_chapter: 18, bible_verse: 37, source_key: 'rylands_p52' },

  { bible_book: 'Matthew', bible_chapter: 8,  bible_verse: 23, source_key: 'jesus_boat' },
  { bible_book: 'Mark',    bible_chapter: 4,  bible_verse: 36, source_key: 'jesus_boat' },
  { bible_book: 'Luke',    bible_chapter: 8,  bible_verse: 22, source_key: 'jesus_boat' },

  { bible_book: 'Matthew', bible_chapter: 28, bible_verse: 13, source_key: 'nazareth_inscription' },
  { bible_book: 'Matthew', bible_chapter: 28, bible_verse: 15, source_key: 'nazareth_inscription' },

  { bible_book: 'Luke',    bible_chapter: 1, bible_verse: 1, source_key: 'muratorian_fragment' },
  { bible_book: 'John',    bible_chapter: 1, bible_verse: 1, source_key: 'muratorian_fragment' },
  { bible_book: 'Acts',    bible_chapter: 1, bible_verse: 1, source_key: 'muratorian_fragment' },
  { bible_book: 'Romans',  bible_chapter: 1, bible_verse: 1, source_key: 'muratorian_fragment' },

  { bible_book: 'Exodus',  bible_chapter: 1,  bible_verse: 1,  source_key: 'merneptah_stele' },
  { bible_book: 'Numbers', bible_chapter: 26, bible_verse: 51, source_key: 'merneptah_stele' },
  { bible_book: 'Joshua',  bible_chapter: 1,  bible_verse: 2,  source_key: 'merneptah_stele' },

  { bible_book: '2 Kings', bible_chapter: 3,  bible_verse: 4,  source_key: 'mesha_stele' },
  { bible_book: '2 Kings', bible_chapter: 3,  bible_verse: 5,  source_key: 'mesha_stele' },
  { bible_book: '1 Kings', bible_chapter: 16, bible_verse: 23, source_key: 'mesha_stele' },

  { bible_book: '2 Samuel', bible_chapter: 7,  bible_verse: 16, source_key: 'tel_dan_stele' },
  { bible_book: '2 Kings',  bible_chapter: 8,  bible_verse: 28, source_key: 'tel_dan_stele' },
  { bible_book: '1 Kings',  bible_chapter: 12, bible_verse: 20, source_key: 'tel_dan_stele' },

  { bible_book: '2 Kings',      bible_chapter: 20, bible_verse: 20, source_key: 'siloam_inscription' },
  { bible_book: '2 Chronicles', bible_chapter: 32, bible_verse: 30, source_key: 'siloam_inscription' },
  { bible_book: 'Isaiah',       bible_chapter: 22, bible_verse: 11, source_key: 'siloam_inscription' },

  { bible_book: '2 Kings', bible_chapter: 9,  bible_verse: 2,  source_key: 'black_obelisk' },
  { bible_book: '2 Kings', bible_chapter: 10, bible_verse: 31, source_key: 'black_obelisk' },
  { bible_book: '2 Kings', bible_chapter: 17, bible_verse: 3,  source_key: 'black_obelisk' },

  { bible_book: '2 Kings', bible_chapter: 18, bible_verse: 13, source_key: 'sennacherib_prism' },
  { bible_book: '2 Kings', bible_chapter: 19, bible_verse: 35, source_key: 'sennacherib_prism' },
  { bible_book: 'Isaiah',  bible_chapter: 36, bible_verse: 1,  source_key: 'sennacherib_prism' },
  { bible_book: 'Isaiah',  bible_chapter: 37, bible_verse: 33, source_key: 'sennacherib_prism' },

  { bible_book: 'Ezra',    bible_chapter: 1, bible_verse: 1, source_key: 'cyrus_cylinder' },
  { bible_book: 'Ezra',    bible_chapter: 1, bible_verse: 2, source_key: 'cyrus_cylinder' },
  { bible_book: 'Isaiah',  bible_chapter: 44, bible_verse: 28, source_key: 'cyrus_cylinder' },
  { bible_book: 'Isaiah',  bible_chapter: 45, bible_verse: 1,  source_key: 'cyrus_cylinder' },

  { bible_book: 'Numbers', bible_chapter: 6, bible_verse: 24, source_key: 'ketef_hinnom' },
  { bible_book: 'Numbers', bible_chapter: 6, bible_verse: 25, source_key: 'ketef_hinnom' },
  { bible_book: 'Numbers', bible_chapter: 6, bible_verse: 26, source_key: 'ketef_hinnom' },

  { bible_book: 'Isaiah',  bible_chapter: 40, bible_verse: 3, source_key: 'dead_sea_scrolls' },
  { bible_book: 'Daniel',  bible_chapter: 9,  bible_verse: 2, source_key: 'dead_sea_scrolls' },
  { bible_book: 'Psalms',  bible_chapter: 22, bible_verse: 1, source_key: 'dead_sea_scrolls' },
  { bible_book: 'Isaiah',  bible_chapter: 7,  bible_verse: 14, source_key: 'dead_sea_scrolls' },

  { bible_book: 'Jeremiah', bible_chapter: 34, bible_verse: 7, source_key: 'lachish_letters' },
  { bible_book: '2 Kings',  bible_chapter: 18, bible_verse: 14, source_key: 'lachish_letters' },

  { bible_book: 'Ezra',      bible_chapter: 4,  bible_verse: 7,  source_key: 'elephantine_papyri' },
  { bible_book: 'Nehemiah',  bible_chapter: 2,  bible_verse: 1,  source_key: 'elephantine_papyri' },
  { bible_book: 'Nehemiah',  bible_chapter: 2,  bible_verse: 10, source_key: 'elephantine_papyri' },
]

// Build a lookup map: "Book-ch-v" → source keys
const _refMap = new Map<string, string[]>()
for (const r of HISTORICAL_REFS) {
  const key = `${r.bible_book}-${r.bible_chapter}-${r.bible_verse}`
  const existing = _refMap.get(key) ?? []
  existing.push(r.source_key)
  _refMap.set(key, existing)
}

const _sourceMap = new Map<string, HistoricalSource>(
  HISTORICAL_SOURCES.map(s => [s.source_key, s])
)

export function getHistoricalForVerse(
  book: string, chapter: number, verse: number
): HistoricalSource[] {
  const keys = _refMap.get(`${book}-${chapter}-${verse}`) ?? []
  return keys.map(k => _sourceMap.get(k)).filter(Boolean) as HistoricalSource[]
}
