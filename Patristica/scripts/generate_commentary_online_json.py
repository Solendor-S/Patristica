"""
generate_commentary_online_json.py — per-chapter JSON so commentary works WITHOUT
the packs installed, the same way translations and early texts already do.

Output mirrors the existing online convention (data/online/<folder>/<Book>/<ch>.json):
  data/online/commentary/<Book>/<chapter>.json          hand-picked (New Advent)
  data/online/commentary-legacy/<Book>/<chapter>.json   legacy (HCF / e-Catena)

Shape — `texts` is deduped per chapter because one paragraph typically covers a whole
verse range; inlining it per entry costs 175 MB instead of 115 MB for the Fathers:

  {
    "texts": ["<full paragraph>", ...],
    "entries": [
      {"v": 16, "f": "Augustine of Hippo", "era": "Early Church",
       "e": "<excerpt>", "ti": 0, "s": "<work, chapter>", "u": "<source url>"}
    ]
  }

python scripts/generate_commentary_online_json.py [--src temp/bible_phase2_test.db]
"""

import argparse
import collections
import gzip
import json
import os
import shutil
import sqlite3

SOURCES = [
    # (table, output folder)
    ('commentary', 'commentary'),
    ('commentary_legacy', 'commentary-legacy'),
]


def build(src_db: str, out_root: str, table: str, folder: str, clean: bool) -> None:
    con = sqlite3.connect(src_db)
    rows = con.execute(
        f'''SELECT book, chapter, verse, father_name, father_era, excerpt,
                   full_text, source, source_url
            FROM {table}'''
    ).fetchall()
    con.close()

    per: dict[tuple[str, int], list] = collections.defaultdict(list)
    for r in rows:
        per[(r[0], r[1])].append(r)

    dest_root = os.path.join(out_root, folder)
    if clean and os.path.isdir(dest_root):
        shutil.rmtree(dest_root)

    total_raw = total_gz = 0
    for (book, chapter), rs in sorted(per.items()):
        texts: list[str] = []
        index: dict[str, int] = {}
        entries = []
        # stable order — the app sorts by father date, but keep output deterministic
        for r in sorted(rs, key=lambda x: (x[2], x[3], x[7] or '')):
            full = r[6] or ''
            if full not in index:
                index[full] = len(texts)
                texts.append(full)
            entries.append({
                'v': r[2], 'f': r[3], 'era': r[4],
                'e': r[5], 'ti': index[full],
                's': r[7] or '', 'u': r[8] or '',
            })

        book_dir = os.path.join(dest_root, book)
        os.makedirs(book_dir, exist_ok=True)
        payload = json.dumps({'texts': texts, 'entries': entries},
                             ensure_ascii=False, separators=(',', ':'))
        with open(os.path.join(book_dir, f'{chapter}.json'), 'w', encoding='utf-8') as f:
            f.write(payload)
        raw = len(payload.encode('utf-8'))
        total_raw += raw
        total_gz += len(gzip.compress(payload.encode('utf-8')))

    print(f'{folder}: {len(per):,} chapter files, {len(rows):,} entries, '
          f'{total_raw / 1e6:.1f} MB raw (~{total_gz / 1e6:.1f} MB over the wire)')


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default='temp/bible_phase2_test.db',
                    help='DB holding the full commentary data')
    ap.add_argument('--out', default='data/online', help='online JSON root')
    ap.add_argument('--keep', action='store_true',
                    help='do not wipe existing output folders first')
    args = ap.parse_args()

    for table, folder in SOURCES:
        build(args.src, args.out, table, folder, clean=not args.keep)


if __name__ == '__main__':
    main()
