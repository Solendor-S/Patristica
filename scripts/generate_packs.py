"""
Generate individual downloadable pack .db files from assets/db/bible.db.

All outputs go to temp/packs/ — source DB is never modified.

python3 scripts/generate_packs.py
"""

import sqlite3
import os
import sys

SRC     = "assets/db/bible.db"
OUT_DIR = "temp/packs"
os.makedirs(OUT_DIR, exist_ok=True)

NT_BOOKS = {
    'Matthew','Mark','Luke','John','Acts','Romans',
    '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians',
    'Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy',
    'Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
    '1 John','2 John','3 John','Jude','Revelation',
}


def vacuum_and_size(path: str) -> float:
    """VACUUM and return size in KB."""
    con = sqlite3.connect(path)
    con.execute("VACUUM")
    con.close()
    return os.path.getsize(path) / 1024


def make_translation_pack(slug: str, translations: list[str], extras: dict = None):
    """Pack for a whole-Bible translation (+ optional extra tables)."""
    path = f"{OUT_DIR}/{slug}.db"
    src = sqlite3.connect(SRC)
    dst = sqlite3.connect(path)

    # Copy schema + rows for bible_translations
    src.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='bible_translations'")
    schema = src.execute(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='bible_translations'"
    ).fetchone()[0]
    dst.execute("DROP TABLE IF EXISTS bible_translations")
    dst.execute(schema)
    ph = ','.join('?' * len(translations))
    rows = src.execute(
        f"SELECT * FROM bible_translations WHERE translation IN ({ph})", translations
    ).fetchall()
    dst.executemany(f"INSERT INTO bible_translations VALUES ({','.join('?'*len(rows[0]))})", rows)

    # Copy extra tables verbatim
    if extras:
        for tbl, where in extras.items():
            schema_row = src.execute(
                f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{tbl}'"
            ).fetchone()
            if not schema_row:
                continue
            dst.execute(f"DROP TABLE IF EXISTS {tbl}")
            dst.execute(schema_row[0])
            q = f"SELECT * FROM {tbl}" + (f" WHERE {where}" if where else "")
            tbl_rows = src.execute(q).fetchall()
            if tbl_rows:
                dst.executemany(
                    f"INSERT INTO {tbl} VALUES ({','.join('?'*len(tbl_rows[0]))})", tbl_rows
                )

    dst.commit()
    src.close()
    dst.close()
    return vacuum_and_size(path)


def make_table_pack(slug: str, tables: dict):
    """Pack from whole tables (or filtered rows). tables = {table_name: where_clause_or_None}"""
    path = f"{OUT_DIR}/{slug}.db"
    src = sqlite3.connect(SRC)
    dst = sqlite3.connect(path)

    for tbl, where in tables.items():
        schema_row = src.execute(
            f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{tbl}'"
        ).fetchone()
        if not schema_row:
            print(f"  WARNING: table {tbl} not found in source DB")
            continue
        dst.execute(f"DROP TABLE IF EXISTS {tbl}")
        dst.execute(schema_row[0])
        q = f"SELECT * FROM {tbl}" + (f" WHERE {where}" if where else "")
        rows = src.execute(q).fetchall()
        if rows:
            dst.executemany(
                f"INSERT INTO {tbl} VALUES ({','.join('?'*len(rows[0]))})", rows
            )

    dst.commit()
    src.close()
    dst.close()
    return vacuum_and_size(path)


def make_apocrypha_pack(book: str, slug: str):
    """One pack per apocrypha book."""
    path = f"{OUT_DIR}/apoc-{slug}.db"
    src = sqlite3.connect(SRC)
    dst = sqlite3.connect(path)

    for tbl, where in [
        ('apocrypha_books',  f"book='{book}'"),
        ('apocrypha_verses', f"book='{book}'"),
    ]:
        schema = src.execute(
            f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{tbl}'"
        ).fetchone()[0]
        dst.execute(f"DROP TABLE IF EXISTS {tbl}")
        dst.execute(schema)
        rows = src.execute(f"SELECT * FROM {tbl} WHERE {where}").fetchall()
        if rows:
            dst.executemany(
                f"INSERT INTO {tbl} VALUES ({','.join('?'*len(rows[0]))})", rows
            )

    dst.commit()
    src.close()
    dst.close()
    return vacuum_and_size(path)


