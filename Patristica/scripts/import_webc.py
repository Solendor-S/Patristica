"""
Build the WEB and World English Bible Catholic packs and online JSON from eBible's USFM.

Both are public domain, so they need no schema bump: each ships as a normal pack
plus per-chapter JSON.

  temp/<slug>_usfm.zip      <- downloaded once from eBible.org
  temp/packs/<slug>.db      <- pack (upload to packs-v1)
  data/online/<slug>/...    <- [{verse, text}] per chapter

"World English Bible" is an eBible.org trademark covering the unaltered text, so
only markup is removed here. Never edit the wording. Two markers survive on purpose:
\\jw...\\jw* (words of Jesus, read by splitByWj; stripUsfm removes them for display)
and {note} (a source footnote standing in for a blank verse, shown in italics).

\\jw is USFM's \\wj renamed, and must stay that way. This data goes live on master, and
already-released apps strip \\w as a prefix, which would leave a stray "j" on screen.

The WEBC's Greek Esther and Daniel replace the Hebrew books: its Daniel has 14 chapters,
with the Prayer of Azariah at 3:24-90, Susanna at 13 and Bel at 14 (see WEBC_DEUTERO in
src/data/books.ts). Psalm titles and section headings are dropped.

Run from Patristica/: python scripts/import_webc.py webc   (or: web, maccabees)

`maccabees` replaces the text of the 3 and 4 Maccabees packs, which were imported in Greek
and which the KJV Apocrypha doesn't contain. Those two packs are built here, not by
generate_packs.py: its source DB still holds the Greek, so rerun this after that script.
"""

import json
import os
import re
import shutil
import sqlite3
import sys
import urllib.request
import zipfile

BOOKS_TS = "src/data/books.ts"   # chapter counts to check against
CORE_DB  = "assets/db/bible.db"  # KJV, to report verses this edition doesn't have

EDITIONS = {
    "webc": {"url": "https://eBible.org/Scriptures/eng-web-c_usfm.zip", "translation": "WEBC",
             "books": 73, "daniel": 14},
    "web":  {"url": "https://eBible.org/Scriptures/engwebp_usfm.zip", "translation": "WEB",
             "books": 66, "daniel": 12},
}

USFM_TO_BOOK = {
    "GEN": "Genesis", "EXO": "Exodus", "LEV": "Leviticus", "NUM": "Numbers",
    "DEU": "Deuteronomy", "JOS": "Joshua", "JDG": "Judges", "RUT": "Ruth",
    "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Kings", "2KI": "2 Kings",
    "1CH": "1 Chronicles", "2CH": "2 Chronicles", "EZR": "Ezra", "NEH": "Nehemiah",
    "EST": "Esther", "ESG": "Esther", "JOB": "Job", "PSA": "Psalms", "PRO": "Proverbs",
    "ECC": "Ecclesiastes", "SNG": "Song of Solomon", "ISA": "Isaiah",
    "JER": "Jeremiah", "LAM": "Lamentations", "EZK": "Ezekiel", "DAN": "Daniel", "DAG": "Daniel",
    "HOS": "Hosea", "JOL": "Joel", "AMO": "Amos", "OBA": "Obadiah",
    "JON": "Jonah", "MIC": "Micah", "NAM": "Nahum", "HAB": "Habakkuk",
    "ZEP": "Zephaniah", "HAG": "Haggai", "ZEC": "Zechariah", "MAL": "Malachi",
    "MAT": "Matthew", "MRK": "Mark", "LUK": "Luke", "JHN": "John",
    "ACT": "Acts", "ROM": "Romans", "1CO": "1 Corinthians", "2CO": "2 Corinthians",
    "GAL": "Galatians", "EPH": "Ephesians", "PHP": "Philippians", "COL": "Colossians",
    "1TH": "1 Thessalonians", "2TH": "2 Thessalonians", "1TI": "1 Timothy",
    "2TI": "2 Timothy", "TIT": "Titus", "PHM": "Philemon", "HEB": "Hebrews",
    "JAS": "James", "1PE": "1 Peter", "2PE": "2 Peter", "1JN": "1 John",
    "2JN": "2 John", "3JN": "3 John", "JUD": "Jude", "REV": "Revelation",
    "TOB": "Tobit", "JDT": "Judith", "WIS": "Wisdom of Solomon", "SIR": "Sirach",
    "BAR": "Baruch", "1MA": "1 Maccabees", "2MA": "2 Maccabees",
}

