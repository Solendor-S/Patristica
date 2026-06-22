"""
Extract Brenton LXX (E_LXX) inline notes from verse text and store in elxx_notes table.

Brenton embedded cross-references and Greek/Hebrew notes directly in verse text
using the format: + {ch}:{v} {note}. {verse text continues}

This script:
  1. Parses all E_LXX verses for + N:M patterns
  2. Extracts the note text using a heuristic state-machine parser
  3. Removes the note from the verse text and stores cleaned text
  4. Stores notes in elxx_notes (book, chapter, verse, word_index, note)
  5. word_index = 0-based position (in cleaned text) of the word AFTER which [fn] appears

Run from project root: python3 scripts/import_elxx_notes.py
"""

import sqlite3
import re

DB_PATH = "assets/db/bible.db"

# These abbreviations have their OWN period (e.g. "Gr.") and are part of the note
PERIOD_ABBREVS = {
    'Gr', 'Heb', 'Lit', 'Aram', 'Alex', 'Vat', 'Comp', 'Syr', 'Copt',
    'Mat', 'Mk', 'Mark', 'Lk', 'Luke', 'Jn', 'John', 'Acts', 'Rom',
    'Cor', 'Gal', 'Eph', 'Phil', 'Col', 'Thes', 'Tim', 'Tit', 'Phlm',
    'Jas', 'Pet', 'Rev', 'Gen', 'Ex', 'Lev', 'Num', 'Dt', 'Deu',
    'Jos', 'Josh', 'Judg', 'Ruth', 'Sam', 'Kgs', 'Chr', 'Ezr', 'Neh',
    'Est', 'Job', 'Psa', 'Ps', 'Prov', 'Ecc', 'Isa', 'Jer', 'Lam',
    'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jon', 'Mic', 'Nah',
    'Hab', 'Zeph', 'Hag', 'Zech', 'Mal', 'Prof', 'Gram',
}

# After these abbreviations, skip ONE more content-ending period before terminating.
# e.g. "Gr. made." — "Gr." is the abbrev, "made." is the content, note ends there.
SKIP_ONE_CONTENT = {'Gr', 'Lit', 'Aram', 'q', 'sc', 'viz', 'i'}

# Always cause note continuation regardless of context
GENERAL_CONTINUERS = {
    'or', 'with', 'which', 'as', 'cf', 'Comp', 'Compare',
    # Scholarly verbs after codex names (Alex. agrees / renders / reads / omits)
    'agrees', 'renders', 'reads', 'omits', 'inserts', 'adds', 'says', 'gives',
}

# Only cause continuation when the PRECEDING word is a PERIOD_ABBREV
# (e.g. "Alex. The Vat." or "Heb. and Alex." but NOT "agrees. and all")
ABBREV_ONLY_CONTINUERS = {'and', 'The', 'But'}


def is_note_continuation(word: str, after_abbrev: bool = False) -> bool:
    clean = word.rstrip('.,;:!?')
    return (
        clean in PERIOD_ABBREVS
        or clean in GENERAL_CONTINUERS
        or (after_abbrev and clean in ABBREV_ONLY_CONTINUERS)
        or clean.isdigit()
        or bool(re.match(r'^\d', clean))
        or len(clean) <= 1
    )


def find_note_end(text: str) -> int:
    """
    Given the text that follows '+ N:M ', returns the index just after the
    note's terminating period (before the verse continuation).
    """
    periods = list(re.finditer(r'\.', text))
    skip_next = False

    for pi, m in enumerate(periods):
        dot_pos = m.start()
        after = text[dot_pos + 1:]

        # Period not followed by space → abbreviation dot or in-word period
        if not after or after[0] != ' ':
            continue

        after_stripped = after[1:].lstrip()
        next_word = after_stripped.split()[0] if after_stripped.strip() else ''

        if skip_next:
            skip_next = False
            # This is the content period after a SKIP_ONE_CONTENT abbreviation
            return dot_pos + 1

        # Identify the word that precedes this period
        before_text = text[:dot_pos]
        before_word = before_text.split()[-1].rstrip('.,;:') if before_text.strip() else ''

        if before_word in SKIP_ONE_CONTENT:
            # e.g. "Gr." → skip one more period (the content word's period)
            skip_next = True
            continue

        if before_word in PERIOD_ABBREVS:
            # "Heb. and...", "Alex. The Vat.", "Mat. 3...." — after_abbrev=True
            # so ABBREV_ONLY_CONTINUERS (and, The, But) are allowed here
            if is_note_continuation(next_word, after_abbrev=True) or not next_word:
                continue
            return dot_pos + 1

        # General case: period after a regular word or digit
        if not next_word or not is_note_continuation(next_word, after_abbrev=False):
            return dot_pos + 1

    # Fallback: take up to last period in the text
    if periods:
        return periods[-1].start() + 1
    return len(text)


