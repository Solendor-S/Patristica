"""
Import STEPBible LXX data into bible.db.

Source: STEPBible (stepbible.org) — CC BY 4.0
File:   'LXX comparisons.txt' (tab-delimited, multiple parallel versions)

Extracts three things:
  C version  (Rahlfs/CCAT + STEPBible morphology)  → lxx_words (replaces Swete data)
  A version  (Apostolic Bible/Poole + STEPBible tagging) → lxx_apostolic_words (new)
  A-Eng version (English Apostolic LXX)             → bible_translations key='A_LXX'

Usage:
  python scripts/import_stepbible_lxx.py --db assets/db/bible.db
      [--src temp/stepbible_lxx_preview_data]
"""

import argparse
import re
import sqlite3
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

# STEPBible book code prefix → app canonical book name
# Only Protestant OT canon; LXX-only books (Tobit, Judith, Maccabees etc.) are skipped.
BOOK_MAP: dict[str, str] = {
    '01_Gen': 'Genesis',         '02_Exo': 'Exodus',          '03_Lev': 'Leviticus',
    '04_Num': 'Numbers',         '05_Deu': 'Deuteronomy',     '06_Jos': 'Joshua',
    '07_Jdg': 'Judges',          '07_Jud': 'Judges',          '08_Rut': 'Ruth',
    '09_1Sa': '1 Samuel',        '10_2Sa': '2 Samuel',        '11_1Ki': '1 Kings',
    '12_2Ki': '2 Kings',         '13_1Ch': '1 Chronicles',    '14_2Ch': '2 Chronicles',
    '15_Ezr': 'Ezra',            '16_Neh': 'Nehemiah',        '17_Est': 'Esther',
    '18_Job': 'Job',             '19_Psa': 'Psalms',          '20_Pro': 'Proverbs',
    '21_Ecc': 'Ecclesiastes',    '22_Sol': 'Song of Solomon', '22_SoS': 'Song of Solomon', '22_Sng': 'Song of Solomon',
    '23_Isa': 'Isaiah',          '24_Jer': 'Jeremiah',        '25_Lam': 'Lamentations',
    '26_Eze': 'Ezekiel',         '26_Ezk': 'Ezekiel',         '27_Dan': 'Daniel',
    '28_Hos': 'Hosea',           '29_Joe': 'Joel',            '29_Jol': 'Joel',
    '30_Amo': 'Amos',            '31_Oba': 'Obadiah',         '32_Jon': 'Jonah',
    '32_Jnh': 'Jonah',           '33_Mic': 'Micah',           '34_Nah': 'Nahum',
    '34_Nam': 'Nahum',           '35_Hab': 'Habakkuk',        '36_Zep': 'Zephaniah',
    '37_Hag': 'Haggai',          '38_Zec': 'Zechariah',       '39_Mal': 'Malachi',
}

# Matches one tagged word in C/A columns.
# Note: closing tag is </w (no >) — the > terminates the whole word entry instead:
#   <w>ἀρχῇ</w αρχη G0746=ἀρχή='beginning'=N-DSF>
WORD_RE = re.compile(
    r'<w>(.*?)</w'           # group 1: accented Greek (closing tag has no >)
    r'\s+(\S+)\s+'           # group 2: unaccented (used as translit)
    r'([GH]\d+[a-z]?)(?==)'  # group 3: Strong's number (e.g. G0746)
    r'=([^=]+)'              # group 4: lemma
    r"='([^']*)'"            # group 5: gloss
    r'=([^>\s]+)>',          # group 6: morphology (entry closed by >)
    re.DOTALL,
)

# Matches one tagged word in A-Eng column:
#   <w G0746>the beginning</w>
AENG_WORD_RE = re.compile(r'<w[^>]*>(.*?)</w>', re.DOTALL)

# Strip trailing verse-letter suffix: '001a' → '001'
VERSE_SUFFIX_RE = re.compile(r'[a-z]+$')


def norm_greek(s: str) -> str:
    """NFD decompose, strip combining diacritics, lowercase — for search normalisation."""
    nfd = unicodedata.normalize('NFD', s)
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn').lower()


def parse_ref(ref_str: str) -> tuple[str | None, int | None, int | None]:
    """Parse '01_Gen.001.001' or '01_Gen.001.001a' → (book_code, chapter, verse)."""
    parts = ref_str.split('.')
    if len(parts) != 3:
        return None, None, None
    book_code = parts[0]
    try:
        chapter = int(parts[1])
        verse = int(VERSE_SUFFIX_RE.sub('', parts[2]))
    except ValueError:
        return None, None, None
    return book_code, chapter, verse


def parse_tagged_words(col3: str) -> list[dict]:
    """Extract word dicts from a C or A tagged column."""
    words = []
    for m in WORD_RE.finditer(col3):
        greek_acc  = m.group(1).strip()
        unaccented = m.group(2).strip()
        strongs    = m.group(3)
        gloss      = m.group(5)
        morph      = m.group(6).strip()
        if greek_acc:
            words.append({
                'greek':   greek_acc,
                'translit': unaccented,
                'strongs': strongs,
                'gloss':   gloss,
                'morph':   morph,
            })
    return words


def parse_aeng_text(col3: str) -> str:
    """Concatenate English words from an A-Eng tagged column into verse text."""
    parts = [m.group(1).strip() for m in AENG_WORD_RE.finditer(col3) if m.group(1).strip()]
    return ' '.join(parts)


