"""
import_hcf_commentary.py — Import patristic commentary from the
HistoricalChristianFaith/Commentaries-Database repo into bible.db.

Each TOML file in the repo maps a Bible verse to one or more patristic quotes.
File structure:  <HCF_DIR>/<Father Folder>/<Book> <Ch>_<V>.toml
                 e.g.  Ignatius of Antioch/Romans 8_17.toml

Usage:
  # Clone the repo first:
  git clone https://github.com/HistoricalChristianFaith/Commentaries-Database <dest>

  python scripts/import_hcf_commentary.py --hcf-dir <dest> --db assets/db/bible.db
  python scripts/import_hcf_commentary.py --hcf-dir <dest> --db assets/db/bible.db --dry-run
  python scripts/import_hcf_commentary.py --hcf-dir <dest> --db assets/db/bible.db --father "Epistle of Barnabas"
  python scripts/import_hcf_commentary.py --hcf-dir <dest> --db assets/db/bible.db --skip-existing
"""

import argparse
import os
import re
import sqlite3
import sys

try:
    import tomllib
except ImportError:
    try:
        import tomli as tomllib  # pip install tomli
    except ImportError:
        sys.exit("Python 3.11+ required for tomllib, or: pip install tomli")


# ── Father folder → (db_name, era, era_order) ────────────────────────────────
# Keyed by exact folder name in the HCF repo.

FATHER_MAP: dict[str, tuple[str, str, int]] = {
    'Clement of Rome':        ('Clement Of Rome',       'Early Church', 4),
    'Ignatius of Antioch':    ('Ignatius of Antioch',    'Early Church', 4),
    'Polycarp of Smyrna':     ('Polycarp of Smyrna',     'Early Church', 4),
    'Justin Martyr':          ('Justin Martyr',           'Early Church', 4),
    'Irenaeus':               ('Irenaeus of Lyons',       'Early Church', 4),
    'Tertullian':             ('Tertullian of Carthage',  'Early Church', 4),
    'Didache':                ('The Didache',             'Early Church', 4),
    'Epistle of Barnabas':    ('Epistle of Barnabas',     'Early Church', 4),
    'Epistle to Diognetus':   ('Epistle to Diognetus',    'Early Church', 4),
    'Martyrdom Of Polycarp':  ('Martyrdom Of Polycarp',   'Early Church', 4),
    'Shepherd of Hermas':     ('Shepherd of Hermas',      'Early Church', 4),
    'Clement of Alexandria':  ('Clement Of Alexandria',   'Early Church', 4),
    'Origen of Alexandria':   ('Origen of Alexandria',    'Early Church', 4),
    'Cyprian':                ('Cyprian of Carthage',     'Early Church', 4),
    'Hippolytus of Rome':     ('Hippolytus of Rome',      'Early Church', 4),
}

# ── Book name normalisation ───────────────────────────────────────────────────
# HCF filenames use full book names. Map any variants to our canonical names.

BOOK_ALIASES: dict[str, str] = {
    'Song of Songs':         'Song of Solomon',
    'Psalms':                'Psalms',
    'Psalm':                 'Psalms',
    'I Samuel':              '1 Samuel',
    'II Samuel':             '2 Samuel',
    'I Kings':               '1 Kings',
    'II Kings':              '2 Kings',
    'I Chronicles':          '1 Chronicles',
    'II Chronicles':         '2 Chronicles',
    'I Corinthians':         '1 Corinthians',
    'II Corinthians':        '2 Corinthians',
    'I Thessalonians':       '1 Thessalonians',
    'II Thessalonians':      '2 Thessalonians',
    'I Timothy':             '1 Timothy',
    'II Timothy':            '2 Timothy',
    'I Peter':               '1 Peter',
    'II Peter':              '2 Peter',
    'I John':                '1 John',
    'II John':               '2 John',
    'III John':              '3 John',
    'I Clement':             None,   # skip non-canonical
    'II Clement':            None,
    'Revelation of John':    'Revelation',
    'The Revelation':        'Revelation',
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
}

# ── Filename parser ───────────────────────────────────────────────────────────
# Matches: "Romans 8_17.toml"  "1 Corinthians 10_13.toml"  "Matthew 5_3-12.toml"
# Also matches verse-only: "Romans 8.toml" (chapter-level, verse=0)

_FILENAME_RE = re.compile(
    r'^(.+?)\s+(\d+)_(\d+)(?:-\d+)?\.toml$',
    re.IGNORECASE,
)
_CHAPTER_ONLY_RE = re.compile(
    r'^(.+?)\s+(\d+)\.toml$',
    re.IGNORECASE,
)

