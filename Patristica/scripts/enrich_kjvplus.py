"""
enrich_kjvplus.py — Fill in missing Strong's numbers in KJV+ and I_KJV+ texts.

Source: OpenHebrewBible KJV-OT-mapped-to-BHS.csv (CC0)
  github.com/eliranwong/OpenHebrewBible/008-BHS-mapping-KJV/KJV-OT-mapped-to-BHS.csv

Algorithm per verse:
  1. Parse mapping CSV phrase→Strong's for this verse
  2. Parse our KJV+ into (word, strongs_or_None, is_italic) tokens
  3. For each untagged non-italic word: if exactly one Strong's candidate exists
     across all mapping phrases in this verse, assign it (unambiguous fill)
  4. Reconstruct text and UPDATE bible_translations

Usage:
  python scripts/enrich_kjvplus.py --db assets/db/bible.db --src temp/kjv_ot_mapped.csv
  python scripts/enrich_kjvplus.py --db assets/db/bible.db --src temp/kjv_ot_mapped.csv --dry-run
  python scripts/enrich_kjvplus.py --db assets/db/bible.db --src temp/kjv_ot_mapped.csv --verse "1 Kings 21:6"
"""

import argparse
import re
import sqlite3
import sys

# OT book names in canonical order (index 0 = book number 1 in CSV)
OT_BOOKS = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
    'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
]
BOOK_BY_NUM = {i + 1: name for i, name in enumerate(OT_BOOKS)}
BOOK_BY_NAME = {name: i + 1 for i, name in enumerate(OT_BOOKS)}

# Regex to extract (phrase, strongs) pairs from mapping text
# Format: "some english words〈H1234＝...〉"
PHRASE_RE = re.compile(r'([^〈〉<\n]+?)〈(H\d+)＝[^〉]*〉')
STRONGS_TOKEN_RE = re.compile(r'^[GH]\d+$')


def norm(word: str) -> str:
    return re.sub(r'[^a-zA-Z]', '', word).lower()


def load_mapping(csv_path: str) -> dict:
    """Load CSV into dict: (book_num, chapter, verse) → [(phrase, strongs), ...]"""
    mapping = {}
    with open(csv_path, encoding='utf-8') as f:
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) < 5:
                continue
            try:
                book, ch, v = int(parts[1]), int(parts[2]), int(parts[3])
            except ValueError:
                continue
            text = parts[4]
            pairs = PHRASE_RE.findall(text)
            if pairs:
                mapping[(book, ch, v)] = pairs
    return mapping


def parse_kjvplus(text: str) -> list:
    """Parse KJV+ text into list of (word, strongs_or_None, is_italic)."""
    tokens = []
    parts = text.split(' ')
    pending = None
    pending_italic = False
    for p in parts:
        if not p:
            continue
        if STRONGS_TOKEN_RE.match(p):
            if pending is not None:
                tokens.append((pending, p, pending_italic))
                pending = None
                pending_italic = False
        else:
            if pending is not None:
                tokens.append((pending, None, pending_italic))
            italic = '{' in p
            pending = p.replace('{', '').replace('}', '') if italic else p
            pending_italic = italic
    if pending is not None:
        tokens.append((pending, None, pending_italic))
    return tokens


def reconstruct(tokens: list) -> str:
    """Reconstruct KJV+ text string from tokens."""
    parts = []
    for word, strongs, italic in tokens:
        parts.append('{' + word + '}' if italic else word)
        if strongs:
            parts.append(strongs)
    return ' '.join(parts)


HTML_TAG_RE = re.compile(r'<[^>]+>')


def build_word_candidates(phrases: list) -> dict:
    """
    From mapping phrases, build norm_word → [strongs, ...] lookup for this verse.
    Only the LAST word of each phrase is assigned the Strong's — preceding words
    are articles/prepositions/pronouns that are Hebrew prefixes/suffixes, not the
    root. Single-word phrases are the clearest case; multi-word phrases only tag
    the final content word. Only unique candidates (len==1) will be used.
    """
    candidates: dict = {}
    for phrase, strongs in phrases:
        clean = HTML_TAG_RE.sub('', phrase).strip()
        words = [w for w in clean.split() if norm(w)]
        if not words:
            continue
        last = norm(words[-1])
        if last not in candidates:
            candidates[last] = []
        if strongs not in candidates[last]:
            candidates[last].append(strongs)
    return candidates


