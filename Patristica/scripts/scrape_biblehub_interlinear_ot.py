"""
scrape_biblehub_interlinear_ot.py — Scrape BibleHub OT interlinear pages

Fetches https://biblehub.com/interlinear/{book_slug}/{ch}-{v}.htm for every
OT verse and saves the per-word (strongs, eng) data as JSON cache files.

Cache location: temp/biblehub_interlinear_cache/{book_slug}.json
Format: { "chapter": { "verse": [ {"strongs": "5375", "eng": "a bearer"}, ... ] } }

IMPORTANT: Run with the Scrapling Python, not the default Python:
  C:\\Users\\Sargo\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe scripts/scrape_biblehub_interlinear_ot.py --db assets/db/bible.db

Usage:
  ... --db assets/db/bible.db                  # scrape all OT books
  ... --db assets/db/bible.db --books "1 Samuel"
  ... --db assets/db/bible.db --books "Genesis" "Exodus"
"""

import argparse
import json
import sqlite3
import time
from pathlib import Path

CACHE_DIR = Path('temp/biblehub_interlinear_cache')

def book_to_slug(book: str) -> str:
    return book.lower().replace(' ', '_')


def load_cache(slug: str) -> dict:
    path = CACHE_DIR / f'{slug}.json'
    if path.exists():
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    return {}


def save_cache(slug: str, data: dict) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = CACHE_DIR / f'{slug}.json'
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)


def scrape_verse(fetcher, book_slug: str, chapter: int, verse: int) -> list:
    """Fetch one interlinear page and return list of {strongs, eng} dicts."""
    url = f'https://biblehub.com/interlinear/{book_slug}/{chapter}-{verse}.htm'
    try:
        page = fetcher.get(url)
    except Exception as e:
        print(f'    FETCH ERROR {url}: {e}')
        return []

    words = page.find_all('.tablefloatheb')
    result = []
    for w in words:
        strongs = ''
        for el in w.find_all('.strongsnt a'):
            txt = (el.text or '').strip()
            if txt.isdigit():
                strongs = txt
                break
        eng_el = w.find('.eng')
        eng = (eng_el.text or '').strip() if eng_el else ''
        result.append({'strongs': strongs, 'eng': eng})
    return result


def main():
    ap = argparse.ArgumentParser(description='Scrape BibleHub OT interlinear pages')
    ap.add_argument('--db',    required=True, help='Path to bible.db')
    ap.add_argument('--books', nargs='+',     help='Limit to these book(s); default = all OT')
    ap.add_argument('--delay', type=float, default=0.4, help='Seconds between requests (default 0.4)')
    args = ap.parse_args()

    from scrapling import Fetcher
    fetcher = Fetcher()

    conn = sqlite3.connect(args.db)
    rows = conn.execute(
        'SELECT book, chapter, verse FROM bible_verses ORDER BY rowid'
    ).fetchall()
    conn.close()

    # Group by book
    book_verses: dict = {}
    for book, ch, vs in rows:
        book_verses.setdefault(book, []).append((ch, vs))

    target_books = set(args.books) if args.books else set(book_verses.keys())
    # Filter to OT only (NT books aren't in scope)
    NT_BOOKS = {
        'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians',
        '2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
        '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus',
        'Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John',
        '3 John','Jude','Revelation',
    }
    target_books -= NT_BOOKS

    total_verses = sum(len(v) for b, v in book_verses.items() if b in target_books)
    print(f'Target: {len(target_books)} books, {total_verses} verses')

    done = 0
    for book in sorted(target_books):
        slug = book_to_slug(book)
        cache = load_cache(slug)
        verses = book_verses.get(book, [])
        book_new = 0

        for ch, vs in verses:
            ch_str, vs_str = str(ch), str(vs)
            if cache.get(ch_str, {}).get(vs_str) is not None:
                done += 1
                continue  # already cached

            data = scrape_verse(fetcher, slug, ch, vs)
            cache.setdefault(ch_str, {})[vs_str] = data
            book_new += 1
            done += 1

            if done % 100 == 0:
                print(f'  {done}/{total_verses} — last: {book} {ch}:{vs}', flush=True)

            # Save incrementally every 50 new verses so the run is resumable
            if book_new % 50 == 0 and book_new > 0:
                save_cache(slug, cache)

            time.sleep(args.delay)

        if book_new > 0:
            save_cache(slug, cache)
            print(f'  {book}: {book_new} new verses cached', flush=True)

    print(f'\nDone. {done} verses processed.')


if __name__ == '__main__':
    main()
