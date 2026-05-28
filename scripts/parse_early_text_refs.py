"""
parse_early_text_refs.py — Build the early_text_refs table from existing data.

Sources:
  1 Clement         : parse scripture refs from existing early_text_footnotes rows
  Didache           : hardcoded well-known allusions/quotes (no footnotes in DB)
  2 Clement         : hardcoded well-known quotes
  Ignatius letters  : inline ref parsing (ANF text has fully-spelled refs inline)
  Epistle to Diognetus, Epistle of Barnabas, Epistle of Polycarp,
  Martyrdom of Polycarp: inline ref parsing

Output: inserts into early_text_refs in assets/db/bible.db

Usage:
  python scripts/parse_early_text_refs.py --db assets/db/bible.db
  python scripts/parse_early_text_refs.py --db assets/db/bible.db --dry-run
"""

import argparse
import re
import sqlite3

# ── Book abbreviation map ─────────────────────────────────────────────────────
# Maps ANF-style abbreviations → canonical book name used in bible.db

ABBREV_MAP: dict[str, str] = {
    # Pentateuch
    'Gen':      'Genesis',
    'Ex':       'Exodus',
    'Exod':     'Exodus',
    'Lev':      'Leviticus',
    'Num':      'Numbers',
    'Deut':     'Deuteronomy',
    # History
    'Josh':     'Joshua',
    'Judg':     'Judges',
    'Ruth':     'Ruth',
    '1 Sam':    '1 Samuel',
    '2 Sam':    '2 Samuel',
    '1 Kings':  '1 Kings',
    '2 Kings':  '2 Kings',
    '1 Chr':    '1 Chronicles',
    '2 Chr':    '2 Chronicles',
    '1 Chron':  '1 Chronicles',
    '2 Chron':  '2 Chronicles',
    'Ezra':     'Ezra',
    'Neh':      'Nehemiah',
    'Esth':     'Esther',
    # Wisdom
    'Job':      'Job',
    'Ps':       'Psalms',
    'Prov':     'Proverbs',
    'Eccl':     'Ecclesiastes',
    'Song':     'Song of Solomon',
    # Prophets
    'Isa':      'Isaiah',
    'Jer':      'Jeremiah',
    'Lam':      'Lamentations',
    'Ezek':     'Ezekiel',
    'Dan':      'Daniel',
    'Hos':      'Hosea',
    'Joel':     'Joel',
    'Amos':     'Amos',
    'Obad':     'Obadiah',
    'Jon':      'Jonah',
    'Mic':      'Micah',
    'Nah':      'Nahum',
    'Hab':      'Habakkuk',
    'Zeph':     'Zephaniah',
    'Hag':      'Haggai',
    'Zech':     'Zechariah',
    'Mal':      'Malachi',
    # NT Gospels / Acts
    'Matt':     'Matthew',
    'Mark':     'Mark',
    'Luke':     'Luke',
    'John':     'John',
    'Acts':     'Acts',
    # Pauline
    'Rom':      'Romans',
    '1 Cor':    '1 Corinthians',
    '2 Cor':    '2 Corinthians',
    'Gal':      'Galatians',
    'Eph':      'Ephesians',
    'Phil':     'Philippians',
    'Col':      'Colossians',
    '1 Thess':  '1 Thessalonians',
    '2 Thess':  '2 Thessalonians',
    '1 Tim':    '1 Timothy',
    '2 Tim':    '2 Timothy',
    'Tit':      'Titus',
    'Philem':   'Philemon',
    'Heb':      'Hebrews',
    # General
    'Jas':      'James',
    '1 Pet':    '1 Peter',
    '2 Pet':    '2 Peter',
    '1 John':   '1 John',
    '2 John':   '2 John',
    '3 John':   '3 John',
    'Jude':     'Jude',
    'Rev':      'Revelation',
}

# Sort by length descending so multi-word abbrevs match before their prefix
SORTED_ABBREVS = sorted(ABBREV_MAP.keys(), key=len, reverse=True)

# ── Books whose text has ANF-style inline refs (fully spelled, Arabic ch:v) ───

