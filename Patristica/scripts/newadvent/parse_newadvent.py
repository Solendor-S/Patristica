"""
parse_newadvent.py — Stage 2: cached New Advent HTML -> verse-keyed citation records.

Citations are machine-readable on New Advent:
  <span class="stiki" id="noteN"><a href="../bible/luk003.htm#verse23">Luke 3:23</a></span>
The href gives book/chapter/start-verse; the display text gives ranges/lists.
One output record per (citation x verse) — the app queries commentary by exact
(book, chapter, verse).

Runs entirely off temp/newadvent_cache/ — never hits the network.

Usage (from Patristica/):
  python scripts/newadvent/parse_newadvent.py            # parse + QA report + sample CSV
  python scripts/newadvent/parse_newadvent.py --father "Irenaeus of Lyons"

Outputs:
  temp/newadvent_citations.json       records for import stage
  temp/newadvent_report.txt           QA report
  temp/newadvent_review_sample.csv    200 random rows for human review
"""

import argparse
import csv
import json
import os
import random
import re
import sys

from bs4 import BeautifulSoup, NavigableString

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fathers_config import FATHERS, CACHE_DIR, MANIFEST, CITATIONS_JSON as OUT_JSON, record_key  # noqa: E402
import versification  # noqa: E402

REPORT    = os.path.join('temp', 'newadvent_report.txt')
SAMPLE    = os.path.join('temp', 'newadvent_review_sample.csv')
BOOKS_TS  = os.path.join('src', 'data', 'books.ts')

_SENT_SPLIT = re.compile(r'(?<=[.!?])\s+')
# 'Sirach 1:2 ' / '1 Corinthians 2:9 ' / 'Psalm 21:5-6 ' at the start of an excerpt
_LEADING_REF = re.compile(r'^(?:(?:[123]\s)?[A-Z][a-z]+(?:\sof\s[A-Z][a-z]+)?\s\d+(?::[\d,\s\-–]+)?\s*)+')


def make_excerpt(text: str, max_chars: int = 220) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    sp = cut.rfind(' ')
    return (cut[:sp] if sp > 0 else cut) + '…'


def clean_text(s: str) -> str:
    return ' '.join(s.replace('\xa0', ' ').split()).strip()


def load_book_chapters() -> dict[str, int]:
    """Book name -> chapter count from books.ts (canon + apocrypha)."""
    with open(BOOKS_TS, encoding='utf-8') as f:
        src = f.read()
    return {m.group(1): int(m.group(2))
            for m in re.finditer(r"\{ name: '([^']+)',\s*chapters: (\d+)", src)}


def sentence_context(para, span) -> tuple[str, str]:
    """(excerpt, full_text) for a citation span inside paragraph `para`.

    excerpt = the sentence immediately preceding the span (New Advent places the
    citation right after the sentence it supports), falling back to the sentence
    after it. full_text = the whole cleaned paragraph.
    """
    marker = NavigableString('')
    span.insert_before(marker)
    text = clean_text(para.get_text())
    marker.extract()  # restore soup for other spans in this paragraph
    span_pos = text.find('')
    text_clean = clean_text(text.replace('', ' '))
    if span_pos <= 0:
        before, after = '', text_clean
    else:
        before = text[:span_pos]
        after = text[span_pos + 1:].strip()
        span_text = clean_text(span.get_text())
        if after.startswith(span_text):  # drop the citation's own display text
            after = after[len(span_text):].strip()

    sentences = _SENT_SPLIT.split(before.strip())
    excerpt = sentences[-1].strip() if sentences and sentences[-1].strip() else ''
    # sentence fragments like "3." or a bare list number aren't useful — widen
    if len(excerpt) < 25 and len(sentences) >= 2:
        excerpt = (sentences[-2] + ' ' + excerpt).strip()
    if len(excerpt) < 25:
        first_after = _SENT_SPLIT.split(after.strip())
        if first_after and len(first_after[0].strip()) > len(excerpt):
            excerpt = first_after[0].strip()
    # adjacent citations leak the previous span's display text into the excerpt
    excerpt = _LEADING_REF.sub('', excerpt).strip()
    return make_excerpt(excerpt or text_clean), text_clean


def breadcrumb_source(soup, work_title: str) -> str:
    """'Against Heresies, Book I, Chapter 1' from the #mi5 breadcrumbs."""
    title = re.sub(r'\s*\([^)]*\)\s*$', '', work_title).strip()  # drop "(St. Irenaeus)"
    mi5 = soup.find(id='mi5')
    if mi5:
        parts = [clean_text(p) for p in mi5.get_text().split('>')]
        if len(parts) >= 2 and parts[-1] and parts[-1].lower() != title.lower():
            return f'{title}, {parts[-1]}'
    return title


