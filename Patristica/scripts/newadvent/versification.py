"""
versification.py — Convert New Advent citation refs to the app's versification.

Two jobs:
  1. 3-letter New Advent bible file codes -> app book names (books.ts canon + apocrypha).
  2. Psalms: New Advent displays VULGATE numbering (verified: Augustine's
     "Exposition on Psalm 23" cites "Psalm 22:1" -> psa022.htm). Chapter mapping
     plus per-psalm verse offset (Vulgate counts superscriptions as verse 1-2;
     English/KJV does not).

Verse offsets are data-driven: temp/newadvent_psalm_offsets.json maps Hebrew
psalm -> (vulgate_verse_count - english_verse_count), built by
`crawl_newadvent.py --psalms` from New Advent's own pages vs bible_verses.
Run self-test:  python scripts/newadvent/versification.py
"""

import json
import os
import re

# New Advent bible file code -> app book name (from newadvent.org/bible/ index, 73 books)
BOOK_CODES: dict[str, str] = {
    'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers',
    'deu': 'Deuteronomy', 'jos': 'Joshua', 'jdg': 'Judges', 'rut': 'Ruth',
    '1sa': '1 Samuel', '2sa': '2 Samuel', '1ki': '1 Kings', '2ki': '2 Kings',
    '1ch': '1 Chronicles', '2ch': '2 Chronicles', 'ezr': 'Ezra', 'neh': 'Nehemiah',
    'tob': 'Tobit', 'jth': 'Judith', 'est': 'Esther',
    '1ma': '1 Maccabees', '2ma': '2 Maccabees',
    'job': 'Job', 'psa': 'Psalms', 'pro': 'Proverbs', 'ecc': 'Ecclesiastes',
    'son': 'Song of Solomon', 'wis': 'Wisdom of Solomon', 'sir': 'Sirach',
    'isa': 'Isaiah', 'jer': 'Jeremiah', 'lam': 'Lamentations', 'bar': 'Baruch',
    'eze': 'Ezekiel', 'dan': 'Daniel', 'hos': 'Hosea', 'joe': 'Joel',
    'amo': 'Amos', 'oba': 'Obadiah', 'jon': 'Jonah', 'mic': 'Micah',
    'nah': 'Nahum', 'hab': 'Habakkuk', 'zep': 'Zephaniah', 'hag': 'Haggai',
    'zec': 'Zechariah', 'mal': 'Malachi',
    'mat': 'Matthew', 'mar': 'Mark', 'luk': 'Luke', 'joh': 'John', 'act': 'Acts',
    'rom': 'Romans', '1co': '1 Corinthians', '2co': '2 Corinthians',
    'gal': 'Galatians', 'eph': 'Ephesians', 'phi': 'Philippians', 'col': 'Colossians',
    '1th': '1 Thessalonians', '2th': '2 Thessalonians',
    '1ti': '1 Timothy', '2ti': '2 Timothy', 'tit': 'Titus', 'phm': 'Philemon',
    'heb': 'Hebrews', 'jam': 'James', '1pe': '1 Peter', '2pe': '2 Peter',
    '1jo': '1 John', '2jo': '2 John', '3jo': '3 John', 'jud': 'Jude',
    'rev': 'Revelation',
}

SINGLE_CHAPTER_BOOKS = {'Obadiah', 'Philemon', '2 John', '3 John', 'Jude'}

# Hand-verified citations where New Advent tagged the wrong reference outright.
# Key is (href file code+number, display text); each was checked against the words
# actually quoted in the surrounding prose.
CITATION_OVERRIDES: dict[tuple[str, str], list[tuple[str, int, int]]] = {
    # NPNF Jerome, Against Jovinianus II: 1 John has only 5 chapters. 'Christ is
    # called the truth' quotes John 14:6 — New Advent tagged the wrong book code.
    ('1jo014', '1 John 14:6'): [('John', 14, 6)],
}

# Non-Psalms chapter quirks; empty until the dangling-ref QA check surfaces a real one.
# ponytail: verified live that New Advent uses English chapters for Malachi (mal004.htm
# exists), so no pre-emptive entries.
BOOK_CHAPTER_FIXUPS: dict[tuple[str, int], tuple[str, int]] = {}

from fathers_config import PSALM_OFFSETS as _OFFSETS_PATH  # noqa: E402

_psalm_offsets: dict[int, int] | None = None


def _load_offsets() -> dict[int, int]:
    global _psalm_offsets
    if _psalm_offsets is None:
        if os.path.exists(_OFFSETS_PATH):
            with open(_OFFSETS_PATH, encoding='utf-8') as f:
                _psalm_offsets = {int(k): v for k, v in json.load(f).items()}
        else:
            _psalm_offsets = {}
    return _psalm_offsets