INLINE_REF_BOOKS = {
    # Tier 1 — Apostolic Fathers
    'Ignatius to the Ephesians',
    'Ignatius to the Magnesians',
    'Ignatius to the Trallians',
    'Ignatius to the Romans',
    'Ignatius to the Philadelphians',
    'Ignatius to the Smyrnaeans',
    'Ignatius to Polycarp',
    'Epistle to Diognetus',
    'Epistle of Barnabas',
    'Epistle of Polycarp',
    'Martyrdom of Polycarp',
    # Tier 2 — Apologists
    'Justin Martyr — First Apology',
    'Justin Martyr — Dialogue with Trypho',
    'Tertullian — Apologeticus',
    'Against Heresies Book 1',
    'Against Heresies Book 2',
    'Against Heresies Book 3',
    'Against Heresies Book 4',
    'Against Heresies Book 5',
}

CANONICAL_BOOKS = {
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
    'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
    'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
    'Haggai', 'Zechariah', 'Malachi',
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
    'Ephesians', 'Philippians', 'Colossians',
    '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
    'Hebrews', 'James', '1 Peter', '2 Peter',
    '1 John', '2 John', '3 John', 'Jude', 'Revelation',
    'Wisdom', 'Sirach', 'Tobit', 'Judith', 'Baruch',
    '1 Maccabees', '2 Maccabees',
}

# Matches: "Philippians 1:5"  "1 Peter 1:8"  "Song of Solomon 2:3"  "Ephesians 2:8-9"
# Uses explicit OR for 3-word books to avoid greedy over-consumption that hides valid
# shorter book names ("Gospel of John 3:16" — 2-word pattern correctly skips "Gospel of"
# and re-matches on "John"; a greedy 3-word pattern would consume "Gospel of John" and fail).
_INLINE_REF_RE = re.compile(
    r'\b(Song of (?:Solomon|Songs)|[1-3]?\s*[A-Z][a-z]+(?:\s+[A-Za-z]+)?)'  # book name
    r'\s+(\d+):(\d+)(?:-\d+)?'                                                # chapter:verse
)

# Matches ANF footnote-style abbreviated refs embedded in body text:
# "Rom. viii. 3"  "Matt. v. 44"  "1 Cor. ix. 25"
_ABBREV_INLINE_RE = re.compile(
    r'\b([1-3]?\s*[A-Z][a-z]+)\.?\s+([ivxlcdmIVXLCDM]+)\.?\s+(\d+)',
)

def extract_inline_refs(text: str) -> list[tuple[str, int, int]]:
    """Extract scripture refs from ANF body text — fully-spelled and abbreviated forms."""
    results: list[tuple[str, int, int]] = []
    seen: set[tuple[str, int, int]] = set()

    # Pass 1: fully-spelled refs ("Ephesians 2:8", "Song of Solomon 2:3")
    for m in _INLINE_REF_RE.finditer(text):
        book = re.sub(r'\s+', ' ', m.group(1).strip())
        if book not in CANONICAL_BOOKS:
            continue
        chapter = int(m.group(2))
        verse   = int(m.group(3))
        key = (book, chapter, verse)
        if key not in seen:
            results.append(key)
            seen.add(key)

    # Pass 2: abbreviated refs ("Rom. viii. 3", "Matt. v. 44")
    for m in _ABBREV_INLINE_RE.finditer(text):
        raw_abbrev = re.sub(r'\s+', ' ', m.group(1).strip().rstrip('.'))
        # Try the abbreviation map
        canonical = None
        for abbrev in SORTED_ABBREVS:
            if raw_abbrev.lower() == abbrev.lower() or raw_abbrev == abbrev:
                canonical = ABBREV_MAP[abbrev]
                break
        if canonical is None:
            continue
        chapter = roman_to_int(m.group(2))
        verse   = int(m.group(3))
        if chapter is None or not (1 <= chapter <= 150 and 1 <= verse <= 200):
            continue
        key = (canonical, chapter, verse)
        if key not in seen:
            results.append(key)
            seen.add(key)

    return results


# ── Roman numeral converter ───────────────────────────────────────────────────

_ROMAN_VALS = {'i': 1, 'v': 5, 'x': 10, 'l': 50, 'c': 100, 'd': 500, 'm': 1000}

def roman_to_int(s: str) -> int | None:
    s = s.lower().strip()
    if not s or not all(c in _ROMAN_VALS for c in s):
        return None
    result, prev = 0, 0
    for ch in reversed(s):
        val = _ROMAN_VALS[ch]
        result += val if val >= prev else -val
        prev = val
    return result if result > 0 else None


