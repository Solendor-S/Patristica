"""
MACULA Greek (SBLGNT) / Hebrew (WLC) lowfat trees -> indented clause outlines.

Source (CC BY 4.0, (c) Biblica): temp/src_data/macula-greek/SBLGNT/lowfat/*.xml and
temp/src_data/macula-hebrew/WLC/lowfat/*.xml (sparse clones, see build_syntax.py).

A sentence becomes a list of rows {"d": depth, "r": role, "w": [[ref, text, gloss, strong, after]]}.
A clause (wg class="cl") that fills a slot (has a role, or sits inside a phrase, e.g. a relative
clause) opens a row one level deeper; coordinated clauses stay at their parent's depth. Words after
a nested clause continue on a fresh row at the parent depth, so surface order is kept.

The UBS-permission attributes (ln, domain, sdbh, lexdomain, coredomain, contextualdomain) are
never read, so they can't leak into our output.

    python scripts/syntax/macula.py words "Romans" 5:12     # refs for curation
    python scripts/syntax/macula.py tree  "Romans" 5:12     # outline of the sentence(s)
"""
import functools
import glob
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mass"))
from citations import versify  # noqa: E402  (Hebrew -> English verse numbers, STEPBible TVTMS)

ROOT = os.path.join("temp", "src_data")
GREEK_DIR = os.path.join(ROOT, "macula-greek", "SBLGNT", "lowfat")
HEBREW_DIR = os.path.join(ROOT, "macula-hebrew", "WLC", "lowfat")
XMLID = "{http://www.w3.org/XML/1998/namespace}id"

# app book name -> MACULA/USFM code
NT = {
    "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN", "Acts": "ACT", "Romans": "ROM",
    "1 Corinthians": "1CO", "2 Corinthians": "2CO", "Galatians": "GAL", "Ephesians": "EPH",
    "Philippians": "PHP", "Colossians": "COL", "1 Thessalonians": "1TH", "2 Thessalonians": "2TH",
    "1 Timothy": "1TI", "2 Timothy": "2TI", "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB",
    "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN", "2 John": "2JN",
    "3 John": "3JN", "Jude": "JUD", "Revelation": "REV",
}
OT = {
    "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM", "Deuteronomy": "DEU",
    "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT", "1 Samuel": "1SA", "2 Samuel": "2SA",
    "1 Kings": "1KI", "2 Kings": "2KI", "1 Chronicles": "1CH", "2 Chronicles": "2CH", "Ezra": "EZR",
    "Nehemiah": "NEH", "Esther": "EST", "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
    "Ecclesiastes": "ECC", "Song of Solomon": "SNG", "Isaiah": "ISA", "Jeremiah": "JER",
    "Lamentations": "LAM", "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS", "Joel": "JOL",
    "Amos": "AMO", "Obadiah": "OBA", "Jonah": "JON", "Micah": "MIC", "Nahum": "NAM",
    "Habakkuk": "HAB", "Zephaniah": "ZEP", "Haggai": "HAG", "Zechariah": "ZEC", "Malachi": "MAL",
}
CODES = {**NT, **OT}
BOOK_OF = {v: k for k, v in CODES.items()}
REF_RE = re.compile(r"^(\w+) (\d+):(\d+)!(\d+)")


def ref_verse(ref: str) -> tuple[str, int, int]:
    m = REF_RE.match(ref)
    return BOOK_OF[m.group(1)], int(m.group(2)), int(m.group(3))


def greek_file(book: str) -> str:
    n = list(NT).index(book) + 1
    hits = glob.glob(os.path.join(GREEK_DIR, f"{n:02d}-*.xml"))
    return hits[0]


def hebrew_files(book: str) -> list[str]:
    n = list(OT).index(book) + 1
    return sorted(glob.glob(os.path.join(HEBREW_DIR, f"{n:02d}-*-lowfat.xml")))


@functools.lru_cache(maxsize=4)
def sentences(book: str) -> list[ET.Element]:
    """Every <sentence> element of a book, in order."""
    files = [greek_file(book)] if book in NT else hebrew_files(book)
    out = []
    for f in files:
        out.extend(ET.parse(f).getroot().iter("sentence"))
    return out


