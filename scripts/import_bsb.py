"""
Import the Berean Standard Bible (BSB) with footnote annotations.

Source: https://bereanbible.com/bsb_tables.tsv

Creates / replaces:
  bible_translations  — BSB row per verse (clean reconstructed text)
  bsb_footnotes       — (book, chapter, verse, word_index, word, footnote)
                        word_index is 0-based position among non-skipped words

Run from project root: python3 scripts/import_bsb.py
"""

import sqlite3
import csv
import io
import re
import urllib.request
from collections import defaultdict

DB_PATH = "assets/db/bible.db"
TSV_URL = "https://bereanbible.com/bsb_tables.tsv"

# Words that represent untranslated original-language particles — omit from text
SKIP_WORDS = {"-", "vvv", ""}


def fetch_tsv() -> list[dict]:
    print(f"Downloading {TSV_URL} ...")
    req = urllib.request.Request(TSV_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read().decode("utf-8")
    return list(csv.DictReader(data.splitlines(), delimiter="\t"))


def parse_verse_id(verse_id: str) -> tuple[str, int, int] | None:
    """'Matthew 21:5' → ('Matthew', 21, 5). Returns None if unparseable."""
    m = re.match(r"^(.+?)\s+(\d+):(\d+)$", verse_id.strip())
    if not m:
        return None
    return m.group(1), int(m.group(2)), int(m.group(3))


def build_verses(rows: list[dict]) -> tuple[
    list[tuple],   # bible_translations records
    list[tuple],   # bsb_footnotes records
]:
    # Propagate VerseId forward (only set on first word of each verse)
    current_verse_id = ""
    for r in rows:
        vid = r["VerseId"].strip()
        if vid:
            current_verse_id = vid
        r["_verse"] = current_verse_id

    # Group rows by verse
    verse_rows: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        verse_rows[r["_verse"]].append(r)

    translation_records = []
    footnote_records = []
    skipped_verses = 0

    for verse_id, vrows in verse_rows.items():
        parsed = parse_verse_id(verse_id)
        if not parsed:
            skipped_verses += 1
            continue
        book, chapter, verse = parsed

        # Sort by BSB Sort (global word order)
        vrows_sorted = sorted(vrows, key=lambda r: int(r["BSB Sort"]) if r["BSB Sort"].strip().isdigit() else 0)

        words_out = []      # (display_text, footnote_or_empty)
        text_parts = []

        for r in vrows_sorted:
            raw_word = r[" BSB version "].strip()
            if raw_word in SKIP_WORDS:
                continue

            bq  = r.get("begQ", "").strip()
            pnc = r.get("pnc", "").strip()
            eq  = r.get("endQ", "").strip()
            fn  = r.get("footnotes", "").strip()
            # Strip HTML italics from footnotes → plain text
            fn_clean = re.sub(r"</?i>", "", fn).strip()

            display = f"{bq}{raw_word}{eq}{pnc}"
            words_out.append((display, fn_clean))
            text_parts.append(display)

        # Reconstruct verse text — join with spaces, collapse double spaces
        verse_text = re.sub(r"  +", " ", " ".join(text_parts)).strip()

        translation_records.append(("BSB", book, chapter, verse, verse_text))

        # Footnote records: word_index is the 0-based token position in the
        # space-split verse text (matching how VerseRow counts words at render time).
        # Multi-word BSB phrases (e.g. "one and only") occupy multiple tokens, so
        # we advance a cursor by len(display.split()) for each source entry.
        token_cursor = 0
        for display, fn_clean in words_out:
            display_tokens = display.split()
            if fn_clean:
                # Attach marker to the last token of the phrase
                last_token_idx = token_cursor + len(display_tokens) - 1
                bare_word = display.strip('",. ')
                footnote_records.append((book, chapter, verse, last_token_idx, bare_word, fn_clean))
            token_cursor += len(display_tokens)

    print(f"  Parsed {len(translation_records)} verses, {skipped_verses} skipped")
    print(f"  Found {len(footnote_records)} word-level footnotes")
    return translation_records, footnote_records


def create_footnotes_table(cur: sqlite3.Cursor) -> None:
    cur.execute("DROP TABLE IF EXISTS bsb_footnotes")
    cur.execute("""
        CREATE TABLE bsb_footnotes (
            id          INTEGER PRIMARY KEY,
            book        TEXT    NOT NULL,
            chapter     INTEGER NOT NULL,
            verse       INTEGER NOT NULL,
            word_index  INTEGER NOT NULL,
            word        TEXT    NOT NULL,
            footnote    TEXT    NOT NULL
        )
    """)
    cur.execute("CREATE INDEX idx_bsb_fn_verse ON bsb_footnotes(book, chapter, verse)")


def main() -> None:
    rows = fetch_tsv()

    print("Building verse texts and footnote index ...")
    translation_records, footnote_records = build_verses(rows)

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Replace BSB in bible_translations
    cur.execute("DELETE FROM bible_translations WHERE translation = 'BSB'")
    print(f"  Deleted {cur.rowcount} existing BSB rows")
    cur.executemany(
        "INSERT INTO bible_translations (translation, book, chapter, verse, text) VALUES (?,?,?,?,?)",
        translation_records,
    )
    print(f"  Inserted {len(translation_records)} BSB verse rows")

    # Create and populate bsb_footnotes
    create_footnotes_table(cur)
    cur.executemany(
        "INSERT INTO bsb_footnotes (book, chapter, verse, word_index, word, footnote) VALUES (?,?,?,?,?,?)",
        footnote_records,
    )
    print(f"  Inserted {len(footnote_records)} footnote rows")

    con.commit()
    con.close()
    print("\nDone. Copy assets/db/bible.db to android/app/src/main/assets/bible.db")


if __name__ == "__main__":
    main()