def make_early_text_pack(work: str, slug: str):
    """One pack per early text work."""
    path = f"{OUT_DIR}/early-{slug}.db"
    src = sqlite3.connect(SRC)
    dst = sqlite3.connect(path)

    # early_texts: rows where book = work
    for tbl, col in [
        ('early_texts',           'book'),
        ('early_text_footnotes',  'book'),
        ('early_text_refs',       'book'),
    ]:
        schema = src.execute(
            f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{tbl}'"
        ).fetchone()[0]
        dst.execute(f"DROP TABLE IF EXISTS {tbl}")
        dst.execute(schema)
        rows = src.execute(f"SELECT * FROM {tbl} WHERE {col}=?", [work]).fetchall()
        if rows:
            dst.executemany(
                f"INSERT INTO {tbl} VALUES ({','.join('?'*len(rows[0]))})", rows
            )

    dst.commit()
    src.close()
    dst.close()
    return vacuum_and_size(path)


# ── Build packs ────────────────────────────────────────────────────────────────

print("Generating packs...\n")
results = []

# Scholar Greek packs (TR is default/core; these are optional alternatives)
results.append(("sblgnt", make_table_pack("sblgnt", {'greek_words': None})))
results.append(("tagnt",  make_table_pack("tagnt",  {'greek_words_tagnt': None})))

# Scholar Hebrew pack (WLC is default/core; BHS/TAHOT is optional)
results.append(("tahot", make_table_pack("tahot", {'hebrew_words': None})))

# Translation packs
results.append(("asv",  make_translation_pack("asv", ["ASV"])))
results.append(("web",  make_translation_pack("web", ["WEB"])))
results.append(("bsb",  make_translation_pack("bsb", ["BSB"], extras={
    'bsb_footnotes':  None,
    'bsb_strongs_map': None,
})))
results.append(("elxx", make_translation_pack("elxx", ["E_LXX", "A_LXX"], extras={
    'elxx_notes':        None,
    'lxx_words':         None,
    'lxx_apostolic_words': None,
})))

# DSS pack
ot_where = "book NOT IN (" + ",".join(f"'{b}'" for b in NT_BOOKS) + ")"
results.append(("dss", make_table_pack("dss", {
    'dss_words':        None,
    'textual_variants': ot_where,
})))

# Apocrypha packs (per book)
src_check = sqlite3.connect(SRC)
apoc_books = src_check.execute(
    "SELECT book FROM apocrypha_books ORDER BY book_order"
).fetchall()
src_check.close()

print(f"  Generating {len(apoc_books)} apocrypha packs...")
apoc_sizes = []
for (book,) in apoc_books:
    slug = book.lower().replace(' ', '-').replace("'", '')
    kb = make_apocrypha_pack(book, slug)
    apoc_sizes.append(kb)
results.append((f"apocrypha ({len(apoc_books)} books)", sum(apoc_sizes)))

# Early texts packs (per work)
src_check = sqlite3.connect(SRC)
works = src_check.execute(
    "SELECT DISTINCT book FROM early_texts ORDER BY book"
).fetchall()
src_check.close()

print(f"  Generating {len(works)} early text packs...")
early_sizes = []
for (work,) in works:
    slug = work.lower().replace(' ', '-').replace("'", '').replace(',', '').replace('.', '')
    kb = make_early_text_pack(work, slug)
    early_sizes.append(kb)
results.append((f"early texts ({len(works)} works)", sum(early_sizes)))

# ── Report ─────────────────────────────────────────────────────────────────────
print("\n=== Pack sizes ===")
total = 0
for name, kb in results:
    mb = kb / 1024
    total += mb
    print(f"  {name:<40} {mb:.1f} MB")
print(f"\n  Total optional content: {total:.1f} MB")
print(f"  Core DB:               {os.path.getsize('temp/bible_core.db') / 1024 / 1024:.1f} MB")
print(f"  Original full DB:       {os.path.getsize(SRC) / 1024 / 1024:.1f} MB")
print(f"\nAll packs written to: {OUT_DIR}/")