def enrich_tokens(tokens: list, candidates: dict) -> tuple:
    """Fill untagged non-italic tokens with unambiguous Strong's. Returns (new_tokens, n_filled)."""
    new_tokens = []
    filled = 0
    for word, strongs, italic in tokens:
        if strongs is None and not italic:
            matches = candidates.get(norm(word), [])
            if len(matches) == 1:
                new_tokens.append((word, matches[0], italic))
                filled += 1
                continue
        new_tokens.append((word, strongs, italic))
    return new_tokens, filled


def parse_verse_arg(verse_str: str):
    """Parse 'Book Chapter:Verse' → (book_num, chapter, verse)."""
    m = re.match(r'^(.+?)\s+(\d+):(\d+)$', verse_str.strip())
    if not m:
        raise ValueError(f"Expected format 'Book Chapter:Verse', got: {verse_str!r}")
    book_name = m.group(1)
    if book_name not in BOOK_BY_NAME:
        raise ValueError(f"Unknown book: {book_name!r}")
    return BOOK_BY_NAME[book_name], int(m.group(2)), int(m.group(3))


def main():
    ap = argparse.ArgumentParser(description='Enrich KJV+ Strong\'s tags from OpenHebrewBible mapping')
    ap.add_argument('--db', required=True, help='Path to bible.db')
    ap.add_argument('--src', required=True, help='Path to KJV-OT-mapped-to-BHS.csv')
    ap.add_argument('--dry-run', action='store_true', help='Print changes without writing to DB')
    ap.add_argument('--verse', help='Only process this verse, e.g. "1 Kings 21:6"')
    args = ap.parse_args()

    print('Loading mapping CSV...')
    mapping = load_mapping(args.src)
    print(f'  {len(mapping)} verses loaded')

    db = sqlite3.connect(args.db)
    translations = ['KJV+', 'I_KJV+']

    if args.verse:
        book_num, chapter, verse = parse_verse_arg(args.verse)
        book_name = BOOK_BY_NUM[book_num]
        filter_clause = f"AND book = '{book_name}' AND chapter = {chapter} AND verse = {verse}"
    else:
        filter_clause = ''

    total_verses = 0
    total_filled = 0
    total_skipped = 0

    for translation in translations:
        print(f'\nProcessing {translation}...')
        rows = db.execute(
            f"SELECT book, chapter, verse, text FROM bible_translations "
            f"WHERE translation = ? {filter_clause} ORDER BY book, chapter, verse",
            [translation]
        ).fetchall()

        updates = []
        for book_name, chapter, verse, text in rows:
            book_num = BOOK_BY_NAME.get(book_name)
            if book_num is None:
                # NT book — skip entirely
                continue

            phrases = mapping.get((book_num, chapter, verse))
            if not phrases:
                total_skipped += 1
                continue

            tokens = parse_kjvplus(text)
            candidates = build_word_candidates(phrases)
            new_tokens, filled = enrich_tokens(tokens, candidates)

            total_verses += 1
            total_filled += filled

            if filled > 0:
                new_text = reconstruct(new_tokens)
                if args.verse or args.dry_run:
                    print(f'  {book_name} {chapter}:{verse} — {filled} tag(s) filled')
                    if args.verse:
                        print(f'  BEFORE: {text}')
                        print(f'  AFTER:  {new_text}')
                if not args.dry_run:
                    updates.append((new_text, translation, book_name, chapter, verse))

        if not args.dry_run and updates:
            db.executemany(
                "UPDATE bible_translations SET text = ? WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?",
                updates
            )
            db.commit()
            print(f'  Wrote {len(updates)} updates')

    db.close()
    print(f'\nDone. Verses processed: {total_verses}, tags filled: {total_filled}, skipped (no mapping): {total_skipped}')


if __name__ == '__main__':
    main()