def vulgate_to_english_psalm(vulg_ch: int, vulg_v: int) -> tuple[int, int]:
    """(Vulgate chapter, Vulgate verse) -> (English chapter, English verse).

    Split/merge cases per LXX/Vulgate convention (New Advent's own psalm nav
    confirms: psa009 = '9/10', psa113 = '114/115', psa114 = '116', psa146 = '147'):
      Vulg 9:1-21   -> Heb 9   | Vulg 9:22-39  -> Heb 10 (v-21)
      Vulg 113:1-8  -> Heb 114 | Vulg 113:9-26 -> Heb 115 (v-8)
      Vulg 114      -> Heb 116:1-9
      Vulg 115      -> Heb 116 (traditional numbering already starts at 10)
      Vulg 146      -> Heb 147:1-11
      Vulg 147      -> Heb 147 (traditional numbering already starts at 12)
    Normal psalms: chapter +1 in the 10-112 / 116-145 bands, then subtract the
    title offset (verses the Vulgate counts for the superscription, English doesn't).
    """
    if vulg_ch == 9:
        heb = (9, vulg_v) if vulg_v <= 21 else (10, vulg_v - 21)
    elif vulg_ch == 113:
        heb = (114, vulg_v) if vulg_v <= 8 else (115, vulg_v - 8)
    elif vulg_ch == 114:
        heb = (116, vulg_v)
    elif vulg_ch == 115:
        heb = (116, vulg_v if vulg_v >= 10 else vulg_v + 9)
    elif vulg_ch == 146:
        heb = (147, vulg_v)
    elif vulg_ch == 147:
        heb = (147, vulg_v if vulg_v >= 12 else vulg_v + 11)
    elif vulg_ch <= 8 or vulg_ch >= 148:
        heb = (vulg_ch, vulg_v)
    else:
        heb = (vulg_ch + 1, vulg_v)

    heb_ch, heb_v = heb
    offset = _load_offsets().get(heb_ch, 0)
    return heb_ch, max(1, heb_v - offset)


def parse_bible_href(href: str) -> tuple[str, int, int | None] | None:
    """'../bible/luk003.htm#verse23' -> ('luk', 3, 23). Verse part optional."""
    m = re.search(r'bible/([a-z0-9]{3})(\d{3})\.htm(?:#verse(\d+))?', href)
    if not m:
        return None
    return m.group(1), int(m.group(2)), int(m.group(3)) if m.group(3) else None


def expand_display_range(display: str, fallback_verse: int | None) -> list[int]:
    """Verse list from citation display text after the colon.

    'Luke 1:32-33' -> [32, 33]; 'Matthew 11:9, 11' -> [9, 11];
    'Mark 4:3-8, 13' -> [3..8, 13]. Cross-chapter ranges ('Luke 1:80-2:7') and
    unparseable text fall back to [fallback_verse] from the href.
    """
    display = display.replace('\xa0', ' ').replace('–', '-').replace('—', '-')
    if ':' not in display:
        return [fallback_verse] if fallback_verse else []
    after = display.split(':', 1)[1].strip()
    if ':' in after:  # cross-chapter range — keep only the start verse
        return [fallback_verse] if fallback_verse else []
    verses: list[int] = []
    for part in after.split(','):
        part = part.strip().rstrip('.;')
        m = re.match(r'^(\d+)\s*-\s*(\d+)$', part)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            if 0 < b - a <= 40:
                verses.extend(range(a, b + 1))
            else:
                verses.append(a)
        elif part.isdigit():
            verses.append(int(part))
    if not verses and fallback_verse:
        verses = [fallback_verse]
    return verses


def display_chapter(display: str) -> int | None:
    """Chapter number from display text: 'Luke 1:32-33' -> 1. None if absent."""
    display = display.replace('\xa0', ' ')
    m = re.search(r'(\d+):', display)
    return int(m.group(1)) if m else None


def convert_citation(href: str, display: str,
                     vulgate_psalms: bool = False) -> list[tuple[str, int, int]] | None:
    """One New Advent citation -> [(app_book, chapter, verse), ...].

    Returns None for unknown book codes (caller flags them — never guess).
    Chapter-only citations (no verse anywhere) return [(book, chapter, 0)],
    matching the existing HCF convention for chapter-level commentary.

    `vulgate_psalms` is set by the caller for works in VULGATE_PSALM_WORKS, whose
    translation prints Vulgate psalm numbers; every other work is stored verbatim.
    """
    parsed = parse_bible_href(href)
    if not parsed:
        return None
    code, file_ch, href_verse = parsed
    book = BOOK_CODES.get(code)
    if not book:
        return None

    override = CITATION_OVERRIDES.get((f'{code}{file_ch:03d}',
                                       display.replace('\xa0', ' ').strip()))
    if override:
        return list(override)

    ch = display_chapter(display)
    if ch is None:
        ch = 1 if book in SINGLE_CHAPTER_BOOKS else file_ch
        # 'Jude 4' style: trailing number is the verse for single-chapter books
        if book in SINGLE_CHAPTER_BOOKS and href_verse is None:
            m = re.search(r'(\d+)\s*$', display.replace('\xa0', ' '))
            if m:
                href_verse = int(m.group(1))

    verses = expand_display_range(display, href_verse)

    # Psalms in a Vulgate-numbered work (see VULGATE_PSALM_WORKS for why this is a
    # whitelist and not inferred per citation). Display text carries the Vulgate
    # chapter AND verse, so both are converted; the title-verse offset comes from
    # the psalm-offsets json.
    if book == 'Psalms' and vulgate_psalms:
        if not verses:
            return [('Psalms', vulgate_to_english_psalm(ch, 1)[0], 0)]
        return [('Psalms', *vulgate_to_english_psalm(ch, v)) for v in verses]

    if not verses:
        return [(book, ch, 0)]
    b, c = BOOK_CHAPTER_FIXUPS.get((book, ch), (book, ch))
    return [(b, c, v) for v in verses]


