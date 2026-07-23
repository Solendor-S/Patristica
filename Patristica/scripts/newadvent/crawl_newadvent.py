"""
crawl_newadvent.py — Stage 1: fetch New Advent father pages into a local HTML cache.

Every fetched page is cached to temp/newadvent_cache/<name>.htm; a cached page is
NEVER re-fetched, so the site is hit exactly once per page ever and the parser can
iterate offline. Resume after interruption is automatic.

Usage (from Patristica/):
  python scripts/newadvent/crawl_newadvent.py                    # crawl all config fathers
  python scripts/newadvent/crawl_newadvent.py --father "Irenaeus of Lyons"
  python scripts/newadvent/crawl_newadvent.py --psalms           # build psalm offsets json

Outputs:
  temp/newadvent_cache/*.htm            raw pages
  temp/newadvent_crawl_manifest.json    [{father, work_title, work_url, chapter_urls}]
  temp/newadvent_psalm_offsets.json     {hebrew_psalm: title_verse_offset}  (--psalms)
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

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fathers_config import FATHERS, EXTRA_WORKS, CACHE_DIR, MANIFEST, PSALM_OFFSETS as OFFSETS  # noqa: E402

BASE      = 'https://www.newadvent.org'
INDEX_URL = BASE + '/fathers/'
DELAY_S   = 1.0


def cached_get(url: str, session: requests.Session) -> str:
    fname = url.rsplit('/', 1)[-1] or 'index.htm'
    path = os.path.join(CACHE_DIR, fname)
    if os.path.exists(path):
        with open(path, encoding='utf-8', errors='replace') as f:
            return f.read()
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            html = r.content.decode('utf-8', errors='replace')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(html)
            time.sleep(DELAY_S)
            return html
        except Exception as e:
            last_err = e
            time.sleep(2 ** attempt)
    raise RuntimeError(f'failed after retries: {url}: {last_err}')


def load_index(session: requests.Session) -> list[dict]:
    """Walk the /fathers/ index: <strong>Father</strong> headings followed by work links."""
    html = cached_get(INDEX_URL, session)
    soup = BeautifulSoup(html, 'html.parser')
    works: list[dict] = []
    current: str | None = None
    for el in soup.find_all(['strong', 'a']):
        if el.name == 'strong':
            current = el.get_text(strip=True)
        elif current in FATHERS:
            href = el.get('href', '')
            m = re.match(r'\.\./fathers/(\d+)\.htm$', href)
            if m:
                works.append({
                    'father': current,
                    'work_title': el.get_text(strip=True),
                    'work_url': f'{BASE}/fathers/{m.group(1)}.htm',
                    'work_id': m.group(1),
                })
    for father, title, url in EXTRA_WORKS:
        works.append({'father': father, 'work_title': title, 'work_url': url,
                      'work_id': url.rsplit('/', 1)[-1].replace('.htm', '')})
    return works


def _child_ids(html: str, page_id: str) -> list[str]:
    """Subpage ids linked from page NNNN[..].htm match NNNN[..]\\d{1,3}.htm.

    Depth varies by work: Against Heresies 0103 -> 0103101 (3 digits), Against
    Marcion 0312 -> 03121 (1 digit, per book). Recursion in discover_chapter_urls
    handles books that split further.
    """
    pat = re.compile(r'href="(?:\.\./fathers/|(?:https?://www\.newadvent\.org)?/fathers/)?('
                     + re.escape(page_id) + r'\d{1,3})\.htm"')
    seen: set[str] = set()
    out: list[str] = []
    for m in pat.finditer(html):
        if m.group(1) not in seen:
            seen.add(m.group(1))
            out.append(m.group(1))
    return out


def discover_chapter_urls(work: dict, session: requests.Session) -> list[str]:
    """BFS from the work page: fetch every subpage, recursing into sub-indexes."""
    urls: list[str] = []
    queue: list[str] = [work['work_id']]
    visited: set[str] = set()
    while queue:
        page_id = queue.pop(0)
        if page_id in visited:
            continue
        visited.add(page_id)
        url = f'{BASE}/fathers/{page_id}.htm'
        html = cached_get(url, session)
        urls.append(url)
        queue.extend(c for c in _child_ids(html, page_id) if c not in visited)
    return urls


def crawl(fathers_filter: list[str] | None) -> None:
    session = requests.Session()
    session.headers['User-Agent'] = 'Patristica-App-Research/1.0'
    works = load_index(session)
    if fathers_filter:
        works = [w for w in works if w['father'] in fathers_filter]
    print(f'{len(works)} works to crawl.')

    manifest: list[dict] = []
    total_pages = 0
    for i, work in enumerate(works, 1):
        try:
            chapters = discover_chapter_urls(work, session)
        except Exception as e:
            print(f'  [{i}/{len(works)}] ERROR {work["work_url"]}: {e}')
            continue
        for url in chapters:
            try:
                cached_get(url, session)
            except Exception as e:
                print(f'    ERROR {url}: {e}')
        total_pages += len(chapters)
        manifest.append({**work, 'chapter_urls': chapters})
        print(f'  [{i}/{len(works)}] {work["father"]} — {work["work_title"]}: {len(chapters)} page(s)')

    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f'\nManifest: {MANIFEST} ({len(manifest)} works, {total_pages} pages cached)')


def build_psalm_offsets(db_path: str) -> None:
    """offset(heb_psalm) = NewAdvent verse count (Vulgate numbering) - app KJV count.

    Fetches newadvent.org/bible/psaNNN.htm (cached like everything else); the <h1>
    carries the HEBREW psalm number. Merged pages (9/10, 114/115) are skipped —
    versification.py handles those with explicit split formulas.
    """
    session = requests.Session()
    session.headers['User-Agent'] = 'Patristica-App-Research/1.0'
    db = sqlite3.connect(db_path)
    cur = db.cursor()
    cur.execute("SELECT chapter, MAX(verse) FROM bible_verses WHERE book='Psalms' GROUP BY chapter")
    app_counts = dict(cur.fetchall())
    db.close()

    offsets: dict[int, int] = {}
    warned = 0
    for n in range(1, 151):
        url = f'{BASE}/bible/psa{n:03d}.htm'
        try:
            html = cached_get(url, session)
        except Exception:
            continue  # psa115/psa147 don't exist (merged into neighbours)
        h1 = re.search(r'<h1>Psalm\s+([\d/]+)', html)
        if not h1 or '/' in h1.group(1):
            continue  # merged page — handled by split formulas
        heb = int(h1.group(1))
        nums = [int(x) for x in re.findall(r'class="verse">(\d+)<', html)]
        if not nums:
            continue
        na_count = max(nums)
        app = app_counts.get(heb)
        if not app:
            continue
        off = na_count - app
        if off in (0, 1, 2):
            offsets[heb] = off
        else:
            warned += 1
            print(f'  WARN Psalm {heb}: NA count {na_count} vs app {app} (offset {off}) — defaulting 0')
            offsets[heb] = 0

    with open(OFFSETS, 'w', encoding='utf-8') as f:
        json.dump(offsets, f, indent=0)
    dist: dict[int, int] = {}
    for v in offsets.values():
        dist[v] = dist.get(v, 0) + 1
    print(f'Psalm offsets: {len(offsets)} psalms, distribution {dist}, {warned} warnings -> {OFFSETS}')


def main() -> None:
    ap = argparse.ArgumentParser(description='Crawl New Advent fathers into local cache')
    ap.add_argument('--father', action='append', help='Limit to this father heading (repeatable)')
    ap.add_argument('--psalms', action='store_true', help='Build psalm offsets json instead')
    ap.add_argument('--db', default=os.path.join('assets', 'db', 'bible.db'))
    args = ap.parse_args()

    os.makedirs(CACHE_DIR, exist_ok=True)
    if args.psalms:
        build_psalm_offsets(args.db)
    else:
        crawl(args.father)


if __name__ == '__main__':
    main()
