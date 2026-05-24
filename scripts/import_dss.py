"""
Import Dead Sea Scrolls (biblical) Hebrew into dss_words table.

Source: github.com/ETCBC/dss (CC BY-NC 4.0)
        Martin G. Abegg's transcription, provided to ETCBC free of charge.
Format: Text-Fabric .tf feature files

Requirements:
    pip install text-fabric

The script uses Text-Fabric to fetch the ETCBC/dss dataset automatically on first run
(downloads ~100 MB to ~/text-fabric-data/). Subsequent runs use the cached copy.

Usage:
    python scripts/import_dss.py --db assets/db/bible.db

The dataset downloads automatically. To use a local clone of ETCBC/dss instead,
pass --offline pointing to its tf/ directory.
"""

import argparse
import sqlite3
import sys

try:
    from tf.fabric import Fabric
except ImportError:
    print("ERROR: text-fabric not installed. Run: pip install text-fabric", file=sys.stderr)
    sys.exit(1)

TF_CACHE = r'~/text-fabric-data/github/ETCBC/dss/tf/2.0'

# ETCBC book abbreviations → app canonical names
# Only books with real canonical chapter/verse refs in the DSS corpus are included.
BOOK_MAP = {
    'Gen':   'Genesis',       'Ex':    'Exodus',        'Lev':  'Leviticus',
    'Num':   'Numbers',       'Deut':  'Deuteronomy',   'Josh': 'Joshua',
    'Judg':  'Judges',        'Ruth':  'Ruth',           '1Sam': '1 Samuel',
    '2Sam':  '2 Samuel',      '1Kgs':  '1 Kings',        '2Kgs': '2 Kings',
    '1Chr':  '1 Chronicles',  '2Chr':  '2 Chronicles',   'Ezra': 'Ezra',
    'Neh':   'Nehemiah',      'Est':   'Esther',         'Job':  'Job',
    'Ps':    'Psalms',        'Prov':  'Proverbs',       'Eccl': 'Ecclesiastes',
    'Song':  'Song of Solomon', 'Is':  'Isaiah',         'Jer':  'Jeremiah',
    'Lam':   'Lamentations',  'Ezek':  'Ezekiel',        'Dan':  'Daniel',
    'Hos':   'Hosea',         'Joel':  'Joel',            'Amos': 'Amos',
    'Obad':  'Obadiah',       'Jonah': 'Jonah',          'Mic':  'Micah',
    'Nah':   'Nahum',         'Hab':   'Habakkuk',        'Zeph': 'Zephaniah',
    'Hag':   'Haggai',        'Zech':  'Zechariah',      'Mal':  'Malachi',
}


def build_morph(F, w) -> str | None:
    parts = []
    for feat in ('sp', 'vs', 'vt', 'gn', 'nu', 'ps', 'st'):
        attr = getattr(F, feat, None)
        if attr:
            v = attr.v(w)
            if v and v not in ('NA', 'unknown', 'absent', 'n/a'):
                parts.append(f'{feat}:{v}')
    return ' '.join(parts) if parts else None


def main():
    parser = argparse.ArgumentParser(description='Import ETCBC/dss into dss_words')
    parser.add_argument('--db', required=True, help='Path to bible.db')
    parser.add_argument('--offline', help='Path to local dss tf/2.0 directory (skips download)')
    args = parser.parse_args()

    tf_location = args.offline if args.offline else TF_CACHE
    print(f'Loading ETCBC/dss from {tf_location} (may download on first run)...')

    import os
    tf_abs = os.path.expanduser(tf_location)
    TF = Fabric(locations=tf_abs, silent=True)
    api = TF.load('otype book chapter verse full lex sp vs vt gn nu ps st', silent=True)
    if not api:
        print('ERROR: Failed to load Text-Fabric features.', file=sys.stderr)
        sys.exit(1)

    F = api.F
    print('Dataset loaded.')

    con = sqlite3.connect(args.db)
    cur = con.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS dss_words (
            book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
            position INTEGER NOT NULL, hebrew TEXT NOT NULL,
            translit TEXT, strongs TEXT, gloss TEXT, morph TEXT,
            PRIMARY KEY (book, chapter, verse, position)
        )
    ''')
    cur.execute('DELETE FROM dss_words')

    # Collect words grouped by (canon_book, chapter_int, verse_int) to assign positions
    verse_words: dict[tuple, list] = {}
    skipped_books: set[str] = set()

    for w in F.otype.s('word'):
        etcbc_book = F.book.v(w)
        if not etcbc_book:
            continue

        canon = BOOK_MAP.get(etcbc_book)
        if not canon:
            skipped_books.add(etcbc_book)
            continue

        ch_raw = F.chapter.v(w)
        vs_raw = F.verse.v(w)
        try:
            ch = int(ch_raw)
            vs = int(vs_raw)
        except (TypeError, ValueError):
            continue  # scroll fragment refs like 'f38'

        hebrew = (F.full.v(w) or '').strip()
        if not hebrew:
            continue

        lex = F.lex.v(w) or None
        morph = build_morph(F, w)

        key = (canon, ch, vs)
        verse_words.setdefault(key, []).append((hebrew, lex, morph))

    # Insert with sequential positions
    rows = []
    for (book, ch, vs), words in verse_words.items():
        for pos, (hebrew, lex, morph) in enumerate(words, 1):
            rows.append((book, ch, vs, pos, hebrew, None, lex, None, morph))

    cur.executemany(
        'INSERT OR REPLACE INTO dss_words '
        '(book, chapter, verse, position, hebrew, translit, strongs, gloss, morph) '
        'VALUES (?,?,?,?,?,?,?,?,?)',
        rows
    )

    con.commit()
    con.close()

    # Report per book
    book_counts: dict[str, int] = {}
    for book, _, __, _pos, *__ in rows:
        book_counts[book] = book_counts.get(book, 0) + 1
    for book in sorted(book_counts):
        print(f'  {book}: {book_counts[book]} words')

    non_canonical = {b for b in skipped_books if not any(c.isdigit() for c in b[:2])}
    if non_canonical:
        print(f'\nSkipped non-canonical books: {", ".join(sorted(non_canonical))}')

    print(f'\nDone. {len(rows)} total words imported into dss_words.')


if __name__ == '__main__':
    main()