# ── Parse scripture refs from a single footnote note string ──────────────────

def parse_refs_from_note(note: str) -> list[tuple[str, int, int]]:
    """
    Returns list of (canonical_book, chapter_int, verse_int) tuples.
    Handles: 'Eph. v. 21; 1 Pet. v. 5.' and 'Gen. iv. 3-8, Num. xii. 14, 15.'
    """
    results: list[tuple[str, int, int]] = []

    for abbrev in SORTED_ABBREVS:
        canonical = ABBREV_MAP[abbrev]
        # Build escaped pattern for this abbreviation
        esc = re.escape(abbrev)
        # Pattern: abbreviation + optional dot + roman chapter + dot + first verse
        pattern = re.compile(
            esc + r'\.?\s+([ivxlcdmIVXLCDM]+)\.?\s+(\d+)',
            re.IGNORECASE
        )
        for m in pattern.finditer(note):
            chapter = roman_to_int(m.group(1))
            verse = int(m.group(2))
            if chapter is not None and 1 <= chapter <= 150 and 1 <= verse <= 200:
                results.append((canonical, chapter, verse))

    # Deduplicate preserving order
    seen: set[tuple[str, int, int]] = set()
    deduped = []
    for r in results:
        if r not in seen:
            seen.add(r)
            deduped.append(r)
    return deduped


# ── Hardcoded refs for Didache ────────────────────────────────────────────────
# (chapter, ref_book, ref_chapter, ref_verse, ref_type)

DIDACHE_REFS: list[tuple[int, str, int, int, str]] = [
    # Two Ways / Sermon on the Mount parallels
    (1, 'Matthew',    5,  44, 'quote'),    # Did 1:3 — love your enemies
    (1, 'Luke',       6,  27, 'quote'),    # Did 1:3 — love your enemies (Luke par.)
    (1, 'Matthew',    5,  46, 'allusion'), # Did 1:3 — what credit is that to you
    (1, 'Luke',       6,  32, 'allusion'),
    (1, 'Matthew',    5,  39, 'quote'),    # Did 1:4 — turn the other cheek
    (1, 'Luke',       6,  29, 'quote'),
    (1, 'Matthew',    5,  40, 'allusion'), # Did 1:4 — cloak and tunic
    (1, 'Matthew',    5,  41, 'allusion'), # Did 1:4 — go the extra mile
    (1, 'Matthew',    7,  12, 'quote'),    # Did 1:2 — Golden Rule
    (1, 'Luke',       6,  31, 'quote'),    # Did 1:2 — Golden Rule (Luke par.)
    (1, 'Leviticus', 19,  18, 'allusion'), # Did 1:2 — love your neighbour
    (2, 'Exodus',    20,  13, 'allusion'), # Did 2:2 — you shall not kill
    (2, 'Exodus',    20,  14, 'allusion'), # Did 2:2 — you shall not commit adultery
    (2, 'Exodus',    20,  15, 'allusion'), # Did 2:2 — you shall not steal
    (3, 'Matthew',    5,  22, 'allusion'), # Did 3:2 — anger leads to murder
    (4, 'Matthew',    5,  23, 'allusion'), # Did 4:14 — reconcile before offering
    (7, 'Matthew',   28,  19, 'allusion'), # Did 7:1 — baptism formula
    (8, 'Matthew',    6,   9, 'quote'),    # Did 8:2 — Lord's Prayer (verbatim)
    (8, 'Matthew',    6,  10, 'quote'),
    (8, 'Matthew',    6,  11, 'quote'),
    (8, 'Matthew',    6,  12, 'quote'),
    (8, 'Matthew',    6,  13, 'quote'),
    (9, 'Matthew',    7,   6, 'quote'),    # Did 9:5 — do not give to dogs (pearls)
    (11, 'Matthew',  10,  40, 'allusion'), # Did 11:4 — receive the apostle
    (11, 'Matthew',  10,  41, 'allusion'), # Did 11:11 — prophet test
    (13, 'Numbers',  18,   8, 'allusion'), # Did 13:3 — first-fruits to priests
    (13, 'Deuteronomy', 18, 4, 'allusion'),
    (16, 'Matthew',  24,  10, 'allusion'), # Did 16:3 — many will fall away
    (16, 'Matthew',  24,  11, 'allusion'), # Did 16:3 — false prophets
    (16, 'Matthew',  24,  31, 'allusion'), # Did 16:6 — trumpet and gathering
    (16, 'Matthew',  24,  30, 'allusion'), # Did 16:8 — Son of Man on clouds
    (16, 'Matthew',  24,  42, 'quote'),    # Did 16:1 — watch, you do not know the hour
    (16, 'Luke',     21,  34, 'allusion'), # Did 16:1 — lamps burning
]