# Whole-line markers whose content isn't verse text.
SKIP_LINE = re.compile(
    r"^\\(id|ide|usfm|rem|h|toca?\d?|mte?\d?|ms\d?|mr|sr|s\d?|r|d|sp|qa|cl|cd|cp|is\d?|ip|imt\d?|ib)(\s|$)"
)
CHAPTER = re.compile(r"^\\c\s+(\d+)")
VERSE   = re.compile(r"\\v\s+(\d+)(?:-(\d+))?\s*")
NOTE    = re.compile(r"\\(f|fe|x)\s.*?\\\1\*", re.S)
WORD    = re.compile(r"\\\+?w\s+([^|\\]*?)(?:\|[^\\]*?)?\\\+?w\*")
DIVINE  = re.compile(r"\\\+?nd\s+(.*?)\\\+?nd\*")
CLOSER  = re.compile(r"\\\+?(?!wj[\s*])[a-z]+\d*\*")
OPENER  = re.compile(r"\\\+?(?!wj[\s*])[a-z]+\d*\s*")
FT_NOTE = re.compile(r"\\ft\s+(.*?)\\f\*", re.S)
# A footnote between two words of Jesus splits the span; rejoin so phrases stay searchable.
WJ_JOIN = re.compile(r"\\wj\*\s*\\wj\s+")
WJ_MARK = re.compile(r"\\jw\*?\s*")


def clean(text: str) -> str:
    text = NOTE.sub("", text)
    text = WORD.sub(r"\1", text)
    text = DIVINE.sub(lambda m: m.group(1).upper(), text)
    text = CLOSER.sub("", text)
    text = OPENER.sub("", text)
    text = WJ_JOIN.sub(" ", text).replace("\\wj", "\\jw")
    return re.sub(r"\s+", " ", text).strip()


def verse_text(raw: str) -> str:
    """Clean text, or the source's footnote in {braces} if the verse is deliberately blank."""
    text = clean(raw)
    if WJ_MARK.sub("", text).strip():
        return text
    note = FT_NOTE.search(raw)
    return "{" + clean(note.group(1)) + "}" if note else ""


def parse_book(usfm: str) -> tuple[dict, list]:
    """Returns ({(chapter, verse): text}, ranges). A verse range is stored at its first number."""
    raw, ranges = {}, []
    chapter = verse = None
    for line in usfm.splitlines():
        line = line.strip()
        if not line or SKIP_LINE.match(line):
            continue
        m = CHAPTER.match(line)
        if m:
            chapter, verse = int(m.group(1)), None
            continue
        pos = 0
        for m in VERSE.finditer(line):
            if verse is not None:
                raw[(chapter, verse)] += " " + line[pos:m.start()]
            verse = int(m.group(1))
            if m.group(2):
                ranges.append(f"{chapter}:{m.group(1)}-{m.group(2)}")
            raw[(chapter, verse)] = ""
            pos = m.end()
        if verse is not None:
            raw[(chapter, verse)] += " " + line[pos:]
    return {k: verse_text(v) for k, v in raw.items()}, ranges


def fetch_zip(url: str, path: str):
    if not os.path.exists(path):
        print(f"Downloading {url} ...")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp, open(path, "wb") as out:
            shutil.copyfileobj(resp, out)


