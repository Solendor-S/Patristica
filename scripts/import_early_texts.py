"""
import_early_texts.py — Import Didache and 1 Clement from Project Gutenberg.

Sources (public domain, Roberts-Donaldson translation):
  Didache:   gutenberg.org/cache/epub/42053/pg42053.txt  (ebook 42053)
  1 Clement: gutenberg.org/cache/epub/77576/pg77576.txt  (ebook 77576)

DB tables (created by provider.tsx on first launch):
  early_texts          (book, chapter, verse, text)
  early_text_footnotes (book, chapter, marker, note)

verse is always 1 per chapter — each chapter stored as a single block.
Inline [N] markers in the text are preserved; footnote text is stored separately.

Usage:
  python scripts/import_early_texts.py --db assets/db/bible.db
  python scripts/import_early_texts.py --db assets/db/bible.db --dry-run
  python scripts/import_early_texts.py --db assets/db/bible.db --text didache
  python scripts/import_early_texts.py --db assets/db/bible.db --text 1clement
"""

import argparse
import html as html_lib
import re
import sqlite3
import urllib.request

DIDACHE_URL   = 'https://www.gutenberg.org/cache/epub/42053/pg42053.txt'
CLEMENT_URL   = 'https://www.gutenberg.org/cache/epub/77576/pg77576.txt'
CLEMENT2_URL  = 'https://www.newadvent.org/fathers/1011.htm'

# ── Didache parser ────────────────────────────────────────────────────────────

def parse_didache(text: str) -> list[tuple[int, str]]:
    """
    Returns [(chapter_num, chapter_text), ...] for all 16 chapters.

    The English section starts after the Greek text. Chapters are marked
    'Chap. I:', 'Chap. II:', etc. We locate the English section by finding
    'Teaching of the Twelve Apostles' (English heading) then split on chapter
    markers within that section only.
    """
    # Find the English section — starts after the Greek text block
    english_start = text.find('Teaching of the Twelve Apostles')
    if english_start == -1:
        english_start = text.find('Teaching of the Twelve Apostels')
    if english_start == -1:
        raise ValueError('Could not locate English section in Didache file')

    english_text = text[english_start:]

    # Stop before the next major document (Gutenberg separator or next title)
    end_markers = ['*** END', 'End of the Project Gutenberg']
    for marker in end_markers:
        pos = english_text.find(marker)
        if pos != -1:
            english_text = english_text[:pos]

    # Split on chapter headings: 'Chap. I:' or 'Chap IV:' (period after Chap optional)
    chapter_re = re.compile(r'Chap\.?\s+([IVXLC]+)\s*:', re.IGNORECASE)
    splits = list(chapter_re.finditer(english_text))
    if not splits:
        raise ValueError('No chapter markers found in Didache English section')

    # Appendix marker — scholarly index that follows the main text
    appendix_re = re.compile(r'\[={5,}\]|USE OF THE HOLY SCRIPTURES', re.IGNORECASE)

    chapters = []
    for i, match in enumerate(splits):
        roman = match.group(1).upper()
        num = roman_to_int(roman)
        start = match.end()
        end = splits[i + 1].start() if i + 1 < len(splits) else len(english_text)
        body = english_text[start:end].strip()
        # Strip leading inline section number: '1 — ' before the text
        body = re.sub(r'^\d+\s*[—\-]+\s*', '', body)
        # Strip scholarly appendix content that sometimes follows the last chapter
        appendix_m = appendix_re.search(body)
        if appendix_m:
            body = body[:appendix_m.start()]
        body = clean_text(body)
        if body:
            chapters.append((num, body))

    return chapters


# ── Section extractors (for footnote boundary isolation) ──────────────────────

def _clip_to_markers(section: str, stop_markers: list[str]) -> str:
    stops = [p for m in stop_markers if (p := section.find(m)) != -1]
    return section[:min(stops)] if stops else section


def _1clement_section(raw: str) -> str:
    start = raw.find('CHAP. I.')
    if start == -1:
        return ''
    return _clip_to_markers(raw[start:], ['*** END', 'End of the Project Gutenberg', 'SECOND EPISTLE OF CLEMENT'])


