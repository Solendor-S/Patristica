"""
enrich_kjvplus_nt.py — Fill missing Strong's tags in NT KJV+ and I_KJV+

Uses data already in bible.db — no external download needed:
  - greek_words (SBLGNT)     → which G-numbers appear in each NT verse
  - strongs_greek.kjv_usage  → which KJV words/phrases each G-number maps to

Algorithm per verse:
  1. Collect G-numbers present in verse from greek_words
  2. Build word→candidates map from strongs_greek.kjv_usage for those G-numbers
  3. For each untagged non-italic word in KJV+ / I_KJV+:
       a. Exact normalised match
       b. Stem match (4 chars for words ≥6, 5 chars for words ≥8)
          handles KJV inflections: persuad-est/-ed, believ-eth/-ed, etc.
       c. Edit-distance-1 fallback for 5–8 char words
     → assign if exactly one candidate (unambiguous)
  4. Reconstruct text and UPDATE bible_translations

Usage:
  python scripts/enrich_kjvplus_nt.py --db assets/db/bible.db
  python scripts/enrich_kjvplus_nt.py --db assets/db/bible.db --dry-run
  python scripts/enrich_kjvplus_nt.py --db assets/db/bible.db --verse "Galatians 1:10"
"""

import argparse
import re
import sqlite3

NT_BOOKS = {
    'Matthew', 'Mark', 'Luke', 'John', 'Acts',
    'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
    'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
    'Jude', 'Revelation',
}

STRONGS_TOKEN_RE = re.compile(r'^G\d+$')

# Very common words that appear in kjv_usage for many Strong's numbers —
# matching on these would almost always be ambiguous, so skip them entirely.
SKIP_WORDS = {
    'the', 'and', 'of', 'in', 'to', 'a', 'an', 'be', 'is', 'was',
    'are', 'were', 'him', 'his', 'her', 'it', 'me', 'my', 'we',
    'our', 'us', 'you', 'thy', 'thee', 'ye', 'he', 'she', 'they',
    'them', 'their', 'who', 'that', 'this', 'with', 'by', 'for',
    'from', 'at', 'on', 'or', 'as', 'up', 'so', 'but', 'not',
    'have', 'had', 'has', 'will', 'would', 'do', 'did', 'done',
}


# ── String helpers ────────────────────────────────────────────────────────────

def norm(word: str) -> str:
    """Lowercase and strip all non-alpha characters."""
    return re.sub(r'[^a-z]', '', word.lower())


