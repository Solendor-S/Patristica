"""
Generate static JSON chapter files for online preview (no download needed).

One JSON file per chapter per optional translation/book/work.
Output goes to temp/online/ — commit that folder to bible-app-data repo on GitHub.

Structure:
  temp/online/
    asv/Matthew/1.json      <- [{verse:1, text:"..."}, ...]
    web/Matthew/1.json
    bsb/Matthew/1.json
    elxx/Genesis/1.json     <- E_LXX text
    dss/Isaiah/1.json       <- DSS Hebrew text
    apoc/Tobit/1.json       <- Apocrypha
    early/1 Clement/1.json  <- Early texts

python3 scripts/generate_online_json.py
"""

import sqlite3
import json
import os
import sys

SRC     = "assets/db/bible.db"  # full DB (temp/bible_full_backup.db also works)
OUT_DIR = "temp/online"

# Use the full backup if it exists (since assets/db/bible.db is now the core)
if os.path.exists("temp/bible_full_backup.db"):
    SRC = "temp/bible_full_backup.db"
    print(f"Using full backup: {SRC}")
else:
    print(f"Using: {SRC}")

db = sqlite3.connect(SRC)
total_files = 0


def write_json(path: str, data: list):
    global total_files
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    total_files += 1


# ── Translation packs (ASV, WEB, BSB) ────────────────────────────────────────
print("\nGenerating translation JSONs...")
for trans in ('ASV', 'WEB', 'BSB'):
    slug = trans.lower()
    rows = db.execute(
        "SELECT book, chapter, verse, text FROM bible_translations WHERE translation=? ORDER BY book, chapter, verse",
        [trans]
    ).fetchall()
    # Group by book+chapter
    chapters: dict = {}
    for book, chapter, verse, text in rows:
        key = (book, chapter)
        chapters.setdefault(key, []).append({"verse": verse, "text": text})
    for (book, chapter), verses in chapters.items():
        write_json(f"{OUT_DIR}/{slug}/{book}/{chapter}.json", verses)
    print(f"  {trans}: {len(chapters)} chapters")

# ── E_LXX / A_LXX ────────────────────────────────────────────────────────────
print("\nGenerating ELXX JSONs...")
for trans in ('E_LXX', 'A_LXX'):
    slug = trans.lower().replace('_', '')
    rows = db.execute(
        "SELECT book, chapter, verse, text FROM bible_translations WHERE translation=? ORDER BY book, chapter, verse",
        [trans]
    ).fetchall()
    chapters = {}
    for book, chapter, verse, text in rows:
        chapters.setdefault((book, chapter), []).append({"verse": verse, "text": text})
    for (book, chapter), verses in chapters.items():
        write_json(f"{OUT_DIR}/{slug}/{book}/{chapter}.json", verses)
    print(f"  {trans}: {len(chapters)} chapters")

# ── DSS ───────────────────────────────────────────────────────────────────────
print("\nGenerating DSS JSONs...")
rows = db.execute(
    "SELECT book, chapter, verse, hebrew FROM dss_words ORDER BY book, chapter, verse, position"
).fetchall()
chapters = {}
for book, chapter, verse, word in rows:
    chapters.setdefault((book, chapter), {}).setdefault(verse, []).append(word)
dss_count = 0
for (book, chapter), verse_map in chapters.items():
    verses = [{"verse": v, "text": " ".join(words)} for v, words in sorted(verse_map.items())]
    write_json(f"{OUT_DIR}/dss/{book}/{chapter}.json", verses)
    dss_count += 1
print(f"  DSS: {dss_count} chapters")

# ── Apocrypha (per book) ──────────────────────────────────────────────────────
print("\nGenerating Apocrypha JSONs...")
rows = db.execute(
    "SELECT book, chapter, verse, text FROM apocrypha_verses ORDER BY book, chapter, verse"
).fetchall()
chapters = {}
for book, chapter, verse, text in rows:
    chapters.setdefault((book, chapter), []).append({"verse": verse, "text": text})
for (book, chapter), verses in chapters.items():
    write_json(f"{OUT_DIR}/apoc/{book}/{chapter}.json", verses)
print(f"  Apocrypha: {len(chapters)} chapters across {len(set(b for b,_ in chapters))} books")

# ── Early texts ───────────────────────────────────────────────────────────────
print("\nGenerating Early Texts JSONs...")
rows = db.execute(
    "SELECT book, chapter, verse, text FROM early_texts ORDER BY book, chapter, verse"
).fetchall()
chapters = {}
for book, chapter, verse, text in rows:
    chapters.setdefault((book, chapter), []).append({"verse": verse, "text": text})
for (book, chapter), verses in chapters.items():
    write_json(f"{OUT_DIR}/early/{book}/{chapter}.json", verses)
print(f"  Early texts: {len(chapters)} chapters across {len(set(b for b,_ in chapters))} works")

db.close()
print(f"\nTotal JSON files: {total_files:,}")
print(f"Output: {OUT_DIR}/")

# Rough size estimate
total_bytes = sum(
    os.path.getsize(os.path.join(root, f))
    for root, _, files in os.walk(OUT_DIR)
    for f in files if f.endswith('.json')
)
print(f"Total size: {total_bytes / 1024 / 1024:.1f} MB")
