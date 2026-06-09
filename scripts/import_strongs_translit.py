"""
Populate missing translit and pronunciation fields in strongs_hebrew
(and pronunciation in strongs_greek) from the OpenScriptures Strong's JSON.

Source: https://github.com/openscriptures/strongs
  hebrew/strongs-hebrew-dictionary.js  → xlit, pron
  greek/strongs-greek-dictionary.js    → pron  (translit already populated)

Usage:
  python scripts/import_strongs_translit.py --db assets/db/bible.db
"""

import argparse
import json
import re
import sqlite3
import urllib.request


HEBREW_URL = 'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js'
GREEK_URL  = 'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js'


def fetch_dict(url: str) -> dict:
    print(f'  Fetching {url}')
    with urllib.request.urlopen(url, timeout=30) as r:
        raw = r.read().decode('utf-8')
    # Strip JS wrapper: "var strongsDictionary = {...};"
    raw = re.sub(r'^\s*var\s+\w+\s*=\s*', '', raw, count=1).rstrip().rstrip(';')
    return json.loads(raw)


def normalize_num(raw: str) -> str:
    """'h1' → 'H1', 'g2532' → 'G2532' (strip leading zeros after letter)."""
    if not raw:
        return raw
    prefix = raw[0].upper()
    digits = raw[1:].lstrip('0') or '0'
    return prefix + digits


def run(db_path: str):
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()

    # ── Hebrew ────────────────────────────────────────────────────────────────
    print('Loading Hebrew Strong\'s dictionary...')
    heb = fetch_dict(HEBREW_URL)
    h_updated = 0
    for raw_key, entry in heb.items():
        num    = normalize_num(raw_key)
        xlit   = (entry.get('xlit') or '').strip()
        pron   = (entry.get('pron') or '').strip()
        if not xlit and not pron:
            continue
        cur.execute(
            'UPDATE strongs_hebrew SET translit = ?, pronunciation = ? WHERE number = ?',
            (xlit, pron, num)
        )
        if cur.rowcount:
            h_updated += 1
    print(f'  Updated {h_updated} Hebrew entries')

    # ── Greek (pronunciation only — translit already populated) ────────────────
    print('Loading Greek Strong\'s dictionary...')
    grk = fetch_dict(GREEK_URL)
    g_updated = 0
    for raw_key, entry in grk.items():
        num  = normalize_num(raw_key)
        pron = (entry.get('pron') or '').strip()
        if not pron:
            continue
        cur.execute(
            'UPDATE strongs_greek SET pronunciation = ? WHERE number = ?',
            (pron, num)
        )
        if cur.rowcount:
            g_updated += 1
    print(f'  Updated {g_updated} Greek entries')

    conn.commit()
    conn.close()
    print('Done.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', required=True, help='Path to bible.db')
    args = parser.parse_args()
    run(args.db)
