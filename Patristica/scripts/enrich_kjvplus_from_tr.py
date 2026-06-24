"""
Fill missing Strongs tags in KJV+ by cross-referencing TR+ (greek_words_tr).

Strategy:
  For each NT verse, find Strongs numbers present in TR+ that are completely
  absent from the KJV+ verse AND appear exactly once in TR+ (unique words —
  excludes articles, particles, conjunctions that repeat). Use proportional
  position mapping + ±1 window to find a suitable untagged KJV+ word.

Safety rules (all must hold to assign):
  1. Strongs completely absent from the KJV+ verse
  2. Strongs appears exactly ONCE in TR+ for this verse (unique — filters out
     G3588 articles, G2532 conjunctions, etc. that appear many times)
  3. Target word starts with uppercase AND is not the first content word in the
     verse (mid-sentence proper names, "Lord", "God", "Christ", etc.)
  4. Target word is completely untagged (no existing Strongs at all)
  5. Never modify or remove existing Strongs
  6. Process absent Strongs in REVERSE TR position order so the actual name
     word (later in Greek) gets priority over preceding verbs/prepositions

python3 scripts/enrich_kjvplus_from_tr.py
"""

import sqlite3
import re
import sys

DB_PATH = "assets/db/bible.db"

STRONGS_TOK = re.compile(r'^[GH]\d+$')
ITALIC_TOK  = re.compile(r'^\{[^}]+\}$')

# First letters that are uppercase purely due to sentence position, not proper nouns
# (These are common verse-opening words that happen to be capitalised.)
SENTENCE_STARTERS = {
    'for', 'and', 'but', 'now', 'so', 'then', 'when', 'where', 'thus',
    'after', 'before', 'therefore', 'wherefore', 'moreover', 'furthermore',
    'also', 'yet', 'still', 'again', 'behold', 'lo', 'verily', 'truly',
    'in', 'at', 'on', 'of', 'to', 'the', 'a', 'an', 'it', 'he', 'she',
    'they', 'we', 'i', 'this', 'that', 'these', 'those', 'all', 'there',
    'here', 'if', 'though', 'because', 'since', 'until', 'while', 'even',
    'as', 'with', 'by', 'from', 'through', 'upon', 'unto',
}

NT_BOOKS = [
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
    '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians',
    'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
    '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter',
    '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation',
]


def norm_strongs(s: str) -> str:
    """Strip leading zeros: G0435 -> G435"""
    return re.sub(r'^([GH])0*(\d+)$', lambda m: m.group(1) + m.group(2), s)


def parse_kjvplus(text: str) -> list[dict]:
    """
    Parse KJV+ text into token list:
      {'surface': str, 'strongs': [str], 'italic': bool, 'passthrough': bool}
    """
    tokens = []
    parts = text.split(' ')
    i = 0
    while i < len(parts):
        p = parts[i]
        if not p:
            i += 1
            continue
        if p == '¶':
            tokens.append({'surface': p, 'strongs': [], 'italic': False, 'passthrough': True})
            i += 1
            continue
        if STRONGS_TOK.match(p):
            # Orphan Strongs — attach to last real word token
            for j in range(len(tokens) - 1, -1, -1):
                if not tokens[j]['passthrough']:
                    tokens[j]['strongs'].append(norm_strongs(p))
                    break
            i += 1
            continue
        is_italic = ITALIC_TOK.match(p) is not None
        tok = {'surface': p, 'strongs': [], 'italic': is_italic, 'passthrough': False}
        j = i + 1
        while j < len(parts) and STRONGS_TOK.match(parts[j]):
            tok['strongs'].append(norm_strongs(parts[j]))
            j += 1
        tokens.append(tok)
        i = j
    return tokens


def reconstruct(tokens: list[dict]) -> str:
    parts = []
    for tok in tokens:
        parts.append(tok['surface'])
        parts.extend(tok['strongs'])
    return ' '.join(parts)


def is_eligible_target(tok: dict, is_first: bool) -> bool:
    """
    A word is an eligible target for a new Strongs assignment if:
    - Not a passthrough (¶)
    - Not italic (supplied word in {})
    - Has NO existing Strongs
    - Starts with uppercase AND is not the first content word in the verse
      AND is not a common sentence-opener (so we target proper names and
      divine titles like Lord, God, Christ, Jerusalem, etc.)
    """
    if tok['passthrough'] or tok['italic']:
        return False
    if tok['strongs']:
        return False
    if is_first:
        return False
    surface = tok['surface'].lstrip('"\'(¶')
    if not surface or not surface[0].isupper():
        return False
    bare = surface.rstrip('.,;:!?()"\'').lower()
    if bare in SENTENCE_STARTERS:
        return False
    return True