# ── Hardcoded refs for 2 Clement ─────────────────────────────────────────────
# (chapter, ref_book, ref_chapter, ref_verse, ref_type)

CLEMENT2_REFS: list[tuple[int, str, int, int, str]] = [
    (1,  'Isaiah',     53,   5, 'allusion'), # 2 Clem 1:2 — He was wounded for our sins
    (2,  'Isaiah',     54,   1, 'quote'),    # 2 Clem 2:1 — Rejoice, O barren (verbatim)
    (2,  'Matthew',    9,  13, 'quote'),     # 2 Clem 2:4 — I came not to call the righteous
    (3,  'Isaiah',     29,  13, 'quote'),    # 2 Clem 3:5 — this people honours me with their lips
    (4,  'Matthew',    7,  21, 'quote'),     # 2 Clem 4:2 — not everyone who says Lord, Lord
    (4,  'Matthew',   10,  32, 'allusion'), # 2 Clem 4:4 — confess me before men
    (5,  'Matthew',   10,  16, 'quote'),    # 2 Clem 5:2 — be wise as serpents
    (5,  'Matthew',   10,  28, 'allusion'), # 2 Clem 5:4 — fear not him who kills the body
    (6,  'Matthew',    6,  24, 'quote'),    # 2 Clem 6:1 — no man can serve two masters
    (6,  'Luke',      16,  13, 'quote'),    # 2 Clem 6:1 — (Luke parallel)
    (7,  '1 Corinthians', 9, 25, 'allusion'), # 2 Clem 7:1 — those who run in a race
    (7,  '1 Corinthians', 15, 50, 'allusion'), # 2 Clem 7:5 — flesh and blood cannot inherit
    (8,  'Luke',      16,  10, 'allusion'), # 2 Clem 8:5 — faithful in little, faithful in much
    (9,  'Genesis',    1,  27, 'allusion'), # 2 Clem 9:3 — male and female He created them
    (9,  'Ephesians',  5,  31, 'allusion'), # 2 Clem 9:3 — two shall become one flesh
    (9,  'Matthew',   12,  50, 'quote'),    # 2 Clem 9:11 — whoever does the will of my Father
    (11, 'Malachi',    3,   1, 'allusion'), # 2 Clem 11:2 — behold I send my messenger
    (11, 'Isaiah',    40,  10, 'allusion'), # 2 Clem 11:7 — reward is with him
    (12, 'Matthew',   22,  30, 'allusion'), # 2 Clem 12:2 — like angels, neither male nor female
    (13, 'Isaiah',    52,   5, 'quote'),    # 2 Clem 13:2 — the name of God is blasphemed
    (13, 'Matthew',    5,  44, 'allusion'), # 2 Clem 13:4 — love your enemies
    (13, 'Luke',       6,  27, 'allusion'), # 2 Clem 13:4 — (Luke parallel)
    (14, 'Genesis',    1,  27, 'allusion'), # 2 Clem 14:2 — male and female
    (14, 'Ephesians',  5,  23, 'allusion'), # 2 Clem 14:2 — Christ is head of the church
    (17, 'Isaiah',    66,  24, 'allusion'), # 2 Clem 17:7 — their worm does not die
    (20, 'Romans',    11,  36, 'allusion'), # 2 Clem 20:5 — to him be glory for ever
]


# ── Main ──────────────────────────────────────────────────────────────────────

CREATE_SQL = '''
CREATE TABLE IF NOT EXISTS early_text_refs (
  id          INTEGER PRIMARY KEY,
  book        TEXT    NOT NULL,
  chapter     INTEGER NOT NULL,
  verse       INTEGER NOT NULL,
  ref_book    TEXT    NOT NULL,
  ref_chapter INTEGER NOT NULL,
  ref_verse   INTEGER NOT NULL,
  ref_type    TEXT    NOT NULL
)
'''

