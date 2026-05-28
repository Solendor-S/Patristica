"""
import_apologists.py — Import Tier-2 Apologist texts into bible.db

Texts:
  Justin Martyr — First Apology          (c. 155 AD)  68 chapters
  Justin Martyr — Dialogue with Trypho   (c. 155 AD) 142 chapters
  Irenaeus — Against Heresies Bk 1–5    (c. 180 AD)  ~166 chapters total
  Tertullian — Apologeticus              (c. 197 AD)   50 chapters

Source: www.newadvent.org/fathers/ (Roberts-Donaldson ANF, public domain)

Three fetch strategies:
  SINGLE  — full text on one page (Justin FA, Tertullian)
  MULTI   — text split across N pages, each with multiple chapters (Dialogue)
  PERCH   — one chapter per page (Irenaeus)

Usage:
  python scripts/import_apologists.py --db assets/db/bible.db
  python scripts/import_apologists.py --db assets/db/bible.db --dry-run
  python scripts/import_apologists.py --db assets/db/bible.db --text justin-first-apology
"""

import argparse
import html as html_lib
import re
import sqlite3
import time
import urllib.request

# ── Text registry ──────────────────────────────────────────────────────────────

# Single-page texts
SINGLE_PAGE = {
    'justin-first-apology': (
        'Justin Martyr — First Apology',
        'https://www.newadvent.org/fathers/0126.htm',
    ),
    'tertullian-apologeticus': (
        'Tertullian — Apologeticus',
        'https://www.newadvent.org/fathers/0301.htm',
    ),
}

# Multi-page texts: list of page URLs, each containing multiple chapters
MULTI_PAGE = {
    'justin-dialogue': (
        'Justin Martyr — Dialogue with Trypho',
        [f'https://www.newadvent.org/fathers/0128{n}.htm' for n in range(1, 10)],
    ),
}

# Per-chapter Irenaeus books: (book_name, book_num, max_chapters_to_try)
IRENAEUS = {
    'irenaeus-ah-1': ('Against Heresies Book 1', 1, 40),
    'irenaeus-ah-2': ('Against Heresies Book 2', 2, 40),
    'irenaeus-ah-3': ('Against Heresies Book 3', 3, 35),
    'irenaeus-ah-4': ('Against Heresies Book 4', 4, 50),
    'irenaeus-ah-5': ('Against Heresies Book 5', 5, 45),
}

ALL_KEYS = list(SINGLE_PAGE) + list(MULTI_PAGE) + list(IRENAEUS)

# ── Fetcher ────────────────────────────────────────────────────────────────────

def fetch(url: str) -> str:
    print(f'    GET {url}')
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; BibleApp/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    try:
        return raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw.decode('latin-1')

# ── HTML helpers ───────────────────────────────────────────────────────────────

_FOOTER_MARKERS = (
    'Translated by Alexander Roberts',
    'Ante-Nicene Fathers',
    'Christian Literature Publishing',
    'Contact information',
    'CONTACT US',
    'ADVERTISE WITH NEW ADVENT',
    'Kevin Knight',
    'newadvent.org/fathers',
    'About this page',
    # New Advent subscription nag (appears on per-chapter pages)
    'Please help support the mission of New Advent',
    'get the full contents of this website as an instant download',
)

def _is_footer_para(text: str) -> bool:
    tl = text.lower()
    return any(m.lower() in tl for m in _FOOTER_MARKERS)

def _strip_footer(body: str) -> str:
    for pat in [
        r'Source\.\s+Translated by',
        r'About this page',
        r'Contact information\.',
        r'CONTACT US \|',
        r'<div[^>]+id=["\']footer',
    ]:
        m = re.search(pat, body, re.IGNORECASE)
        if m:
            body = body[:m.start()]
            break
    return body

