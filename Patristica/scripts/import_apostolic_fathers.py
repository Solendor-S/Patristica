"""
import_apostolic_fathers.py — Import Tier-1 Apostolic Fathers from New Advent (ANF, public domain).

Texts imported:
  Ignatius of Antioch — 7 letters (c. 107–110 AD)
  Epistle to Diognetus  (c. 130–200 AD)
  Epistle of Barnabas   (c. 70–132 AD)
  Epistle of Polycarp   (c. 110–140 AD)
  Martyrdom of Polycarp (c. 155 AD)

Source: www.newadvent.org/fathers/ (Roberts-Donaldson ANF translation, public domain)

DB tables (already created by provider.tsx):
  early_texts          (book, chapter, verse, text)
  early_text_footnotes (book, chapter, marker, note)

verse is always 1 per chapter — each chapter is a single prose block.
Inline footnote markers are converted to [N] format; footnote text stored separately.

Usage:
  python scripts/import_apostolic_fathers.py --db assets/db/bible.db
  python scripts/import_apostolic_fathers.py --db assets/db/bible.db --dry-run
  python scripts/import_apostolic_fathers.py --db assets/db/bible.db --text ignatius-ephesians
"""

import argparse
import html as html_lib
import re
import sqlite3
import time
import urllib.request

# ── Text registry ─────────────────────────────────────────────────────────────

TEXTS = {
    'ignatius-ephesians':    ('Ignatius to the Ephesians',    'https://www.newadvent.org/fathers/0104.htm'),
    'ignatius-magnesians':   ('Ignatius to the Magnesians',   'https://www.newadvent.org/fathers/0105.htm'),
    'ignatius-trallians':    ('Ignatius to the Trallians',    'https://www.newadvent.org/fathers/0106.htm'),
    'ignatius-romans':       ('Ignatius to the Romans',       'https://www.newadvent.org/fathers/0107.htm'),
    'ignatius-philadelphians': ('Ignatius to the Philadelphians', 'https://www.newadvent.org/fathers/0108.htm'),
    'ignatius-smyrnaeans':   ('Ignatius to the Smyrnaeans',   'https://www.newadvent.org/fathers/0109.htm'),
    'ignatius-polycarp':     ('Ignatius to Polycarp',         'https://www.newadvent.org/fathers/0110.htm'),
    'diognetus':             ('Epistle to Diognetus',         'https://www.newadvent.org/fathers/0101.htm'),
    'barnabas':              ('Epistle of Barnabas',          'https://www.newadvent.org/fathers/0124.htm'),
    'polycarp-epistle':      ('Epistle of Polycarp',          'https://www.newadvent.org/fathers/0136.htm'),
    'martyrdom-polycarp':    ('Martyrdom of Polycarp',        'https://www.newadvent.org/fathers/0102.htm'),
}

# ── Fetcher ───────────────────────────────────────────────────────────────────

def fetch(url: str) -> str:
    print(f'  Downloading {url} ...')
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; BibleApp/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    # Try UTF-8 first, fall back to latin-1
    try:
        return raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw.decode('latin-1')

# ── HTML cleaner ──────────────────────────────────────────────────────────────

def strip_tags(html: str) -> str:
    """Remove all HTML tags."""
    return re.sub(r'<[^>]+>', '', html)

def clean_para(html: str) -> str:
    """
    Convert a single <p>…</p> inner HTML to clean prose.
    - Replaces <sup><a …>N</a></sup>  →  [N]  (footnote marker)
    - Replaces <br>/<br /> with space
    - Strips remaining tags
    - Unescapes HTML entities
    - Collapses whitespace
    """
    # Convert footnote markers: <sup><a ...>N</a></sup> → [N]
    # New Advent uses several patterns:
    #   <sup><a href="#fn1">1</a></sup>
    #   <a href="#fn1"><sup>1</sup></a>
    #   <sup>1</sup>  (plain, no link)
    text = re.sub(r'<sup>\s*<a[^>]*>(\d+)</a>\s*</sup>', r'[\1]', html)
    text = re.sub(r'<a[^>]*>\s*<sup>(\d+)</sup>\s*</a>',  r'[\1]', text)
    text = re.sub(r'<sup>(\d+)</sup>',                     r'[\1]', text)
    # <br> → space
    text = re.sub(r'<br\s*/?>', ' ', text)
    # Remove remaining tags
    text = strip_tags(text)
    text = html_lib.unescape(text)
    # Collapse internal whitespace
    text = ' '.join(text.split())
    return text.strip()

# ── Footer detector ───────────────────────────────────────────────────────────

