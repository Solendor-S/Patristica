"""
Generate bible_core.db — the bundled database stripped of all optional content.

Reads from assets/db/bible.db (never modifies it).
Writes to temp/bible_core.db.

Core keeps:
  - bible_verses           (KJV text, all 66 canonical books)
  - bible_translations     (KJV+, I_KJV+ only)
  - greek_words            (SBLGNT NT word-level)
  - greek_words_tagnt      (TAGNT NT word-level)
  - greek_words_tr         (TR NT word-level)
  - hebrew_words           (BHS OT word-level)
  - wlc_words              (WLC OT word-level)
  - lxx_words              (LXX Greek OT word-level — needed for LXX+ tab in reader)
  - lxx_apostolic_words
  - strongs_greek          (Strongs G lexicon)
  - strongs_hebrew         (Strongs H lexicon)
  - thayers_greek
  - bdb_hebrew
  - cross_refs
  - textual_variants       (NT variants only — SBLGNT-based)
  - ot_quote_spans
  - verse_footnotes        (KJV footnotes)
  - bsb_strongs_map        (small, needed for Strongs lookups)
  - overview_chapters
  - overview_pericopes
  - overview_verses
  - biblehub_chapters
  - biblesummary_chapters
  - commentary             (patristic commentary)
  - josephus
  - josephus_refs
  - historical_refs
  - historical_sources

Optional (NOT in core — goes to packs):
  - bible_translations rows for ASV, WEB, BSB, E_LXX, A_LXX
  - dss_words
  - apocrypha_books
  - apocrypha_verses
  - early_texts
  - early_text_footnotes
  - early_text_refs
  - elxx_notes
  - bsb_footnotes          (BSB pack)
  - textual_variants OT rows (DSS pack)

python3 scripts/split_core_db.py
"""

import sqlite3
import shutil
import os
import sys

SRC   = "assets/db/bible.db"
DEST  = "temp/bible_core.db"

os.makedirs("temp", exist_ok=True)

print(f"Copying {SRC} -> {DEST} ...")
shutil.copy2(SRC, DEST)

src_size = os.path.getsize(SRC)
print(f"  Source: {src_size / 1024 / 1024:.1f} MB")

con = sqlite3.connect(DEST)
cur = con.cursor()

# ── Strip optional translation rows ──────────────────────────────────────────
print("\nRemoving optional translation rows from bible_translations ...")
optional_translations = ('ASV', 'WEB', 'BSB', 'E_LXX', 'A_LXX')
ph = ','.join('?' * len(optional_translations))
before = cur.execute("SELECT COUNT(*) FROM bible_translations").fetchone()[0]
cur.execute(f"DELETE FROM bible_translations WHERE translation IN ({ph})", optional_translations)
after = cur.execute("SELECT COUNT(*) FROM bible_translations").fetchone()[0]
print(f"  Removed {before - after:,} rows (kept {after:,})")

# ── Drop optional tables entirely ─────────────────────────────────────────────
optional_tables = [
    'dss_words',
    'apocrypha_books',
    'apocrypha_verses',
    'early_texts',
    'early_text_footnotes',
    # early_text_refs stays in core — needed for Bible verse cross-ref citations
    'elxx_notes',
    'bsb_footnotes',
    'lxx_words',           # LXX Greek OT — goes with elxx pack
    'lxx_apostolic_words', # Apostolic Fathers Greek — goes with elxx pack
    'greek_words',         # SBLGNT — optional scholar pack (TR is default)
    'greek_words_tagnt',   # TAGNT  — optional scholar pack
    'hebrew_words',        # BHS/TAHOT — optional scholar pack (WLC is default)
]
for tbl in optional_tables:
    exists = cur.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", [tbl]
    ).fetchone()[0]
    if exists:
        cur.execute(f"DROP TABLE {tbl}")
        print(f"  Dropped table: {tbl}")

# ── Strip OT textual variants (those belong to the DSS pack) ─────────────────
# NT variants (from SBLGNT) stay; OT variants go to DSS pack
nt_books = {
    'Matthew','Mark','Luke','John','Acts','Romans',
    '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
    'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy',
    'Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
    '1 John','2 John','3 John','Jude','Revelation',
}
ph_nt = ','.join('?' * len(nt_books))
cur.execute(f"DELETE FROM textual_variants WHERE book NOT IN ({ph_nt})", list(nt_books))

con.commit()

# ── VACUUM to reclaim space ───────────────────────────────────────────────────
print("\nVACUUMing (this may take a moment) ...")
con.execute("VACUUM")
con.close()

dest_size = os.path.getsize(DEST)
saved = src_size - dest_size
print(f"\nResult:")
print(f"  Core DB:  {dest_size / 1024 / 1024:.1f} MB  ({DEST})")
print(f"  Original: {src_size  / 1024 / 1024:.1f} MB")
print(f"  Saved:    {saved     / 1024 / 1024:.1f} MB  ({saved / src_size * 100:.0f}% reduction)")