def _strong_prefix(sentence_lang: str, strong: str) -> str:
    if not strong:
        return ""
    s = strong.lstrip("0") or "0"
    return ("H" if sentence_lang == "he" else "G") + s


def outline(sent: ET.Element, lang: str) -> list[dict]:
    rows: list[dict] = []

    def emit(w: ET.Element, ctx: dict):
        if ctx.get("row") is None:
            ctx["row"] = {"d": ctx["d"], "r": ctx["r"], "w": []}
            rows.append(ctx["row"])
        text = (w.text or w.get("unicode") or "").strip()
        gloss = w.get("english") or w.get("gloss") or ""
        strong = _strong_prefix(lang, w.get("strong") or w.get("strongnumberx") or "")
        ctx["row"]["w"].append([w.get("ref") or "", text, gloss, strong, w.get("after", "")])

    def visit(node: ET.Element, ctx: dict, in_phrase: bool):
        for ch in node:
            if ch.tag == "w":
                emit(ch, ctx)
            elif ch.tag == "wg":
                if ch.get("class") == "cl":
                    sub = ch.get("role") or in_phrase
                    inner = {"d": ctx["d"] + 1 if sub else ctx["d"],
                             "r": ch.get("role") or ("rel" if in_phrase else ctx["r"] if not sub else ""),
                             "row": None}
                    visit(ch, inner, False)
                    if inner["row"] is not None or sub:
                        ctx["row"] = None  # words after a nested clause start a continuation row
                else:
                    visit(ch, ctx, True if ch.get("class") in ("np", "pp", "adjp", "advp") else in_phrase)

    visit(sent, {"d": 0, "r": "", "row": None}, False)
    return rows


def sentence_verses(rows: list[dict]) -> list[tuple[str, int, int]]:
    seen, out = set(), []
    for r in rows:
        for w in r["w"]:
            if w[0] and REF_RE.match(w[0]):
                v = ref_verse(w[0])
                if v not in seen:
                    seen.add(v)
                    out.append(v)
    return out


@functools.lru_cache(maxsize=None)
def app_ref(ref: str) -> str:
    """MACULA ref ("PSA 45:7!3", Hebrew numbering) -> app/English numbering ("PSA 45:6!3")."""
    m = REF_RE.match(ref)
    if not m:
        return ref
    book = BOOK_OF[m.group(1)]
    if book not in OT:
        return ref
    ch, v = versify(book, int(m.group(2)), int(m.group(3)))
    return f"{m.group(1)} {ch}:{v}!{m.group(4)}"


def lang_of(book: str) -> str:
    return "el" if book in NT else "he"


def find(book: str, chapter: int, verse: int) -> list[list[dict]]:
    """Outlines of every sentence touching the verse."""
    code = CODES[book]
    tag = f"{code} {chapter}:{verse}!"
    out = []
    for s in sentences(book):
        if any((w.get("ref") or "").startswith(tag) for w in s.iter("w")):
            out.append(outline(s, lang_of(book)))
    return out


def all_refs(book: str) -> set[str]:
    return {w.get("ref") for s in sentences(book) for w in s.iter("w") if w.get("ref")}


def main():
    if len(sys.argv) != 4 or sys.argv[1] not in ("words", "tree"):
        print(__doc__)
        sys.exit(1)
    sys.stdout.reconfigure(encoding="utf-8")
    book = sys.argv[2]
    ch, v = map(int, sys.argv[3].split(":"))
    outs = find(book, ch, v)
    if not outs:
        print("no tree for", book, ch, v)
        sys.exit(1)
    tag = f"{CODES[book]} {ch}:{v}!"
    for rows in outs:
        if sys.argv[1] == "words":
            for r in rows:
                for w in r["w"]:
                    if w[0].startswith(tag):
                        print(f"{w[0]:<14} {w[1]:<18} {w[2]:<20} {w[3]}")
        else:
            for r in rows:
                words = " ".join(f"{w[1]}[{w[0].split('!')[1]}]" if w[0].startswith(tag) else w[1] for w in r["w"])
                gloss = " ".join(w[2] for w in r["w"])
                print("    " * r["d"] + (f"<{r['r']}> " if r["r"] else "") + words)
                print("    " * r["d"] + "    = " + gloss)
            print("-" * 40)


if __name__ == "__main__":
    main()