def clean_para(html: str) -> str:
    text = re.sub(r'<sup>\s*<a[^>]*>(\d+)</a>\s*</sup>', r'[\1]', html)
    text = re.sub(r'<a[^>]*>\s*<sup>(\d+)</sup>\s*</a>',  r'[\1]', text)
    text = re.sub(r'<sup>(\d+)</sup>',                     r'[\1]', text)
    text = re.sub(r'<br\s*/?>', ' ', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = html_lib.unescape(text)
    return ' '.join(text.split()).strip()

# ── Chapter regex — separator is optional to handle "Chapter N" and "Chapter N. Title" ──

_CH_RE = re.compile(
    r'<h[23][^>]*>\s*(?:Chapter|Chap\.?)\s+'
    r'([IVXLC]+|\d+)'           # Roman or Arabic numeral
    r'(?:[.\s—–-].*?)?'         # optional separator + title (any content, incl. nested tags)
    r'</h[23]>',
    re.IGNORECASE | re.DOTALL,
)

_ROMAN = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}

def roman_to_int(s: str) -> int:
    result, prev = 0, 0
    for ch in reversed(s.upper()):
        val = _ROMAN.get(ch, 0)
        result += val if val >= prev else -val
        prev = val
    return result or 1

# ── Single-page parser (Justin FA, Tertullian) ─────────────────────────────────

def parse_single(html: str, book_name: str) -> list[tuple[int, str]]:
    body_m = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL | re.IGNORECASE)
    body = body_m.group(1) if body_m else html
    body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r'<style[^>]*>.*?</style>',  '', body, flags=re.DOTALL | re.IGNORECASE)
    body = _strip_footer(body)

    splits = list(_CH_RE.finditer(body))
    if not splits:
        raise ValueError(f'No chapter headings found for {book_name}')

    chapters: list[tuple[int, str]] = []
    for i, match in enumerate(splits):
        raw_num = match.group(1)
        num = roman_to_int(raw_num.upper()) if not raw_num.isdigit() else int(raw_num)
        start = match.end()
        end   = splits[i + 1].start() if i + 1 < len(splits) else len(body)
        segment = body[start:end]

        paras = re.findall(r'<p[^>]*>(.*?)</p>', segment, re.DOTALL | re.IGNORECASE)
        if not paras:
            paras = re.findall(r'<p[^>]*>(.*?)(?=<p|<h[23]|<div|$)', segment, re.DOTALL | re.IGNORECASE)

        clean = [clean_para(p) for p in paras]
        clean = [p for p in clean if p and len(p) > 10 and not _is_footer_para(p)]

        body_text = '\n\n'.join(clean)
        if body_text.strip():
            chapters.append((num, body_text.strip()))

    return chapters

# ── Multi-page parser (Dialogue with Trypho) ──────────────────────────────────

def parse_multipage(urls: list[str], book_name: str, delay: float = 1.0) -> list[tuple[int, str]]:
    all_chapters: dict[int, str] = {}
    for url in urls:
        html = fetch(url)
        try:
            page_chapters = parse_single(html, book_name)
            for num, text in page_chapters:
                if num not in all_chapters:
                    all_chapters[num] = text
        except ValueError:
            print(f'    WARNING: no chapters on {url}')
        if url != urls[-1]:
            time.sleep(delay)
    return sorted(all_chapters.items())

# ── Per-chapter Irenaeus fetcher ───────────────────────────────────────────────

_IRENAEUS_CH_HDR = re.compile(
    r'Against\s+Heresies\s*\(Book\s+[IVX]+,\s*Chapter\s+\d+\)',
    re.IGNORECASE,
)
# Also matches chapter headings that appear only as h1 on some pages
_IRENAEUS_CH_H1 = re.compile(
    r'<h[12][^>]*>[^<]*Against\s+Heresies[^<]*</h[12]>',
    re.IGNORECASE | re.DOTALL,
)