def _2clement_section(raw: str) -> str:
    first = raw.find('SECOND EPISTLE OF CLEMENT')
    if first == -1:
        return ''
    start = raw.find('SECOND EPISTLE OF CLEMENT', first + 1)
    if start == -1:
        return ''
    return _clip_to_markers(raw[start:], ['*** END', 'End of the Project Gutenberg', 'EPISTLE OF POLYCARP'])


# ── 1 Clement parser ──────────────────────────────────────────────────────────

def parse_1clement(text: str) -> list[tuple[int, str]]:
    section = _1clement_section(text)
    if not section:
        raise ValueError('Could not locate 1 Clement (CHAP. I.) in file')

    # Chapters: 'CHAP. I.—_Title_' — match 'CHAP.' + roman + '.'
    # Underscores are italic markers in the plain-text encoding
    chapter_re = re.compile(r'CHAP\.\s+([IVXLC]+)\.', re.IGNORECASE)
    splits = list(chapter_re.finditer(section))

    if not splits:
        # Fallback: try without the trailing dot (some editions omit it)
        chapter_re = re.compile(r'CHAP\.\s+([IVXLC]+)', re.IGNORECASE)
        splits = list(chapter_re.finditer(section))

    if not splits:
        raise ValueError(f'No chapter markers found in 1 Clement section (section length: {len(section)})')

    chapters = []
    for i, match in enumerate(splits):
        roman = match.group(1).upper()
        num = roman_to_int(roman)
        start_pos = match.end()
        end_pos = splits[i + 1].start() if i + 1 < len(splits) else len(section)
        body = section[start_pos:end_pos]

        # Strip the subtitle — format: '—_Subtitle text._\n\nBody...'
        # Find closing underscore (end of subtitle) then take everything after it.
        close_us = body.find('_', body.find('_') + 1) if '_' in body else -1
        if close_us != -1:
            body = body[close_us + 1:]
        # Remove any remaining underscore italic markers
        body = body.replace('_', '')
        body = body.strip()

        # Strip footnote dump that bleeds into the last chapter's body.
        # The dump format is "Footnote N:\n\n  text" — the double newline before
        # "Footnote" distinguishes it from inline footnote cross-references.
        fn_dump = re.search(r'\n\s*\n\s*Footnote\s+\d+\s*:\s*\n', body)
        if fn_dump:
            body = body[:fn_dump.start()]

        body = body.strip()
        body = clean_text(body)
        if body:
            chapters.append((num, body))

    return chapters


# ── 2 Clement parser ──────────────────────────────────────────────────────────

def parse_2clement(html_text: str) -> list[tuple[int, str]]:
    """
    Returns [(chapter_num, chapter_text), ...] for all 20 chapters of 2 Clement.

    Source: New Advent (ANF Vol. 9, John Keith translation, public domain).
    Structure: <h2>Chapter N. Title</h2> followed by <p> paragraphs.
    No footnote markers in this translation.
    """
    sections = re.split(r'<h2>(Chapter \d+\.[^<]*)</h2>', html_text)
    chapters = []
    for i in range(1, len(sections) - 1, 2):
        title = sections[i]
        if not title.startswith('Chapter'):
            continue
        m = re.match(r'Chapter (\d+)\.', title)
        if not m:
            continue
        num = int(m.group(1))
        body_html = sections[i + 1]
        paragraphs = re.findall(r'<p>(.*?)</p>', body_html, re.DOTALL)
        clean_paras = []
        for p in paragraphs:
            text = re.sub(r'<[^>]+>', '', p)
            text = html_lib.unescape(text)
            text = ' '.join(text.split())
            if text:
                clean_paras.append(text)
        body = '\n\n'.join(clean_paras)
        if body:
            chapters.append((num, body))
    return chapters


# ── Footnote parser ───────────────────────────────────────────────────────────

def parse_footnotes(text: str) -> dict[int, str]:
    """
    Returns {marker_int: note_text} for all 'Footnote N:' blocks in the file.
    Format in ANF Gutenberg files:
      Footnote 4:

        Eph. v. 21; 1 Pet. v. 5.

      Footnote 5:
        ...
    """
    pattern = re.compile(
        r'Footnote\s+(\d+):\s*\r?\n\s*\r?\n\s+(.*?)(?=\r?\n\s*\r?\n\s*Footnote\s+\d+:|\Z)',
        re.DOTALL
    )
    result = {}
    for m in pattern.finditer(text):
        num = int(m.group(1))
        note = ' '.join(m.group(2).split())  # collapse whitespace
        result[num] = note
    return result


