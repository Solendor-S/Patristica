"""
enrich_kjvplus_multitag.py — Add missing second Strong's tags to KJV+ / I_KJV+

Some KJV words are translations of 2+ consecutive Hebrew words. For example:
  "armourbearer" = H5375 (bearer of) + H3627 (weapons)
The current KJV+ data only stores one tag per word. This script uses the
BibleHub interlinear cache (produced by scrape_biblehub_interlinear_ot.py)
to identify and append the missing second/third tags.

Algorithm per verse:
  1. Get BibleHub H-number sequence from cache
  2. Get current KJV+ token list (word, strongs, italic)
  3. in_kjv = set of H-numbers already tagged in this verse
  4. For each BibleHub H-number NOT in in_kjv:
       - Skip prefix morphemes (conjunctive waw, article, direct-obj marker, etc.)
       - Find the anchor: last preceding BibleHub word whose H IS in in_kjv
       - Append this H immediately after the anchor token
  5. UPDATE bible_translations

Usage:
  python scripts/enrich_kjvplus_multitag.py --db assets/db/bible.db
  python scripts/enrich_kjvplus_multitag.py --db assets/db/bible.db --dry-run
  python scripts/enrich_kjvplus_multitag.py --db assets/db/bible.db --verse "1 Samuel 16:21"
"""

import argparse
import json
import re
import sqlite3
from pathlib import Path

CACHE_DIR = Path('temp/biblehub_interlinear_cache')

# H-numbers that are pure grammatical markers with no KJV word equivalent.
# These appear in BibleHub interlinear but have no corresponding KJV token.
PREFIX_MORPHEMES = {
    '2050',  # conjunctive waw "and/also" (prefix)
    '1886',  # definite article "the" (prefix)
    '3807',  # preposition lamed (prefix form "to/for")
    '853',   # direct object marker et (untranslated)
    '3651',  # adverb "so/thus" (sometimes prefix)
    '7350',  # NOT — sometimes untranslated morpheme
    '0',     # BibleHub placeholder for pronominal suffixes / no standalone entry
    '',      # no Strong's at all
}

STRONGS_TOKEN_RE = re.compile(r'^[GH]\d+$')
STRONGS_NORM_RE  = re.compile(r'^([GH])0*(\d+)')


def norm_strongs(s: str) -> str:
    m = STRONGS_NORM_RE.match(s or '')
    return (m.group(1) + m.group(2)) if m else s


def parse_kjvplus(text: str) -> list:
    """'word H1234 word2 H5678 ...' → [(word, strongs_or_None, is_italic)]"""
    tokens = []
    pending = None
    pending_italic = False
    for p in text.split(' '):
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
    parts = []
    for word, strongs, italic in tokens:
        parts.append('{' + word + '}' if italic else word)
        if strongs:
            parts.append(strongs)
    return ' '.join(parts)


def book_to_slug(book: str) -> str:
    return book.lower().replace(' ', '_')


def load_cache(slug: str) -> dict:
    path = CACHE_DIR / f'{slug}.json'
    if path.exists():
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return {}


def enrich_verse(bh_words: list, tokens: list) -> tuple[list, int]:
    """
    bh_words: [{"strongs": "5375", "eng": "..."}, ...]  from BibleHub cache
    tokens:   [(word, strongs_or_None, italic), ...]     from KJV+

    Returns (new_tokens, n_added).
    """
    # Build set of normalised H-numbers already in KJV+
    in_kjv: set = set()
    for _, strongs, _ in tokens:
        if strongs:
            in_kjv.add(norm_strongs(strongs))

    # Build ordered BibleHub H-number list (skip blanks / prefix morphemes)
    bh_nums = []
    for w in bh_words:
        raw = (w.get('strongs') or '').strip()
        bh_nums.append(raw)  # keep all positions (including blanks) for anchor search

    # Find H-numbers missing from KJV+ and not prefix morphemes
    # For each missing H, find the anchor token index in `tokens`
    # by scanning backwards in bh_nums for the last H that IS in in_kjv

    # We'll build a list of (anchor_token_index, missing_H) to insert
    insertions: list[tuple[int, str]] = []

    # Map from normalised H-number → token index in tokens
    # (last occurrence, for cases where same H appears twice)
    h_to_token_idx: dict[str, int] = {}
    for i, (_, strongs, _) in enumerate(tokens):
        if strongs:
            h_to_token_idx[norm_strongs(strongs)] = i

    for pos, raw in enumerate(bh_nums):
        if not raw or raw in PREFIX_MORPHEMES:
            continue
        norm_h = norm_strongs('H' + raw) if raw.isdigit() else norm_strongs(raw)
        if norm_h in in_kjv:
            continue  # already tagged

        # Find anchor: scan backwards in bh_nums from pos
        anchor_idx = None
        for back in range(pos - 1, -1, -1):
            candidate_raw = bh_nums[back]
            if not candidate_raw or candidate_raw in PREFIX_MORPHEMES:
                continue
            cn = norm_strongs('H' + candidate_raw) if candidate_raw.isdigit() else norm_strongs(candidate_raw)
            if cn in h_to_token_idx:
                anchor_idx = h_to_token_idx[cn]
                break

        if anchor_idx is not None:
            insertions.append((anchor_idx, norm_h))

    if not insertions:
        return tokens, 0

    # Apply insertions: after each anchor token, append the missing H-number
    # Group by anchor_idx and deduplicate
    from collections import defaultdict
    anchor_map: dict = defaultdict(list)
    seen_h: set = set()
    for anchor_idx, h in insertions:
        if h not in seen_h:
            anchor_map[anchor_idx].append(h)
            seen_h.add(h)

    new_tokens = []
    added = 0
    for i, (word, strongs, italic) in enumerate(tokens):
        new_tokens.append((word, strongs, italic))
        if i in anchor_map:
            for extra_h in anchor_map[i]:
                # Insert as a standalone strongs-only token by appending after this word
                # Format: treat it as a word with no text but with a strongs (using empty string)
                # Actually we append it as extra strongs on the current word by inserting
                # a "phantom" token: ("", extra_h, False) which reconstruct handles correctly.
                # But reconstruct skips empty words, so instead we append the H-number directly
                # after the anchor token's strongs in the text by using a sentinel.
                # Simplest: insert an extra token (word='', strongs=extra_h) after anchor.
                # reconstruct will produce "word H1234 H5678" format.
                new_tokens.append(('', extra_h, False))
                added += 1

    return new_tokens, added


