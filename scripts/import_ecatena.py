"""
import_ecatena.py — Scrape e-Catena (earlychristianwritings.com/e-catena/)
and import the 12,517 ANF cross-references into the commentary table in bible.db.

e-Catena is organised: NT verse → list of patristic allusions (author, work, quote).
Each entry maps directly to the commentary table schema.

Scraping is checkpointed: scraped data is saved to temp/ecatena_raw.json so the
9-minute scrape only runs once. Re-running the script skips straight to import.

Usage:
  python scripts/import_ecatena.py --db assets/db/bible.db
  python scripts/import_ecatena.py --db assets/db/bible.db --dry-run
  python scripts/import_ecatena.py --db assets/db/bible.db --scrape-only
  python scripts/import_ecatena.py --db assets/db/bible.db --import-only
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time

import requests
from bs4 import BeautifulSoup

BASE_URL   = 'https://www.earlychristianwritings.com/e-catena/'
CHECKPOINT = os.path.join('temp', 'ecatena_raw.json')
DELAY_S    = 1.2   # polite rate-limit between requests

# ── NT book abbreviation → canonical name ────────────────────────────────────

VERSE_ABBREV: dict[str, str] = {
    'Matt':     'Matthew',   'Mt':       'Matthew',
    'Mark':     'Mark',      'Mk':       'Mark',
    'Luke':     'Luke',      'Lk':       'Luke',
    'John':     'John',      'Jn':       'John',
    'Acts':     'Acts',
    'Rom':      'Romans',
    '1 Cor':    '1 Corinthians',  '2 Cor':  '2 Corinthians',
    '1Cor':     '1 Corinthians',  '2Cor':   '2 Corinthians',
    'Gal':      'Galatians',
    'Eph':      'Ephesians',
    'Phil':     'Philippians',
    'Col':      'Colossians',
    '1 Thess':  '1 Thessalonians', '2 Thess': '2 Thessalonians',
    '1Thess':   '1 Thessalonians', '2Thess':  '2 Thessalonians',
    '1 Tim':    '1 Timothy',  '2 Tim':  '2 Timothy',
    '1Tim':     '1 Timothy',  '2Tim':   '2 Timothy',
    'Tit':      'Titus',
    'Philem':   'Philemon',   'Phlm':   'Philemon',
    'Heb':      'Hebrews',
    'Jas':      'James',
    '1 Pet':    '1 Peter',    '2 Pet':  '2 Peter',
    '1Pet':     '1 Peter',    '2Pet':   '2 Peter',
    '1 John':   '1 John',     '2 John': '2 John',   '3 John': '3 John',
    '1Jn':      '1 John',     '2Jn':    '2 John',   '3Jn':    '3 John',
    'Jude':     'Jude',
    'Rev':      'Revelation', 'Apoc':   'Revelation',
}
_SORTED_ABBREVS = sorted(VERSE_ABBREV.keys(), key=len, reverse=True)

_VERSE_RE = re.compile(
    r'^(' + '|'.join(re.escape(a) for a in _SORTED_ABBREVS) + r')'
    r'\.?\s+(\d+):(\d+)',
    re.IGNORECASE,
)

def parse_verse_ref(text: str) -> tuple[str, int, int] | None:
    text = text.strip()
    m = _VERSE_RE.match(text)
    if not m:
        return None
    abbrev = m.group(1)
    # case-insensitive lookup
    canonical = next(
        (VERSE_ABBREV[k] for k in _SORTED_ABBREVS if k.lower() == abbrev.lower()),
        None,
    )
    if not canonical:
        return None
    return canonical, int(m.group(2)), int(m.group(3))


# ── Author name extraction from link text ────────────────────────────────────
# e-Catena link text: "Clement of Alexandria Stromata Book II"
# We extract the known author prefix and leave the rest as the work title.

# Ordered longest → shortest so "Clement of Alexandria" matches before "Clement"
KNOWN_AUTHORS: list[tuple[str, str]] = sorted([
    ('Clement of Alexandria',   'Clement Of Alexandria'),
    ('Clement of Rome',         'Clement Of Rome'),
    ('Origen of Alexandria',    'Origen of Alexandria'),
    ('Origen',                  'Origen of Alexandria'),
    ('Irenaeus',                'Irenaeus of Lyons'),
    ('Tertullian',              'Tertullian of Carthage'),
    ('Justin Martyr',           'Justin Martyr'),
    ('Justin',                  'Justin Martyr'),
    ('Ignatius',                'Ignatius of Antioch'),
    ('Polycarp',                'Polycarp of Smyrna'),
    ('Cyprian',                 'Cyprian of Carthage'),
    ('Hippolytus',              'Hippolytus of Rome'),
    ('Shepherd of Hermas',      'Shepherd of Hermas'),
    ('Hermas',                  'Shepherd of Hermas'),
    ('Barnabas',                'Epistle of Barnabas'),
    ('Didache',                 'The Didache'),
    ('Theophilus',              'Theophilus of Antioch'),
    ('Athenagoras',             'Athenagoras of Athen'),
    ('Tatian',                  'Tatian the Assyrian'),
    ('Methodius',               'Methodius of Olympus'),
    ('Lactantius',              'Lucius Caecilius Firmianus Lactantius'),
    ('Novatian',                'A Treatise Against the Heretic Novatian'),
    ('Arnobius',                'Arnobius of Sicca'),
    ('Minucius Felix',          'Minucius Felix'),
    ('Dionysius of Alexandria', 'Dionysius of Alexandria'),
    ('Julius Africanus',        'Julius Africanus'),
    ('Gregory Thaumaturgus',    'Gregory the Wonderworker'),
    ('Alexander of Alexandria', 'Alexander of Alexandria'),
    ('Peter of Alexandria',     'Peter of Alexandria'),
    ('Victorinus',              'Victorinus of Pettau'),
    ('Commodian',               'Commodian'),
    ('Apostolic Constitutions', 'The Apostolic Constitutions'),
    ('Didascalia',              'Didascalia Apostolorum'),
], key=lambda x: len(x[0]), reverse=True)

def extract_author_and_work(link_text: str) -> tuple[str, str]:
    """Return (db_father_name, work_title). Falls back to (link_text, '')."""
    t = link_text.strip()
    for prefix, db_name in KNOWN_AUTHORS:
        if t.lower().startswith(prefix.lower()):
            work = t[len(prefix):].strip().lstrip(',').strip()
            return db_name, work
    return t, ''


# ── Quote cleaning ────────────────────────────────────────────────────────────

_FOOTNOTE_NUM_RE = re.compile(r'\s*\[\d+\]\s*$')

def clean_quote(text: str) -> str:
    text = text.strip().strip('"').strip('“”')
    text = _FOOTNOTE_NUM_RE.sub('', text).strip()
    return text


# ── Excerpt helper ────────────────────────────────────────────────────────────

def make_excerpt(text: str, max_chars: int = 220) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    sp = cut.rfind(' ')
    return cut[:sp] if sp > 0 else cut


# ── Scraper ───────────────────────────────────────────────────────────────────

def get_chapter_urls(session: requests.Session) -> list[str]:
    """Fetch the e-Catena index and return all chapter page URLs."""
    resp = session.get(BASE_URL, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, 'html.parser')
    urls = []
    for a in soup.find_all('a', href=True):
        href = a['href']
        if re.match(r'^[a-z0-9]+\.html?$', href, re.IGNORECASE) and href != 'index.html':
            urls.append(BASE_URL + href)
    # deduplicate preserving order
    seen: set[str] = set()
    result = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            result.append(u)
    return result


def scrape_chapter_page(soup: BeautifulSoup, page_url: str) -> list[dict]:
    """Parse a single e-Catena chapter page and return list of entry dicts.

    HTML structure per entry:
      <p><font size="+1">Rom. 8:2 - <a>NIV</a>, <a>NAB</a> - in <a href="ccel...">Author Work Title</a></font></p>
      <blockquote>quote text [footnote_num]</blockquote>
    """
    entries = []

    for p in soup.find_all('p'):
        font = p.find('font')
        if not font:
            continue

        # Verse ref is the first text node inside the font tag
        font_text = font.get_text()
        # Extract "Rom. 8:2" from "Rom. 8:2 - NIV, NAB - in Clement of Alexandria..."
        verse_part = font_text.split(' - ')[0].strip() if ' - ' in font_text else ''
        if not verse_part:
            # Try splitting on ' -'
            verse_part = font_text.split(' -')[0].strip()
        ref = parse_verse_ref(verse_part)
        if not ref:
            continue
        book, chapter, verse = ref

        # Author+work link is the LAST <a> in the <p> (after NIV and NAB links)
        all_links = font.find_all('a')
        if not all_links:
            continue
        author_link = all_links[-1]
        link_text   = author_link.get_text(strip=True)
        href        = author_link.get('href', '')
        if not link_text:
            continue

        author_db, work = extract_author_and_work(link_text)

        # Quote is in the <blockquote> immediately following this <p>
        bq = p.find_next_sibling('blockquote')
        quote_text = clean_quote(bq.get_text()) if bq else ''

        entries.append({
            'book':        book,
            'chapter':     chapter,
            'verse':       verse,
            'father_name': author_db,
            'source':      work or link_text,
            'source_url':  href if href.startswith('http') else '',
            'quote':       quote_text,
        })

    return entries


def scrape_all(session: requests.Session) -> list[dict]:
    urls = get_chapter_urls(session)
    print(f'Found {len(urls)} chapter pages to scrape.')
    all_entries: list[dict] = []
    for i, url in enumerate(urls, 1):
        try:
            resp = session.get(url, timeout=30)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'html.parser')
            entries = scrape_chapter_page(soup, url)
            all_entries.extend(entries)
            print(f'  [{i}/{len(urls)}] {url.split("/")[-1]}: {len(entries)} entries')
        except Exception as e:
            print(f'  [{i}/{len(urls)}] ERROR {url}: {e}')
        time.sleep(DELAY_S)
    return all_entries


# ── Importer ─────────────────────────────────────────────────────────────────

def already_exists(cur: sqlite3.Cursor, book: str, chapter: int, verse: int,
                   father_name: str, source: str) -> bool:
    cur.execute(
        'SELECT 1 FROM commentary WHERE book=? AND chapter=? AND verse=? '
        'AND father_name=? AND source=? LIMIT 1',
        (book, chapter, verse, father_name, source),
    )
    return cur.fetchone() is not None


def import_entries(entries: list[dict], db: sqlite3.Connection,
                   dry_run: bool) -> tuple[int, int]:
    cur = db.cursor()
    inserted = skipped = 0
    for e in entries:
        book        = e['book']
        chapter     = e['chapter']
        verse       = e['verse']
        father_name = e['father_name']
        source      = e['source']
        quote       = e['quote']
        source_url  = e['source_url']

        if not quote:
            skipped += 1
            continue

        if already_exists(cur, book, chapter, verse, father_name, source):
            skipped += 1
            continue

        excerpt   = make_excerpt(quote)
        full_text = quote

        if dry_run:
            print(f'  {book} {chapter}:{verse} | {father_name} | {source[:50]}')
            inserted += 1
            continue

        cur.execute(
            '''INSERT INTO commentary
               (book, chapter, verse, father_name, father_era, father_era_order,
                excerpt, full_text, source, source_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (book, chapter, verse, father_name, 'Early Church', 4,
             excerpt, full_text, source, source_url),
        )
        inserted += 1

    if not dry_run:
        db.commit()
    return inserted, skipped


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description='Scrape e-Catena and import into bible.db')
    ap.add_argument('--db',          help='Path to bible.db')
    ap.add_argument('--dry-run',     action='store_true')
    ap.add_argument('--scrape-only', action='store_true', help='Scrape and save JSON, no DB write')
    ap.add_argument('--import-only', action='store_true', help='Skip scrape, use existing checkpoint')
    args = ap.parse_args()

    os.makedirs('temp', exist_ok=True)

    # ── Scrape phase ──────────────────────────────────────────────────────────
    if not args.import_only:
        if os.path.exists(CHECKPOINT):
            print(f'Checkpoint found: {CHECKPOINT} — skipping scrape.')
            print('Use --import-only to import it, or delete the file to re-scrape.')
        else:
            print('Starting scrape of e-Catena (260 pages, ~5 min) ...')
            session = requests.Session()
            session.headers['User-Agent'] = 'Patristica-App-Research/1.0'
            entries = scrape_all(session)
            with open(CHECKPOINT, 'w', encoding='utf-8') as f:
                json.dump(entries, f, ensure_ascii=False, indent=2)
            print(f'Saved {len(entries)} entries to {CHECKPOINT}')
            if args.scrape_only:
                return

    # ── Import phase ──────────────────────────────────────────────────────────
    if args.scrape_only:
        return

    if not args.db:
        sys.exit('--db required for import')

    if not os.path.exists(CHECKPOINT):
        sys.exit(f'No checkpoint at {CHECKPOINT}. Run without --import-only first.')

    with open(CHECKPOINT, encoding='utf-8') as f:
        entries = json.load(f)
    print(f'Loaded {len(entries)} entries from checkpoint.')

    db = sqlite3.connect(args.db)
    inserted, skipped = import_entries(entries, db, args.dry_run)
    db.close()

    if args.dry_run:
        print(f'\nDry-run: {inserted} would insert, {skipped} skip')
    else:
        print(f'\nDone. Inserted: {inserted}, skipped (dup/no-quote): {skipped}')


if __name__ == '__main__':
    main()