def parse_irenaeus_book(
    book_name: str, book_num: int, max_chapters: int, delay: float = 0.8
) -> list[tuple[int, str]]:
    """
    Fetch each chapter page 0103{book_num}{ch:02d}.htm and extract content.
    Stops when a page does not contain an Against Heresies chapter heading,
    indicating we have gone past the book's last chapter.
    """
    chapters: list[tuple[int, str]] = []

    for ch in range(1, max_chapters + 1):
        url = f'https://www.newadvent.org/fathers/0103{book_num}{ch:02d}.htm'
        try:
            html = fetch(url)
        except Exception as e:
            print(f'    Ch{ch:02d} fetch error: {e} — stopping')
            break

        # Validity check: page must contain an Irenaeus chapter heading
        if not (_IRENAEUS_CH_HDR.search(html) or _IRENAEUS_CH_H1.search(html)):
            print(f'    Ch{ch:02d} no chapter heading — book ends at ch {ch - 1}')
            break

        body_m = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL | re.IGNORECASE)
        body = body_m.group(1) if body_m else html
        body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL | re.IGNORECASE)
        body = re.sub(r'<style[^>]*>.*?</style>',  '', body, flags=re.DOTALL | re.IGNORECASE)
        body = _strip_footer(body)

        paras = re.findall(r'<p[^>]*>(.*?)</p>', body, re.DOTALL | re.IGNORECASE)
        clean = [clean_para(p) for p in paras]
        clean = [p for p in clean if p and len(p) > 30 and not _is_footer_para(p)]

        body_text = '\n\n'.join(clean).strip()
        if body_text:
            chapters.append((ch, body_text))
        if ch < max_chapters:
            time.sleep(delay)

    return chapters

# ── DB helpers ─────────────────────────────────────────────────────────────────

def ensure_tables(db: sqlite3.Connection) -> None:
    db.execute('''CREATE TABLE IF NOT EXISTS early_texts (
        book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
        text TEXT NOT NULL, PRIMARY KEY (book, chapter, verse))''')
    db.execute('''CREATE TABLE IF NOT EXISTS early_text_footnotes (
        book TEXT NOT NULL, chapter INTEGER NOT NULL,
        marker INTEGER NOT NULL, note TEXT NOT NULL,
        PRIMARY KEY (book, chapter, marker))''')
    db.commit()

def write_chapters(
    db: sqlite3.Connection, book_name: str, chapters: list[tuple[int, str]], dry_run: bool
) -> None:
    print(f'  Parsed {len(chapters)} chapters')
    if not chapters:
        print('  WARNING: 0 chapters — skipping')
        return

    if dry_run:
        for num, body in chapters[:3]:
            print(f'  Ch.{num}: {body[:120].replace(chr(10), " ")}...')
        if len(chapters) > 3:
            print(f'  ... ({len(chapters) - 3} more chapters)')
        return

    db.execute('DELETE FROM early_texts WHERE book = ?', [book_name])
    text_rows = [(book_name, num, 1, body) for num, body in chapters]
    db.executemany(
        'INSERT INTO early_texts (book, chapter, verse, text) VALUES (?, ?, ?, ?)',
        text_rows,
    )
    db.commit()
    print(f'  Inserted {len(text_rows)} chapters -> "{book_name}"')

# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description='Import Tier-2 Apologist texts into bible.db')
    ap.add_argument('--db',      required=True, help='Path to bible.db')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--text',    choices=ALL_KEYS, help='Import only this text (default: all)')
    args = ap.parse_args()

    targets = [args.text] if args.text else ALL_KEYS

    db = sqlite3.connect(args.db)
    ensure_tables(db)

    for key in targets:
        # ── Single-page ──────────────────────────────────────────────────────
        if key in SINGLE_PAGE:
            book_name, url = SINGLE_PAGE[key]
            print(f'\n[{book_name}]')
            try:
                html = fetch(url)
                chapters = parse_single(html, book_name)
            except Exception as e:
                print(f'  ERROR: {e}')
                continue
            write_chapters(db, book_name, chapters, args.dry_run)
            time.sleep(1.5)

        # ── Multi-page ───────────────────────────────────────────────────────
        elif key in MULTI_PAGE:
            book_name, urls = MULTI_PAGE[key]
            print(f'\n[{book_name}]  ({len(urls)} pages)')
            try:
                chapters = parse_multipage(urls, book_name)
            except Exception as e:
                print(f'  ERROR: {e}')
                continue
            write_chapters(db, book_name, chapters, args.dry_run)
            time.sleep(1.5)

        # ── Per-chapter Irenaeus ─────────────────────────────────────────────
        elif key in IRENAEUS:
            book_name, book_num, max_ch = IRENAEUS[key]
            print(f'\n[{book_name}]  (fetching up to {max_ch} chapters)')
            try:
                chapters = parse_irenaeus_book(book_name, book_num, max_ch)
            except Exception as e:
                print(f'  ERROR: {e}')
                continue
            write_chapters(db, book_name, chapters, args.dry_run)
            time.sleep(1.5)

    db.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
