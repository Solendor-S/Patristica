"""
enrich_kjvplus_ot_wlc.py — Fill missing Strong's tags in OT KJV+ and I_KJV+

Uses data already in bible.db — no external download needed:
  - wlc_words                 → which H-numbers appear in each OT verse
  - strongs_hebrew.kjv_usage  → which KJV words/phrases each H-number maps to

Algorithm per verse (mirrors enrich_kjvplus_nt.py exactly, adapted for OT):
  1. Collect H-numbers present in verse from wlc_words
  2. Build word→candidates map from strongs_hebrew.kjv_usage for those H-numbers
  3. For each untagged non-italic word in KJV+ / I_KJV+:
       a. Exact normalised match
       b. Stem match (4 chars for words ≥6, 5 chars for words ≥8)
          handles KJV inflections: sanctifi-ed/-eth, behold-eth/-est, etc.
       c. Edit-distance-1 fallback for 5–8 char words
     → assign if exactly one candidate (unambiguous)
  4. Reconstruct text and UPDATE bible_translations

Why verse-constrained is safe:
  Only H-numbers that actually appear in the verse are considered.  This
  eliminates nearly all false positives that plague global kjv_usage matching,
  since common words (servants, king, land) only match if their H-number is
  genuinely in that verse.

Usage:
  python scripts/enrich_kjvplus_ot_wlc.py --db assets/db/bible.db
  python scripts/enrich_kjvplus_ot_wlc.py --db assets/db/bible.db --dry-run
  python scripts/enrich_kjvplus_ot_wlc.py --db assets/db/bible.db --verse "1 Samuel 16:21"
"""

import argparse
import re
import sqlite3

OT_BOOKS = {
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
    '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
    'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
    'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
    'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
    'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
    'Zechariah', 'Malachi',
}

# Matches H-number tokens (with or without leading zeros)
STRONGS_TOKEN_RE = re.compile(r'^[GH]\d+$')

# Strip leading zeros for consistent comparison: H0430 → H430
STRONGS_NORM_RE = re.compile(r'^([GH])0*(\d+)')
def norm_strongs(s: str) -> str:
    m = STRONGS_NORM_RE.match(s or '')
    return (m.group(1) + m.group(2)) if m else s

