"""
Extract OT quotation word spans from NT verses using the Levinsohn OT Quotation dataset
and store in ot_quote_spans.

Strategy:
  1. Download Levinsohn_OT_quotation.csv from OpenGNT — 691 rows of scholarly,
     word-level Greek NT quotation spans (book_num, start_ch, start_v, start_word,
     end_ch, end_v, end_word).
  2. Expand any cross-verse spans into per-verse entries.
  3. Group by (book, chapter, verse) and merge overlapping/adjacent Greek word spans.
  4. Map Greek word positions → KJV word positions proportionally:
       kjv_start = round((greek_start - 1) / greek_count * kjv_count)
       kjv_end   = round(greek_end   / greek_count * kjv_count)
  5. Clamp to [0, len(kjv_words)] and write to ot_quote_spans.

python3 scripts/import_ot_quote_spans.py
"""

import sqlite3
import re
import urllib.request

DB_PATH = "assets/db/bible.db"
CSV_URL = "https://raw.githubusercontent.com/eliranwong/OpenGNT/master/mapping_LevinsohnGNTDF/Levinsohn_OT_quotation.csv"

BOOK_NUM_MAP = {
    40: 'Matthew',         41: 'Mark',            42: 'Luke',           43: 'John',
    44: 'Acts',            45: 'Romans',           46: '1 Corinthians',  47: '2 Corinthians',
    48: 'Galatians',       49: 'Ephesians',        50: 'Philippians',    51: 'Colossians',
    52: '1 Thessalonians', 53: '2 Thessalonians',  54: '1 Timothy',      55: '2 Timothy',
    56: 'Titus',           57: 'Philemon',         58: 'Hebrews',        59: 'James',
    60: '1 Peter',         61: '2 Peter',          62: '1 John',         63: '2 John',
    64: '3 John',          65: 'Jude',             66: 'Revelation',
}

USFM_INLINE_RE = re.compile(r'\\[+]?\w+\*?\s*')
USFM_WORD_RE   = re.compile(r'\\[+]?w\b([^|\\]*)(?:\|[^\\]*)?\\[+]?w\*')


def strip_usfm(text: str) -> str:
    text = USFM_WORD_RE.sub(lambda m: m.group(1), text)
    text = USFM_INLINE_RE.sub('', text)
    return text.strip()


def kjv_word_count(text: str) -> list[str]:
    return [w for w in strip_usfm(text).split() if w]


# Words that signal the end of a narrative intro phrase and the start of the actual quote
_INTRO_TERMINATORS = {'saying', 'saith', 'written', 'write', 'said', 'saying,', 'saith,', 'written,'}

def advance_past_intro(words: list[str], start: int, end: int) -> int:
    """If the first few words of the span are an intro phrase, advance past them."""
    limit = min(start + 5, end)
    for i in range(start, limit):
        w = words[i].lower().strip('.,;:{}')
        if w in _INTRO_TERMINATORS:
            new = i + 1
            if new < end:
                return new
    return start


def merge_spans(spans: list[tuple[int, int]], gap: int = 2) -> list[tuple[int, int]]:
    """Merge overlapping or near-adjacent (start, end) integer spans. 1-indexed, end inclusive.
    Spans separated by <= gap words are merged (bridges single filler words like 'for'/'and')."""
    if not spans:
        return []
    sorted_spans = sorted(spans)
    merged = [sorted_spans[0]]
    for s, e in sorted_spans[1:]:
        if s <= merged[-1][1] + gap:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    return merged


def expand_cross_verse_span(book: str, sc: int, sv: int, sw: int, ec: int, ev: int, ew: int,
                             greek_count_map: dict) -> list[tuple]:
    """
    Expand a span that crosses verse boundaries into a list of per-verse
    (book, chapter, verse, greek_start, greek_end) tuples.
    greek_start/end are 1-indexed, end is inclusive.
    """
    result = []
    if sc != ec:
        # Cross-chapter — unlikely in this dataset, handle by clamping to start verse only
        cnt = greek_count_map.get((book, sc, sv), 999)
        result.append((book, sc, sv, sw, cnt))
        return result

    for v in range(sv, ev + 1):
        cnt = greek_count_map.get((book, sc, v), 999)
        if v == sv:
            result.append((book, sc, v, sw, cnt))
        elif v == ev:
            result.append((book, sc, v, 1, ew))
        else:
            result.append((book, sc, v, 1, cnt))
    return result