def extract_chapter_footnotes(
    chapter_text: str,
    all_footnotes: dict[int, str],
) -> list[tuple[int, str]]:
    """
    Scan chapter_text for inline [N] markers and return [(marker, note), ...].
    """
    markers = [int(m) for m in re.findall(r'\[(\d+)\]', chapter_text)]
    seen = set()
    result = []
    for n in markers:
        if n not in seen and n in all_footnotes:
            result.append((n, all_footnotes[n]))
            seen.add(n)
    return result


# ── Helpers ───────────────────────────────────────────────────────────────────

ROMAN = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}

def roman_to_int(s: str) -> int:
    result, prev = 0, 0
    for ch in reversed(s):
        val = ROMAN.get(ch, 0)
        result += val if val >= prev else -val
        prev = val
    return result


def clean_text(s: str) -> str:
    """Collapse whitespace and Gutenberg soft-wrap line breaks into clean prose."""
    s = re.sub(r'\x00|\x0c', '', s)
    # Split on paragraph breaks, join each paragraph's lines into one line
    paragraphs = re.split(r'\n{2,}', s)
    paragraphs = [' '.join(line.strip() for line in para.splitlines() if line.strip()) for para in paragraphs]
    return '\n\n'.join(p for p in paragraphs if p).strip()


def fetch(url: str) -> str:
    print(f'  Downloading {url} ...')
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    # Gutenberg UTF-8 files sometimes have a BOM
    return raw.decode('utf-8-sig')


# ── Main ──────────────────────────────────────────────────────────────────────

# (book_name, url, parser, section_fn_or_None)
# section_fn is used to bound parse_footnotes so footnotes from later texts
# don't bleed into the last footnote of this text.
TEXTS = {
    'didache':  ('Didache',   DIDACHE_URL,  parse_didache,   None),
    '1clement': ('1 Clement', CLEMENT_URL,  parse_1clement,  _1clement_section),
    '2clement': ('2 Clement', CLEMENT2_URL, parse_2clement,  None),
}

def main():
    ap = argparse.ArgumentParser(description='Import early Christian texts into bible.db')
    ap.add_argument('--db',      required=True, help='Path to bible.db')
    ap.add_argument('--dry-run', action='store_true', help='Parse and print without writing')
    ap.add_argument('--text',    choices=['didache', '1clement', '2clement'], help='Import only this text')
    args = ap.parse_args()

    targets = [args.text] if args.text else list(TEXTS.keys())

    db = sqlite3.connect(args.db)
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

    for key in targets:
        book_name, url, parser, section_fn = TEXTS[key]
        print(f'\n[{book_name}]')

        raw = fetch(url)
        chapters = parser(raw)
        print(f'  Parsed {len(chapters)} chapters')

        if args.dry_run:
            for num, body in chapters[:3]:
                print(f'  Ch.{num}: {body[:80]}...')
            if len(chapters) > 3:
                print(f'  ... ({len(chapters) - 3} more)')
            continue

        # Use bounded section text for footnote parsing so footnotes from
        # adjacent texts (e.g. 2 Clement) don't bleed into this text's last entry.
        fn_text = section_fn(raw) if section_fn else raw
        all_footnotes = parse_footnotes(fn_text)
        print(f'  Found {len(all_footnotes)} footnotes in source file')

        db.execute('DELETE FROM early_texts WHERE book = ?', [book_name])
        db.execute('DELETE FROM early_text_footnotes WHERE book = ?', [book_name])

        text_rows = [(book_name, num, 1, body) for num, body in chapters]
        db.executemany(
            'INSERT INTO early_texts (book, chapter, verse, text) VALUES (?, ?, ?, ?)',
            text_rows
        )

        fn_rows = []
        for num, body in chapters:
            for marker, note in extract_chapter_footnotes(body, all_footnotes):
                fn_rows.append((book_name, num, marker, note))
        db.executemany(
            'INSERT INTO early_text_footnotes (book, chapter, marker, note) VALUES (?, ?, ?, ?)',
            fn_rows
        )

        db.commit()
        print(f'  Inserted {len(text_rows)} chapters, {len(fn_rows)} footnotes for "{book_name}"')

    db.close()
    print('\nDone.')


if __name__ == '__main__':
    main()
