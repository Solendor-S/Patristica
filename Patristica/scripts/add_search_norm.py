"""
Add accent-stripped normalisation columns to greek_words, lxx_words, and hebrew_words
so the app can do diacritic-insensitive searches in original-language text.

  greek_words.greek_norm  — NFD + strip U+0300-U+036F combining marks, lowercased
  lxx_words.greek_norm    — same
  hebrew_words.hebrew_norm — strip U+0591-U+05C7 vowel points / cantillation, lowercased

Usage:
  python scripts/add_search_norm.py --db assets/db/bible.db
"""

import argparse
import re
import sqlite3
import unicodedata
from pathlib import Path


def norm_greek(s: str) -> str:
    return re.sub(r'[̀-ͯ]', '', unicodedata.normalize('NFD', s)).lower()


def norm_hebrew(s: str) -> str:
    return re.sub(r'[֑-ׇ]', '', s).lower()


def process(db_path: str) -> None:
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    for table, col, norm_col, norm_fn in [
        ('greek_words',  'greek',  'greek_norm',  norm_greek),
        ('lxx_words',    'greek',  'greek_norm',  norm_greek),
        ('hebrew_words', 'hebrew', 'hebrew_norm', norm_hebrew),
    ]:
        # Check table exists
        exists = cur.execute(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?", (table,)
        ).fetchone()[0]
        if not exists:
            print(f'{table}: not found, skipping.')
            continue

        # Add column if missing
        cols = [r[1] for r in cur.execute(f'PRAGMA table_info({table})').fetchall()]
        if norm_col not in cols:
            cur.execute(f'ALTER TABLE {table} ADD COLUMN {norm_col} TEXT')
            print(f'{table}: added {norm_col} column.')

        # Populate rows where norm_col is NULL
        rows = cur.execute(
            f'SELECT rowid, {col} FROM {table} WHERE {norm_col} IS NULL'
        ).fetchall()

        if not rows:
            print(f'{table}: already populated, skipping.')
            continue

        print(f'{table}: normalising {len(rows):,} rows…')
        batch = [(norm_fn(word) if word else '', rowid) for rowid, word in rows]
        cur.executemany(f'UPDATE {table} SET {norm_col} = ? WHERE rowid = ?', batch)

        # Index for fast LIKE '%word%' scans
        idx = f'idx_{table}_{norm_col}'
        cur.execute(f'CREATE INDEX IF NOT EXISTS {idx} ON {table}({norm_col})')
        print(f'{table}: done. Index {idx} ensured.')

    con.commit()
    con.close()
    print('All done.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', required=True)
    args = parser.parse_args()
    process(args.db)
