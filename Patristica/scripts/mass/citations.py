"""
Lectionary citation parsing + versification for the Mass tab.

Lectionary citations use NABRE numbering, which follows the Hebrew verse numbers in the OT
(Psalm titles counted as verses, Mal 3:19-24, Joel 3-4, Isa 8:23/9:1-6 ...). The app's texts use
English (KJV) numbering, so OT refs are converted with STEPBible TVTMS (CC BY 4.0), Hebrew -> English.
Daniel and the deuterocanon are left as-is (the app reads them from the WEBC, which uses the same
Greek/Vulgate-style numbers as the lectionary).

parse("Isaiah 63:16b-17, 19b; 64:2-7") ->
    [[{"book": "Isaiah", "ch": 63, "v1": 16, "ch2": 63, "v2": 17}, ...]]   (outer list = alternatives)
A whole chapter is v1=1, v2=999. Unparseable -> [] (the app then shows the citation only).

    python scripts/mass/citations.py      # self-test
"""
import functools
import glob
import os
import re

TVTMS = os.path.join("temp", "src_data", "STEPBible-Data", "Versification")

BOOKS = {
    # app name: [aliases, lowercase, no dots]
    "Genesis": ["gen", "gn"], "Exodus": ["exod", "ex", "exo"], "Leviticus": ["lev", "lv"],
    "Numbers": ["num", "nm"], "Deuteronomy": ["deut", "dt", "deu"], "Joshua": ["josh", "jos"],
    "Judges": ["judg", "jgs", "jdg"], "Ruth": ["ruth", "ru"], "1 Samuel": ["1 sam", "1 sm", "1sam"],
    "2 Samuel": ["2 sam", "2 sm", "2sam"], "1 Kings": ["1 kgs", "1 kings", "1kgs"],
    "2 Kings": ["2 kgs", "2 kings", "2kgs"], "1 Chronicles": ["1 chr", "1 chron", "1chr"],
    "2 Chronicles": ["2 chr", "2 chron", "2chr"], "Ezra": ["ezra", "ezr"], "Nehemiah": ["neh"],
    "Tobit": ["tob", "tb"], "Judith": ["jdt", "judith"], "Esther": ["esth", "est"],
    "1 Maccabees": ["1 macc", "1 mc", "1macc"], "2 Maccabees": ["2 macc", "2 mc", "2macc"],
    "Job": ["job", "jb"], "Psalms": ["ps", "psalm", "psalms", "pss"], "Proverbs": ["prov", "prv"],
    "Ecclesiastes": ["eccl", "ecc", "qoh", "qoheleth"], "Song of Solomon": ["song", "song of songs", "sg", "cant"],
    "Wisdom of Solomon": ["wis", "wisdom", "ws"], "Sirach": ["sir", "ecclesiasticus"],
    "Isaiah": ["isa", "is"], "Jeremiah": ["jer"], "Lamentations": ["lam"], "Baruch": ["bar"],
    "Ezekiel": ["ezek", "ez"], "Daniel": ["dan", "dn"], "Hosea": ["hos"], "Joel": ["joel", "jl"],
    "Amos": ["amos", "am"], "Obadiah": ["obad", "ob"], "Jonah": ["jonah", "jon"], "Micah": ["mic", "mi"],
    "Nahum": ["nah", "na"], "Habakkuk": ["hab", "hb"], "Zephaniah": ["zeph", "zep"], "Haggai": ["hag", "hg"],
    "Zechariah": ["zech", "zec"], "Malachi": ["mal"],
    "Matthew": ["matt", "mt", "mat"], "Mark": ["mark", "mk"], "Luke": ["luke", "lk"], "John": ["john", "jn"],
    "Acts": ["acts", "acts of the apostles"], "Romans": ["rom"], "1 Corinthians": ["1 cor", "1cor"],
    "2 Corinthians": ["2 cor", "2cor"], "Galatians": ["gal"], "Ephesians": ["eph"],
    "Philippians": ["phil"], "Colossians": ["col"], "1 Thessalonians": ["1 thess", "1 thes", "1thess"],
    "2 Thessalonians": ["2 thess", "2 thes", "2thess"], "1 Timothy": ["1 tim", "1 tm", "1tim"],
    "2 Timothy": ["2 tim", "2 tm", "2tim"], "Titus": ["titus", "ti", "tit"], "Philemon": ["phlm", "philem"],
    "Hebrews": ["heb"], "James": ["jas", "james"], "1 Peter": ["1 pet", "1 pt", "1pet"],
    "2 Peter": ["2 pet", "2 pt", "2pet"], "1 John": ["1 john", "1 jn"], "2 John": ["2 john", "2 jn"],
    "3 John": ["3 john", "3 jn"], "Jude": ["jude"], "Revelation": ["rev", "rv", "revelation", "apoc"],
}
ALIAS = {}
for name, al in BOOKS.items():
    ALIAS[name.lower()] = name
    for a in al:
        ALIAS[a] = name