def run_import(db_path: str, src_path: str) -> None:
    src_file = Path(src_path) / 'LXX comparisons.txt'
    if not src_file.exists():
        print(f'Error: {src_file} not found', file=sys.stderr)
        sys.exit(1)

    c_words:   dict = defaultdict(list)   # (book, ch, vs) → [word_dict, …]
    a_words:   dict = defaultdict(list)
    aeng_text: dict = {}                  # (book, ch, vs) → verse_text

    skipped_books: set = set()

    print(f'Parsing {src_file} ({src_file.stat().st_size // 1_000_000} MB)…')
    with open(src_file, encoding='utf-8', errors='replace') as fh:
        for i, line in enumerate(fh):
            if i % 20_000 == 0:
                print(f'  Line {i:,}…', end='\r')

            line = line.rstrip('\n')
            cols = line.split('\t')
            if len(cols) < 3:
                continue

            ref_col = cols[0].strip()
            if '=' not in ref_col:
                continue

            ref_part, version = ref_col.rsplit('=', 1)
            if version not in ('C', 'A', 'A-Eng'):
                continue

            book_code, chapter, verse = parse_ref(ref_part)
            if book_code is None:
                continue

            app_book = BOOK_MAP.get(book_code)
            if not app_book:
                skipped_books.add(book_code)
                continue

            key   = (app_book, chapter, verse)
            col3  = cols[2].strip()

            if version == 'A-Eng':
                if key not in aeng_text:      # first entry wins (a/b suffix variants)
                    text = parse_aeng_text(col3)
                    if text:
                        aeng_text[key] = text
            elif version == 'C':
                c_words[key].extend(parse_tagged_words(col3))
            else:  # 'A'
                a_words[key].extend(parse_tagged_words(col3))

    print(f'\nParsed: {len(c_words):,} C-verses  |  '
          f'{len(a_words):,} A-verses  |  '
          f'{len(aeng_text):,} A-Eng verses')
    if skipped_books:
        print(f'Skipped (not in Protestant canon): {sorted(skipped_books)}')

    con = sqlite3.connect(db_path)
    cur = con.cursor()

    # ── lxx_words — C version (replaces Swete) ────────────────────────────────
    cur.execute('''
        CREATE TABLE IF NOT EXISTS lxx_words (
            book      TEXT    NOT NULL,
            chapter   INTEGER NOT NULL,
            verse     INTEGER NOT NULL,
            position  INTEGER NOT NULL,
            greek     TEXT    NOT NULL,
            translit  TEXT,
            strongs   TEXT,
            gloss     TEXT,
            morph     TEXT,
            greek_norm TEXT,
            PRIMARY KEY (book, chapter, verse, position)
        )
    ''')
    try:
        cur.execute('ALTER TABLE lxx_words ADD COLUMN greek_norm TEXT')
    except Exception:
        pass
    cur.execute('DELETE FROM lxx_words')

    lxx_rows = []
    for (book, ch, vs) in sorted(c_words):
        for pos, w in enumerate(c_words[(book, ch, vs)]):
            lxx_rows.append((book, ch, vs, pos,
                             w['greek'], w['translit'], w['strongs'],
                             w['gloss'], w['morph'], norm_greek(w['greek'])))
    cur.executemany(
        'INSERT OR REPLACE INTO lxx_words '
        '(book, chapter, verse, position, greek, translit, strongs, gloss, morph, greek_norm) '
        'VALUES (?,?,?,?,?,?,?,?,?,?)',
        lxx_rows,
    )
    print(f'lxx_words (C):           {len(lxx_rows):>8,} words')

    # ── lxx_apostolic_words — A version (new table) ───────────────────────────
    cur.execute('''
        CREATE TABLE IF NOT EXISTS lxx_apostolic_words (
            book      TEXT    NOT NULL,
            chapter   INTEGER NOT NULL,
            verse     INTEGER NOT NULL,
            position  INTEGER NOT NULL,
            greek     TEXT    NOT NULL,
            translit  TEXT,
            strongs   TEXT,
            gloss     TEXT,
            morph     TEXT,
            greek_norm TEXT,
            PRIMARY KEY (book, chapter, verse, position)
        )
    ''')
    cur.execute('DELETE FROM lxx_apostolic_words')

    apost_rows = []
    for (book, ch, vs) in sorted(a_words):
        for pos, w in enumerate(a_words[(book, ch, vs)]):
            apost_rows.append((book, ch, vs, pos,
                               w['greek'], w['translit'], w['strongs'],
                               w['gloss'], w['morph'], norm_greek(w['greek'])))
    cur.executemany(
        'INSERT OR REPLACE INTO lxx_apostolic_words '
        '(book, chapter, verse, position, greek, translit, strongs, gloss, morph, greek_norm) '
        'VALUES (?,?,?,?,?,?,?,?,?,?)',
        apost_rows,
    )
    print(f'lxx_apostolic_words (A): {len(apost_rows):>8,} words')

    # ── bible_translations A_LXX — A-Eng version (new) ───────────────────────
    cur.execute("DELETE FROM bible_translations WHERE translation = 'A_LXX'")
    alxx_rows = [
        ('A_LXX', book, ch, vs, text)
        for (book, ch, vs), text in sorted(aeng_text.items())
    ]
    cur.executemany(
        'INSERT INTO bible_translations (translation, book, chapter, verse, text) '
        'VALUES (?,?,?,?,?)',
        alxx_rows,
    )
    print(f'bible_translations A_LXX:{len(alxx_rows):>8,} verses')

    con.commit()
    con.close()
    print('\nDone. Bump DB_SCHEMA_VERSION in src/db/provider.tsx and rebuild the app.')


def main() -> None:
    parser = argparse.ArgumentParser(description='Import STEPBible LXX into bible.db')
    parser.add_argument('--db',  required=True, help='Path to bible.db')
    parser.add_argument('--src', default='temp/stepbible_lxx_preview_data',
                        help='Directory containing "LXX comparisons.txt"')
    args = parser.parse_args()
    run_import(args.db, args.src)


if __name__ == '__main__':
    main()