def write_chapters(json_dir: str, verses: dict) -> int:
    shutil.rmtree(json_dir, ignore_errors=True)
    os.makedirs(json_dir)
    chapters = sorted({c for c, _ in verses})
    for chapter in chapters:
        rows = [{"verse": v, "text": t} for (c, v), t in sorted(verses.items()) if c == chapter]
        with open(f"{json_dir}/{chapter}.json", "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    return len(chapters)


def maccabees():
    zip_path = "temp/maccabees_usfm.zip"
    fetch_zip("https://eBible.org/Scriptures/eng-web_usfm.zip", zip_path)
    with zipfile.ZipFile(zip_path) as z:
        for code, n, want_chapters in (("3MA", 3, 7), ("4MA", 4, 18)):
            name = next(x for x in z.namelist() if code in x and x.endswith(".usfm"))
            verses, _ = parse_book(z.read(name).decode("utf-8-sig"))
            book = f"{n} Maccabees"
            assert max(c for c, _ in verses) == want_chapters, f"{book}: wrong chapter count"
            for (c, v), text in verses.items():
                assert text and "\\" not in text and "|" not in text, f"{book} {c}:{v}: {text[:80]}"
                assert not re.search("[\u0370-\u03ff]{3}", text), f"{book} {c}:{v} is still Greek"
            pack = f"temp/packs/apoc-{n}-maccabees.db"
            db = sqlite3.connect(pack)
            order = db.execute("SELECT book_order FROM apocrypha_books WHERE book = ?", [book]).fetchone()[0]
            db.execute("DELETE FROM apocrypha_verses WHERE book = ?", [book])
            db.executemany(
                "INSERT INTO apocrypha_verses (book, book_order, chapter, verse, text) VALUES (?,?,?,?,?)",
                [(book, order, c, v, t) for (c, v), t in sorted(verses.items())],
            )
            db.commit()
            db.execute("VACUUM")
            db.close()
            files = write_chapters(f"data/online/apoc/{book}", verses)
            print(f"{book}: {len(verses)} verses, {files} chapters, {os.path.getsize(pack) / 1024:.0f} KB")


def main():
    slug = sys.argv[1]
    if slug == "maccabees":
        return maccabees()
    edition = EDITIONS[slug]
    zip_path, pack, json_dir = f"temp/{slug}_usfm.zip", f"temp/packs/{slug}.db", f"data/online/{slug}"
    fetch_zip(edition["url"], zip_path)

    books, all_ranges = {}, []
    with zipfile.ZipFile(zip_path) as z:
        for name in sorted(z.namelist()):
            if not name.endswith(".usfm"):
                continue
            usfm = z.read(name).decode("utf-8-sig")
            code = usfm.split(None, 2)[1]
            if code not in USFM_TO_BOOK:   # front matter, glossary
                continue
            verses, ranges = parse_book(usfm)
            books[USFM_TO_BOOK[code]] = verses
            all_ranges += [f"{USFM_TO_BOOK[code]} {r}" for r in ranges]

    # Fail loudly: a bad parse here silently mangles Scripture.
    assert len(books) == edition["books"], f"expected {edition['books']} books, got {len(books)}"
    with open(BOOKS_TS, encoding="utf-8") as f:
        expected = {n: int(c) for n, c in re.findall(r"name: '([^']+)',\s+chapters:\s*(\d+)", f.read())}
    expected["Daniel"] = edition["daniel"]
    # Blank with no footnote to show: nothing to store.
    blank = [f"{b} {c}:{v}" for b, vs in books.items() for (c, v), t in vs.items() if not t]
    books = {b: {k: t for k, t in vs.items() if t} for b, vs in books.items()}
    notes = [f"{b} {c}:{v}" for b, vs in books.items() for (c, v), t in vs.items() if t.startswith("{")]
    for book, verses in books.items():
        got = max(c for c, _ in verses)
        assert got == expected[book], f"{book}: {got} chapters, expected {expected[book]}"
        for (c, v), text in verses.items():
            bare = WJ_MARK.sub("", text)
            assert "\\" not in bare and "|" not in bare, f"{book} {c}:{v} has markup: {text[:80]}"
            opens = len(re.findall(r"\\jw(?!\*)", text))
            assert opens == text.count("\\jw*"), f"{book} {c}:{v} unbalanced jw: {text[:120]}"

    core = sqlite3.connect(CORE_DB)
    missing = [
        f"{b} {c}:{v}" for b, c, v in core.execute("SELECT book, chapter, verse FROM bible_verses")
        if (c, v) not in books[b]
    ]
    core.close()

    os.makedirs(os.path.dirname(pack), exist_ok=True)
    if os.path.exists(pack):
        os.remove(pack)
    db = sqlite3.connect(pack)
    db.execute("""
        CREATE TABLE bible_translations (
            translation TEXT NOT NULL,
            book        TEXT NOT NULL,
            chapter     INTEGER NOT NULL,
            verse       INTEGER NOT NULL,
            text        TEXT NOT NULL,
            PRIMARY KEY (translation, book, chapter, verse)
        )
    """)
    db.executemany(
        "INSERT INTO bible_translations VALUES (?,?,?,?,?)",
        [(edition["translation"], b, c, v, t) for b, vs in books.items() for (c, v), t in vs.items()],
    )
    db.commit()
    db.execute("VACUUM")
    db.close()

    shutil.rmtree(json_dir, ignore_errors=True)
    files = 0
    for book, verses in books.items():
        files += write_chapters(f"{json_dir}/{book}", verses)

    total = sum(len(v) for v in books.values())
    print(f"{len(books)} books, {total} verses, {files} chapter files")
    print(f"{pack}: {os.path.getsize(pack) / 1048576:.1f} MB")
    print(f"Verse ranges stored at their first number: {all_ranges}")
    print(f"Blank, shown as the source's note: {notes}")
    print(f"Blank with no note, skipped: {blank}")
    print(f"KJV verses not in this edition ({len(missing)}): {missing}")


if __name__ == "__main__":
    main()
