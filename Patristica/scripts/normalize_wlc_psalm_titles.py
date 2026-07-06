"""
normalize_wlc_psalm_titles.py

Detects psalm chapters where WLC has more verses than KJV (the extra initial
verses are superscription/heading) and collapses them into verse 0 in
wlc_words, then shifts remaining verse numbers down to align with KJV.

Safe to re-run — it checks whether verse 0 rows already exist before acting.

Usage:
    python scripts/normalize_wlc_psalm_titles.py [--db assets/db/bible.db] [--dry-run]
"""

import argparse
import sqlite3

BOOK = 'Psalms'


def normalize(con: sqlite3.Connection, dry_run: bool) -> None:
    cur = con.cursor()

    # KJV max verse per psalm chapter
    kjv = {r[0]: r[1] for r in cur.execute(
        "SELECT chapter, MAX(verse) FROM bible_verses WHERE book=? GROUP BY chapter", [BOOK]
    )}

    # WLC max verse per psalm chapter
    wlc = {r[0]: r[1] for r in cur.execute(
        "SELECT chapter, MAX(verse) FROM wlc_words WHERE book=? GROUP BY chapter", [BOOK]
    )}

    total_moved = 0
    total_shifted = 0

    for chapter in sorted(wlc.keys()):
        wlc_max = wlc[chapter]
        kjv_max = kjv.get(chapter, 0)
        extra = wlc_max - kjv_max

        if extra <= 0:
            continue

        # Safety: skip if verse 0 already exists (already normalised)
        already = cur.execute(
            "SELECT COUNT(*) FROM wlc_words WHERE book=? AND chapter=? AND verse=0",
            [BOOK, chapter]
        ).fetchone()[0]
        if already:
            print(f"  Ps {chapter}: already has verse 0, skipping")
            continue

        print(f"  Ps {chapter}: extra={extra} (WLC max={wlc_max}, KJV max={kjv_max})")

        # --- Step 1: collapse title verses (1..extra) into verse 0 ---
        # Re-assign positions sequentially to avoid conflicts when
        # multiple title verses (e.g. Ps 51 v1 + v2) merge into verse 0.
        title_words = cur.execute(
            "SELECT rowid, verse, position FROM wlc_words "
            "WHERE book=? AND chapter=? AND verse BETWEEN 1 AND ? "
            "ORDER BY verse, position",
            [BOOK, chapter, extra]
        ).fetchall()

        for new_pos, (rowid, _verse, _pos) in enumerate(title_words, start=1):
            total_moved += 1
            if not dry_run:
                cur.execute(
                    "UPDATE wlc_words SET verse=0, position=? WHERE rowid=?",
                    [new_pos, rowid]
                )

        # --- Step 2: shift content verses (extra+1..wlc_max) down by extra ---
        # Work in descending verse order so we don't create duplicates mid-shift.
        content_verses = cur.execute(
            "SELECT DISTINCT verse FROM wlc_words "
            "WHERE book=? AND chapter=? AND verse > ? "
            "ORDER BY verse",
            [BOOK, chapter, extra]
        ).fetchall()

        for (verse,) in content_verses:
            new_verse = verse - extra
            total_shifted += 1
            if not dry_run:
                cur.execute(
                    "UPDATE wlc_words SET verse=? WHERE book=? AND chapter=? AND verse=?",
                    [new_verse, BOOK, chapter, verse]
                )

    prefix = "[DRY RUN] " if dry_run else ""
    print(f"\n{prefix}Moved {total_moved} title words to verse 0")
    print(f"{prefix}Shifted {total_shifted} content verse groups")

    if not dry_run:
        con.commit()
        print("Committed.")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="assets/db/bible.db")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    con = sqlite3.connect(args.db)
    try:
        normalize(con, args.dry_run)
    finally:
        con.close()


if __name__ == "__main__":
    main()
