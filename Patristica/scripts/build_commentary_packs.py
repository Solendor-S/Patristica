"""
build_commentary_packs.py — split commentary out of the core DB into two packs.

Hand-picked (New Advent, `commentary_entries` + `commentary_texts` + the `commentary`
view) and legacy (HCF/e-Catena, `commentary_legacy`) become separate downloadable
packs, so the bundled app ships neither.

Outputs (source DB is never modified):
  temp/packs/commentary-fathers.db
  temp/packs/commentary-legacy.db
  temp/bible_core_nocommentary.db     core DB with both dropped, for size comparison

python scripts/build_commentary_packs.py [--src temp/bible_phase2_test.db]
"""

import argparse
import os
import sqlite3

OUT_DIR = 'temp/packs'
CORE_OUT = 'temp/bible_core_nocommentary.db'

# Objects that move into each pack. Order matters: tables before the view that reads them.
FATHERS_TABLES = ['commentary_texts', 'commentary_entries']
FATHERS_VIEW = 'commentary'
FATHERS_OBJECTS = [*FATHERS_TABLES, FATHERS_VIEW]
LEGACY_OBJECTS = ['commentary_legacy']

# Dropping order is the reverse: the view first, or it is left dangling over
# tables that no longer exist. Same rule split_core_db.py follows.
CORE_DROP_ORDER = [FATHERS_VIEW, *FATHERS_TABLES, *LEGACY_OBJECTS]


def mb(path: str) -> float:
    return os.path.getsize(path) / 1e6


def copy_objects(src_path: str, dst_path: str, names: list[str]) -> dict[str, int]:
    """Recreate the named tables/views (and their indexes) in a fresh DB, with rows."""
    if os.path.exists(dst_path):
        os.remove(dst_path)
    con = sqlite3.connect(dst_path)
    con.execute("ATTACH DATABASE ? AS src", (src_path,))
    counts: dict[str, int] = {}
    for name in names:
        row = con.execute(
            "SELECT type, sql FROM src.sqlite_master WHERE name = ?", (name,)
        ).fetchone()
        if not row:
            print(f'  WARNING: {name} not found in source — skipped')
            continue
        obj_type, sql = row
        con.execute(sql)
        if obj_type == 'table':
            con.execute(f'INSERT INTO main."{name}" SELECT * FROM src."{name}"')
            counts[name] = con.execute(f'SELECT COUNT(*) FROM main."{name}"').fetchone()[0]
        # carry the table's own indexes across
        for (idx_sql,) in con.execute(
            "SELECT sql FROM src.sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL",
            (name,),
        ).fetchall():
            con.execute(idx_sql)
    con.commit()
    con.execute('DETACH DATABASE src')
    con.execute('VACUUM')
    con.close()
    return counts


def build_core(src_path: str, dst_path: str) -> None:
    """Copy the source DB and drop every commentary object from the copy."""
    import shutil
    if os.path.exists(dst_path):
        os.remove(dst_path)
    shutil.copyfile(src_path, dst_path)
    con = sqlite3.connect(dst_path)
    for name in CORE_DROP_ORDER:
        row = con.execute("SELECT type FROM sqlite_master WHERE name = ?", (name,)).fetchone()
        if not row:
            continue
        con.execute(f'DROP {"VIEW" if row[0] == "view" else "TABLE"} IF EXISTS "{name}"')
    con.commit()
    con.execute('VACUUM')
    con.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='temp/bible_phase2_test.db',
                    help='DB holding the full commentary data')
    args = ap.parse_args()
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f'Source: {args.src} ({mb(args.src):.1f} MB)\n')

    fathers = f'{OUT_DIR}/commentary-fathers.db'
    print('Building commentary-fathers.db …')
    counts = copy_objects(args.src, fathers, FATHERS_OBJECTS)
    for k, v in counts.items():
        print(f'    {k}: {v:,} rows')
    print(f'    -> {mb(fathers):.1f} MB\n')

    legacy = f'{OUT_DIR}/commentary-legacy.db'
    print('Building commentary-legacy.db …')
    counts = copy_objects(args.src, legacy, LEGACY_OBJECTS)
    for k, v in counts.items():
        print(f'    {k}: {v:,} rows')
    print(f'    -> {mb(legacy):.1f} MB\n')

    print('Building commentary-free core …')
    build_core(args.src, CORE_OUT)
    print(f'    -> {mb(CORE_OUT):.1f} MB\n')

    print(f'Core {mb(args.src):.1f} MB -> {mb(CORE_OUT):.1f} MB '
          f'(saves {mb(args.src) - mb(CORE_OUT):.1f} MB), '
          f'packs total {mb(fathers) + mb(legacy):.1f} MB')

    # sanity: the view must resolve inside its own pack
    con = sqlite3.connect(fathers)
    n = con.execute('SELECT COUNT(*) FROM commentary').fetchone()[0]
    sample = con.execute(
        'SELECT father_name, book, chapter, verse FROM commentary LIMIT 1').fetchone()
    con.close()
    print(f'\nSelf-check: commentary view in pack returns {n:,} rows; sample {sample}')


if __name__ == '__main__':
    main()
