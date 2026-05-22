"""
Import KJV+Strong's data into bible.db

Data source: github.com/luvlylavnder/bible-app-data (CC0 public domain)

Steps to get the data:
  git clone https://github.com/luvlylavnder/bible-app-data --depth 1

Then run:
  python scripts/import_kjvstrongs.py --src path/to/bible-app-data/interlinear --db assets/db/bible.db

The interlinear/ folder contains 66 JSON files (one per Bible book).
Each file is an array of verse objects:
  { "id": "01001001", "verse": [{ "i": 0, "text": "In the beginning", "number": "h7225", ... }, ...] }

Output format in bible_translations:
  translation='KJV+', text = "In the beginning H7225 God H430 created H1254 the heaven H8064 ..."
"""

import argparse
import json
import os
import re
import sqlite3

# Map JSON filename stem → canonical book name (matches bible_verses table)
BOOK_NAME_MAP = {
    "Genesis": "Genesis", "Exodus": "Exodus", "Leviticus": "Leviticus",
    "Numbers": "Numbers", "Deuteronomy": "Deuteronomy", "Joshua": "Joshua",
    "Judges": "Judges", "Ruth": "Ruth", "1Samuel": "1 Samuel", "2Samuel": "2 Samuel",
    "1Kings": "1 Kings", "2Kings": "2 Kings", "1Chronicles": "1 Chronicles",
    "2Chronicles": "2 Chronicles", "Ezra": "Ezra", "Nehemiah": "Nehemiah",
    "Esther": "Esther", "Job": "Job", "Psalms": "Psalms", "Proverbs": "Proverbs",
    "Ecclesiastes": "Ecclesiastes", "Song_of_solomon": "Song of Solomon",
    "Isaiah": "Isaiah", "Jeremiah": "Jeremiah", "Lamentations": "Lamentations",
    "Ezekiel": "Ezekiel", "Daniel": "Daniel", "Hosea": "Hosea", "Joel": "Joel",
    "Amos": "Amos", "Obadiah": "Obadiah", "Jonah": "Jonah", "Micah": "Micah",
    "Nahum": "Nahum", "Habakkuk": "Habakkuk", "Zephaniah": "Zephaniah",
    "Haggai": "Haggai", "Zechariah": "Zechariah", "Malachi": "Malachi",
    "Matthew": "Matthew", "Mark": "Mark", "Luke": "Luke", "John": "John",
    "Acts": "Acts", "Romans": "Romans", "1Corinthians": "1 Corinthians",
    "2Corinthians": "2 Corinthians", "Galatians": "Galatians",
    "Ephesians": "Ephesians", "Philippians": "Philippians",
    "Colossians": "Colossians", "1Thessalonians": "1 Thessalonians",
    "2Thessalonians": "2 Thessalonians", "1Timothy": "1 Timothy",
    "2Timothy": "2 Timothy", "Titus": "Titus", "Philemon": "Philemon",
    "Hebrews": "Hebrews", "James": "James", "1Peter": "1 Peter",
    "2Peter": "2 Peter", "1John": "1 John", "2John": "2 John",
    "3John": "3 John", "Jude": "Jude", "Revelation": "Revelation",
}


def normalize_strongs(number: str) -> str:
    """Convert 'h7225' or 'g2532' → 'H7225' or 'G2532'."""
    if not number:
        return ''
    return number[0].upper() + number[1:].lstrip('0').zfill(1) if len(number) > 1 else number.upper()


def build_verse_text(word_objs: list) -> str:
    """
    word_objs: list of { "i": int, "text": str, "number": str }
    Returns: "In the beginning H7225 God H430 created H1254 ..."

    NOTE: 'i' is the Strong's dictionary index, not word order — same word reuse shares
    the same 'i'. Array order is the correct KJV word order; do NOT sort by 'i'.
    Entries with empty text (e.g. bare articles in the Greek) are skipped entirely.
    """
    parts = []
    for w in word_objs:
        text = w.get('text', '').strip()
        if not text:
            continue
        parts.append(text)
        strongs = normalize_strongs(w.get('number', ''))
        if strongs:
            parts.append(strongs)
    return ' '.join(parts)


def import_interlinear(src_dir: str, db_path: str):
    rows = []

    for filename in sorted(os.listdir(src_dir)):
        if not filename.endswith('.json'):
            continue
        stem = filename[:-5]  # strip .json
        book_name = BOOK_NAME_MAP.get(stem)
        if not book_name:
            print(f"  Skipping unknown file: {filename}")
            continue

        filepath = os.path.join(src_dir, filename)
        with open(filepath, encoding='utf-8') as f:
            data = json.load(f)

        for verse_obj in data:
            vid = str(verse_obj.get('id', ''))
            # id format: BBCCCVVV (8 chars) — e.g. "01001001" = book 1, ch 1, v 1
            if len(vid) >= 8:
                chapter = int(vid[2:5])
                verse   = int(vid[5:8])
            elif len(vid) >= 7:
                chapter = int(vid[1:4])
                verse   = int(vid[4:7])
            else:
                continue

            word_objs = verse_obj.get('verse', [])
            if not word_objs:
                continue

            text = build_verse_text(word_objs)
            rows.append(('KJV+', book_name, chapter, verse, text))

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("DELETE FROM bible_translations WHERE translation = 'KJV+'")
    cur.executemany(
        "INSERT INTO bible_translations (translation, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)",
        rows
    )
    conn.commit()
    conn.close()
    print(f"Inserted {len(rows)} verses with translation='KJV+'")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Import KJV+Strong's into bible.db")
    parser.add_argument('--src', required=True, help='Path to interlinear/ folder from bible-app-data repo')
    parser.add_argument('--db',  required=True, help='Path to bible.db asset file')
    args = parser.parse_args()
    import_interlinear(args.src, args.db)
