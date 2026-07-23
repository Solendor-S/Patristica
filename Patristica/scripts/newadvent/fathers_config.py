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
}

# Works not listed under a father heading on the index (URL added manually).
# (father_heading_in_FATHERS, work_title, work_url)
EXTRA_WORKS: list[tuple[str, str, str]] = [
    # Didache sits under "Miscellaneous" on the index
    # ('Didache', 'The Didache', 'https://www.newadvent.org/fathers/0714.htm'),
]