INDEX_SOURCE = 'CREATE INDEX IF NOT EXISTS idx_etr_source ON early_text_refs(book, chapter, verse)'
INDEX_TARGET = 'CREATE INDEX IF NOT EXISTS idx_etr_target ON early_text_refs(ref_book, ref_chapter, ref_verse)'


def main():
    ap = argparse.ArgumentParser(description='Build early_text_refs table')
    ap.add_argument('--db',      required=True, help='Path to bible.db')
    ap.add_argument('--dry-run', action='store_true', help='Print without writing')
    args = ap.parse_args()

    db = sqlite3.connect(args.db)

    if not args.dry_run:
        db.execute(CREATE_SQL)
        db.execute(INDEX_SOURCE)
        db.execute(INDEX_TARGET)
        db.execute('DELETE FROM early_text_refs')

    # ── 1 Clement: parse from existing footnotes ─────────────────────────────
    footnotes = db.execute(
        'SELECT book, chapter, marker, note FROM early_text_footnotes ORDER BY book, chapter, marker'
    ).fetchall()

    clement_rows: list[tuple[str, int, int, str, int, int, str]] = []
    for book, chapter, _marker, note in footnotes:
        for ref_book, ref_chapter, ref_verse in parse_refs_from_note(note):
            clement_rows.append((book, chapter, 1, ref_book, ref_chapter, ref_verse, 'allusion'))

    # Deduplicate
    seen: set = set()
    unique_clement: list[tuple] = []
    for row in clement_rows:
        key = (row[0], row[1], row[3], row[4], row[5])
        if key not in seen:
            seen.add(key)
            unique_clement.append(row)

    # ── Didache: hardcoded ────────────────────────────────────────────────────
    didache_rows = [
        ('Didache', ch, 1, ref_book, ref_ch, ref_v, ref_type)
        for ch, ref_book, ref_ch, ref_v, ref_type in DIDACHE_REFS
    ]

    # ── 2 Clement: hardcoded ─────────────────────────────────────────────────
    clement2_rows = [
        ('2 Clement', ch, 1, ref_book, ref_ch, ref_v, ref_type)
        for ch, ref_book, ref_ch, ref_v, ref_type in CLEMENT2_REFS
    ]

    # ── Inline refs for Ignatius + Apostolic Fathers ────────────────────────
    early_text_rows_raw = db.execute(
        'SELECT book, chapter, verse, text FROM early_texts WHERE book IN ({})'.format(
            ','.join('?' * len(INLINE_REF_BOOKS))
        ),
        list(INLINE_REF_BOOKS),
    ).fetchall()

    inline_rows: list[tuple] = []
    inline_counts: dict[str, int] = {}
    for book, chapter, verse, text in early_text_rows_raw:
        for ref_book, ref_chapter, ref_verse in extract_inline_refs(text):
            inline_rows.append((book, chapter, verse, ref_book, ref_chapter, ref_verse, 'allusion'))
            inline_counts[book] = inline_counts.get(book, 0) + 1

    all_rows = unique_clement + didache_rows + clement2_rows + inline_rows

    print(f'1 Clement:  {len(unique_clement)} refs (parsed from {len(footnotes)} footnotes)')
    print(f'Didache:    {len(didache_rows)} refs (hardcoded)')
    print(f'2 Clement:  {len(clement2_rows)} refs (hardcoded)')
    for bk, cnt in sorted(inline_counts.items()):
        print(f'{bk}: {cnt} refs (inline)')
    print(f'Total:      {len(all_rows)} rows')

    if args.dry_run:
        print('\nSample (first 20):')
        for row in all_rows[:20]:
            print(f'  {row[0]} {row[1]}:{row[2]}  ->  {row[3]} {row[4]}:{row[5]}  [{row[6]}]')
        return

    db.executemany(
        'INSERT OR IGNORE INTO early_text_refs (book, chapter, verse, ref_book, ref_chapter, ref_verse, ref_type) '
        'VALUES (?, ?, ?, ?, ?, ?, ?)',
        all_rows
    )
    db.commit()
    db.close()
    print('Done — committed to DB.')


if __name__ == '__main__':
    main()