_FOOTER_MARKERS = (
    'Translated by Alexander Roberts',
    'Ante-Nicene Fathers',
    'Christian Literature Publishing',
    'Contact information',
    'CONTACT US',
    'ADVERTISE WITH NEW ADVENT',
    'Kevin Knight',
    'newadvent.org/fathers',
)

def _is_footer_para(text: str) -> bool:
    tl = text.lower()
    return any(m.lower() in tl for m in _FOOTER_MARKERS)


# ── New Advent chapter parser ──────────────────────────────────────────────────

def parse_newadvent(html: str, book_name: str) -> list[tuple[int, str]]:
    """
    Parse a New Advent page into [(chapter_num, chapter_text), ...].

    New Advent ANF structure:
      <h2>Chapter I.—Title text.</h2>
      <p>Paragraph text...</p>
      <p>More text...</p>
      <h2>Chapter II.—...</h2>
      ...

    Some texts (Martyrdom of Polycarp, Diognetus) use Arabic numerals:
      <h2>Chapter 1. Title.</h2>

    Preface/salutation before Chapter 1 is stored as chapter 0 (intro),
    but we skip chapter 0 if empty and start at 1.
    """
    # Isolate the main content block — skip navigation/header cruft.
    # New Advent wraps content in <div class="pod"> or just uses <body>.
    body_m = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL | re.IGNORECASE)
    body = body_m.group(1) if body_m else html

    # Remove <script>, <style>, <nav>, header/footer boilerplate
    body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r'<style[^>]*>.*?</style>',  '', body, flags=re.DOTALL | re.IGNORECASE)

    # Truncate at New Advent footer markers (source attribution / contact info)
    for footer_pat in [
        r'Source\.\s+Translated by',
        r'Contact information\.',
        r'CONTACT US \|',
        r'<div[^>]+id=["\']footer',
        r'<div[^>]+class=["\'][^"\']*footer',
    ]:
        m = re.search(footer_pat, body, re.IGNORECASE)
        if m:
            body = body[:m.start()]
            break

    # Split on chapter headings.
    # Pattern covers:
    #   <h2>Chapter I.—Title</h2>
    #   <h2>Chapter 1. Title</h2>
    #   <h2>Chapter I. Title</h2>
    #   <h2>Chap. I.—Title</h2>
    ch_re = re.compile(
        r'<h2[^>]*>\s*(?:Chapter|Chap\.?)\s+'
        r'([IVXLC]+|\d+)'      # Roman or Arabic numeral
        r'[.\s—–-]'            # separator
        r'[^<]*</h2>',
        re.IGNORECASE,
    )
    splits = list(ch_re.finditer(body))

    if not splits:
        # Fallback: some texts use <b>Chapter N.</b> at paragraph start
        ch_re2 = re.compile(
            r'<p[^>]*>\s*<b>\s*(?:Chapter|Chap\.?)\s+([IVXLC]+|\d+)[.\s—–-][^<]*</b>',
            re.IGNORECASE,
        )
        splits = list(ch_re2.finditer(body))

    if not splits:
        raise ValueError(f'No chapter headings found for {book_name}. '
                         f'Check the New Advent URL or HTML structure.')

    chapters: list[tuple[int, str]] = []
    for i, match in enumerate(splits):
        raw_num = match.group(1)
        # Convert Roman or keep Arabic
        num = roman_to_int(raw_num.upper()) if not raw_num.isdigit() else int(raw_num)

        start = match.end()
        end   = splits[i + 1].start() if i + 1 < len(splits) else len(body)
        segment = body[start:end]

        # Extract <p> paragraphs from segment
        paras = re.findall(r'<p[^>]*>(.*?)</p>', segment, re.DOTALL | re.IGNORECASE)
        if not paras:
            # Some pages use <p> without closing tag (HTML4); grab text differently
            paras = re.findall(r'<p[^>]*>(.*?)(?=<p|<h[23]|<div|$)', segment, re.DOTALL | re.IGNORECASE)

        clean_paras = [clean_para(p) for p in paras]
        clean_paras = [p for p in clean_paras if p and len(p) > 10
                       and not _is_footer_para(p)]

        body_text = '\n\n'.join(clean_paras)
        if body_text.strip():
            chapters.append((num, body_text.strip()))

    return chapters


