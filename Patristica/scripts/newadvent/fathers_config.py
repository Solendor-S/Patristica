"""
fathers_config.py — Single source of truth for which New Advent fathers get scraped,
plus the pipeline's shared file paths and record identity.

Each key is the EXACT <strong> heading text on https://www.newadvent.org/fathers/.
'key' must be a valid FATHER_DATES prefix in src/data/fatherDates.ts (exact keys safest).

Later batches (Augustine, Chrysostom, ...) = append entries here. Nothing else changes.
"""

import os

# Shared paths (scripts run from Patristica/)
CACHE_DIR      = os.path.join('temp', 'newadvent_cache')
MANIFEST       = os.path.join('temp', 'newadvent_crawl_manifest.json')
CITATIONS_JSON = os.path.join('temp', 'newadvent_citations.json')
PSALM_OFFSETS  = os.path.join('temp', 'newadvent_psalm_offsets.json')


def record_key(r: dict) -> tuple:
    """Dedup identity of a citation record — used by both parse and import."""
    return (r['book'], r['chapter'], r['verse'], r['father_name'], r['source'], r['excerpt'])

# Phase 1 — Ante-Nicene / early fathers
FATHERS: dict[str, dict] = {
    'Clement of Rome':         {'key': 'Clement Of Rome',                       'era': 'Early Church', 'era_order': 4},
    'Ignatius of Antioch':     {'key': 'Ignatius of Antioch',                   'era': 'Early Church', 'era_order': 4},
    'Polycarp':                {'key': 'Polycarp of Smyrna',                    'era': 'Early Church', 'era_order': 4},
    'Papias':                  {'key': 'Papias of Hierapolis',                  'era': 'Early Church', 'era_order': 4},
    'Barnabas':                {'key': 'Epistle of Barnabas',                   'era': 'Early Church', 'era_order': 4},
    'Hermas':                  {'key': 'Shepherd of Hermas',                    'era': 'Early Church', 'era_order': 4},
    'Mathetes':                {'key': 'Epistle to Diognetus',                  'era': 'Early Church', 'era_order': 4},
    'Aristides the Philosopher': {'key': 'Aristides the Philosopher',           'era': 'Early Church', 'era_order': 4},
    'Justin Martyr':           {'key': 'Justin Martyr',                         'era': 'Early Church', 'era_order': 4},
    'Tatian':                  {'key': 'Tatian',                                'era': 'Early Church', 'era_order': 4},
    'Athenagoras':             {'key': 'Athenagoras',                           'era': 'Early Church', 'era_order': 4},
    'Theophilus':              {'key': 'Theophilus of Antioch',                 'era': 'Early Church', 'era_order': 4},
    'Irenaeus of Lyons':       {'key': 'Irenaeus of Lyons',                     'era': 'Early Church', 'era_order': 4},
    'Clement of Alexandria':   {'key': 'Clement Of Alexandria',                 'era': 'Early Church', 'era_order': 4},
    'Tertullian':              {'key': 'Tertullian',                            'era': 'Early Church', 'era_order': 4},
    'Caius':                   {'key': 'Caius Presbyter of Rome',               'era': 'Early Church', 'era_order': 4},
    'Hippolytus':              {'key': 'Hippolytus of Rome',                    'era': 'Early Church', 'era_order': 4},
    'Julius Africanus':        {'key': 'Julius Africanus',                      'era': 'Early Church', 'era_order': 4},
    'Origen':                  {'key': 'Origen',                                'era': 'Early Church', 'era_order': 4},
    'Cyprian of Carthage':     {'key': 'Cyprian',                               'era': 'Early Church', 'era_order': 4},
    'Novatian':                {'key': 'Novatian',                              'era': 'Early Church', 'era_order': 4},
    'Minucius Felix':          {'key': 'Minucius Felix',                        'era': 'Early Church', 'era_order': 4},
    'Commodianus':             {'key': 'Commodianus',                           'era': 'Early Church', 'era_order': 4},
    'Dionysius the Great':     {'key': 'Dionysius of Alexandria',               'era': 'Early Church', 'era_order': 4},
    'Dionysius of Rome':       {'key': 'Dionysius of Rome',                     'era': 'Early Church', 'era_order': 4},
    'Gregory Thaumaturgus':    {'key': 'Gregory the Wonderworker',              'era': 'Early Church', 'era_order': 4},
    'Malchion':                {'key': 'Malchion',                              'era': 'Early Church', 'era_order': 4},
    'Methodius':               {'key': 'Methodius of Olympus',                  'era': 'Early Church', 'era_order': 4},
    'Peter of Alexandria':     {'key': 'Peter of Alexandria',                   'era': 'Early Church', 'era_order': 4},
    'Alexander of Alexandria': {'key': 'Alexander of Alexandria',               'era': 'Early Church', 'era_order': 4},
    'Arnobius':                {'key': 'Arnobius of Sicca',                     'era': 'Early Church', 'era_order': 4},
    'Lactantius':              {'key': 'Lucius Caecilius Firmianus Lactantius', 'era': 'Early Church', 'era_order': 4},
    'Victorinus':              {'key': 'Victorinus of Pettau',                  'era': 'Early Church', 'era_order': 4},
    'Pamphilus':               {'key': 'Pamphilus of Caesarea',                 'era': 'Early Church', 'era_order': 4},

    # Phase 2a — post-Nicene pilot (2026-08-01). Both keys already exist verbatim
    # in fatherDates.ts. NPNF translations, so the psalm-numbering auto-detect in
    # versification.convert_citation gets its first real workout here.
    'Athanasius':              {'key': 'Athanasius',                            'era': 'Early Church', 'era_order': 4},
    'Jerome':                  {'key': 'Jerome',                                'era': 'Early Church', 'era_order': 4},

    # Phase 2b — remaining post-Nicene fathers (2026-08-01). Councils/Liturgies/
    # Apocrypha/Miscellaneous sections are a SEPARATE later pass, per user.
    'Augustine of Hippo':                    {'key': 'Augustine of Hippo',          'era': 'Early Church', 'era_order': 4},  # 48
    'John Chrysostom':                       {'key': 'John Chrysostom',             'era': 'Early Church', 'era_order': 4},  # 36
    'Gregory of Nyssa':                      {'key': 'Gregory of Nyssa',            'era': 'Early Church', 'era_order': 4},  # 15
    'Ambrose (340-397)':                     {'key': 'Ambrose of Milan',            'era': 'Early Church', 'era_order': 4},  # 11
    'Ephraim the Syrian (306-373)':          {'key': 'Ephrem The Syrian',           'era': 'Early Church', 'era_order': 4},  # 7
    'Eusebius of Caesarea (c. 265-c. 340)':  {'key': 'Eusebius of Caesarea',        'era': 'Early Church', 'era_order': 4},  # 5
    'Sulpitius Severus (c. 363-c. 420)':     {'key': 'Sulpicius Severus',           'era': 'Early Church', 'era_order': 4},  # 5
    'Theodoret':                             {'key': 'Theodoret',                   'era': 'Early Church', 'era_order': 4},  # 5
    'Basil the Great':                       {'key': 'Basil the Great',             'era': 'Early Church', 'era_order': 4},  # 3
    'Hilary of Poitiers':                    {'key': 'Hilary of Poitiers',          'era': 'Early Church', 'era_order': 4},  # 3
    'John Cassian (c. 360-c. 435)':          {'key': 'John Cassian',                'era': 'Early Church', 'era_order': 4},  # 3
    'Mar Jacob (452-521)':                   {'key': 'Jacob of Serugh',             'era': 'Early Church', 'era_order': 4},  # 3
    'Rufinus':                               {'key': 'Rufinus of Aquileia',         'era': 'Early Church', 'era_order': 4},  # 3
    'Gregory the Great, Pope (c. 540-604)':  {'key': 'Gregory the Great',           'era': 'Early Church', 'era_order': 4},  # 2
    'Gregory Nazianzen':                     {'key': 'Gregory the Theologian',      'era': 'Early Church', 'era_order': 4},  # 2
    'Leo the Great, Pope (c. 395-461)':      {'key': 'Leo the Great',               'era': 'Early Church', 'era_order': 4},  # 2
    'Alexander of Lycopolis':                {'key': 'Alexander of Lycopolis',      'era': 'Early Church', 'era_order': 4},  # 1
    'Aphrahat/Aphraates (c. 280-367)':       {'key': 'Aphrahat the Persian Sage',   'era': 'Early Church', 'era_order': 4},  # 1
    'Archelaus':                             {'key': 'Archelaus',                   'era': 'Early Church', 'era_order': 4},  # 1
    'Bardesanes (154-222)':                  {'key': 'Bardesanes',                  'era': 'Early Church', 'era_order': 4},  # 1
    'Cyril of Jerusalem':                    {'key': 'Cyril of Jerusalem',          'era': 'Early Church', 'era_order': 4},  # 1
    'Gennadius of Marseilles':               {'key': 'Gennadius of Marseilles',     'era': 'Early Church', 'era_order': 4},  # 1
    'John of Damascus':                      {'key': 'John of Damascus',            'era': 'Early Church', 'era_order': 4},  # 1
    'Moses of Chorene (c. 400-c. 490)':      {'key': 'Moses of Chorene',            'era': 'Early Church', 'era_order': 4},  # 1
    'Socrates Scholasticus (c. 379-c. 450)': {'key': 'Socrates Scholasticus',       'era': 'Early Church', 'era_order': 4},  # 1
    'Sozomen (c. 375-c. 447)':               {'key': 'Sozomen',                     'era': 'Early Church', 'era_order': 4},  # 1
    'Theodotus':                             {'key': 'Theodotus',                   'era': 'Early Church', 'era_order': 4},  # 1
    'Vincent of Lérins (d. c. 450)':         {'key': 'Vincent of Lérins',           'era': 'Early Church', 'era_order': 4},  # 1
    'Venantius':                             {'key': 'Venantius',                   'era': 'Early Church', 'era_order': 4},  # 1
}

