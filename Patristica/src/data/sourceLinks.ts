const NA   = 'https://www.newadvent.org/fathers'
const CCEL = 'https://www.ccel.org/ccel'
const TERT = 'https://www.tertullian.org/fathers'

const WORK_MAP: Record<string, Record<string, string>> = {
  'John Chrysostom': {
    'Matthew':         `${NA}/2001.htm`,
    'John':            `${NA}/2401.htm`,
    'Acts':            `${NA}/2101.htm`,
    'Romans':          `${NA}/2102.htm`,
    '1 Corinthians':   `${NA}/2201.htm`,
    '2 Corinthians':   `${NA}/2202.htm`,
    'Galatians':       `${NA}/2302.htm`,
    'Ephesians':       `${NA}/2303.htm`,
    'Philippians':     `${NA}/2304.htm`,
    'Colossians':      `${NA}/2305.htm`,
    '1 Thessalonians': `${NA}/2306.htm`,
    '2 Thessalonians': `${NA}/2307.htm`,
    '1 Timothy':       `${NA}/2308.htm`,
    '2 Timothy':       `${NA}/2309.htm`,
    'Titus':           `${NA}/2311.htm`,
    'Philemon':        `${NA}/2310.htm`,
    'Hebrews':         `${NA}/2403.htm`,
    'Genesis':         `${NA}/2101.htm`,
    'Psalms':          `${NA}/2102.htm`,
  },
  'Augustine of Hippo': {
    'Psalms':          `${NA}/1501.htm`,
    'John':            `${NA}/1701.htm`,
    '1 John':          `${NA}/1702.htm`,
    'Matthew':         `${NA}/1302.htm`,
    'Galatians':       `${NA}/1303.htm`,
    'Romans':          `${NA}/1304.htm`,
    'Genesis':         `${NA}/1701.htm`,
  },
  'Jerome of Stridon': {
    'Matthew':         `${NA}/3009.htm`,
    'Mark':            `${NA}/3009.htm`,
    'Galatians':       `${NA}/3008.htm`,
    'Ephesians':       `${NA}/3010.htm`,
    'Titus':           `${NA}/3011.htm`,
    'Philemon':        `${NA}/3012.htm`,
    'Isaiah':          `${NA}/3013.htm`,
    'Ezekiel':         `${NA}/3014.htm`,
    'Daniel':          `${NA}/3015.htm`,
  },
  'Origen of Alexandria': {
    'Matthew':         `${NA}/1016.htm`,
    'John':            `${NA}/1017.htm`,
    'Romans':          `${NA}/1028.htm`,
    'Genesis':         `${NA}/1002.htm`,
    'Psalms':          `${NA}/1019.htm`,
  },
  'Cyril of Alexandria': {
    'John':            `${NA}/2092.htm`,
    'Luke':            `${NA}/2095.htm`,
    'Isaiah':          `${NA}/2096.htm`,
  },
  'Ambrose of Milan': {
    'Luke':            `${NA}/2104.htm`,
    'Psalms':          `${NA}/2102.htm`,
  },
  'Hilary of Poitiers': {
    'Matthew':         `${NA}/3300.htm`,
    'Psalms':          `${NA}/3301.htm`,
  },
  'Basil of Caesarea': {
    'Isaiah':          `${NA}/3201.htm`,
    'Psalms':          `${NA}/3202.htm`,
    'Genesis':         `${NA}/3203.htm`,
  },
  'Gregory of Nyssa': {
    'Song of Solomon': `${NA}/2907.htm`,
    'Psalms':          `${NA}/2903.htm`,
    'Ecclesiastes':    `${NA}/2906.htm`,
  },
  'Gregory the Great': {
    'Job':             `${NA}/3601.htm`,
    'Ezekiel':         `${NA}/3602.htm`,
    'Song of Solomon': `${NA}/3603.htm`,
  },
  'Theophylact of Ohrid': {
    'Matthew':         `${NA}/2001.htm`,
    'Mark':            `${CCEL}/theophylact/markcomm`,
    'Luke':            `${CCEL}/theophylact/lukecomm`,
    'John':            `${CCEL}/theophylact/johncomm`,
  },
  'Theophylact of Ochrid': {
    'Matthew':         `${NA}/2001.htm`,
    'Mark':            `${CCEL}/theophylact/markcomm`,
    'Luke':            `${CCEL}/theophylact/lukecomm`,
    'John':            `${CCEL}/theophylact/johncomm`,
  },
  'Venerable Bede': {
    'Luke':            `${NA}/3508.htm`,
    'Acts':            `${NA}/3509.htm`,
    'Mark':            `${NA}/3507.htm`,
    '1 Peter':         `${NA}/3510.htm`,
    '2 Peter':         `${NA}/3510.htm`,
    '1 John':          `${NA}/3510.htm`,
    'Revelation':      `${NA}/3511.htm`,
    'Proverbs':        `${NA}/3504.htm`,
  },
  'Bede': {
    'Luke':            `${NA}/3508.htm`,
    'Acts':            `${NA}/3509.htm`,
    'Mark':            `${NA}/3507.htm`,
  },
  'Tertullian': {
    'Matthew':         `${NA}/0302.htm`,
    'Luke':            `${NA}/0302.htm`,
    'John':            `${NA}/0302.htm`,
    'Mark':            `${NA}/0302.htm`,
  },
  'Tertullian of Carthage': {
    'Matthew':         `${NA}/0302.htm`,
    'Luke':            `${NA}/0302.htm`,
    'John':            `${NA}/0302.htm`,
    'Mark':            `${NA}/0302.htm`,
  },
  'Irenaeus of Lyons': {
    'Matthew':         `${NA}/0103.htm`,
    'Luke':            `${NA}/0103.htm`,
    'John':            `${NA}/0103.htm`,
    'Revelation':      `${NA}/0103.htm`,
  },
  'Cyprian of Carthage': {
    'Matthew':         `${NA}/0507.htm`,
    'Luke':            `${NA}/0507.htm`,
    'John':            `${NA}/0507.htm`,
  },
  'Eusebius of Caesarea': {
    'Matthew':         `${NA}/2901.htm`,
    'Luke':            `${NA}/2901.htm`,
    'Isaiah':          `${NA}/2902.htm`,
    'Psalms':          `${NA}/2903.htm`,
  },
  'Athanasius of Alexandria': {
    'Psalms':          `${NA}/2802.htm`,
    'Matthew':         `${NA}/2806.htm`,
  },
  'Thomas Aquinas': {
    'Matthew':         `${CCEL}/aquinas/catena1.i.html`,
    'Mark':            `${CCEL}/aquinas/catena2.i.html`,
    'Luke':            `${CCEL}/aquinas/catena3.i.html`,
    'John':            `${CCEL}/aquinas/catena4.i.html`,
  },
  'Ambrosiaster': {
    'Romans':          `${NA}/2107.htm`,
    'Galatians':       `${NA}/2107.htm`,
    'Ephesians':       `${NA}/2107.htm`,
    'Philippians':     `${NA}/2107.htm`,
    'Colossians':      `${NA}/2107.htm`,
    '1 Corinthians':   `${NA}/2107.htm`,
    '2 Corinthians':   `${NA}/2107.htm`,
    '1 Timothy':       `${NA}/2107.htm`,
    '2 Timothy':       `${NA}/2107.htm`,
    'Titus':           `${NA}/2107.htm`,
    'Philemon':        `${NA}/2107.htm`,
    '1 Thessalonians': `${NA}/2107.htm`,
    '2 Thessalonians': `${NA}/2107.htm`,
  },
  'Hippolytus of Rome': {
    'Daniel':          `${NA}/0503.htm`,
    'Genesis':         `${NA}/0503.htm`,
    'Revelation':      `${NA}/0503.htm`,
  },
}

