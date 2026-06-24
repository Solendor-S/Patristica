"""
Import ASV and WEB translations into bible_translations table.

ASV source: scrollmapper/bible_databases (formats/csv/ASV.csv)
WEB source: BibleNLP/ebible corpus (eng-engwebu.txt + metadata/vref.txt)

Run from project root: python3 scripts/import_translations.py
"""

import sqlite3
import csv
import io
import urllib.request

DB_PATH = "assets/db/bible.db"

SCROLLMAPPER_BASE = "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/csv"
EBIBLE_BASE = "https://raw.githubusercontent.com/BibleNLP/ebible/main"

# USFM 3-letter code → canonical book name used in bible_verses table
USFM_TO_BOOK = {
    "GEN": "Genesis", "EXO": "Exodus", "LEV": "Leviticus", "NUM": "Numbers",
    "DEU": "Deuteronomy", "JOS": "Joshua", "JDG": "Judges", "RUT": "Ruth",
    "1SA": "1 Samuel", "2SA": "2 Samuel", "1KI": "1 Kings", "2KI": "2 Kings",
    "1CH": "1 Chronicles", "2CH": "2 Chronicles", "EZR": "Ezra", "NEH": "Nehemiah",
    "EST": "Esther", "JOB": "Job", "PSA": "Psalms", "PRO": "Proverbs",
    "ECC": "Ecclesiastes", "SNG": "Song of Solomon", "ISA": "Isaiah",
    "JER": "Jeremiah", "LAM": "Lamentations", "EZK": "Ezekiel", "DAN": "Daniel",
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
}

# Scrollmapper ASV.csv uses Roman-numeral prefixes and alternate book names.
# Normalise to the canonical names used in the bible_verses table.
_ROMAN = {"I ": "1 ", "II ": "2 ", "III ": "3 "}
_ALIASES = {"Revelation of John": "Revelation", "Song of Solomon": "Song of Solomon"}

def normalise_book(name: str) -> str:
    name = name.strip()
    if name in _ALIASES:
        return _ALIASES[name]
    for rom, num in _ROMAN.items():
        if name.startswith(rom):
            return num + name[len(rom):]
    return name


def fetch_text(url: str) -> str:
    print(f"Downloading {url} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def import_asv(cur: sqlite3.Cursor) -> None:
    data = fetch_text(f"{SCROLLMAPPER_BASE}/ASV.csv")
    reader = csv.DictReader(io.StringIO(data))

    cur.execute("DELETE FROM bible_translations WHERE translation = 'ASV'")
    print(f"  ASV: deleted {cur.rowcount} existing rows")

    records = []
    for row in reader:
        book = normalise_book(row["Book"])
        c = int(row["Chapter"])
        v = int(row["Verse"])
        text = row["Text"].strip()
        records.append(("ASV", book, c, v, text))

    cur.executemany(
        "INSERT INTO bible_translations (translation, book, chapter, verse, text) VALUES (?,?,?,?,?)",
        records,
    )
    print(f"  ASV: inserted {len(records)} verses")


def import_web(cur: sqlite3.Cursor) -> None:
    vref_lines = fetch_text(f"{EBIBLE_BASE}/metadata/vref.txt").splitlines()
    web_lines  = fetch_text(f"{EBIBLE_BASE}/corpus/eng-engwebu.txt").splitlines()

    if len(vref_lines) != len(web_lines):
        raise ValueError(f"vref ({len(vref_lines)}) and WEB ({len(web_lines)}) line counts differ")

    cur.execute("DELETE FROM bible_translations WHERE translation = 'WEB'")
    print(f"  WEB: deleted {cur.rowcount} existing rows")

    records = []
    skipped = 0
    for ref, text in zip(vref_lines, web_lines):
        text = text.strip()
        if not text:
            skipped += 1
            continue
        parts = ref.split(" ", 1)      # "MAT 21:5" → ["MAT", "21:5"]
        code = parts[0]
        book = USFM_TO_BOOK.get(code)
        if book is None:               # Apocrypha / non-canonical — skip
            skipped += 1
            continue
        ch_v = parts[1].split(":")
        c, v = int(ch_v[0]), int(ch_v[1])
        records.append(("WEB", book, c, v, text))

    cur.executemany(
        "INSERT INTO bible_translations (translation, book, chapter, verse, text) VALUES (?,?,?,?,?)",
        records,
    )
    print(f"  WEB: inserted {len(records)} verses, skipped {skipped} (empty/apocrypha)")


def main():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    import_asv(cur)
    import_web(cur)

    con.commit()
    con.close()
    print("\nDone. Verify then copy to android/app/src/main/assets/bible.db")


if __name__ == "__main__":
    main()
