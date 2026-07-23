"""
import_newadvent_commentary.py — Stage 3: citation records JSON -> commentary table.

First run against a given DB:
  - renames the existing `commentary` table to `commentary_legacy` (preserves all
    HCF/e-Catena rows untouched)
  - recreates `commentary` with the identical schema + index
  - loads the New Advent records as the app's primary commentary source
Re-runs are safe: the rename is guarded, and rows are deduped on
(book, chapter, verse, father_name, source, excerpt).

Usage (from Patristica/):
  python scripts/newadvent/import_newadvent_commentary.py --db temp/bible_test.db --dry-run
  python scripts/newadvent/import_newadvent_commentary.py --db assets/db/bible.db
"""

import argparse
import json
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fathers_config import FATHERS, CITATIONS_JSON as IN_JSON, record_key  # noqa: E402

# full_text paragraphs are heavily shared (a 16-verse range = 16 rows, one
# paragraph), so they live once in commentary_texts; the `commentary` VIEW
# exposes the exact legacy column set, keeping queries.ts untouched.
CREATE_SQL = [
    '''CREATE TABLE commentary_texts (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         text TEXT NOT NULL UNIQUE)''',
    '''CREATE TABLE commentary_entries (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         book TEXT NOT NULL,
         chapter INTEGER NOT NULL,
         verse INTEGER NOT NULL,
         father_name TEXT NOT NULL,
         father_era TEXT NOT NULL,
         father_era_order INTEGER DEFAULT 0,
         excerpt TEXT NOT NULL,
         text_id INTEGER NOT NULL REFERENCES commentary_texts(id),
         source TEXT DEFAULT '',
         source_url TEXT DEFAULT '')''',
    'CREATE INDEX idx_commentary_loc ON commentary_entries(book, chapter, verse)',
    '''CREATE VIEW commentary AS
       SELECT e.id, e.book, e.chapter, e.verse, e.father_name, e.father_era,
              e.father_era_order, e.excerpt, t.text AS full_text,
              e.source, e.source_url
       FROM commentary_entries e JOIN commentary_texts t ON t.id = e.text_id''',
]


def check_father_keys(db: sqlite3.Connection) -> None:
    """Warn for config keys that aren't a FATHER_DATES prefix (fatherDates.ts)."""
    fd_path = os.path.join('src', 'data', 'fatherDates.ts')
    with open(fd_path, encoding='utf-8') as f:
        src = f.read()
    import re
    keys = set(re.findall(r"^\s*'([^']+)':\s*\{", src, re.MULTILINE))
    missing = [m['key'] for m in FATHERS.values()
               if not any(m['key'] == k or m['key'].startswith(k) for k in keys)]
    if missing:
        print('WARNING — these father_name keys have NO FATHER_DATES entry '
              '(add to fatherDates.ts or they sort last with no tradition badge):')
        for k in sorted(set(missing)):
            print(f'  {k}')


def migrate_schema(db: sqlite3.Connection) -> None:
    cur = db.cursor()
    objs = {r[0]: r[1] for r in cur.execute(
        "SELECT name, type FROM sqlite_master WHERE type IN ('table','view')").fetchall()}
    if 'commentary_legacy' not in objs and objs.get('commentary') == 'table':
        n = cur.execute('SELECT COUNT(*) FROM commentary').fetchone()[0]
        print(f'Renaming commentary ({n} legacy rows) -> commentary_legacy')
        cur.execute('ALTER TABLE commentary RENAME TO commentary_legacy')
        # the rename drags idx_commentary_loc along; free the name for the new schema
        cur.execute('DROP INDEX IF EXISTS idx_commentary_loc')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_commentary_legacy_loc '
                    'ON commentary_legacy(book, chapter, verse)')
        del objs['commentary']
    elif objs.get('commentary') == 'table':
        # earlier flat-table import run — rebuild as normalized layout
        print('Dropping flat commentary table from previous run (rebuilt from JSON)')
        cur.execute('DROP TABLE commentary')
        cur.execute('DROP INDEX IF EXISTS idx_commentary_loc')
        del objs['commentary']
    if 'commentary' not in objs:
        for sql in CREATE_SQL:
            cur.execute(sql)
    db.commit()


def import_records(db: sqlite3.Connection, records: list[dict], dry_run: bool) -> tuple[int, int, int]:
    cur = db.cursor()
    # New Advent tagging typos ("Mark 6:83") reference verses that don't exist —
    # guard against the actual target DB, not a hardcoded asset path
    verse_counts = {(b, c): v for b, c, v in cur.execute(
        'SELECT book, chapter, MAX(verse) FROM bible_verses GROUP BY book, chapter')}
    existing: set[tuple] = set()
    if not dry_run:
        cur.execute('SELECT book, chapter, verse, father_name, source, excerpt FROM commentary')
        existing = set(cur.fetchall())
    text_ids: dict[str, int] = {}
    inserted = skipped = bad_verse = 0
    for r in records:
        maxv = verse_counts.get((r['book'], r['chapter']))
        if maxv and r['verse'] > maxv:
            bad_verse += 1
            continue
        key = record_key(r)
        if key in existing:
            skipped += 1
            continue
        existing.add(key)
        if not dry_run:
            text_id = text_ids.get(r['full_text'])
            if text_id is None:
                cur.execute('INSERT OR IGNORE INTO commentary_texts (text) VALUES (?)',
                            (r['full_text'],))
                text_id = cur.execute('SELECT id FROM commentary_texts WHERE text = ?',
                                      (r['full_text'],)).fetchone()[0]
                text_ids[r['full_text']] = text_id
            cur.execute(
                '''INSERT INTO commentary_entries
                   (book, chapter, verse, father_name, father_era, father_era_order,
                    excerpt, text_id, source, source_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (r['book'], r['chapter'], r['verse'], r['father_name'],
                 r['father_era'], r['father_era_order'],
                 r['excerpt'], text_id, r['source'], r['source_url']))
        inserted += 1
    if not dry_run:
        db.commit()
    return inserted, skipped, bad_verse


def main() -> None:
    ap = argparse.ArgumentParser(description='Import New Advent citations into commentary table')
    ap.add_argument('--db', required=True, help='Path to bible.db (use a copy first)')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    with open(IN_JSON, encoding='utf-8') as f:
        records = json.load(f)
    print(f'Loaded {len(records)} records from {IN_JSON}')

    db = sqlite3.connect(args.db)
    check_father_keys(db)
    if args.dry_run:
        print('Dry-run: schema migration + inserts skipped; showing 10 sample rows:')
        for r in records[:10]:
            print(f"  {r['book']} {r['chapter']}:{r['verse']} | {r['father_name']} | "
                  f"{r['source'][:60]} | {r['excerpt'][:60]}")
        db.close()
        return

    migrate_schema(db)
    inserted, skipped, bad_verse = import_records(db, records, dry_run=False)
    n_new = db.execute('SELECT COUNT(*) FROM commentary').fetchone()[0]
    n_old = db.execute('SELECT COUNT(*) FROM commentary_legacy').fetchone()[0] \
        if db.execute("SELECT 1 FROM sqlite_master WHERE name='commentary_legacy'").fetchone() else 0
    db.close()
    print(f'Inserted {inserted}, skipped {skipped} dupes, dropped {bad_verse} bad-verse rows. '
          f'commentary={n_new} rows, commentary_legacy={n_old} rows.')


if __name__ == '__main__':
    main()
