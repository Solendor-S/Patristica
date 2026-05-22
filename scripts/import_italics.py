"""
Add translator-added-word italic markers to KJV, ASV, and WEB translations.

Source: eBible.org USFM files (public domain / open license)
  KJV — eng-kjv_usfm.zip
  ASV — eng-asv_usfm.zip
  WEB — eng-web_usfm.zip

USFM uses \\add...\\add* for words added by translators (shown in italics in print).
This script converts those to per-word {curly brace} markers stored in the DB text,
e.g. "There is therefore now no {condemnation} to them which are in Christ Jesus"

The app parses {word} → italic Text spans at render time.

Usage:
  python scripts/import_italics.py --db assets/db/bible.db
  python scripts/import_italics.py --db assets/db/bible.db --translations KJV ASV
  python scripts/import_italics.py --db assets/db/bible.db --src path/to/usfm_dir/ --translations WEB
"""

import argparse
import re
import sqlite3
import sys
import urllib.request
import zipfile
from pathlib import Path

USFM_URLS: dict[str, str] = {
    'KJV': 'https://ebible.org/Scriptures/eng-kjv_usfm.zip',
    'ASV': 'https://ebible.org/Scriptures/eng-asv_usfm.zip',
    'WEB': 'https://ebible.org/Scriptures/eng-web_usfm.zip',
}

_HEADERS = {'User-Agent': 'Mozilla/5.0 (compatible; BibleApp/1.0)'}

# USFM 3-char book ID → app canonical book name
USFM_ID_MAP: dict[str, str] = {
    'GEN': 'Genesis',         'EXO': 'Exodus',          'LEV': 'Leviticus',
    'NUM': 'Numbers',         'DEU': 'Deuteronomy',      'JOS': 'Joshua',
    'JDG': 'Judges',          'RUT': 'Ruth',             '1SA': '1 Samuel',
    '2SA': '2 Samuel',        '1KI': '1 Kings',          '2KI': '2 Kings',
    '1CH': '1 Chronicles',    '2CH': '2 Chronicles',     'EZR': 'Ezra',
    'NEH': 'Nehemiah',        'EST': 'Esther',            'JOB': 'Job',
    'PSA': 'Psalms',          'PRO': 'Proverbs',          'ECC': 'Ecclesiastes',
    'SNG': 'Song of Solomon', 'SON': 'Song of Solomon',  'ISA': 'Isaiah',
    'JER': 'Jeremiah',        'LAM': 'Lamentations',     'EZK': 'Ezekiel',
    'EZE': 'Ezekiel',         'DAN': 'Daniel',            'HOS': 'Hosea',
    'JOL': 'Joel',            'AMO': 'Amos',              'OBA': 'Obadiah',
    'JON': 'Jonah',           'MIC': 'Micah',             'NAM': 'Nahum',
    'HAB': 'Habakkuk',        'ZEP': 'Zephaniah',         'HAG': 'Haggai',
    'ZEC': 'Zechariah',       'MAL': 'Malachi',
    'MAT': 'Matthew',         'MRK': 'Mark',              'LUK': 'Luke',
    'JHN': 'John',            'ACT': 'Acts',              'ROM': 'Romans',
    '1CO': '1 Corinthians',   '2CO': '2 Corinthians',    'GAL': 'Galatians',
    'EPH': 'Ephesians',       'PHP': 'Philippians',       'COL': 'Colossians',
    '1TH': '1 Thessalonians', '2TH': '2 Thessalonians',  '1TI': '1 Timothy',
    '2TI': '2 Timothy',       'TIT': 'Titus',             'PHM': 'Philemon',
    'HEB': 'Hebrews',         'JAS': 'James',             '1PE': '1 Peter',
    '2PE': '2 Peter',         '1JN': '1 John',            '2JN': '2 John',
    '3JN': '3 John',          'JUD': 'Jude',              'REV': 'Revelation',
}

# Canonical → Roman numeral prefix form (ASV stores numbered books this way)
_ROMAN_PREFIX = {'1 ': 'I ', '2 ': 'II ', '3 ': 'III '}

def to_roman_book(book: str) -> str | None:
    for num, rom in _ROMAN_PREFIX.items():
        if book.startswith(num):
            return rom + book[len(num):]
    return None


def download_usfm(translation: str, dest_dir: Path) -> Path:
    url = USFM_URLS[translation]
    zip_path = dest_dir / f'{translation.lower()}.zip'
    print(f'Downloading {translation} from eBible.org…')
    req = urllib.request.Request(url, headers=_HEADERS)
    with urllib.request.urlopen(req) as resp, open(zip_path, 'wb') as f:
        f.write(resp.read())
    extract_dir = dest_dir / translation.lower()
    extract_dir.mkdir(exist_ok=True)
    print(f'Extracting {translation}…')
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(extract_dir)
    return extract_dir


