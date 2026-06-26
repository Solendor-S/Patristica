import { FATHER_DATES } from './fatherDates'

export interface MapCity {
  name: string
  lat: number
  lng: number
  description: string
}

export interface MapJourney {
  id: string
  label: string
  color: string
  route: [number, number][]
  cities: MapCity[]
  passages: Array<{ book: string; chapterStart: number; chapterEnd: number }>
}

export const JOURNEYS: MapJourney[] = [
  // ── OLD TESTAMENT ─────────────────────────────────────────────────────────

  {
    id: 'abraham',
    label: "Abraham's Journey",
    color: '#c084fc',
    passages: [{ book: 'Genesis', chapterStart: 11, chapterEnd: 25 }],
    route: [
      [30.96, 46.10],  // Ur
      [33.00, 43.00],  // along Euphrates
      [35.00, 39.50],  // upper Euphrates
      [36.86, 39.03],  // Haran
      [35.50, 37.00],  // south through Syria
      [33.50, 36.50],  // Damascus region
      [32.21, 35.28],  // Shechem
      [31.93, 35.22],  // Bethel
      [31.00, 34.80],  // Negev
      [30.50, 31.50],  // Egypt (Nile Delta)
      [31.00, 34.80],  // Negev (return)
      [31.93, 35.22],  // Bethel (return)
      [31.53, 35.10],  // Hebron/Mamre
      [31.25, 34.79],  // Beersheba
      [31.78, 35.23],  // Moriah (Jerusalem)
    ],
    cities: [
      { name: 'Ur of the Chaldees', lat: 30.96, lng: 46.10, description: 'Abraham\'s birthplace — God called him to leave for a land he did not know (Gen 11:31, 12:1)' },
      { name: 'Haran', lat: 36.86, lng: 39.03, description: 'Family settled here after leaving Ur; Terah died here; God renewed the call to Abraham (Gen 11:32–12:4)' },
      { name: 'Shechem', lat: 32.21, lng: 35.28, description: 'First stop in Canaan — God appeared and promised the land; Abraham built an altar (Gen 12:6–7)' },
      { name: 'Bethel', lat: 31.93, lng: 35.22, description: 'Abraham pitched his tent and built an altar, calling on the name of the Lord (Gen 12:8)' },
      { name: 'Egypt', lat: 30.50, lng: 31.50, description: 'Abraham went during famine; called Sarah his sister; Pharaoh returned her with gifts (Gen 12:10–20)' },
      { name: 'Hebron (Mamre)', lat: 31.53, lng: 35.10, description: 'Abraham settled near the oaks of Mamre; three visitors announced Isaac\'s birth; interceded for Sodom (Gen 13:18, 18)' },
      { name: 'Beersheba', lat: 31.25, lng: 34.79, description: 'Abraham planted a tamarisk tree and called on the Lord; covenant with Abimelech (Gen 21:33)' },
      { name: 'Mount Moriah', lat: 31.78, lng: 35.23, description: 'God commanded Abraham to sacrifice Isaac here — his faith proven; the Lord provided a ram (Gen 22:1–19)' },
    ],
  },

  {
    id: 'exodus',
    label: 'The Exodus',
    color: '#fb923c',
    passages: [
      { book: 'Exodus', chapterStart: 1, chapterEnd: 40 },
      { book: 'Numbers', chapterStart: 10, chapterEnd: 36 },
      { book: 'Deuteronomy', chapterStart: 1, chapterEnd: 34 },
    ],
    route: [
      [30.80, 31.80],  // Ramesses / Goshen
      [30.55, 32.22],  // Succoth
      [30.50, 32.50],  // Etham
      [29.90, 32.55],  // Red Sea crossing (Gulf of Suez)
      [28.80, 33.00],  // Marah
      [28.50, 33.20],  // Elim
      [28.20, 33.40],  // Wilderness of Sin
      [28.10, 33.60],  // Rephidim
      [28.54, 33.97],  // Mount Sinai
      [29.20, 34.10],  // Wilderness of Paran
      [30.64, 34.47],  // Kadesh Barnea
      [30.32, 35.44],  // Mount Hor
      [29.55, 35.00],  // Gulf of Aqaba (around Edom)
      [30.50, 35.80],  // East of Edom / Zin
      [31.78, 35.70],  // Plains of Moab
      [31.87, 35.44],  // Jericho
    ],
    cities: [
      { name: 'Ramesses (Goshen)', lat: 30.80, lng: 31.80, description: 'Israel enslaved in Egypt; Moses led 600,000 men plus families out on the night of Passover (Ex 12:37)' },
      { name: 'Succoth', lat: 30.55, lng: 32.22, description: 'First camp after leaving Egypt; the Lord went before them as a pillar of cloud and fire (Ex 13:20–22)' },
      { name: 'Red Sea Crossing', lat: 29.90, lng: 32.55, description: 'God parted the sea; Israel crossed on dry ground; Pharaoh\'s army was drowned (Ex 14)' },
      { name: 'Marah', lat: 28.80, lng: 33.00, description: 'Bitter waters made sweet by a tree God showed Moses — first test of trust (Ex 15:22–26)' },
      { name: 'Elim', lat: 28.50, lng: 33.20, description: 'Oasis with twelve springs and seventy palm trees — God\'s provision in the wilderness (Ex 15:27)' },
      { name: 'Rephidim', lat: 28.10, lng: 33.60, description: 'Water from the rock; Amalek defeated while Moses held up his hands (Ex 17)' },
      { name: 'Mount Sinai', lat: 28.54, lng: 33.97, description: 'God descended in fire; the Ten Commandments given; the Law, the Tabernacle, and the covenant established (Ex 19–40)' },
      { name: 'Kadesh Barnea', lat: 30.64, lng: 34.47, description: 'Twelve spies sent into Canaan; ten gave a bad report; Israel condemned to 40 years in the wilderness (Num 13–14)' },
      { name: 'Mount Hor', lat: 30.32, lng: 35.44, description: 'Aaron died and was gathered to his people; his son Eleazar became high priest (Num 20:22–29)' },
      { name: 'Plains of Moab', lat: 31.78, lng: 35.70, description: 'Israel camped opposite Jericho; Moses gave his final addresses; Balaam\'s oracles; Moses died on Nebo (Num 22–Deut 34)' },
      { name: 'Jericho', lat: 31.87, lng: 35.44, description: 'The walls fell as Israel shouted — first conquest of Canaan under Joshua (Josh 6)' },
    ],
  },

  {
    id: 'exile',
    label: 'Babylonian Exile & Return',
    color: '#94a3b8',
    passages: [
      { book: '2 Kings', chapterStart: 24, chapterEnd: 25 },
      { book: 'Jeremiah', chapterStart: 39, chapterEnd: 52 },
      { book: 'Ezra', chapterStart: 1, chapterEnd: 10 },
      { book: 'Nehemiah', chapterStart: 1, chapterEnd: 13 },
    ],
    route: [
      [31.78, 35.23],  // Jerusalem
      [31.87, 35.44],  // Jericho
      [32.50, 35.55],  // north Jordan Valley
      [33.51, 36.29],  // Damascus
      [34.40, 36.52],  // Riblah (Nebuchadnezzar's HQ)
      [34.50, 38.00],  // east across fertile crescent
      [34.50, 41.00],  // Euphrates region
      [32.54, 44.42],  // Babylon
      [33.00, 43.50],  // Ahava (Ezra's gathering point)
      [34.00, 41.00],  // north along Euphrates
      [36.83, 38.01],  // Carchemish area
      [35.00, 37.00],  // west through Syria
      [33.50, 36.50],  // Damascus region
      [32.50, 35.55],  // south through Canaan
      [31.78, 35.23],  // Jerusalem
    ],
    cities: [
      { name: 'Jerusalem', lat: 31.78, lng: 35.23, description: 'Nebuchadnezzar besieged and destroyed the city; Solomon\'s temple burned; the people led away captive (2 Kings 25)' },
      { name: 'Riblah', lat: 34.40, lng: 36.52, description: 'Nebuchadnezzar\'s command post; King Zedekiah blinded here after watching his sons killed (2 Kings 25:6–7)' },
      { name: 'Babylon', lat: 32.54, lng: 44.42, description: 'Israel in exile for 70 years; Daniel, Ezekiel, and Shadrach, Meshach, and Abednego served here; Cyrus issued the decree of return in 538 BC (Ezra 1)' },
      { name: 'Ahava', lat: 33.00, lng: 43.50, description: 'Ezra gathered the returning exiles and fasted three days before departure (Ezra 8:15–23)' },
      { name: 'Jerusalem (Return)', lat: 31.79, lng: 35.24, description: 'Zerubbabel led the first return (538 BC); Ezra the second (458 BC); Nehemiah rebuilt the walls (445 BC)' },
    ],
  },

  // ── NEW TESTAMENT ──────────────────────────────────────────────────────────

  {
    id: 'jesus-ministry',
    label: 'Ministry of Jesus',
    color: '#fcd34d',
    passages: [
      { book: 'Matthew', chapterStart: 1, chapterEnd: 28 },
      { book: 'Mark', chapterStart: 1, chapterEnd: 16 },
      { book: 'Luke', chapterStart: 1, chapterEnd: 24 },
      { book: 'John', chapterStart: 1, chapterEnd: 21 },
    ],
    route: [
      [31.70, 35.20],  // Bethlehem
      [32.70, 35.30],  // Nazareth
      [31.83, 35.55],  // Jordan River (baptism)
      [31.50, 35.45],  // Wilderness of Judea (temptation)
      [32.75, 35.35],  // Cana
      [32.88, 35.57],  // Capernaum
      [32.83, 35.52],  // Sea of Galilee
      [32.60, 35.33],  // Nain
      [33.25, 35.70],  // Caesarea Philippi
      [32.70, 35.84],  // Mount Hermon (Transfiguration)
      [32.46, 35.52],  // Scythopolis / Decapolis region
      [31.87, 35.44],  // Jericho
      [31.77, 35.26],  // Bethany
      [31.78, 35.23],  // Jerusalem
    ],
    cities: [
      { name: 'Bethlehem', lat: 31.70, lng: 35.20, description: 'Born of the virgin Mary; laid in a manger; worshipped by shepherds and magi (Matt 2, Luke 2)' },
      { name: 'Nazareth', lat: 32.70, lng: 35.30, description: 'Grew up here; declared the fulfilment of Isaiah 61 in the synagogue; rejected by his hometown (Luke 4:16–30)' },
      { name: 'Jordan River (Baptism)', lat: 31.83, lng: 35.55, description: 'Baptised by John; the Spirit descended as a dove; the Father declared: "This is my beloved Son" (Matt 3:13–17)' },
      { name: 'Wilderness of Judea', lat: 31.50, lng: 35.45, description: 'Forty days fasting; tempted by the devil three times; angels ministered to him (Matt 4:1–11)' },
      { name: 'Cana of Galilee', lat: 32.75, lng: 35.35, description: 'First miracle — water turned to wine at a wedding; his disciples believed (John 2:1–11)' },
      { name: 'Capernaum', lat: 32.88, lng: 35.57, description: 'Ministry headquarters; healed the paralytic, the centurion\'s servant, Peter\'s mother-in-law; taught in the synagogue (Matt 4:13, 9)' },
      { name: 'Sea of Galilee', lat: 32.83, lng: 35.52, description: 'Stilled the storm; walked on water; fed 5,000 nearby; called the first disciples from their boats (Matt 14, Mark 4)' },
      { name: 'Nain', lat: 32.60, lng: 35.33, description: 'Raised a widow\'s only son from death as the funeral procession went out (Luke 7:11–17)' },
      { name: 'Caesarea Philippi', lat: 33.25, lng: 35.70, description: 'Peter confessed: "You are the Christ, the Son of the living God"; Jesus foretold his death (Matt 16:13–21)' },
      { name: 'Mount Hermon (Transfiguration)', lat: 32.70, lng: 35.84, description: 'Jesus transfigured before Peter, James, and John; Moses and Elijah appeared; the Father spoke from a cloud (Matt 17:1–8)' },
      { name: 'Jericho', lat: 31.87, lng: 35.44, description: 'Healed blind Bartimaeus; called Zacchaeus down from the sycamore tree (Luke 18:35, 19:1–10)' },
      { name: 'Bethany', lat: 31.77, lng: 35.26, description: 'Home of Mary, Martha, and Lazarus — raised from the tomb after four days (John 11); anointed for burial (John 12:1–8)' },
      { name: 'Jerusalem', lat: 31.78, lng: 35.23, description: 'Triumphal entry; cleansed the temple; Last Supper; Gethsemane; crucified at Golgotha; rose on the third day (Matt 21–28)' },
    ],
  },

  {
    id: 'seven-churches',
    label: 'Seven Churches of Revelation',
    color: '#e879f9',
    passages: [{ book: 'Revelation', chapterStart: 1, chapterEnd: 3 }],
    route: [
      [37.94, 27.34],  // Ephesus
      [38.42, 27.14],  // Smyrna
      [39.12, 27.18],  // Pergamum
      [38.92, 27.85],  // Thyatira
      [38.49, 28.03],  // Sardis
      [38.35, 28.52],  // Philadelphia
      [37.83, 29.11],  // Laodicea
    ],
    cities: [
      { name: 'Ephesus', lat: 37.94, lng: 27.34, description: 'Left their first love — called to remember, repent, and return; threatened with lampstand removed (Rev 2:1–7)' },
      { name: 'Smyrna', lat: 38.42, lng: 27.14, description: 'Persecuted and poor yet rich — "Be faithful unto death and I will give you the crown of life" (Rev 2:8–11)' },
      { name: 'Pergamum', lat: 39.12, lng: 27.18, description: 'Where Satan\'s throne is — held fast the faith; rebuked for tolerating false teaching (Rev 2:12–17)' },
      { name: 'Thyatira', lat: 38.92, lng: 27.85, description: 'Growing in love and faith; rebuked for tolerating the prophetess Jezebel and her immorality (Rev 2:18–29)' },
      { name: 'Sardis', lat: 38.49, lng: 28.03, description: 'A name of being alive but dead — called to wake up and strengthen what remains (Rev 3:1–6)' },
      { name: 'Philadelphia', lat: 38.35, lng: 28.52, description: 'Little strength yet kept the word — given an open door; promised to be kept from the hour of trial (Rev 3:7–13)' },
      { name: 'Laodicea', lat: 37.83, lng: 29.11, description: 'Lukewarm — neither hot nor cold; "I stand at the door and knock" — called to repent and be zealous (Rev 3:14–22)' },
    ],
  },

  {
    id: 'jonah',
    label: "Jonah's Journey",
    color: '#22d3ee',
    passages: [{ book: 'Jonah', chapterStart: 1, chapterEnd: 4 }],
    route: [
      [32.05, 34.75],  // Joppa
      [32.50, 32.00],  // Mediterranean (fleeing toward Tarshish)
      [32.80, 29.00],  // thrown overboard / great fish
      [33.20, 32.50],  // spat out on shore
      [34.00, 37.00],  // overland toward Nineveh
      [36.36, 43.15],  // Nineveh
    ],
    cities: [
      { name: 'Joppa', lat: 32.05, lng: 34.75, description: 'Jonah fled here and boarded a ship bound for Tarshish, running from God\'s call (Jonah 1:3)' },
      { name: 'Mediterranean Sea', lat: 32.80, lng: 29.00, description: 'A great storm arose; Jonah confessed and was thrown overboard; swallowed by a great fish for three days and nights (Jonah 1:4–17)' },
      { name: 'Nineveh', lat: 36.36, lng: 43.15, description: 'Jonah preached; the entire city — king to cattle — fasted and repented; God relented from disaster (Jonah 3)' },
    ],
  },

  {
    id: 'flight-egypt',
    label: 'Flight to Egypt',
    color: '#86efac',
    passages: [{ book: 'Matthew', chapterStart: 2, chapterEnd: 2 }],
    route: [
      [31.70, 35.20],  // Bethlehem
      [31.50, 34.47],  // Gaza
      [30.50, 32.50],  // Sinai crossing
      [30.07, 31.29],  // Egypt (Heliopolis / Cairo area)
      [30.50, 32.50],  // Sinai (return)
      [31.50, 34.47],  // Coastal plain
      [32.70, 35.30],  // Nazareth
    ],
    cities: [
      { name: 'Bethlehem', lat: 31.70, lng: 35.20, description: 'An angel warned Joseph in a dream: flee to Egypt — Herod seeks the child to destroy him (Matt 2:13)' },
      { name: 'Egypt', lat: 30.07, lng: 31.29, description: 'The family remained until Herod\'s death — fulfilling "Out of Egypt I called my son" (Matt 2:14–15, Hos 11:1)' },
      { name: 'Nazareth', lat: 32.70, lng: 35.30, description: 'Joseph settled the family here on return from Egypt — Jesus grew up in Nazareth (Matt 2:19–23)' },
    ],
  },

  // ── PAUL'S JOURNEYS ────────────────────────────────────────────────────────

  {
    id: 'paul-1',
    label: "Paul's 1st Journey",
    color: '#f59e0b',
    passages: [{ book: 'Acts', chapterStart: 13, chapterEnd: 14 }],
    route: [
      [36.20, 36.16],  // Antioch (Syria)
      [36.12, 35.93],  // Seleucia (port)
      [35.17, 33.90],  // Salamis (Cyprus)
      [34.77, 32.42],  // Paphos (Cyprus)
      [36.96, 30.85],  // Perga
      [38.27, 31.19],  // Antioch (Pisidia)
      [37.87, 32.48],  // Iconium
      [37.57, 32.35],  // Lystra
      [37.36, 33.37],  // Derbe
      [37.57, 32.35],  // Lystra (return)
      [37.87, 32.48],  // Iconium (return)
      [38.27, 31.19],  // Antioch (Pisidia) (return)
      [36.88, 30.70],  // Attalia
      [36.12, 35.93],  // Seleucia
      [36.20, 36.16],  // Antioch (Syria)
    ],
    cities: [
      { name: 'Antioch (Syria)', lat: 36.20, lng: 36.16, description: 'Home base — Paul and Barnabas sent out by the church here (Acts 13:1–3)' },
      { name: 'Seleucia Pieria', lat: 36.12, lng: 35.93, description: 'Port of Antioch — they sailed from here to Cyprus (Acts 13:4)' },
      { name: 'Salamis (Cyprus)', lat: 35.17, lng: 33.90, description: 'First stop in Cyprus — preached in the synagogues (Acts 13:5)' },
      { name: 'Paphos (Cyprus)', lat: 34.77, lng: 32.42, description: 'Paul confronted Bar-Jesus the sorcerer; proconsul Sergius Paulus believed (Acts 13:6–12)' },
      { name: 'Perga (Pamphylia)', lat: 36.96, lng: 30.85, description: 'John Mark departed for Jerusalem here (Acts 13:13)' },
      { name: 'Antioch (Pisidia)', lat: 38.27, lng: 31.19, description: 'Paul\'s landmark synagogue sermon; expelled by Jewish opposition (Acts 13:14–52)' },
      { name: 'Iconium', lat: 37.87, lng: 32.48, description: 'Many believed; plot to stone them forced them to flee (Acts 14:1–6)' },
      { name: 'Lystra', lat: 37.57, lng: 32.35, description: 'Paul healed a lame man; crowd tried to worship them as gods; Paul stoned and left for dead (Acts 14:8–20)' },
      { name: 'Derbe', lat: 37.36, lng: 33.37, description: 'Made many disciples; turned back to strengthen the churches (Acts 14:20–21)' },
      { name: 'Attalia', lat: 36.88, lng: 30.70, description: 'Sailed from here back to Antioch (Acts 14:25–26)' },
    ],
  },

  {
    id: 'paul-2',
    label: "Paul's 2nd Journey",
    color: '#60a5fa',
    passages: [{ book: 'Acts', chapterStart: 15, chapterEnd: 18 }],
    route: [
      [36.20, 36.16],  // Antioch (Syria)
      [37.36, 33.37],  // Derbe
      [37.57, 32.35],  // Lystra
      [39.78, 26.14],  // Troas
      [40.47, 25.53],  // Samothrace
      [40.94, 24.40],  // Neapolis
      [41.01, 24.28],  // Philippi
      [40.64, 22.94],  // Thessalonica
      [40.52, 22.20],  // Berea
      [37.97, 23.73],  // Athens
      [37.94, 22.93],  // Corinth
      [37.94, 27.34],  // Ephesus
      [32.49, 34.89],  // Caesarea
      [31.77, 35.23],  // Jerusalem
      [36.20, 36.16],  // Antioch (Syria)
    ],
    cities: [
      { name: 'Antioch (Syria)', lat: 36.20, lng: 36.16, description: 'Paul and Silas set out after the Jerusalem Council (Acts 15:36–40)' },
      { name: 'Lystra', lat: 37.57, lng: 32.35, description: 'Timothy joined as a co-worker here (Acts 16:1–3)' },
      { name: 'Troas', lat: 39.78, lng: 26.14, description: 'Paul received the "Macedonian vision" — calling him to Europe (Acts 16:8–10)' },
      { name: 'Samothrace', lat: 40.47, lng: 25.53, description: 'Island stop on the way to Macedonia (Acts 16:11)' },
      { name: 'Neapolis', lat: 40.94, lng: 24.40, description: 'First landing point in Europe (Acts 16:11)' },
      { name: 'Philippi', lat: 41.01, lng: 24.28, description: 'Lydia baptised; Paul and Silas imprisoned and freed by earthquake (Acts 16:12–40)' },
      { name: 'Thessalonica', lat: 40.64, lng: 22.94, description: 'Many believed; Jews stirred up a mob, forcing Paul to leave (Acts 17:1–9)' },
      { name: 'Berea', lat: 40.52, lng: 22.20, description: 'Bereans examined the Scriptures daily — praised for nobility (Acts 17:10–12)' },
      { name: 'Athens', lat: 37.97, lng: 23.73, description: 'Paul\'s famous Areopagus sermon on the "unknown God" (Acts 17:16–34)' },
      { name: 'Corinth', lat: 37.94, lng: 22.93, description: 'Stayed 18 months; met Aquila and Priscilla; wrote 1 & 2 Thessalonians (Acts 18:1–18)' },
      { name: 'Ephesus', lat: 37.94, lng: 27.34, description: 'Brief stop; left Priscilla and Aquila here (Acts 18:19–21)' },
      { name: 'Caesarea Maritima', lat: 32.49, lng: 34.89, description: 'Landed and greeted the church (Acts 18:22)' },
      { name: 'Jerusalem', lat: 31.77, lng: 35.23, description: 'Went up and greeted the church (Acts 18:22)' },
    ],
  },

  {
    id: 'paul-3',
    label: "Paul's 3rd Journey",
    color: '#4ade80',
    passages: [{ book: 'Acts', chapterStart: 18, chapterEnd: 21 }],
    route: [
      [36.20, 36.16],  // Antioch (Syria)
      [38.27, 31.19],  // Antioch (Pisidia) area / Galatia
      [37.94, 27.34],  // Ephesus
      [41.01, 24.28],  // Philippi / Macedonia
      [40.64, 22.94],  // Thessalonica
      [37.94, 22.93],  // Corinth (Greece)
      [40.64, 22.94],  // Thessalonica (return)
      [41.01, 24.28],  // Philippi (return)
      [39.78, 26.14],  // Troas
      [37.52, 27.28],  // Miletus
      [36.90, 27.31],  // Cos
      [36.43, 28.22],  // Rhodes
      [36.26, 29.31],  // Patara
      [33.27, 35.20],  // Tyre
      [32.93, 35.07],  // Ptolemais
      [32.49, 34.89],  // Caesarea
      [31.77, 35.23],  // Jerusalem
    ],
    cities: [
      { name: 'Antioch (Syria)', lat: 36.20, lng: 36.16, description: 'Paul set out again through Galatia and Phrygia (Acts 18:23)' },
      { name: 'Ephesus', lat: 37.94, lng: 27.34, description: 'Paul\'s longest stay — over 2 years; extraordinary miracles; silversmiths\' riot (Acts 19)' },
      { name: 'Philippi', lat: 41.01, lng: 24.28, description: 'Paul passed through Macedonia strengthening the churches (Acts 20:1–2)' },
      { name: 'Corinth', lat: 37.94, lng: 22.93, description: 'Spent 3 months; wrote Romans here (Acts 20:2–3)' },
      { name: 'Troas', lat: 39.78, lng: 26.14, description: 'Paul raised Eutychus from the dead after he fell from a window (Acts 20:6–12)' },
      { name: 'Miletus', lat: 37.52, lng: 27.28, description: 'Farewell address to the Ephesian elders — one of Paul\'s most moving speeches (Acts 20:17–38)' },
      { name: 'Cos', lat: 36.90, lng: 27.31, description: 'Island stop on the way south (Acts 21:1)' },
      { name: 'Rhodes', lat: 36.43, lng: 28.22, description: 'Island stop on the way south (Acts 21:1)' },
      { name: 'Patara', lat: 36.26, lng: 29.31, description: 'Changed ships for the voyage to Phoenicia (Acts 21:1–2)' },
      { name: 'Tyre', lat: 33.27, lng: 35.20, description: 'Disciples urged Paul not to go to Jerusalem (Acts 21:3–6)' },
      { name: 'Ptolemais (Akko)', lat: 32.93, lng: 35.07, description: 'Greeted the brothers and stayed one day (Acts 21:7)' },
      { name: 'Caesarea Maritima', lat: 32.49, lng: 34.89, description: 'Prophet Agabus foretold Paul\'s arrest in Jerusalem (Acts 21:8–14)' },
      { name: 'Jerusalem', lat: 31.77, lng: 35.23, description: 'Paul arrested in the temple — beginning of his imprisonment (Acts 21:15–36)' },
    ],
  },

  {
    id: 'paul-4',
    label: "Paul's Voyage to Rome",
    color: '#f87171',
    passages: [{ book: 'Acts', chapterStart: 27, chapterEnd: 28 }],
    route: [
      [32.49, 34.89],  // Caesarea
      [33.56, 35.37],  // Sidon
      [36.27, 29.98],  // Myra
      [36.67, 27.37],  // Cnidus
      [34.97, 24.79],  // Fair Havens (Crete)
      [35.90, 14.44],  // Malta (shipwreck)
      [37.08, 15.28],  // Syracuse
      [37.92, 15.66],  // Rhegium
      [40.83, 14.12],  // Puteoli
      [41.90, 12.50],  // Rome
    ],
    cities: [
      { name: 'Caesarea Maritima', lat: 32.49, lng: 34.89, description: 'Paul sailed as a prisoner under Julius the centurion (Acts 27:1)' },
      { name: 'Sidon', lat: 33.56, lng: 35.37, description: 'Julius allowed Paul to visit friends (Acts 27:3)' },
      { name: 'Myra (Lycia)', lat: 36.27, lng: 29.98, description: 'Transferred to an Alexandrian grain ship bound for Italy (Acts 27:5–6)' },
      { name: 'Cnidus', lat: 36.67, lng: 27.37, description: 'Headwinds forced them south around Crete (Acts 27:7)' },
      { name: 'Fair Havens (Crete)', lat: 34.97, lng: 24.79, description: 'Paul warned against sailing — overruled; the storm came (Acts 27:8–12)' },
      { name: 'Malta', lat: 35.90, lng: 14.44, description: 'Shipwrecked after 14 days adrift; Paul bitten by viper, unharmed; healed many (Acts 27:39–28:10)' },
      { name: 'Syracuse (Sicily)', lat: 37.08, lng: 15.28, description: 'Stayed 3 days (Acts 28:12)' },
      { name: 'Rhegium', lat: 37.92, lng: 15.66, description: 'Brief stop; south wind came up (Acts 28:13)' },
      { name: 'Puteoli', lat: 40.83, lng: 14.12, description: 'Found brothers who urged them to stay 7 days (Acts 28:13–14)' },
      { name: 'Rome', lat: 41.90, lng: 12.50, description: 'Paul under house arrest for 2 years — wrote Ephesians, Philippians, Colossians, Philemon (Acts 28:16–31)' },
    ],
  },
]