def parse_footnotes_html(html: str) -> dict[int, str]:
    """
    Extract footnotes from New Advent pages.
    Common formats:
      <p><a name="fn1"></a>1. Footnote text here.</p>
      <p id="fn1">1. text</p>
      <p><sup>1</sup> text</p>
    """
    notes: dict[int, str] = {}

    # Pattern 1: <a name="fnN"> or <a name="fN">
    pattern1 = re.compile(
        r'<a\s+name=["\']fn?(\d+)["\'][^>]*></a>\s*\d+\.?\s*(.*?)(?=<a\s+name=["\']fn?\d|$)',
        re.DOTALL | re.IGNORECASE,
    )
    for m in pattern1.finditer(html):
        num  = int(m.group(1))
        text = clean_para(m.group(2))
        if text and num not in notes:
            notes[num] = text

    # Pattern 2: <p><sup>N</sup> text</p>  (fallback)
    if not notes:
        pattern2 = re.compile(
            r'<p[^>]*>\s*<sup>(\d+)</sup>\s*(.*?)</p>',
            re.DOTALL | re.IGNORECASE,
        )
        for m in pattern2.finditer(html):
            num  = int(m.group(1))
            text = clean_para(m.group(2))
            if text and num not in notes:
                notes[num] = text

    return notes


def extract_chapter_footnotes(
    chapter_text: str,
    all_footnotes: dict[int, str],
) -> list[tuple[int, str]]:
    """Return [(marker_int, note_text), ...] for [N] markers in chapter_text."""
    markers = [int(m) for m in re.findall(r'\[(\d+)\]', chapter_text)]
    seen:  set[int] = set()
    result: list[tuple[int, str]] = []
    for n in markers:
        if n not in seen and n in all_footnotes:
            result.append((n, all_footnotes[n]))
            seen.add(n)
    return result


# ── Helpers ───────────────────────────────────────────────────────────────────

ROMAN = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}

def roman_to_int(s: str) -> int:
    result, prev = 0, 0
    for ch in reversed(s.upper()):
        val = ROMAN.get(ch, 0)
        result += val if val >= prev else -val
        prev = val
    return result or 1   # never return 0


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(
        description='Import Tier-1 Apostolic Fathers into bible.db'
    )
    ap.add_argument('--db',      required=True, help='Path to bible.db')
    ap.add_argument('--dry-run', action='store_true',
                    help='Parse and print without writing to DB')
    ap.add_argument('--text',    choices=list(TEXTS.keys()),
                    help='Import only this text (default: all)')
    args = ap.parse_args()

    targets = [args.text] if args.text else list(TEXTS.keys())

    db = sqlite3.connect(args.db)
    # Tables should already exist from provider.tsx, but create if missing
    db.execute('''
        CREATE TABLE IF NOT EXISTS early_texts (
            book    TEXT    NOT NULL,
            chapter INTEGER NOT NULL,
            verse   INTEGER NOT NULL,
            text    TEXT    NOT NULL,
            PRIMARY KEY (book, chapter, verse)
        )
    ''')
    db.execute('''
        CREATE TABLE IF NOT EXISTS early_text_footnotes (
            book    TEXT    NOT NULL,
            chapter INTEGER NOT NULL,
            marker  INTEGER NOT NULL,
            note    TEXT    NOT NULL,
            PRIMARY KEY (book, chapter, marker)
        )
    ''')
    db.commit()

    for key in targets:
        book_name, url = TEXTS[key]
        print(f'\n[{book_name}]')

        try:
            html = fetch(url)
        except Exception as e:
            print(f'  ERROR fetching: {e}')
            continue

        try:
            chapters = parse_newadvent(html, book_name)
        except ValueError as e:
            print(f'  ERROR parsing: {e}')
            continue

        print(f'  Parsed {len(chapters)} chapters')

        if not chapters:
            print('  WARNING: 0 chapters — skipping')
            continue

        if args.dry_run:
            for num, body in chapters[:3]:
                preview = body[:120].replace('\n', ' ')
                print(f'  Ch.{num}: {preview}...')
            if len(chapters) > 3:
                print(f'  ... ({len(chapters) - 3} more chapters)')
            continue

        # Parse footnotes from the same page
        footnotes = parse_footnotes_html(html)
        print(f'  Found {len(footnotes)} footnotes')

        # Write to DB
        db.execute('DELETE FROM early_texts WHERE book = ?',          [book_name])
        db.execute('DELETE FROM early_text_footnotes WHERE book = ?', [book_name])

        text_rows = [(book_name, num, 1, body) for num, body in chapters]
        db.executemany(
            'INSERT INTO early_texts (book, chapter, verse, text) VALUES (?, ?, ?, ?)',
            text_rows,
        )

        fn_rows: list[tuple] = []
        for num, body in chapters:
            for marker, note in extract_chapter_footnotes(body, footnotes):
                fn_rows.append((book_name, num, marker, note))
        db.executemany(
            'INSERT INTO early_text_footnotes (book, chapter, marker, note) VALUES (?, ?, ?, ?)',
            fn_rows,
        )

        db.commit()
        print(f'  Inserted {len(text_rows)} chapters, {len(fn_rows)} footnotes -> "{book_name}"')

        # Polite crawl delay between requests
        if targets.index(key) < len(targets) - 1:
            time.sleep(1.5)

    db.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