def clean_usfm_with_italics(text: str) -> str:
    """
    Convert \\add...\\add* spans to per-word {curly brace} markers, then strip
    all USFM footnote/cross-ref blocks, inline markers, and word-level attributes.
    """
    def wrap_italic(m: re.Match) -> str:
        inner = re.sub(r'\|[a-z0-9-]+="[^"]*"', '', m.group(1))
        words = inner.split()
        return ' '.join(f'{{{w}}}' for w in words if w)

    # 1. Remove entire footnote/cross-ref/endnote blocks before anything else
    text = re.sub(r'\\f\b.*?\\f\*', '', text, flags=re.DOTALL)
    text = re.sub(r'\\x\b.*?\\x\*', '', text, flags=re.DOTALL)
    text = re.sub(r'\\fe\b.*?\\fe\*', '', text, flags=re.DOTALL)
    text = re.sub(r'\\rq\b.*?\\rq\*', '', text, flags=re.DOTALL)
    # 2. Convert \add...\add* to {word} markers
    text = re.sub(r'\\add\b(.*?)\\add\*', wrap_italic, text, flags=re.DOTALL)
    # 3. Strip word-level |attr="val" annotations (eBible tagged USFM)
    text = re.sub(r'\|[a-z0-9-]+="[^"]*"', '', text)
    # 4. Strip remaining USFM inline markers
    text = re.sub(r'\\[a-z]+\d*\*?', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\s+([,.;:!?])', r'\1', text)  # remove space before punctuation
    return text.strip()


def parse_usfm_file(path: Path):
    """Yield (book, chapter, verse, text) with {italic} markers from a USFM file."""
    book = None
    chapter = None

    with open(path, encoding='utf-8', errors='replace') as fh:
        current_verse: tuple[str, int, int] | None = None
        current_parts: list[str] = []

        def flush():
            nonlocal current_verse, current_parts
            if current_verse and current_parts:
                text = clean_usfm_with_italics(' '.join(current_parts))
                if text:
                    yield current_verse + (text,)
            current_verse = None
            current_parts = []

        for line in fh:
            line = line.rstrip('\n')

            id_m = re.match(r'\\id\s+(\w+)', line)
            if id_m:
                yield from flush()
                book = USFM_ID_MAP.get(id_m.group(1).upper())
                chapter = None
                continue

            c_m = re.match(r'\\c\s+(\d+)', line)
            if c_m:
                yield from flush()
                chapter = int(c_m.group(1))
                continue

            v_m = re.match(r'\\v\s+(\d+)\s*(.*)', line)
            if v_m:
                yield from flush()
                if book and chapter:
                    current_verse = (book, chapter, int(v_m.group(1)))
                    rest = v_m.group(2)
                    current_parts = [rest] if rest.strip() else []
                continue

            if current_verse and not line.startswith('\\'):
                current_parts.append(line)

        yield from flush()

    if current_verse and current_parts:
        text = clean_usfm_with_italics(' '.join(current_parts))
        if text:
            yield current_verse + (text,)


def has_any_add(src_dir: Path) -> bool:
    """Quick scan to verify the USFM files actually contain \\add markers."""
    for f in src_dir.rglob('*.usfm'):
        content = f.read_text(encoding='utf-8', errors='replace')
        if r'\add' in content:
            return True
    return False


def process_translation(db_path: str, translation: str, src_dir: Path) -> None:
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    if not has_any_add(src_dir):
        print(f'Warning: no \\add markers found in {src_dir} — no italics to import for {translation}.', file=sys.stderr)

    updated = 0
    skipped = 0

    for usfm_file in sorted(src_dir.rglob('*.usfm')):
        for book, chapter, verse, text in parse_usfm_file(usfm_file):
            if not book:
                skipped += 1
                continue

            if translation == 'KJV':
                r = cur.execute(
                    'UPDATE bible_verses SET text = ? WHERE book = ? AND chapter = ? AND verse = ?',
                    (text, book, chapter, verse),
                )
            else:
                # Try canonical name first; fall back to Roman numeral form for ASV
                r = cur.execute(
                    'UPDATE bible_translations SET text = ? WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?',
                    (text, translation, book, chapter, verse),
                )
                if r.rowcount == 0:
                    alt = to_roman_book(book)
                    if alt:
                        r = cur.execute(
                            'UPDATE bible_translations SET text = ? WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?',
                            (text, translation, alt, chapter, verse),
                        )

            if r.rowcount > 0:
                updated += 1
            else:
                skipped += 1

    con.commit()
    con.close()
    print(f'{translation}: updated {updated} verses, skipped {skipped}.')


def main() -> None:
    parser = argparse.ArgumentParser(description='Add italic markers to KJV/ASV/WEB in bible.db')
    parser.add_argument('--db', required=True, help='Path to bible.db')
    parser.add_argument('--translations', nargs='+', default=['KJV', 'ASV', 'WEB'],
                        choices=['KJV', 'ASV', 'WEB'], help='Translations to update')
    parser.add_argument('--src', help='Path to a USFM directory (applies to all translations; downloads if omitted)')
    args = parser.parse_args()

    temp_root = Path('temp/italics_usfm')

    for translation in args.translations:
        if args.src:
            src_dir = Path(args.src)
        else:
            src_dir = temp_root / translation.lower()
            src_dir.mkdir(parents=True, exist_ok=True)
            if not any(src_dir.rglob('*.usfm')):
                src_dir = download_usfm(translation, temp_root)

        if not src_dir.exists():
            print(f'Error: {src_dir} not found', file=sys.stderr)
            sys.exit(1)

        process_translation(args.db, translation, src_dir)


if __name__ == '__main__':
    main()