# Works whose translation prints VULGATE psalm numbers, so psalm citations need
# converting to the app's English versification. Whitelist, not auto-detection:
# New Advent's psalm tagging is unreliable (it sometimes links the English page,
# sometimes the Vulgate one, and Chrysostom mixes both inside a single homily
# series), so the only safe signal is the work itself. Everything not listed here
# is stored exactly as the source printed it — the Phase 1 convention.
#
# Evidence, from the in-band (psalms 9-147) display-vs-href tally:
#   Enarrations  2359 Vulgate / 0 English — decisive, and it IS psalm commentary
#   Pastoral Rule  21 / 13, but hand-sampling showed all 10 checked 'Vulgate' hits
#     genuine AND at least one 'English' hit also Vulgate with a bad href
#     (psa130 tagged 'Psalm 131:9' — English Ps 131 has only 3 verses)
# Everything else totals 100 Vulgate / 419 English, scattered and mixed; converting
# there would trade ~100 untouched-but-wrong rows for ~100 actively mis-shifted ones.
VULGATE_PSALM_WORKS: set[str] = {
    'The Enarrations, or Expositions, on the Psalms',
    'Pastoral Rule',
}

# Works not listed under a father heading on the index (URL added manually).
# (father_heading_in_FATHERS, work_title, work_url)
EXTRA_WORKS: list[tuple[str, str, str]] = [
    # Didache sits under "Miscellaneous" on the index
    # ('Didache', 'The Didache', 'https://www.newadvent.org/fathers/0714.htm'),
]
