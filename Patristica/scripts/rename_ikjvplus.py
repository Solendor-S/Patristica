"""
Rename KJV+ → I_KJV+ in bible.db

Run BEFORE import_kjvstrongs_english.py so the English-ordered KJV+ slot is free.

Usage:
  python scripts/rename_ikjvplus.py --db assets/db/bible.db
"""

import argparse
import sqlite3


def rename(db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("UPDATE bible_translations SET translation = 'I_KJV+' WHERE translation = 'KJV+'")
    print(f"Renamed {cur.rowcount} rows: KJV+ -> I_KJV+")
    conn.commit()
    conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', required=True, help='Path to bible.db')
    args = parser.parse_args()
    rename(args.db)
