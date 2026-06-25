"""
Generate per-chapter JSON files for Greek/Hebrew word study data.

These allow the word study panel to work in online mode when a source
pack hasn't been downloaded yet.

Output: data/online/words/{source}/{book}/{chapter}.json
Format: {"1": [{pos, text, translit, strongs, gloss, morph}, ...], "2": [...]}

Sources:
  sblgnt  -> greek_words            (NT, core db)
  tagnt   -> greek_words_tagnt      (NT, core db)
  tahot   -> hebrew_words           (OT, core db)
  lxx     -> lxx_words              (OT, elxx pack db)
  lxx_a   -> lxx_apostolic_words    (OT, elxx pack db)

python3 scripts/generate_online_word_json.py
"""

import sqlite3
import json
import os

# Default source DB (has NT + TAHOT tables)
MAIN_SRC = "temp/bible_full_backup.db" if os.path.exists("temp/bible_full_backup.db") else "assets/db/bible.db"
ELXX_SRC = "temp/packs/elxx.db"
OUT_DIR = "data/online/words"

# (slug, table, text_col, db_path)
SOURCES = [
    ("sblgnt", "greek_words",            "greek",  MAIN_SRC),
    ("tagnt",  "greek_words_tagnt",      "greek",  MAIN_SRC),
    ("tahot",  "hebrew_words",           "hebrew", MAIN_SRC),
    ("lxx",    "lxx_words",              "greek",  ELXX_SRC),
    ("lxx_a",  "lxx_apostolic_words",    "greek",  ELXX_SRC),
]

total = 0

for slug, table, text_col, db_path in SOURCES:
    if not os.path.exists(db_path):
        print(f"  Skipping {slug} — db not found: {db_path}")
        continue

    db = sqlite3.connect(db_path)

    exists = db.execute(
        f"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{table}'"
    ).fetchone()[0]
    if not exists:
        print(f"  Skipping {slug} — table {table} not found in {db_path}")
        db.close()
        continue

    print(f"\nGenerating {slug} ({table}) from {db_path}...")
    rows = db.execute(
        f"SELECT book, chapter, verse, position, {text_col}, translit, strongs, gloss, morph "
        f"FROM {table} ORDER BY book, chapter, verse, position"
    ).fetchall()
    db.close()

    # Group by (book, chapter)
    chapters: dict = {}
    for book, ch, verse, pos, text, translit, strongs, gloss, morph in rows:
        key = (book, ch)
        chapters.setdefault(key, {}).setdefault(str(verse), []).append({
            "p": pos,
            "t": text or "",
            "tr": translit or "",
            "s": strongs or "",
            "g": gloss or "",
            "m": morph or "",
        })

    file_count = 0
    for (book, ch), verse_map in chapters.items():
        path = f"{OUT_DIR}/{slug}/{book}/{ch}.json"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(verse_map, f, ensure_ascii=False, separators=(",", ":"))
        file_count += 1
        total += 1

    size_mb = sum(
        os.path.getsize(os.path.join(r, fn))
        for r, _, files in os.walk(f"{OUT_DIR}/{slug}")
        for fn in files
    ) / 1024 / 1024
    print(f"  {file_count} chapter files, {size_mb:.1f} MB")

print(f"\nTotal files: {total}")
print(f"Output: {OUT_DIR}/")
