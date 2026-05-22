"""
Import Dead Sea Scrolls (DSS) data from STEPBible TAHOT into bible.db.

Sources:
  TAHOT.txt — from https://github.com/tyndale-house/STEPBible-Data
  Format: tab-separated with columns including a Source field that marks DSS words.

Usage:
  python scripts/import_dss.py --db assets/db/bible.db --src path/to/TAHOT.txt

The script:
  1. Parses TAHOT.txt and extracts words with source tag containing 'DSS'
  2. Inserts word-per-row into dss_words table
  3. Concatenates gloss per verse → inserts into bible_translations as 'E_DSS'
"""

import argparse
import sqlite3
import sys
import urllib.request
from pathlib import Path

TAHOT_URL = 'https://raw.githubusercontent.com/tyndale-house/STEPBible-Data/master/TAHOT%20OT%20Hebrew%20(Tyndale%20House%20STEPBible%20-%20CC%20BY%204.0).txt'

# Map TAHOT book abbreviations → app canonical book names
BOOK_MAP = {
    'Gen': 'Genesis', 'Exo': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers',
    'Deu': 'Deuteronomy', 'Jos': 'Joshua', 'Jdg': 'Judges', 'Rut': 'Ruth',
    '1Sa': '1 Samuel', '2Sa': '2 Samuel', '1Ki': '1 Kings', '2Ki': '2 Kings',
    '1Ch': '1 Chronicles', '2Ch': '2 Chronicles', 'Ezr': 'Ezra', 'Neh': 'Nehemiah',
    'Est': 'Esther', 'Job': 'Job', 'Psa': 'Psalms', 'Pro': 'Proverbs',
    'Ecc': 'Ecclesiastes', 'Sol': 'Song of Solomon', 'Isa': 'Isaiah',
    'Jer': 'Jeremiah', 'Lam': 'Lamentations', 'Eze': 'Ezekiel', 'Dan': 'Daniel',
    'Hos': 'Hosea', 'Joe': 'Joel', 'Amo': 'Amos', 'Oba': 'Obadiah', 'Jon': 'Jonah',
    'Mic': 'Micah', 'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zep': 'Zephaniah',
    'Hag': 'Haggai', 'Zec': 'Zechariah', 'Mal': 'Malachi',
}


def download_tahot(dest: Path) -> None:
    print(f'Downloading TAHOT from STEPBible GitHub…')
    urllib.request.urlretrieve(TAHOT_URL, dest)
    print(f'Saved to {dest}')


def parse_tahot(src: Path):
    """
    Yield dicts for every word in TAHOT that has a DSS source tag.

    TAHOT column layout (tab-separated, # comment lines skipped):
      0  Ref         e.g. Gen.1.1
      1  Hebrew      pointed Hebrew word
      2  Transliteration
      3  StrongNumber
      4  Morphology
      5  Gloss       English gloss
      6  GlossFixed
      7  Source      e.g. LXX, DSS, SP, BHS …
      (column count may vary — check header line)
    """
    headers = None
    with open(src, encoding='utf-8') as fh:
        for line in fh:
            line = line.rstrip('\n')
            if line.startswith('#') or not line.strip():
                continue
            parts = line.split('\t')
            if headers is None:
                headers = [h.strip().lower() for h in parts]
                continue

            row = dict(zip(headers, parts))

            # Only keep words that have DSS evidence
            source = row.get('source', '')
            if 'DSS' not in source.upper():
                continue

            ref = row.get('ref', '')
            ref_parts = ref.split('.')
            if len(ref_parts) != 3:
                continue

            book_abbr, chapter_str, verse_str = ref_parts
            book = BOOK_MAP.get(book_abbr)
            if not book:
                continue

            yield {
                'book':    book,
                'chapter': int(chapter_str),
                'verse':   int(verse_str),
                'hebrew':  row.get('hebrew', ''),
                'translit': row.get('transliteration', ''),
                'strongs': row.get('strongnumber', ''),
                'gloss':   row.get('gloss', ''),
                'morph':   row.get('morphology', ''),
            }


def import_dss(db_path: str, src_path: Path) -> None:
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS dss_words (
            book     TEXT    NOT NULL,
            chapter  INTEGER NOT NULL,
            verse    INTEGER NOT NULL,
            position INTEGER NOT NULL,
            hebrew   TEXT    NOT NULL,
            translit TEXT,
            strongs  TEXT,
            gloss    TEXT,
            morph    TEXT,
            PRIMARY KEY (book, chapter, verse, position)
        )
    ''')

    cur.execute("DELETE FROM dss_words")
    cur.execute("DELETE FROM bible_translations WHERE translation = 'E_DSS'")

    # Track position within each verse and accumulate glosses
    verse_words: dict = {}  # (book, chapter, verse) → [(position, row)]

    for row in parse_tahot(src_path):
        key = (row['book'], row['chapter'], row['verse'])
        if key not in verse_words:
            verse_words[key] = []
        pos = len(verse_words[key])
        verse_words[key].append((pos, row))

    dss_rows = []
    edss_rows = []

    for (book, chapter, verse), words in sorted(verse_words.items()):
        glosses = []
        for pos, row in words:
            dss_rows.append((
                book, chapter, verse, pos,
                row['hebrew'], row['translit'], row['strongs'], row['gloss'], row['morph'],
            ))
            if row['gloss']:
                glosses.append(row['gloss'])
        if glosses:
            edss_rows.append(('E_DSS', book, chapter, verse, ' '.join(glosses)))

    cur.executemany(
        'INSERT OR REPLACE INTO dss_words (book, chapter, verse, position, hebrew, translit, strongs, gloss, morph) VALUES (?,?,?,?,?,?,?,?,?)',
        dss_rows,
    )
    cur.executemany(
        'INSERT OR REPLACE INTO bible_translations (translation, book, chapter, verse, text) VALUES (?,?,?,?,?)',
        edss_rows,
    )

    con.commit()
    con.close()

    print(f'Inserted {len(dss_rows)} DSS words across {len(verse_words)} verses.')
    print(f'Generated {len(edss_rows)} E_DSS gloss verses.')


def main():
    parser = argparse.ArgumentParser(description='Import DSS data from STEPBible TAHOT into bible.db')
    parser.add_argument('--db',  required=True, help='Path to bible.db')
    parser.add_argument('--src', help='Path to local TAHOT.txt (downloads if omitted)')
    args = parser.parse_args()

    if args.src:
        src = Path(args.src)
    else:
        src = Path('temp/TAHOT.txt')
        src.parent.mkdir(parents=True, exist_ok=True)
        download_tahot(src)

    if not src.exists():
        print(f'Error: {src} not found', file=sys.stderr)
        sys.exit(1)

    import_dss(args.db, src)


if __name__ == '__main__':
    main()