OSIS = {"Gen": "Genesis", "Exo": "Exodus", "Lev": "Leviticus", "Num": "Numbers", "Deu": "Deuteronomy",
        "Jos": "Joshua", "Jdg": "Judges", "Rut": "Ruth", "1Sa": "1 Samuel", "2Sa": "2 Samuel",
        "1Ki": "1 Kings", "2Ki": "2 Kings", "1Ch": "1 Chronicles", "2Ch": "2 Chronicles", "Ezr": "Ezra",
        "Neh": "Nehemiah", "Est": "Esther", "Job": "Job", "Psa": "Psalms", "Pro": "Proverbs",
        "Ecc": "Ecclesiastes", "Sng": "Song of Solomon", "Isa": "Isaiah", "Jer": "Jeremiah",
        "Lam": "Lamentations", "Ezk": "Ezekiel", "Hos": "Hosea", "Jol": "Joel", "Amo": "Amos",
        "Oba": "Obadiah", "Jon": "Jonah", "Mic": "Micah", "Nam": "Nahum", "Hab": "Habakkuk",
        "Zep": "Zephaniah", "Hag": "Haggai", "Zec": "Zechariah", "Mal": "Malachi"}
HEBREW_NUMBERED = set(OSIS.values())  # Daniel deliberately excluded (WEBC follows the Greek)

BOOK_RE = re.compile(r"^((?:[1-3]\s?)?[A-Za-z][A-Za-z ]*?)\.?\s+(\d)")


@functools.lru_cache(maxsize=1)
def heb_to_eng() -> dict:
    """(book, ch, v) Hebrew -> (book, ch, v) English, plus (book, ch, 'title') entries ignored."""
    path = glob.glob(os.path.join(TVTMS, "TVTMS*.txt"))[0]
    lines = open(path, encoding="utf-8").read().split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith("#DataStart(Condensed)"))
    ref = re.compile(r"^([1-3]?[A-Z][a-z]{2})\.(\d+):(\d+|Title)(?:-(\d+))?$")
    m = {}
    for line in lines[start + 1:]:
        if line.startswith("#DataStart") and "Condensed" not in line:
            break
        f = line.split("\t")
        if len(f) < 3 or f[0].startswith(("#", "$", "TEST", "BIBLES", "'")) or not f[0]:
            continue
        a, b = ref.match(f[1].strip()), ref.match(f[2].strip())
        if not a or not b or a.group(1) not in OSIS or b.group(1) != a.group(1):
            continue
        if a.group(3) == "Title" or b.group(3) == "Title":
            if a.group(3) == "Title" and b.group(3) != "Title":
                for v in range(int(b.group(3)), int(b.group(4) or b.group(3)) + 1):
                    m.setdefault((OSIS[a.group(1)], int(b.group(2)), v), (OSIS[a.group(1)], int(a.group(2)), 1))
            continue
        ea, eb = int(a.group(3)), int(a.group(4) or a.group(3))
        ha, hb = int(b.group(3)), int(b.group(4) or b.group(3))
        if eb - ea != hb - ha:
            continue
        for k in range(hb - ha + 1):
            key = (OSIS[a.group(1)], int(b.group(2)), ha + k)
            m.setdefault(key, (OSIS[a.group(1)], int(a.group(2)), ea + k))
    return m


def versify(book: str, ch: int, v: int) -> tuple[int, int]:
    if book not in HEBREW_NUMBERED or v >= 999:
        return ch, v
    hit = heb_to_eng().get((book, ch, v))
    return (hit[1], hit[2]) if hit else (ch, v)


def clean(s: str) -> str:
    s = s.replace("\xa0", " ").replace("–", "-").replace("—", "—")
    s = re.sub(r"\(\s*diff\s*\)|\(#[^)]*\)|\[[^\]]*\]|\bcf\.?\s*|\bsee\s+|\bSee\s+|\bCf\.?\s*", " ", s)
    s = re.sub(r"\s+-\s+[A-Z][^\d;]*$", "", s)  # trailing " – Temptation" style titles
    s = re.sub(r"\([^)0-9]*\)", " ", s)  # "(Jesus appears to Mary Magdalene)"
    s = re.sub(r"(?<=\d):\s+(?=\d)", ":", s)  # "3: 9" -> "3:9"
    s = re.sub(r"\s*\([^)]*$", "", s)  # unclosed trailing note
    s = re.sub(r"(?<=\d)\s*\+\s*(?=\d)", ", ", s)  # "4+6" -> "4, 6"
    s = re.sub(r"\band\b", ",", s)
    return " ".join(s.split()).strip(" ;,.")