const AUTHOR_MAP: Record<string, string> = {
  'Jerome':                       `${NA}/3009.htm`,
  'Gregory The Dialogist':        `${NA}/3601.htm`,
  'Athanasius the Apostolic':     `${NA}/2802.htm`,
  'Basil the Great':              `${NA}/3202.htm`,
  'Raban':                        `${TERT}/index.htm`,
  'George Leo Haydock':           'https://www.ecatholic2000.com/haydock/title.shtml',
  'Richard Challoner':            'https://drbo.org/drl/',
  'Ambrosiaster':                 `${NA}/2107.htm`,
  'Clement Of Alexandria':        `${NA}/0209.htm`,
  'Hippolytus of Rome':           `${NA}/0503.htm`,
  'Ignatius of Antioch':          `${CCEL}/schaff/anf01`,
  'Clement Of Rome':              `${CCEL}/schaff/anf01`,
  'Shepherd of Hermas':           `${CCEL}/schaff/anf01`,
  'The Apostolic Constitutions':  `${CCEL}/schaff/anf07`,
  'Justin Martyr':                `${CCEL}/schaff/anf01`,
  'Theophilus of Antioch':        `${CCEL}/schaff/anf02`,
  'Methodius of Olympus':         `${CCEL}/schaff/anf06`,
  'John Cassian':                 `${CCEL}/schaff/npnf211`,
  'Gregory the Theologian':       `${CCEL}/schaff/npnf207`,
  'John of Damascus':             `${CCEL}/schaff/npnf209`,
  'Ephrem The Syrian':            `${TERT}/index.htm`,
  'Remigius of Auxerre':          `${TERT}/index.htm`,
  'Remigius of Rheims':           `${TERT}/index.htm`,
  'Didymus the Blind':            `${TERT}/index.htm`,
  'Cassiodorus Senator':          `${CCEL}/schaff/npnf111`,
  'Severian of Gabala':           `${TERT}/index.htm`,
  'Alcuin of York':               `${TERT}/index.htm`,
  'Caesarius of Arles':           `${CCEL}/schaff/npnf111`,
  'Gaius Marius Victorinus':      `${CCEL}/schaff/npnf108`,
  'Rabanus Maurus':               `${TERT}/index.htm`,
  'Pseudo-Chrys':                 `${NA}/2001.htm`,
  'Theophylact of Ohrid':         `${CCEL}/theophylact`,
  'Theophylact of Ochrid':        `${CCEL}/theophylact`,
  'Venerable Bede':               `${NA}/3508.htm`,
  'Bede':                         `${NA}/3508.htm`,
  'Oecumenius':                   `${TERT}/index.htm`,
  'Pseudo-Jerome':                `${NA}/3009.htm`,
}

