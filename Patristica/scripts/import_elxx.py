"""
Import Brenton's 1851 Septuagint (English) into bible.db as translation 'E_LXX'.

Source:
  eBible.org Brenton Septuagint — public domain
  Download: https://ebible.org/Scriptures/eng-Brenton_usfm.zip
  Or supply a local USFM directory with --src.

Usage:
  python scripts/import_elxx.py --db assets/db/bible.db [--src path/to/usfm_dir/]

The script parses USFM files and inserts verse text into bible_translations as 'E_LXX'.
Only OT books (matching the app's 39 canonical OT book names) are imported.
"""

import argparse
import re
import sqlite3
import sys
import urllib.request
import zipfile
from pathlib import Path

BRENTON_ZIP_URL = 'https://ebible.org/Scriptures/eng-Brenton_usfm.zip'

OT_BOOKS = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
    'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
    'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
    'Haggai', 'Zechariah', 'Malachi',
]

# USFM book ID → app canonical name (USFM uses 3-char SIL codes)
USFM_ID_MAP = {
    'GEN': 'Genesis',       'EXO': 'Exodus',        'LEV': 'Leviticus',
    'NUM': 'Numbers',       'DEU': 'Deuteronomy',   'JOS': 'Joshua',
    'JDG': 'Judges',        'RUT': 'Ruth',           '1SA': '1 Samuel',
    '2SA': '2 Samuel',      '1KI': '1 Kings',        '2KI': '2 Kings',
    '1CH': '1 Chronicles',  '2CH': '2 Chronicles',   'EZR': 'Ezra',
    'NEH': 'Nehemiah',      'EST': 'Esther',          'JOB': 'Job',
    'PSA': 'Psalms',        'PRO': 'Proverbs',        'ECC': 'Ecclesiastes',
    'SNG': 'Song of Solomon','ISA': 'Isaiah',         'JER': 'Jeremiah',
    'LAM': 'Lamentations',  'EZK': 'Ezekiel',         'DAN': 'Daniel',
    'HOS': 'Hosea',         'JOL': 'Joel',            'AMO': 'Amos',
    'OBA': 'Obadiah',       'JON': 'Jonah',           'MIC': 'Micah',
    'NAM': 'Nahum',         'HAB': 'Habakkuk',        'ZEP': 'Zephaniah',
    'HAG': 'Haggai',        'ZEC': 'Zechariah',       'MAL': 'Malachi',
    # Alternate codes sometimes used
    'SON': 'Song of Solomon', 'EZE': 'Ezekiel',
}


def download_brenton(dest_dir: Path) -> None:
    zip_path = dest_dir / 'brenton.zip'
    print('Downloading Brenton Septuagint from eBible.org…')
    urllib.request.urlretrieve(BRENTON_ZIP_URL, zip_path)
    print('Extracting…')
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(dest_dir)
    print(f'Done. Files in {dest_dir}')


def clean_usfm_text(text: str) -> str:
    """Strip remaining USFM inline markers and extra whitespace from verse text."""
    text = re.sub(r'\\[a-z]+\*?', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def parse_usfm_file(path: Path):
    """
    Yield (book, chapter, verse, text) from a USFM file.
    Handles \\id, \\c, \\v markers.
    """
    book = None
    chapter = None

    with open(path, encoding='utf-8', errors='replace') as fh:
        current_verse = None
        current_text_parts = []

        def flush():
            nonlocal current_verse, current_text_parts
            if current_verse and current_text_parts:
                text = clean_usfm_text(' '.join(current_text_parts))
                if text:
                    yield current_verse + (text,)
            current_verse = None
            current_text_parts = []

        for line in fh:
            line = line.rstrip('\n')

            id_match = re.match(r'\\id\s+(\w+)', line)
            if id_match:
                yield from flush()
                usfm_id = id_match.group(1).upper()
                book = USFM_ID_MAP.get(usfm_id)
                chapter = None
                continue

            c_match = re.match(r'\\c\s+(\d+)', line)
            if c_match:
                yield from flush()
                chapter = int(c_match.group(1))
                continue

            v_match = re.match(r'\\v\s+(\d+)\s*(.*)', line)
            if v_match:
                yield from flush()
                if book and chapter:
                    verse_num = int(v_match.group(1))
                    current_verse = (book, chapter, verse_num)
                    rest = v_match.group(2)
                    if rest.strip():
                        current_text_parts = [rest]
                    else:
                        current_text_parts = []
                continue

            # Continuation line (not a new marker)
            if current_verse and not line.startswith('\\'):
                current_text_parts.append(line)

        yield from flush()

    # Handle generator pattern — the inner flush is a regular function so we need
    # to yield remaining verse after loop
    if current_verse and current_text_parts:
        text = clean_usfm_text(' '.join(current_text_parts))
        if text:
            yield current_verse + (text,)


def import_elxx(db_path: str, src_dir: Path) -> None:
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    cur.execute("DELETE FROM bible_translations WHERE translation = 'E_LXX'")

    rows = []
    ot_book_set = set(OT_BOOKS)

    for usfm_file in sorted(src_dir.rglob('*.usfm')):
        for book, chapter, verse, text in parse_usfm_file(usfm_file):
            if book in ot_book_set:
                rows.append(('E_LXX', book, chapter, verse, text))

    if not rows:
        print('Warning: no verses found. Check --src path and USFM file format.', file=sys.stderr)
        con.close()
        sys.exit(1)

    cur.executemany(
        'INSERT OR REPLACE INTO bible_translations (translation, book, chapter, verse, text) VALUES (?,?,?,?,?)',
        rows,
    )
    con.commit()
    con.close()
    print(f'Inserted {len(rows)} E_LXX (Brenton) verses.')


def main():
    parser = argparse.ArgumentParser(description="Import Brenton's Septuagint (E_LXX) into bible.db")
    parser.add_argument('--db',  required=True, help='Path to bible.db')
    parser.add_argument('--src', help='Path to USFM directory (downloads from eBible.org if omitted)')
    args = parser.parse_args()

    if args.src:
        src_dir = Path(args.src)
    else:
        src_dir = Path('temp/brenton_usfm')
        src_dir.mkdir(parents=True, exist_ok=True)
        download_brenton(src_dir)

    if not src_dir.exists():
        print(f'Error: {src_dir} not found', file=sys.stderr)
        sys.exit(1)

    import_elxx(args.db, src_dir)


if __name__ == '__main__':
    main()