NOTE_SPLIT_RE = re.compile(r'\+\s*\d+:\d+\s+')


def parse_verse(text: str) -> tuple[str, list[tuple[int, str]]]:
    """
    Returns (cleaned_verse_text, [(word_index, note_text), ...]).
    word_index is 0-based index in the CLEANED text of the word after which [fn] appears.
    """
    parts = NOTE_SPLIT_RE.split(text)
    # Find all note markers and their positions in the original text
    markers = list(NOTE_SPLIT_RE.finditer(text))

    if not markers:
        return text, []

    clean_parts: list[str] = [parts[0]]
    notes: list[tuple[int, str]] = []
    word_count_so_far = 0

    for i, m in enumerate(markers):
        prefix = parts[i]  # text before this marker
        note_and_rest = parts[i + 1]  # text after the marker (note + verse continuation)

        end_idx = find_note_end(note_and_rest)
        note_text = note_and_rest[:end_idx].strip().rstrip('.')
        rest = note_and_rest[end_idx:].lstrip()

        # word_index = index of the LAST word of the prefix in cleaned text
        prefix_words = prefix.split()
        # Running word count includes all clean_parts so far
        all_clean_so_far = ''.join(clean_parts)
        words_so_far = len(all_clean_so_far.split()) if all_clean_so_far.strip() else 0
        word_index = max(0, words_so_far - 1) if words_so_far > 0 else 0

        notes.append((word_index, note_text))
        clean_parts.append(rest)

    cleaned = ' '.join(' '.join(p.split()) for p in clean_parts if p.strip())
    # Normalise whitespace
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()

    return cleaned, notes


def main() -> None:
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    # Fetch all E_LXX verses that have inline notes (+ may appear at start or mid-verse)
    rows = cur.execute(
        "SELECT book, chapter, verse, text FROM bible_translations "
        "WHERE translation='E_LXX' AND (text LIKE '% + %' OR text LIKE '+ %')"
    ).fetchall()
    print(f"Found {len(rows)} E_LXX verses with inline notes")

    # Create elxx_notes table
    cur.execute("DROP TABLE IF EXISTS elxx_notes")
    cur.execute("""
        CREATE TABLE elxx_notes (
            id         INTEGER PRIMARY KEY,
            book       TEXT    NOT NULL,
            chapter    INTEGER NOT NULL,
            verse      INTEGER NOT NULL,
            word_index INTEGER NOT NULL,
            note       TEXT    NOT NULL
        )
    """)
    cur.execute("CREATE INDEX idx_elxx_notes ON elxx_notes(book, chapter, verse)")

    note_records: list[tuple] = []
    verse_updates: list[tuple] = []
    total_notes = 0

    for book, chapter, verse, text in rows:
        cleaned, notes = parse_verse(text)
        if not notes:
            continue

        verse_updates.append((cleaned, 'E_LXX', book, chapter, verse))
        for word_index, note_text in notes:
            note_records.append((book, chapter, verse, word_index, note_text))
            total_notes += 1

    cur.executemany(
        "INSERT INTO elxx_notes (book, chapter, verse, word_index, note) VALUES (?,?,?,?,?)",
        note_records,
    )
    cur.executemany(
        "UPDATE bible_translations SET text=? WHERE translation=? AND book=? AND chapter=? AND verse=?",
        verse_updates,
    )

    con.commit()
    con.close()

    print(f"Extracted {total_notes} notes from {len(verse_updates)} verses")
    print("Done. Copy assets/db/bible.db to android/app/src/main/assets/bible.db")


if __name__ == "__main__":
    main()