def reconstruct_with_extras(tokens: list) -> str:
    """Like reconstruct() but handles ('', extra_H, False) phantom tokens."""
    parts = []
    for word, strongs, italic in tokens:
        if word:
            parts.append('{' + word + '}' if italic else word)
        if strongs:
            parts.append(strongs)
    return ' '.join(parts)


def parse_verse_arg(s: str):
    m = re.match(r'^(.+?)\s+(\d+):(\d+)$', s.strip())
    if not m:
        raise ValueError(f"Expected 'Book Chapter:Verse', got: {s!r}")
    return m.group(1), int(m.group(2)), int(m.group(3))


def main():
    ap = argparse.ArgumentParser(
        description='Add missing second Strong\'s tags to KJV+ using BibleHub interlinear cache'
    )
    ap.add_argument('--db',      required=True,  help='Path to bible.db')
    ap.add_argument('--dry-run', action='store_true', help='Show stats without writing')
    ap.add_argument('--verse',   help='Process single verse, e.g. "1 Samuel 16:21"')
    args = ap.parse_args()

    if args.verse:
        book_arg, ch_arg, v_arg = parse_verse_arg(args.verse)
        filter_sql    = ' AND book = ? AND chapter = ? AND verse = ?'
        filter_params: tuple = (book_arg, ch_arg, v_arg)
    else:
        filter_sql    = ''
        filter_params = ()

    conn = sqlite3.connect(args.db)

    # Load all available cache files
    caches: dict = {}
    for cache_file in sorted(CACHE_DIR.glob('*.json')):
        slug = cache_file.stem
        with open(cache_file, encoding='utf-8') as f:
            caches[slug] = json.load(f)
    print(f'Loaded cache for {len(caches)} book(s)')

    if not caches:
        print('No cache found. Run scrape_biblehub_interlinear_ot.py first.')
        conn.close()
        return

    grand_added = 0

    for translation in ('KJV+', 'I_KJV+'):
        print(f'\nProcessing {translation}...')
        rows = conn.execute(
            f'SELECT book, chapter, verse, text FROM bible_translations '
            f'WHERE translation = ?{filter_sql} ORDER BY book, chapter, verse',
            (translation, *filter_params)
        ).fetchall()

        updates = []
        t_verses = t_added = 0

        for book, chapter, verse, text in rows:
            slug = book_to_slug(book)
            book_cache = caches.get(slug)
            if not book_cache:
                continue

            bh_words = book_cache.get(str(chapter), {}).get(str(verse))
            if not bh_words:
                continue

            tokens = parse_kjvplus(text)
            new_tokens, added = enrich_verse(bh_words, tokens)

            t_verses += 1
            t_added  += added

            if added > 0:
                new_text = reconstruct_with_extras(new_tokens)
                if args.verse or args.dry_run:
                    print(f'  {book} {chapter}:{verse} — {added} tag(s) added')
                if args.verse:
                    print(f'    BEFORE: {text}')
                    print(f'    AFTER:  {new_text}')
                if not args.dry_run:
                    updates.append((new_text, translation, book, chapter, verse))

        if not args.dry_run and updates:
            conn.executemany(
                'UPDATE bible_translations SET text = ? '
                'WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?',
                updates,
            )
            conn.commit()
            print(f'  Wrote {len(updates):,} verse updates')

        print(f'  Verses checked: {t_verses:,} | Tags added: {t_added:,}')
        grand_added += t_added

    conn.close()
    print(f'\nTotal tags added: {grand_added:,}')


if __name__ == '__main__':
    main()