def enrich_verse(kjv_text: str, tr_rows: list) -> tuple[str, int]:
    """
    Returns (updated_text, tags_added).
    tr_rows: list of (position, normalised_strongs) sorted by position.
    """
    tokens = parse_kjvplus(kjv_text)

    # Current KJV+ Strongs set (normalised)
    kjv_set = {s for tok in tokens for s in tok['strongs']}

    # Count Strongs occurrences in TR+ for this verse
    from collections import Counter
    tr_counts = Counter(s for _, s in tr_rows)

    # Absent Strongs: in TR+ exactly once AND completely missing from KJV+
    absent = [
        (pos, s) for pos, s in tr_rows
        if s not in kjv_set and tr_counts[s] == 1
    ]
    if not absent:
        return kjv_text, 0

    # Build candidate list: (token_index, is_first_content_word)
    first_content_seen = False
    candidates = []  # (token_idx, is_first)
    for i, tok in enumerate(tokens):
        if not tok['passthrough'] and not tok['italic']:
            candidates.append((i, not first_content_seen))
            first_content_seen = True

    n_cands = len(candidates)
    n_greek = len(tr_rows)
    tags_added = 0

    # Process in REVERSE TR position order: later-position Greek words (actual names)
    # get priority over earlier verbs/prepositions targeting the same KJV window.
    for tr_pos, strongs in sorted(absent, key=lambda x: x[0], reverse=True):
        if n_cands == 0 or n_greek == 0:
            break

        # Skip if already added this Strongs (could happen with multiple absent list entries)
        if strongs in kjv_set:
            continue

        # Proportional target index into candidates list
        target = round((tr_pos - 1) / n_greek * n_cands)
        target = max(0, min(target, n_cands - 1))

        # Search ±1 window for eligible untagged uppercase content word
        assigned = False
        for offset in [0, 1, -1]:
            idx = target + offset
            if idx < 0 or idx >= n_cands:
                continue
            tok_idx, is_first = candidates[idx]
            tok = tokens[tok_idx]
            if not tok['strongs'] and is_eligible_target(tok, is_first):
                tok['strongs'].append(strongs)
                kjv_set.add(strongs)
                tags_added += 1
                assigned = True
                break

    if tags_added == 0:
        return kjv_text, 0
    return reconstruct(tokens), tags_added


def main():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    placeholders = ','.join('?' * len(NT_BOOKS))
    kjv_rows = cur.execute(
        f"SELECT rowid, book, chapter, verse, text FROM bible_translations "
        f"WHERE translation='KJV+' AND book IN ({placeholders})",
        NT_BOOKS,
    ).fetchall()
    print(f"Loaded {len(kjv_rows):,} KJV+ NT verses")

    tr_rows_raw = cur.execute(
        "SELECT book, chapter, verse, position, strongs FROM greek_words_tr "
        "WHERE strongs IS NOT NULL AND strongs != '' "
        "ORDER BY book, chapter, verse, position"
    ).fetchall()

    from collections import defaultdict
    tr_map: dict[tuple, list] = defaultdict(list)
    for book, ch, v, pos, strongs in tr_rows_raw:
        tr_map[(book, ch, v)].append((pos, norm_strongs(strongs)))
    print(f"Loaded TR+ data for {len(tr_map):,} verses")

    updates = []
    total_tags = 0
    verses_changed = 0

    for rowid, book, ch, v, text in kjv_rows:
        tr = tr_map.get((book, ch, v), [])
        if not tr:
            continue
        new_text, added = enrich_verse(text, tr)
        if added > 0:
            updates.append((new_text, rowid))
            total_tags += added
            verses_changed += 1

    print(f"\nVerses changed: {verses_changed:,}")
    print(f"Tags added:     {total_tags:,}")

    if updates:
        cur.executemany("UPDATE bible_translations SET text=? WHERE rowid=?", updates)
        con.commit()
        print("DB updated.")

    print("\nSpot checks:")
    checks = [
        ('Luke', 19, 2,   'Zacchaeus — want G2195'),
        ('Matthew', 11, 23, 'remained — should NOT gain G3306'),
        ('John', 3, 16,   'John 3:16 — should be unchanged'),
        ('Matthew', 1, 21, 'Jesus — want G2424'),
        ('Luke', 2, 21,   'Jesus — want G2424'),
    ]
    for book, ch, v, label in checks:
        row = cur.execute(
            "SELECT text FROM bible_translations WHERE translation='KJV+' AND book=? AND chapter=? AND verse=?",
            [book, ch, v]
        ).fetchone()
        sys.stdout.buffer.write(f"\n  [{label}]\n  {row[0] if row else 'NOT FOUND'}\n".encode('utf-8'))

    con.close()


if __name__ == '__main__':
    main()