def parse_filename(filename: str) -> tuple[str, int, int] | None:
    """Return (canonical_book, chapter, verse) or None if unparseable / non-canonical."""
    m = _FILENAME_RE.match(filename)
    if m:
        raw_book, chapter, verse = m.group(1), int(m.group(2)), int(m.group(3))
    else:
        m2 = _CHAPTER_ONLY_RE.match(filename)
        if m2:
            raw_book, chapter, verse = m2.group(1), int(m2.group(2)), 0
        else:
            return None

    # Normalise
    book = BOOK_ALIASES.get(raw_book, raw_book)
    if book is None:
        return None  # explicitly excluded
    if book not in CANONICAL_BOOKS:
        return None  # skip apocrypha or unrecognised
    return book, chapter, verse


# ── Excerpt helper ────────────────────────────────────────────────────────────

def make_excerpt(text: str, max_chars: int = 220) -> str:
    """First ~220 chars, breaking at a word boundary."""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_space = truncated.rfind(' ')
    return truncated[:last_space] if last_space > 0 else truncated


# ── Dedup check ───────────────────────────────────────────────────────────────

def already_exists(cur: sqlite3.Cursor, book: str, chapter: int, verse: int,
                   father_name: str, source: str) -> bool:
    cur.execute(
        'SELECT 1 FROM commentary WHERE book=? AND chapter=? AND verse=? '
        'AND father_name=? AND source=? LIMIT 1',
        (book, chapter, verse, father_name, source)
    )
    return cur.fetchone() is not None


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description='Import HCF commentary into bible.db')
    ap.add_argument('--hcf-dir', required=True,
                    help='Path to cloned HistoricalChristianFaith/Commentaries-Database')
    ap.add_argument('--db', required=True, help='Path to bible.db')
    ap.add_argument('--dry-run', action='store_true', help='Print without writing')
    ap.add_argument('--skip-existing', action='store_true',
                    help='Skip fathers that already have entries in DB')
    ap.add_argument('--father', action='append', metavar='FOLDER_NAME',
                    help='Only import this folder name (can repeat). Default: all in FATHER_MAP')
    args = ap.parse_args()

    hcf_dir = args.hcf_dir
    if not os.path.isdir(hcf_dir):
        sys.exit(f'HCF dir not found: {hcf_dir}')

    db = sqlite3.connect(args.db)
    cur = db.cursor()

    target_folders = args.father if args.father else list(FATHER_MAP.keys())

    total_inserted = 0
    total_skipped  = 0
    total_errors   = 0

    for folder_name in target_folders:
        if folder_name not in FATHER_MAP:
            print(f'[WARN] Unknown folder: {folder_name} — add to FATHER_MAP')
            continue

        folder_path = os.path.join(hcf_dir, folder_name)
        if not os.path.isdir(folder_path):
            print(f'[SKIP] Not found in repo: {folder_name}/')
            continue

        db_name, era, era_order = FATHER_MAP[folder_name]

        if args.skip_existing:
            cur.execute('SELECT COUNT(*) FROM commentary WHERE father_name=?', (db_name,))
            if cur.fetchone()[0] > 0:
                print(f'[SKIP] {folder_name} — already has entries in DB')
                continue

        folder_inserted = 0
        folder_skipped  = 0
        folder_errors   = 0

        for fname in sorted(os.listdir(folder_path)):
            if not fname.endswith('.toml') or fname == 'metadata.toml':
                continue

            ref = parse_filename(fname)
            if ref is None:
                folder_errors += 1
                continue
            book, chapter, verse = ref

            fpath = os.path.join(folder_path, fname)
            try:
                with open(fpath, 'rb') as f:
                    data = tomllib.load(f)
            except Exception as e:
                print(f'  [ERROR] {folder_name}/{fname}: {e}')
                folder_errors += 1
                continue

            blocks = data.get('commentary', [])
            if not blocks:
                continue

            for block in blocks:
                quote = (block.get('quote') or '').strip()
                if not quote:
                    folder_skipped += 1
                    continue

                source       = (block.get('source_title') or '').strip()
                source_url   = (block.get('source_url')   or '').strip()
                excerpt      = make_excerpt(quote)
                full_text    = quote

                if already_exists(cur, book, chapter, verse, db_name, source):
                    folder_skipped += 1
                    continue

                if args.dry_run:
                    print(f'  {book} {chapter}:{verse} | {db_name} | {source[:60]}')
                    folder_inserted += 1
                    continue

                cur.execute(
                    '''INSERT INTO commentary
                       (book, chapter, verse, father_name, father_era, father_era_order,
                        excerpt, full_text, source, source_url)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                    (book, chapter, verse, db_name, era, era_order,
                     excerpt, full_text, source, source_url)
                )
                folder_inserted += 1

        print(f'{folder_name}: +{folder_inserted} inserted, {folder_skipped} skipped, {folder_errors} unparseable')
        total_inserted += folder_inserted
        total_skipped  += folder_skipped
        total_errors   += folder_errors

    if not args.dry_run and total_inserted > 0:
        db.commit()
        print(f'\nCommitted. Total inserted: {total_inserted}')
    else:
        print(f'\nDry-run total: {total_inserted} would insert, {total_skipped} skip, {total_errors} errors')

    db.close()


if __name__ == '__main__':
    main()
