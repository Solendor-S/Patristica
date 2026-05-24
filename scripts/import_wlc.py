"""
Import Westminster Leningrad Codex (WLC) into wlc_words table.

Source: github.com/Clear-Bible/macula-hebrew (CC BY 4.0)
Format: XML lowfat files in WLC/lowfat/ — one per chapter, <w> elements with attributes

Usage:
    python scripts/import_wlc.py --db assets/db/bible.db --src path/to/macula-hebrew

The --src directory should be the root of a cloned macula-hebrew repo.
XML files are at <src>/WLC/lowfat/*.xml
"""

import argparse
import glob
import os
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET

# Maps MACULA book abbreviations (from ref attribute, e.g. "GEN") → app's canonical book names
BOOK_MAP = {
    'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus',
    'NUM': 'Numbers', 'DEU': 'Deuteronomy', 'JOS': 'Joshua',
    'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
    '1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles',
    '2CH': '2 Chronicles', 'EZR': 'Ezra', 'NEH': 'Nehemiah',
    'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms', 'PRO': 'Proverbs',
    'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'ISA': 'Isaiah',
    'JER': 'Jeremiah', 'LAM': 'Lamentations', 'EZK': 'Ezekiel',
    'DAN': 'Daniel', 'HOS': 'Hosea', 'JOL': 'Joel', 'AMO': 'Amos',
    'OBA': 'Obadiah', 'JON': 'Jonah', 'MIC': 'Micah', 'NAM': 'Nahum',
    'HAB': 'Habakkuk', 'ZEP': 'Zephaniah', 'HAG': 'Haggai',
    'ZEC': 'Zechariah', 'MAL': 'Malachi',
}

# Regex to parse ref like "GEN 1:1!1" → (book_code, chapter, verse)
REF_RE = re.compile(r'^([A-Z1-9]{2,3})\s+(\d+):(\d+)')


def parse_ref(ref: str):
    m = REF_RE.match(ref)
    if not m:
        return None
    return m.group(1), int(m.group(2)), int(m.group(3))


def clean_strongs(raw: str) -> str | None:
    if not raw:
        return None
    s = raw.strip()
    # strongnumberx is numeric only (e.g. "7225" or "0871a") — prefix H
    if s and s[0].isdigit():
        s = re.sub(r'[a-z]$', '', s)  # strip trailing disambiguation letter
        return f'H{s}' if s else None
    # already prefixed (e.g. "H7225")
    s = re.sub(r'([A-Z]\d+)[a-z]$', r'\1', s)
    return s if s else None


def import_xml(cur: sqlite3.Cursor, xml_path: str):
    try:
        tree = ET.parse(xml_path)
    except ET.ParseError as e:
        print(f"  WARN: parse error in {os.path.basename(xml_path)}: {e}")
        return 0

    root = tree.getroot()
    rows = []
    verse_pos: dict[tuple, int] = {}

    for w in root.iter('w'):
        ref = w.get('ref', '')
        if not ref:
            continue
        parsed = parse_ref(ref)
        if not parsed:
            continue
        book_code, chapter, verse = parsed

        book_name = BOOK_MAP.get(book_code)
        if not book_name:
            continue

        hebrew = (w.get('unicode') or w.text or '').strip()
        if not hebrew:
            continue

        strongs = clean_strongs(w.get('strongnumberx') or w.get('strong') or '')
        gloss = (w.get('gloss') or w.get('english') or '').strip() or None
        morph = (w.get('morph') or '').strip() or None
        translit = (w.get('transliteration') or '').strip() or None

        key = (book_name, chapter, verse)
        pos = verse_pos.get(key, 0) + 1
        verse_pos[key] = pos

        rows.append((book_name, chapter, verse, pos, hebrew, translit, strongs, gloss, morph))

    if rows:
        cur.executemany(
            'INSERT OR REPLACE INTO wlc_words '
            '(book, chapter, verse, position, hebrew, translit, strongs, gloss, morph) '
            'VALUES (?,?,?,?,?,?,?,?,?)',
            rows
        )
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description='Import MACULA Hebrew (WLC) into wlc_words')
    parser.add_argument('--db', required=True, help='Path to bible.db')
    parser.add_argument('--src', required=True, help='Path to cloned macula-hebrew repo')
    args = parser.parse_args()

    lowfat_dir = os.path.join(args.src, 'WLC', 'lowfat')
    if not os.path.isdir(lowfat_dir):
        print(f"ERROR: lowfat directory not found: {lowfat_dir}", file=sys.stderr)
        print("Expected structure: <src>/WLC/lowfat/*.xml", file=sys.stderr)
        sys.exit(1)

    # Skip the root summary file (macula-hebrew-lowfat.xml) — only chapter files matter
    xml_files = sorted(f for f in glob.glob(os.path.join(lowfat_dir, '*.xml'))
                       if re.match(r'\d{2}-', os.path.basename(f)))
    if not xml_files:
        print(f"ERROR: No .xml files found in {lowfat_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(xml_files)} XML files in {lowfat_dir}")

    con = sqlite3.connect(args.db)
    cur = con.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS wlc_words (
            book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
            position INTEGER NOT NULL, hebrew TEXT NOT NULL,
            translit TEXT, strongs TEXT, gloss TEXT, morph TEXT,
            PRIMARY KEY (book, chapter, verse, position)
        )
    ''')
    cur.execute('DELETE FROM wlc_words')

    total = 0
    prev_book = None
    book_count = 0
    for xml_path in xml_files:
        count = import_xml(cur, xml_path)
        total += count

        # Print progress per book (infer book from filename like "01-Gen-001-lowfat.xml")
        fname = os.path.basename(xml_path)
        book_part = fname.split('-')[1] if '-' in fname else fname
        if book_part != prev_book:
            if prev_book is not None:
                print(f"  {prev_book}: {book_count} words")
            prev_book = book_part
            book_count = count
        else:
            book_count += count

    if prev_book:
        print(f"  {prev_book}: {book_count} words")

    con.commit()
    con.close()
    print(f"\nDone. {total} total words imported into wlc_words.")


if __name__ == '__main__':
    main()