def parse_page(html: str, work: dict, page_url: str, records: list[dict],
               stats: dict) -> None:
    soup = BeautifulSoup(html, 'html.parser')
    scope = soup.find(id='springfield2') or soup
    source_base = breadcrumb_source(soup, work['work_title'])
    meta = FATHERS[work['father']]

    for span in scope.select('span.stiki'):
        a = span.find('a', href=True)
        if not a:
            continue
        stats['spans'] += 1
        href, display = a['href'], clean_text(a.get_text())
        refs = versification.convert_citation(href, display)
        if refs is None:
            stats['unknown_codes'].add(href)
            continue

        para = span.find_parent(['p', 'blockquote', 'li']) or span.parent
        # single-page works: add nearest preceding chapter heading to the locator
        source = source_base
        if source_base == re.sub(r'\s*\([^)]*\)\s*$', '', work['work_title']).strip() \
                and ',' not in source_base:
            h = para.find_previous(['h2', 'h3']) if para else None
            if h:
                hm = re.match(r'\s*(Chapter|Chap\.?|Section)\s+([IVXLC\d]+)',
                              h.get_text(), re.IGNORECASE)
                if hm:
                    source = f'{source_base}, Chapter {hm.group(2)}'

        excerpt, full_text = sentence_context(para, span) if para else (display, display)
        if len(full_text) < 30:
            stats['tiny_context'] += 1

        for book, ch, verse in refs:
            records.append({
                'father_heading': work['father'],
                'father_name': meta['key'],
                'father_era': meta['era'],
                'father_era_order': meta['era_order'],
                'book': book, 'chapter': ch, 'verse': verse,
                'display': display,
                'excerpt': excerpt, 'full_text': full_text,
                'source': source, 'source_url': page_url,
            })


def main() -> None:
    ap = argparse.ArgumentParser(description='Parse cached New Advent pages into citation records')
    ap.add_argument('--father', action='append', help='Limit to this father heading (repeatable)')
    args = ap.parse_args()

    with open(MANIFEST, encoding='utf-8') as f:
        manifest = json.load(f)
    if args.father:
        manifest = [w for w in manifest if w['father'] in args.father]

    records: list[dict] = []
    stats = {'spans': 0, 'unknown_codes': set(), 'tiny_context': 0,
             'pages': 0, 'missing_pages': []}
    per_work: dict[str, int] = {}

    for work in manifest:
        before = len(records)
        for url in work['chapter_urls']:
            path = os.path.join(CACHE_DIR, url.rsplit('/', 1)[-1])
            if not os.path.exists(path):
                stats['missing_pages'].append(url)
                continue
            with open(path, encoding='utf-8', errors='replace') as f:
                html = f.read()
            parse_page(html, work, url, records, stats)
            stats['pages'] += 1
        per_work[f"{work['father']} — {work['work_title']}"] = len(records) - before

    # in-run dedup (same citation parsed twice via duplicate links)
    seen: set[tuple] = set()
    unique: list[dict] = []
    dupes = 0
    for r in records:
        key = record_key(r)
        if key in seen:
            dupes += 1
            continue
        seen.add(key)
        unique.append(r)
    records = unique

    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=1)

    # ── QA report (report-only; the importer drops bad-verse rows against the
    #    actual --db target, so a missing local assets DB never skips the guard) ──
    book_chapters = load_book_chapters()
    verse_counts: dict[tuple[str, int], int] = {}
    db_path = os.path.join('assets', 'db', 'bible.db')
    if os.path.exists(db_path):
        import sqlite3
        con = sqlite3.connect(db_path)
        verse_counts = {(b, c): v for b, c, v in con.execute(
            'SELECT book, chapter, MAX(verse) FROM bible_verses GROUP BY book, chapter')}
        con.close()
    dangling = {}
    verse_over = {}
    chapter_level = 0
    for r in records:
        if r['verse'] == 0:
            chapter_level += 1
        maxc = book_chapters.get(r['book'])
        if maxc is None or r['chapter'] < 1 or r['chapter'] > maxc:
            dangling[(r['book'], r['chapter'])] = dangling.get((r['book'], r['chapter']), 0) + 1
        maxv = verse_counts.get((r['book'], r['chapter']))
        if maxv and r['verse'] > maxv:
            k = (r['book'], r['chapter'])
            verse_over[k] = verse_over.get(k, 0) + 1

    lines = [
        f'Pages parsed: {stats["pages"]}   (missing from cache: {len(stats["missing_pages"])})',
        f'Citation spans seen: {stats["spans"]}',
        f'Records (rows, after {dupes} in-run dupes removed): {len(records)}',
        f'Chapter-level rows (verse=0): {chapter_level}',
        f'Tiny-context paragraphs (<30 chars): {stats["tiny_context"]}',
        '',
        f'UNKNOWN BOOK CODES ({len(stats["unknown_codes"])}):',
        *[f'  {h}' for h in sorted(stats['unknown_codes'])],
        '',
        f'DANGLING REFS (book, chapter out of range) ({len(dangling)}):',
        *[f'  {b} {c}: {n} rows' for (b, c), n in sorted(dangling.items())],
        '',
        f'VERSE OUT OF RANGE — source typos, dropped at import ({sum(verse_over.values())} rows in {len(verse_over)} chapters):',
        *[f'  {b} {c}: {n} rows' for (b, c), n in sorted(verse_over.items())],
        '',
        'ROWS PER WORK:',
        *[f'  {k}: {v}' for k, v in per_work.items()],
    ]
    if stats['missing_pages']:
        lines += ['', 'MISSING PAGES:'] + [f'  {u}' for u in stats['missing_pages'][:20]]
    report = '\n'.join(lines)
    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write(report)

    # ── human-review sample ───────────────────────────────────────────────────
    random.seed(42)
    sample = random.sample(records, min(200, len(records)))
    with open(SAMPLE, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['father', 'source', 'ref', 'display_text', 'excerpt', 'source_url'])
        for r in sample:
            w.writerow([r['father_name'], r['source'],
                        f"{r['book']} {r['chapter']}:{r['verse']}",
                        r['display'], r['excerpt'], r['source_url']])

    print(report[:2000])
    print(f'\nWrote {len(records)} records -> {OUT_JSON}')
    print(f'Report -> {REPORT}   Sample -> {SAMPLE}')


if __name__ == '__main__':
    main()