def _segments(text: str, book: str | None):
    """Parse 'Book 1:2-3, 5; 4:1-6' -> segments (Hebrew/NABRE numbering)."""
    segs = []
    cur_book, cur_ch = book, None
    for part in re.split(r";", text):
        part = part.strip()
        if not part:
            continue
        m = BOOK_RE.match(part)
        if m:
            name = ALIAS.get(m.group(1).strip().lower().replace(".", ""))
            if name is None:
                return None
            cur_book, cur_ch = name, None
            part = part[len(m.group(1)):].strip(". ")
        if cur_book is None:
            return None
        for piece in part.split(","):
            piece = piece.strip()
            if not piece:
                continue
            piece = re.sub(r"(?<=\d)[a-e]+", "", piece)  # verse letters -> whole verse
            x = re.fullmatch(r"(\d+):(\d+)\s*[-—]\s*(\d+):(\d+)", piece)
            if x:
                cur_ch = int(x.group(3))
                segs.append([cur_book, int(x.group(1)), int(x.group(2)), int(x.group(3)), int(x.group(4))])
                continue
            x = re.fullmatch(r"(\d+):(\d+)(?:\s*[-—]\s*(\d+))?", piece)
            if x:
                cur_ch = int(x.group(1))
                v1 = int(x.group(2))
                segs.append([cur_book, cur_ch, v1, cur_ch, int(x.group(3) or v1)])
                continue
            x = re.fullmatch(r"(\d+)(?:\s*[-—]\s*(\d+))?", piece)
            if x and cur_ch is not None:
                v1 = int(x.group(1))
                segs.append([cur_book, cur_ch, v1, cur_ch, int(x.group(2) or v1)])
                continue
            if x and cur_ch is None and cur_book == "Psalms" or (x and cur_ch is None):
                c = int(x.group(1))  # "Psalm 24" = whole psalm
                segs.append([cur_book, c, 1, int(x.group(2) or c), 999])
                cur_ch = c
                continue
            return None
    return segs


def parse(cite: str) -> list[list[dict]]:
    out = []
    for alt in re.split(r"\||\bor\b|\bOR\b", cite or ""):
        text = clean(alt)
        if not re.search(r"\d", text):
            continue
        prev_book = out[-1][-1]["book"] if out and out[-1] else None
        segs = _segments(text, prev_book)
        if not segs:
            continue
        res = []
        for b, c1, v1, c2, v2 in segs:
            c1, v1 = versify(b, c1, v1)
            c2, v2 = versify(b, c2, v2)
            res.append({"book": b, "ch": c1, "v1": v1, "ch2": c2, "v2": v2})
        out.append(res)
    return out


def selftest():
    p = parse("Psalm 51:3-4, 5-6ab, 12-13, 14 and 17")
    assert p[0][0] == {"book": "Psalms", "ch": 51, "v1": 1, "ch2": 51, "v2": 2}, p[0][0]
    assert p[0][-1]["v1"] == 15, p  # Heb 17 = Eng 15
    p = parse("Mal 3:19-20a")
    assert p[0][0]["ch"] == 4 and p[0][0]["v1"] == 1 and p[0][0]["v2"] == 2, p
    p = parse("2 Corinthians 5:20—6:2")
    assert p[0][0] == {"book": "2 Corinthians", "ch": 5, "v1": 20, "ch2": 6, "v2": 2}, p
    p = parse("Luke 2:22-40|Luke 2:22-32")
    assert len(p) == 2 and p[1][0]["v2"] == 32, p
    p = parse("Isaiah 63:16b-17, 19b; 64:2-7")
    assert [(s["ch"], s["v1"], s["v2"]) for s in p[0]] == [(63, 16, 17), (63, 19, 19), (64, 3, 8)], p  # Heb 64:2 = Eng 64:3
    p = parse("Isa 9:1-6")
    assert p[0][0]["ch"] == 9 and p[0][0]["v1"] == 2 and p[0][0]["v2"] == 7, p
    p = parse("Psalm 24")
    assert p[0][0]["v1"] == 1 and p[0][0]["v2"] == 999, p
    p = parse("John 20:1-9 or Luke 24:13-35")
    assert len(p) == 2 and p[1][0]["book"] == "Luke", p
    p = parse("1 Cor 12:31—13:13 or 13:4-13")
    assert p[1][0] == {"book": "1 Corinthians", "ch": 13, "v1": 4, "ch2": 13, "v2": 13}, p
    p = parse("Matt 4:1-11 – Temptation")
    assert p[0][0]["v2"] == 11, p
    p = parse("Dan 3:52, 53, 54, 55 ( diff )")
    assert p[0][0]["book"] == "Daniel" and p[0][0]["v1"] == 52, p
    print("citations selftest ok")


if __name__ == "__main__":
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    selftest()