# Very common words that appear in kjv_usage for many H-numbers —
# matching on these would almost always be ambiguous, so skip them entirely.
SKIP_WORDS = {
    'the', 'and', 'of', 'in', 'to', 'a', 'an', 'be', 'is', 'was',
    'are', 'were', 'him', 'his', 'her', 'it', 'me', 'my', 'we',
    'our', 'us', 'you', 'thy', 'thee', 'ye', 'he', 'she', 'they',
    'them', 'their', 'who', 'that', 'this', 'with', 'by', 'for',
    'from', 'at', 'on', 'or', 'as', 'up', 'so', 'but', 'not',
    'have', 'had', 'has', 'will', 'would', 'do', 'did', 'done',
    # Extra OT function words worth skipping (very high ambiguity in Hebrew)
    'said', 'unto', 'upon', 'also', 'even', 'then', 'thus',
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


# ── KJV+ token parsing ────────────────────────────────────────────────────────

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


# ── kjv_usage parser ──────────────────────────────────────────────────────────

def parse_kjv_usage(kjv_usage: str) -> set:
    """
    Parse strongs_hebrew.kjv_usage e.g.:
      "LORD (6220), God (2606), lord (209), ..."

    Returns set of normalised words from every phrase.
    Multi-word phrases ("put away") add every individual word.
    """
    if not kjv_usage:
        return set()
    words: set = set()
    entries = re.split(r',\s*(?=[a-zA-Z])', kjv_usage)
    for entry in entries:
        phrase = re.sub(r'\s*\(\d+\)\s*$', '', entry).strip()
        for w in phrase.split():
            n = norm(w)
            if len(n) >= 3 and n not in SKIP_WORDS:
                words.add(n)
    return words


# ── Candidate builder ─────────────────────────────────────────────────────────

def build_verse_candidates(strongs_nums: set, strongs_lookup: dict) -> dict:
    """norm_word → [H-numbers] for exactly the Strong's numbers in this verse."""
    candidates: dict = {}
    for h in strongs_nums:
        for w in strongs_lookup.get(h, set()):
            candidates.setdefault(w, [])
            if h not in candidates[w]:
                candidates[w].append(h)
    return candidates


# ── Fuzzy matcher ─────────────────────────────────────────────────────────────

def find_candidate(word: str, candidates: dict) -> str | None:
    """
    Return the single unambiguous H-number for word, or None.

    Priority:
      1. Exact normalised match
      2. Stem-4 (words ≥ 6 chars) — handles -ed / -eth / -est / -ing suffixes
      3. Stem-5 (words ≥ 8 chars) — tighter stem for longer words
      4. Edit-distance-1 (words 5–8 chars) — single-char KJV variants
    """
    n = norm(word)
    if not n or len(n) < 3 or n in SKIP_WORDS:
        return None

    # 1. Exact
    exact = candidates.get(n, [])
    if len(exact) == 1:
        return exact[0]
    if len(exact) > 1:
        return None

    # 2. Stem-4 (≥ 6 char words)
    if len(n) >= 6:
        s4 = n[:4]
        stem4_hits: set = set()
        for cw, hs in candidates.items():
            if len(cw) >= 4 and cw[:4] == s4:
                stem4_hits.update(hs)
        if len(stem4_hits) == 1:
            return next(iter(stem4_hits))
        if len(stem4_hits) > 1:
            if len(n) >= 8:
                s5 = n[:5]
                stem5_hits: set = set()
                for cw, hs in candidates.items():
                    if len(cw) >= 5 and cw[:5] == s5:
                        stem5_hits.update(hs)
                if len(stem5_hits) == 1:
                    return next(iter(stem5_hits))
            return None

    # 3. Edit-distance-1 (5–8 char words not matched above)
    if 5 <= len(n) <= 8:
        edit_hits: set = set()
        for cw, hs in candidates.items():
            if abs(len(cw) - len(n)) <= 1 and levenshtein(n, cw) == 1:
                edit_hits.update(hs)
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
            h = find_candidate(word, candidates)
            if h:
                new_tokens.append((word, h, italic))
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
        description='Fill missing OT Strong\'s tags in KJV+ / I_KJV+ using WLC verse data'
    )
    ap.add_argument('--db',      required=True, help='Path to bible.db')
    ap.add_argument('--dry-run', action='store_true', help='Show stats without writing')
    ap.add_argument('--verse',   help='Process single verse, e.g. "1 Samuel 16:21"')
    args = ap.parse_args()

    conn = sqlite3.connect(args.db)

    # ── Load strongs_hebrew: H-number (normalised) → set of KJV words ────────
    print('Loading strongs_hebrew...')
    strongs_lookup: dict = {}
    for number, kjv_usage in conn.execute('SELECT number, kjv_usage FROM strongs_hebrew'):
        words = parse_kjv_usage(kjv_usage or '')
        if words:
            strongs_lookup[norm_strongs(number)] = words
    print(f'  {len(strongs_lookup):,} entries loaded')

    # ── Load wlc_words: (book, chapter, verse) → set of normalised H-numbers ─
    print('Loading wlc_words...')
    verse_strongs: dict = {}
    for book, ch, v, h in conn.execute(
        'SELECT book, chapter, verse, strongs FROM wlc_words WHERE strongs IS NOT NULL'
    ):
        verse_strongs.setdefault((book, ch, v), set()).add(norm_strongs(h))
    print(f'  {len(verse_strongs):,} verses with WLC data')

    if args.verse:
        book_arg, ch_arg, v_arg = parse_verse_arg(args.verse)
        filter_sql    = ' AND book = ? AND chapter = ? AND verse = ?'
        filter_params: tuple = (book_arg, ch_arg, v_arg)
    else:
        filter_sql    = ''
        filter_params = ()

    grand_verses = 0
    grand_filled = 0

    for translation in ('KJV+', 'I_KJV+'):
        print(f'\nProcessing {translation}...')
        rows = conn.execute(
            f'SELECT book, chapter, verse, text FROM bible_translations '
            f'WHERE translation = ?{filter_sql} ORDER BY book, chapter, verse',
            (translation, *filter_params)
        ).fetchall()

        updates = []
        t_verses = t_filled = 0

        for book, chapter, verse, text in rows:
            if book not in OT_BOOKS:
                continue

            strongs_in_verse = verse_strongs.get((book, chapter, verse))
            if not strongs_in_verse:
                continue

            candidates        = build_verse_candidates(strongs_in_verse, strongs_lookup)
            tokens            = parse_kjvplus(text)
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