def main() -> None:
    print(f"Downloading {CSV_URL} ...")
    req = urllib.request.Request(CSV_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read().decode('utf-8')
    lines = raw.splitlines()
    print(f"  Downloaded {len(lines)} rows")

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Build greek word count map: (book, chapter, verse) -> count
    print("Loading Greek word counts...")
    greek_rows = cur.execute(
        "SELECT book, chapter, verse, COUNT(*) FROM greek_words GROUP BY book, chapter, verse"
    ).fetchall()
    greek_count_map: dict[tuple, int] = {(b, ch, v): cnt for b, ch, v, cnt in greek_rows}
    print(f"  {len(greek_count_map):,} NT verse word counts loaded")

    # Load KJV verse texts
    print("Loading KJV verse texts...")
    kjv_rows = cur.execute(
        "SELECT book, chapter, verse, text FROM bible_verses"
    ).fetchall()
    kjv_map: dict[tuple, list[str]] = {
        (b, ch, v): kjv_word_count(text) for b, ch, v, text in kjv_rows
    }
    print(f"  {len(kjv_map):,} KJV verses loaded")

    # Parse CSV into per-verse (book, ch, v, greek_start, greek_end) tuples
    # CSV columns: book_num, start_ch, start_v, start_word, end_ch, end_v, end_word, [xml...]
    print("\nParsing Levinsohn CSV...")
    raw_entries: list[tuple] = []  # (book, ch, v, greek_start_1idx, greek_end_1idx_inclusive)
    skipped = 0

    for line in lines:
        line = line.lstrip('﻿').strip()
        if not line:
            continue
        parts = line.split('\t')
        if len(parts) < 7:
            continue
        try:
            book_num = int(parts[0])
            sc, sv, sw = int(parts[1]), int(parts[2]), int(parts[3])
            ec, ev, ew = int(parts[4]), int(parts[5]), int(parts[6])
        except ValueError:
            skipped += 1
            continue

        book = BOOK_NUM_MAP.get(book_num)
        if not book:
            skipped += 1
            continue

        if sc == ec and sv == ev:
            raw_entries.append((book, sc, sv, sw, ew))
        else:
            expanded = expand_cross_verse_span(book, sc, sv, sw, ec, ev, ew, greek_count_map)
            raw_entries.extend(expanded)

    print(f"  {len(raw_entries)} per-verse entries (after cross-verse expansion), {skipped} skipped")

    # Group by (book, ch, v), collect all (start, end) Greek word spans per verse
    from collections import defaultdict
    grouped: dict[tuple, list[tuple[int, int]]] = defaultdict(list)
    for book, ch, v, gs, ge in raw_entries:
        grouped[(book, ch, v)].append((gs, ge))

    # Merge spans per verse, then map to KJV positions
    spans: list[tuple] = []
    no_greek = 0
    no_kjv = 0
    mapped = 0

    for (book, ch, v), greek_spans in grouped.items():
        merged = merge_spans(greek_spans)

        greek_count = greek_count_map.get((book, ch, v))
        if greek_count is None or greek_count == 0:
            no_greek += 1
            continue

        kjv_words = kjv_map.get((book, ch, v))
        if not kjv_words:
            no_kjv += 1
            continue
        kjv_count = len(kjv_words)

        for gs, ge in merged:
            # gs and ge are 1-indexed, ge is inclusive
            kjv_start = round((gs - 1) / greek_count * kjv_count)
            kjv_end   = round(ge       / greek_count * kjv_count)
            # Clamp
            kjv_start = max(0, min(kjv_start, kjv_count))
            kjv_end   = max(0, min(kjv_end,   kjv_count))
            if kjv_end <= kjv_start:
                kjv_end = min(kjv_start + 1, kjv_count)
            # Advance start past intro phrases like "saying," / "it is written,"
            kjv_start = advance_past_intro(kjv_words, kjv_start, kjv_end)
            spans.append((book, ch, v, kjv_start, kjv_end))
            mapped += 1

    print(f"  Mapped: {mapped}  |  No greek data: {no_greek}  |  No KJV data: {no_kjv}")

    # Verify key examples
    print("\nVerification:")
    checks = [
        ('Matthew', 3, 3,  "voice of one crying"),
        ('Matthew', 8, 17, "Himself took our infirmities"),
        ('Romans',  10, 13, None),
        ('Romans',  10, 15, "How beautiful are the feet"),
    ]
    for book, ch, v, expected in checks:
        entry = [(ws, we) for b, c, vv, ws, we in spans if b == book and c == ch and vv == v]
        kjv_words = kjv_map.get((book, ch, v), [])
        if entry:
            ws, we = entry[0]
            quoted = ' '.join(kjv_words[ws:we])
            print(f"  {book} {ch}:{v} [{ws}:{we}] -> \"{quoted[:60]}\"")
        else:
            print(f"  {book} {ch}:{v} -> NOT FOUND")

    # Write to DB
    print("\nWriting to database...")
    cur.execute("DROP TABLE IF EXISTS ot_quote_spans")
    cur.execute("""
        CREATE TABLE ot_quote_spans (
            id         INTEGER PRIMARY KEY,
            book       TEXT    NOT NULL,
            chapter    INTEGER NOT NULL,
            verse      INTEGER NOT NULL,
            word_start INTEGER NOT NULL,
            word_end   INTEGER NOT NULL
        )
    """)
    cur.execute("CREATE INDEX idx_otqs ON ot_quote_spans(book, chapter, verse)")
    cur.executemany(
        "INSERT INTO ot_quote_spans (book, chapter, verse, word_start, word_end) VALUES (?,?,?,?,?)",
        spans,
    )
    con.commit()
    con.close()

    print(f"Total spans inserted: {len(spans)}")
    print("\nNext steps:")
    print("  1. Copy assets/db/bible.db to android/app/src/main/assets/bible.db")
    print("  2. Bump DB_SCHEMA_VERSION in src/db/provider.tsx")


if __name__ == "__main__":
    main()