// ── Early-text in-app navigation helper ──────────────────────────────────────

const ROMAN_BOOK: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 }

function extractChapter(source: string): number {
  const m = source.match(/(?:chapter\s+|ch\.)\s*(\d+)/i)
  return m ? parseInt(m[1], 10) : 1
}

/**
 * Given a commentary entry's father_name and source, returns the canonical
 * early-text book name + chapter (matching EARLY_TEXT_MAP) if the text lives
 * in-app, or null to fall back to the external URL.
 */
export function getEarlyTextBook(fatherName: string, source: string): { book: string; chapter: number } | null {
  const s = source.toLowerCase()
  const f = fatherName.toLowerCase()
  const chapter = extractChapter(source)

  const ret = (book: string) => ({ book, chapter })

  // Ignatius letters — need the specific letter name from the source
  if (f.includes('ignatius') || s.includes('ignatius')) {
    if (s.includes('ephes'))                              return ret('Ignatius to the Ephesians')
    if (s.includes('magnesian'))                          return ret('Ignatius to the Magnesians')
    if (s.includes('trallian'))                           return ret('Ignatius to the Trallians')
    if (s.includes('roman') && !s.includes('corinthian')) return ret('Ignatius to the Romans')
    if (s.includes('philadelph'))                         return ret('Ignatius to the Philadelphians')
    if (s.includes('smyrn'))                              return ret('Ignatius to the Smyrnaeans')
    if (s.includes('polycarp') && f.includes('ignatius')) return ret('Ignatius to Polycarp')
    // No specific letter identifiable — skip to avoid wrong navigation
  }

  // Irenaeus — Against Heresies (roman or arabic book number)
  if (s.includes('against heresies') || s.includes('heresies book')) {
    const romMatch = s.match(/book\s+(i{1,3}v?|vi{0,3})\b/i)
    if (romMatch) {
      const num = ROMAN_BOOK[romMatch[1].toLowerCase()]
      if (num) return ret(`Against Heresies Book ${num}`)
    }
    const arabMatch = s.match(/book\s*(\d+)/)
    if (arabMatch) return ret(`Against Heresies Book ${arabMatch[1]}`)
    return ret('Against Heresies Book 1')
  }

  // Justin Martyr
  if (f.includes('justin') || s.includes('justin') || s.includes('first apology') || s.includes('dialogue with trypho')) {
    if (s.includes('dialogue') || s.includes('trypho')) return ret('Justin Martyr — Dialogue with Trypho')
    return ret('Justin Martyr — First Apology')
  }

  // Tertullian — Apologeticus
  if (f.includes('tertullian') && (s.includes('apologet') || s.includes('apolog'))) {
    return ret('Tertullian — Apologeticus')
  }

  // Polycarp's epistle (NOT martyrdom)
  if (s.includes('philippian') && (f.includes('polycarp') || s.includes('polycarp'))) {
    return ret('Epistle of Polycarp')
  }

  // Martyrdom of Polycarp
  if (s.includes('martyrdom of polycarp') || f === 'martyrdom of polycarp') {
    return ret('Martyrdom of Polycarp')
  }

  // Didache
  if (s.includes('didache')) return ret('Didache')

  // Barnabas
  if (s.includes('barnabas')) return ret('Epistle of Barnabas')

  // Diognetus
  if (s.includes('diognetus')) return ret('Epistle to Diognetus')

  // 1 Clement
  if (
    s === '1 clement' ||
    s.startsWith('1 clement') ||
    (f.includes('clement of rome') && (s.includes('corinthian') || s.includes('1 clement'))) ||
    s.includes('first epistle of clement') ||
    s.includes('letter to the corinthians (clement)')
  ) return ret('1 Clement')

  // 2 Clement
  if (s === '2 clement' || s.startsWith('2 clement') || s.includes('second clement')) return ret('2 Clement')

  return null
}