def levenshtein(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    row = list(range(len(b) + 1))
    for ca in a:
        new_row = [row[0] + 1]
        for j, cb in enumerate(b):
            new_row.append(min(row[j] + (ca != cb), new_row[-1] + 1, row[j + 1] + 1))
        row = new_row
    return row[-1]


# ── KJV+ token parsing (mirrors enrich_kjvplus.py logic) ─────────────────────

def parse_kjvplus(text: str) -> list:
    """'word G1234 word2 G5678 ...' → [(word, strongs_or_None, is_italic)]"""
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


# ── kjv_usage parser ──────────────────────────────────────────────────────────

def parse_kjv_usage(kjv_usage: str) -> set:
    """
    Parse strongs_greek.kjv_usage e.g.:
      "persuade (11), trust (8), obey (7), have confidence (4), ..."

    Returns set of normalised words extracted from every phrase.
    For multi-word phrases ("have confidence") we add every individual word
    so matching works on either component.  Very short or skip words are excluded.
    """
    if not kjv_usage:
        return set()
    words: set = set()
    # split on ", " boundary before a letter (avoids splitting inside phrases)
    entries = re.split(r',\s*(?=[a-zA-Z])', kjv_usage)
    for entry in entries:
        # strip trailing count "(n)"
        phrase = re.sub(r'\s*\(\d+\)\s*$', '', entry).strip()
        for w in phrase.split():
            n = norm(w)
            if len(n) >= 3 and n not in SKIP_WORDS:
                words.add(n)
    return words


# ── Candidate builder ─────────────────────────────────────────────────────────

def build_verse_candidates(strongs_nums: set, strongs_lookup: dict) -> dict:
    """
    norm_word → [G-numbers] for exactly the Strong's numbers in this verse.
    """
    candidates: dict = {}
    for g in strongs_nums:
        for w in strongs_lookup.get(g, set()):
            candidates.setdefault(w, [])
            if g not in candidates[w]:
                candidates[w].append(g)
    return candidates


# ── Fuzzy matcher ─────────────────────────────────────────────────────────────

def find_candidate(word: str, candidates: dict) -> str | None:
    """
    Return the single unambiguous G-number for word, or None.

    Priority:
      1. Exact normalised match
      2. Stem-4 match (words ≥ 6 chars) — handles -ed / -eth / -est suffixes
      3. Stem-5 match (words ≥ 8 chars) — longer words, tighter stem
      4. Edit-distance-1 (words 5–8 chars) — handles single-char KJV variants
    """
    n = norm(word)
    if not n or len(n) < 3 or n in SKIP_WORDS:
        return None

    # 1. Exact
    exact = candidates.get(n, [])
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        return None  # ambiguous

    # 2. Stem-4 (≥ 6 char words)
    if len(n) >= 6:
        s4 = n[:4]
        stem4_hits: set = set()
        for cw, gs in candidates.items():
            if len(cw) >= 4 and cw[:4] == s4:
                stem4_hits.update(gs)
        if len(stem4_hits) == 1:
            return next(iter(stem4_hits))
        if len(stem4_hits) > 1:
            # Ambiguous at stem-4; try stem-5 before giving up
            if len(n) >= 8:
                s5 = n[:5]
                stem5_hits: set = set()
                for cw, gs in candidates.items():
                    if len(cw) >= 5 and cw[:5] == s5:
                        stem5_hits.update(gs)
                if len(stem5_hits) == 1:
                    return next(iter(stem5_hits))
            return None

    # 3. Edit-distance-1 (5–8 char words not matched above)
    if 5 <= len(n) <= 8:
        edit_hits: set = set()
        for cw, gs in candidates.items():
            if abs(len(cw) - len(n)) <= 1 and levenshtein(n, cw) == 1:
                edit_hits.update(gs)
        if len(edit_hits) == 1:
            return next(iter(edit_hits))

    return None


# ── Token enricher ────────────────────────────────────────────────────────────

def enrich_tokens(tokens: list, candidates: dict) -> tuple:
    """Fill untagged non-italic tokens where exactly one candidate exists."""
    new_tokens = []
    filled = 0
    for word, strongs, italic in tokens:
        if strongs is None and not italic:
            g = find_candidate(word, candidates)
            if g:
                new_tokens.append((word, g, italic))
                filled += 1
                continue
        new_tokens.append((word, strongs, italic))
    return new_tokens, filled


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_verse_arg(s: str):
    m = re.match(r'^(.+?)\s+(\d+):(\d+)$', s.strip())
    if not m:
        raise ValueError(f"Expected 'Book Chapter:Verse', got: {s!r}")
    return m.group(1), int(m.group(2)), int(m.group(3))


def main():
    ap = argparse.ArgumentParser(
        description='Fill missing NT Strong\'s tags in KJV+ / I_KJV+ using internal DB data'
    )
    ap.add_argument('--db',      required=True, help='Path to bible.db')
    ap.add_argument('--dry-run', action='store_true', help='Show changes without writing')
    ap.add_argument('--verse',   help='Process single verse, e.g. "Galatians 1:10"')
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)

    # ── Load strongs_greek: G-number → set of normalised KJV words ──────────
    print('Loading strongs_greek...')
    strongs_lookup: dict = {}
    for number, kjv_usage in conn.execute('SELECT number, kjv_usage FROM strongs_greek'):
        words = parse_kjv_usage(kjv_usage or '')
        if words:
            strongs_lookup[number] = words
    print(f'  {len(strongs_lookup):,} entries loaded')

    # ── Load greek_words: (book, chapter, verse) → set of G-numbers ─────────
    print('Loading greek_words (SBLGNT)...')
    verse_strongs: dict = {}
    for book, ch, v, g in conn.execute(
        'SELECT book, chapter, verse, strongs FROM greek_words WHERE strongs IS NOT NULL'
    ):
        verse_strongs.setdefault((book, ch, v), set()).add(g)
    print(f'  {len(verse_strongs):,} verses with Greek data')

    if args.verse:
        book_arg, ch_arg, v_arg = parse_verse_arg(args.verse)
        filter_sql   = f" AND book = ? AND chapter = ? AND verse = ?"
        filter_params: tuple = (book_arg, ch_arg, v_arg)
    else:
        filter_sql   = ''
        filter_params = ()

    grand_verses = 0
    grand_filled = 0

    for translation in ('KJV+', 'I_KJV+'):
        print(f'\nProcessing {translation}...')
        rows = conn.execute(
            f"SELECT book, chapter, verse, text FROM bible_translations "
            f"WHERE translation = ?{filter_sql} ORDER BY book, chapter, verse",
            (translation, *filter_params)
        ).fetchall()

        updates = []
        t_verses = t_filled = 0

        for book, chapter, verse, text in rows:
            if book not in NT_BOOKS:
                continue

            strongs_in_verse = verse_strongs.get((book, chapter, verse))
            if not strongs_in_verse:
                continue

            candidates  = build_verse_candidates(strongs_in_verse, strongs_lookup)
            tokens      = parse_kjvplus(text)
            new_tokens, filled = enrich_tokens(tokens, candidates)

            t_verses += 1
            t_filled += filled

            if filled > 0:
                new_text = reconstruct(new_tokens)
                if args.verse or args.dry_run:
                    print(f'  {book} {chapter}:{verse} — {filled} tag(s) filled')
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

        print(f'  Verses checked: {t_verses:,} | Tags filled: {t_filled:,}')
        grand_verses += t_verses
        grand_filled += t_filled

    conn.close()
    print(f'\nTotal — Verses touched: {grand_verses:,} | Tags filled: {grand_filled:,}')


if __name__ == '__main__':
    main()