# ── self-test ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # simulate offsets: Ps 3 title=1, Ps 23 title merged (0), Ps 51 title=2
    _psalm_offsets = {3: 1, 23: 0, 51: 2}

    assert parse_bible_href('../bible/luk003.htm#verse23') == ('luk', 3, 23)
    assert parse_bible_href('../bible/psa022.htm#verse1') == ('psa', 22, 1)
    assert parse_bible_href('../bible/jud001.htm') == ('jud', 1, None)

    assert expand_display_range('Luke\xa01:32-33', 32) == [32, 33]
    assert expand_display_range('Matthew\xa011:9,\xa011', 9) == [9, 11]
    assert expand_display_range('Matthew\xa020:1-16', 1) == list(range(1, 17))
    assert expand_display_range('Luke 1:80-2:7', 80) == [80]

    # The verified Augustine case: Vulg "Psalm 22:1" -> English Psalm 23:1
    assert vulgate_to_english_psalm(22, 1) == (23, 1)
    # Vulg 50:3 -> English 51:1 (2-verse title)
    assert vulgate_to_english_psalm(50, 3) == (51, 1)
    # Vulg 3:2 -> English 3:1 (1-verse title)
    assert vulgate_to_english_psalm(3, 2) == (3, 1)
    # Merged psalm splits
    assert vulgate_to_english_psalm(9, 22)[0] == 10
    assert vulgate_to_english_psalm(113, 9) == (115, 1)
    assert vulgate_to_english_psalm(115, 10) == (116, 10)
    assert vulgate_to_english_psalm(147, 12) == (147, 12)

    assert convert_citation('../bible/luk003.htm#verse23', 'Luke\xa03:23') == [('Luke', 3, 23)]

    # ── psalm numbering: verbatim by default, converted only for whitelisted works ──
    # default (ANF, Chrysostom, everything not in VULGATE_PSALM_WORKS) — verbatim,
    # regardless of what the href file number happens to be
    assert convert_citation('../bible/psa021.htm#verse16', 'Psalm\xa022:16') == [('Psalms', 22, 16)]
    assert convert_citation('../bible/psa018.htm#verse1-4', 'Psalm\xa019:1-4') == [
        ('Psalms', 19, v) for v in range(1, 5)]
    # the Clement of Rome false positive an auto-detect would have corrupted: href
    # and display agree at 19, but the text ('the heavens declare') is English 19
    assert convert_citation('../bible/psa019.htm#verse1', 'Psalm\xa019:1') == [('Psalms', 19, 1)]
    # Athanasius 'lift up your heads, O ye gates' — English 24:7, left alone
    assert convert_citation('../bible/psa024.htm#verse7', 'Psalm\xa024:7') == [('Psalms', 24, 7)]

    # whitelisted work (Augustine's Enarrations, Gregory's Pastoral Rule)
    assert convert_citation('../bible/psa022.htm#verse1', 'Psalm\xa022:1',
                            vulgate_psalms=True) == [('Psalms', 23, 1)]
    assert convert_citation('../bible/psa050.htm#verse3', 'Psalm\xa050:3',
                            vulgate_psalms=True) == [('Psalms', 51, 1)]
    # chapter-level Vulgate citation keeps verse 0, converts the chapter only
    assert convert_citation('../bible/psa022.htm', 'Psalm\xa022',
                            vulgate_psalms=True) == [('Psalms', 23, 0)]
    # ponytail ceiling, asserted so it stays a known quantity: psalms 1-8 and
    # 148-150 share a chapter number in both schemes, so a Vulgate work's title
    # offset there is real but uncorrectable from the chapter alone
    assert convert_citation('../bible/psa003.htm#verse2', 'Psalm\xa03:2',
                            vulgate_psalms=True) == [('Psalms', 3, 1)]
    assert convert_citation('../bible/sir002.htm#verse1', 'Sirach\xa02:1') == [('Sirach', 2, 1)]
    assert convert_citation('../bible/jud001.htm#verse4', 'Jude\xa04') == [('Jude', 1, 4)]
    assert convert_citation('../bible/gen015.htm', 'Genesis\xa015') == [('Genesis', 15, 0)]

    print('versification self-test OK')