function buildSearchUrl(quoteText: string, authorUrl: string | undefined): string {
  const phrase = quoteText.trim().split(/\s+/).slice(0, 8).join(' ').replace(/["""'']/g, '')
  const site = authorUrl?.includes('newadvent.org') ? 'newadvent.org/fathers'
             : authorUrl?.includes('ccel.org')      ? 'ccel.org'
             : 'newadvent.org/fathers'
  return `https://www.google.com/search?btnI=1&q=site:${site}+"${encodeURIComponent(phrase)}"`
}

/**
 * Returns the best "Read full text" URL for a commentary entry.
 * Priority: verified deep link on the entry → quote-text Google site search
 *           → book-specific work → author fallback
 */
export function getSourceUrl(
  fatherName: string,
  book: string,
  existingUrl: string,
  quoteText?: string,
): string | null {
  const name = fatherName.split(',')[0].trim()
  const authorUrl = AUTHOR_MAP[fatherName] ?? AUTHOR_MAP[name]

  // A stored deep link to the actual source page beats everything else
  if (
    existingUrl &&
    (existingUrl.includes('newadvent.org/fathers') || existingUrl.includes('ccel.org')) &&
    !existingUrl.includes('newadvent.org/cathen')
  ) return existingUrl

  if (quoteText?.trim()) return buildSearchUrl(quoteText, authorUrl)

  const byFather = WORK_MAP[fatherName] ?? WORK_MAP[name]
  if (byFather?.[book]) return byFather[book]

  if (authorUrl) return authorUrl

  return null
}