// ── Father Geographic Map ─────────────────────────────────────────────────────

export interface FatherCityEntry {
  name: string
  dates: string
  sort: number
  tradition?: string
  role?: string
}

export interface FatherCity {
  displayName: string
  lat: number
  lng: number
  fathers: FatherCityEntry[]
}

// Maps exact FATHER_DATES location strings to coordinates.
// Multiple strings with the same displayName merge into one pin.
const FATHER_CITY_COORDS: Record<string, { lat: number; lng: number; displayName: string }> = {
  'Antioch, Syria':                            { lat: 36.20, lng:  36.16, displayName: 'Antioch' },
  'Antioch & Tarsus':                          { lat: 36.20, lng:  36.16, displayName: 'Antioch' },
  'Antioch & Constantinople':                  { lat: 36.20, lng:  36.16, displayName: 'Antioch' },
  'Syria / Antioch':                           { lat: 36.20, lng:  36.16, displayName: 'Antioch' },
  'Smyrna, Asia Minor':                        { lat: 38.42, lng:  27.14, displayName: 'Smyrna' },
  'Ephesus, Asia Minor':                       { lat: 37.94, lng:  27.34, displayName: 'Ephesus' },
  'Hierapolis, Phrygia':                       { lat: 37.92, lng:  29.12, displayName: 'Hierapolis' },
  'Rome':                                      { lat: 41.90, lng:  12.49, displayName: 'Rome' },
  'Rome (North African origin)':               { lat: 41.90, lng:  12.49, displayName: 'Rome' },
  'Rome or Corinth':                           { lat: 41.90, lng:  12.49, displayName: 'Rome' },
  'Gaul / Rome (secretary to Leo I)':          { lat: 41.90, lng:  12.49, displayName: 'Rome' },
  'Antwerp & Rome':                            { lat: 41.90, lng:  12.49, displayName: 'Rome' },
  'Lyon, Gaul':                                { lat: 45.74, lng:   4.83, displayName: 'Lyon' },
  'Palestine / Rome':                          { lat: 31.77, lng:  35.23, displayName: 'Jerusalem' },
  'Jerusalem / Emmaus':                        { lat: 31.77, lng:  35.23, displayName: 'Jerusalem' },
  'Jerusalem':                                 { lat: 31.77, lng:  35.23, displayName: 'Jerusalem' },
  'Corinth, Greece':                           { lat: 37.94, lng:  22.93, displayName: 'Corinth' },
  'Alexandria, Egypt':                         { lat: 31.20, lng:  29.92, displayName: 'Alexandria' },
  'Alexandria & Caesarea':                     { lat: 31.20, lng:  29.92, displayName: 'Alexandria' },
  'Carthage, North Africa':                    { lat: 36.86, lng:  10.32, displayName: 'Carthage' },
  'Neocaesarea, Pontus':                       { lat: 40.55, lng:  36.50, displayName: 'Neocaesarea' },
  'Olympus, Lycia':                            { lat: 36.40, lng:  30.46, displayName: 'Olympus, Lycia' },
  'Sicca Veneria, North Africa':               { lat: 36.48, lng:   8.70, displayName: 'Sicca Veneria' },
  'Caesarea Maritima':                         { lat: 32.50, lng:  34.89, displayName: 'Caesarea Maritima' },
  'Nicomedia & Trier':                         { lat: 40.77, lng:  29.92, displayName: 'Nicomedia' },
  'Caesarea, Cappadocia':                      { lat: 38.74, lng:  35.49, displayName: 'Caesarea, Cappadocia' },
  'Nyssa, Cappadocia':                         { lat: 38.38, lng:  34.71, displayName: 'Nyssa' },
  'Constantinople':                            { lat: 41.01, lng:  28.97, displayName: 'Constantinople' },
  'Constantinople & Palestine':                { lat: 41.01, lng:  28.97, displayName: 'Constantinople' },
  'Milan, Italy':                              { lat: 45.46, lng:   9.19, displayName: 'Milan' },
  'Nitria & Kellia, Egypt':                    { lat: 30.42, lng:  30.33, displayName: 'Nitria' },
  'Emesa, Syria':                              { lat: 34.73, lng:  36.72, displayName: 'Emesa' },
  'Salamis (Constantia), Cyprus':              { lat: 35.18, lng:  33.91, displayName: 'Salamis, Cyprus' },
  'Bethlehem (via Rome & Antioch)':            { lat: 31.71, lng:  35.20, displayName: 'Bethlehem' },
  'Aquileia & Jerusalem (via Egypt)':          { lat: 45.77, lng:  13.37, displayName: 'Aquileia' },
  'Aquileia, Italy':                           { lat: 45.77, lng:  13.37, displayName: 'Aquileia' },
  'Iconium, Lycaonia':                         { lat: 37.87, lng:  32.49, displayName: 'Iconium' },
  'Marseille, Gaul (via Egypt & Bethlehem)':   { lat: 43.30, lng:   5.37, displayName: 'Marseille' },
  'Marseille, Gaul':                           { lat: 43.30, lng:   5.37, displayName: 'Marseille' },
  'Hippo Regius, North Africa':                { lat: 36.90, lng:   7.77, displayName: 'Hippo Regius' },
  'Nola, Italy':                               { lat: 40.92, lng:  14.53, displayName: 'Nola' },
  'Bracara Augusta, Hispania':                 { lat: 41.55, lng:  -8.43, displayName: 'Braga' },
  'Gaul (Aquitaine)':                          { lat: 44.84, lng:  -0.58, displayName: 'Aquitaine' },
  'Lérins, Gaul':                              { lat: 43.52, lng:   7.05, displayName: 'Lérins' },
  'Ravenna, Italy':                            { lat: 44.42, lng:  12.20, displayName: 'Ravenna' },
  'Ruspe, North Africa':                       { lat: 36.73, lng:  11.00, displayName: 'Ruspe' },
  'Vivarium, Calabria, Italy':                 { lat: 38.62, lng:  16.52, displayName: 'Vivarium' },
  'Arles, Gaul':                               { lat: 43.68, lng:   4.63, displayName: 'Arles' },
  'Monte Cassino, Italy':                      { lat: 41.49, lng:  13.82, displayName: 'Monte Cassino' },
  'Gaza, Palestine':                           { lat: 31.50, lng:  34.46, displayName: 'Gaza' },
  'Serugh, Mesopotamia':                       { lat: 36.93, lng:  38.95, displayName: 'Serugh' },
  'Mabbug, Syria':                             { lat: 36.52, lng:  37.95, displayName: 'Mabbug' },
  'Seville, Spain':                            { lat: 37.39, lng:  -5.99, displayName: 'Seville' },
  'Monastery of Mar Saba, Palestine':          { lat: 31.70, lng:  35.33, displayName: 'Mar Saba' },
  'Nineveh (via Beth Qatraye, Persia)':        { lat: 36.34, lng:  43.13, displayName: 'Nineveh' },
  'Assyria (via Rome)':                        { lat: 36.34, lng:  43.13, displayName: 'Nineveh' },
  'Jarrow, Northumbria':                       { lat: 54.98, lng:  -1.50, displayName: 'Jarrow' },
  'Tours, Francia':                            { lat: 47.39, lng:   0.69, displayName: 'Tours' },
  'Fulda & Mainz, Germania':                   { lat: 50.55, lng:   9.68, displayName: 'Fulda' },
  'Auxerre, Francia':                          { lat: 47.80, lng:   3.57, displayName: 'Auxerre' },
  'Auxerre & Reims, Francia':                  { lat: 47.80, lng:   3.57, displayName: 'Auxerre' },
  'Ohrid, Bulgaria':                           { lat: 41.12, lng:  20.80, displayName: 'Ohrid' },
  'Canterbury, England':                       { lat: 51.28, lng:   1.08, displayName: 'Canterbury' },
  'Clairvaux, France':                         { lat: 48.14, lng:   4.78, displayName: 'Clairvaux' },
  'Thessalonica':                              { lat: 40.64, lng:  22.94, displayName: 'Thessalonica' },
  'Paris & Naples':                            { lat: 48.85, lng:   2.35, displayName: 'Paris' },
  'Paris':                                     { lat: 48.85, lng:   2.35, displayName: 'Paris' },
  'Laon & Paris, Francia':                     { lat: 48.85, lng:   2.35, displayName: 'Paris' },
  'London':                                    { lat: 51.51, lng:  -0.13, displayName: 'London' },
  'Lancashire, England':                       { lat: 53.76, lng:  -2.70, displayName: 'Lancashire' },
  'Poetovio (Ptuj), Pannonia':                 { lat: 46.41, lng:  15.87, displayName: 'Poetovio' },
  'Gabala, Syria':                             { lat: 35.73, lng:  35.88, displayName: 'Gabala' },
  'Reims, Francia':                            { lat: 49.25, lng:   4.03, displayName: 'Reims' },
  'Douai & Rheims, France':                    { lat: 49.25, lng:   4.03, displayName: 'Reims' },
  'Tricca, Thessaly':                          { lat: 39.55, lng:  21.77, displayName: 'Trikala' },
  'Eclanum, Italy':                            { lat: 41.01, lng:  15.14, displayName: 'Eclanum' },
  'Egyptian Desert (Thebaid)':                 { lat: 26.56, lng:  31.72, displayName: 'Egyptian Desert' },
  'Scetis (Wadi el-Natrun), Egypt':            { lat: 30.43, lng:  30.33, displayName: 'Scetis' },
  'Persian Empire (Mesopotamia)':              { lat: 33.34, lng:  44.40, displayName: 'Mesopotamia' },
  'Nisibis & Edessa, Syria':                   { lat: 37.15, lng:  38.79, displayName: 'Edessa' },
  'Poitiers, Gaul':                            { lat: 46.58, lng:   0.34, displayName: 'Poitiers' },
  'Barcelona, Spain':                          { lat: 41.38, lng:   2.17, displayName: 'Barcelona' },
  'Cyrrhus, Syria':                            { lat: 36.74, lng:  36.97, displayName: 'Cyrrhus' },
  'Athens / Alexandria':                       { lat: 37.98, lng:  23.73, displayName: 'Athens' },
  'Brescia, Italy':                            { lat: 45.54, lng:  10.22, displayName: 'Brescia' },
}

const SKIP_FATHER_KEYS = new Set(['2 Clement'])

function buildFatherCities(): FatherCity[] {
  const map = new Map<string, FatherCity>()
  for (const [name, info] of Object.entries(FATHER_DATES)) {
    if (SKIP_FATHER_KEYS.has(name)) continue
    if (!info.location) continue
    const coord = FATHER_CITY_COORDS[info.location]
    if (!coord) continue
    const key = coord.displayName
    if (!map.has(key)) {
      map.set(key, { displayName: coord.displayName, lat: coord.lat, lng: coord.lng, fathers: [] })
    }
    const city = map.get(key)!
    // Deduplicate aliases (same dates + role = same person under a different name key)
    if (!city.fathers.some(f => f.dates === info.dates && f.role === info.role)) {
      city.fathers.push({ name, dates: info.dates, sort: info.sort, tradition: info.tradition, role: info.role })
    }
  }
  return Array.from(map.values())
}

export const FATHER_CITIES: FatherCity[] = buildFatherCities()
