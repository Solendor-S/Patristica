"""
Import Abbott-Smith's Manual Greek Lexicon of the NT (1922, public domain; TEI markup by
translatable-exegetical-tools) into temp/packs/lexicons.db, table abbott_smith.

Body markup understood by src/components/LexiconMarkup.tsx:
  - lines separated by "\n"; leading "\t"s = indent level (nested senses)
  - ⟪text⟫                bold (headword, glosses, sense labels; the source uses * itself)
  - ⟦Book C:V|label⟧      tappable verse link (canonical 66 books only; delimiters never
                          occur in the sources, unlike [ and ])
Hebrew/Aramaic spans are wrapped in Unicode bidi isolates (U+2068 … U+2069).

    python scripts/lexicons/fetch_sources.py
    python scripts/lexicons/import_abbott_smith.py      (run from Patristica/)
"""
import json
import os
import re
import sqlite3
import unicodedata
import xml.etree.ElementTree as ET

SRC = "temp/lexicon-src"
PACK = "temp/packs/lexicons.db"
CORE = "assets/db/bible.db"
NS = "{http://www.crosswire.org/2013/TEIOSIS/namespace}"
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"
FSI, PDI = "⁨", "⁩"

OSIS_BOOKS = {
    "Gen": "Genesis", "Exod": "Exodus", "Lev": "Leviticus", "Num": "Numbers", "Deut": "Deuteronomy",
    "Josh": "Joshua", "Judg": "Judges", "Ruth": "Ruth", "1Sam": "1 Samuel", "2Sam": "2 Samuel",
    "1Kgs": "1 Kings", "2Kgs": "2 Kings", "1Chr": "1 Chronicles", "2Chr": "2 Chronicles",
    "Ezra": "Ezra", "Neh": "Nehemiah", "Esth": "Esther", "Job": "Job", "Ps": "Psalms",
    "Prov": "Proverbs", "Eccl": "Ecclesiastes", "Song": "Song of Solomon", "Isa": "Isaiah",
    "Jer": "Jeremiah", "Lam": "Lamentations", "Ezek": "Ezekiel", "Dan": "Daniel", "Hos": "Hosea",
    "Joel": "Joel", "Amos": "Amos", "Obad": "Obadiah", "Jonah": "Jonah", "Jon": "Jonah",
    "Mic": "Micah", "Nah": "Nahum", "Hab": "Habakkuk", "Zeph": "Zephaniah", "Hag": "Haggai",
    "Zech": "Zechariah", "Mal": "Malachi",
    "Matt": "Matthew", "Mark": "Mark", "Luke": "Luke", "John": "John", "Acts": "Acts",
    "Rom": "Romans", "1Cor": "1 Corinthians", "2Cor": "2 Corinthians", "Gal": "Galatians",
    "Eph": "Ephesians", "Phil": "Philippians", "Col": "Colossians", "1Thess": "1 Thessalonians",
    "2Thess": "2 Thessalonians", "1Tim": "1 Timothy", "2Tim": "2 Timothy", "Titus": "Titus",
    "Phlm": "Philemon", "Heb": "Hebrews", "Jas": "James", "1Pet": "1 Peter", "2Pet": "2 Peter",
    "1John": "1 John", "2John": "2 John", "3John": "3 John", "Jude": "Jude", "Rev": "Revelation",
}
OSIS_REF = re.compile(r"^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)")
# Front-matter abbreviation tables to keep (0 grammar, 3 versions, 4 authors, 5 works).
# 1 and 2 are Bible books, which become links instead.
ABBREV_TABLES = (0, 3, 4, 5)


def norm(s: str) -> str:
    """Accent- and case-insensitive key for lemma matching."""
    d = unicodedata.normalize("NFD", s.strip().lower())
    return "".join(c for c in d if not unicodedata.combining(c)).replace("ς", "σ")


def clean(s: str) -> str:
    return re.sub(r"[ \t\r\n]+", " ", s)


class Renderer:
    """TEI entry -> light markup. Walks mixed content, tracking sense depth."""

    def __init__(self):
        self.out: list[str] = []

    def text(self, s: str | None):
        if s:
            self.out.append(clean(s))

    def newline(self, depth: int):
        self.out.append("\n" + "\t" * depth)

    def node(self, el: ET.Element, depth: int):
        tag = el.tag.replace(NS, "")
        if tag == "note" and el.get("type") == "occurrencesNT":
            pass                                            # stored as nt_count
        elif tag == "pb":
            pass
        elif tag == "lb":
            self.out.append(" ")
        elif tag == "sense":
            if el.get("n"):
                self.newline(depth)
                self.out.append(f"⟪{el.get('n')}⟫ ")
            self.children(el, depth + 1 if el.get("n") else depth)
        elif tag == "etym":
            self.newline(0)
            self.children(el, depth)
        elif tag == "re":
            self.newline(0)
            self.children(el, depth)
        elif tag in ("gloss", "orth"):
            inner = clean("".join(el.itertext())).strip()
            if inner:
                self.out.append(f"⟪{inner}⟫")
        elif tag == "foreign" and el.get(XML_LANG) in ("heb", "arc"):
            self.out.append(FSI + clean("".join(el.itertext())).strip() + PDI)
        elif tag == "ref" and el.get("osisRef"):
            label = clean("".join(el.itertext())).strip()
            m = OSIS_REF.match(el.get("osisRef"))
            book = OSIS_BOOKS.get(m.group(1)) if m else None
            self.out.append(f"⟦{book} {m.group(2)}:{m.group(3)}|{label}⟧" if book else label)
        elif tag == "hi" and el.get("rend") == "superscript":
            self.out.append(clean("".join(el.itertext())))
        else:
            self.children(el, depth)
        self.text(el.tail)

    def children(self, el: ET.Element, depth: int):
        self.text(el.text)
        for ch in el:
            self.node(ch, depth)


def render(entry: ET.Element) -> str:
    r = Renderer()
    r.children(entry, 0)
    body = "".join(r.out)
    lines = [re.sub(r" {2,}", " ", l).rstrip() for l in body.split("\n")]
    lines = [l for l in lines if l.strip()]
    lines = [re.sub(r"^(\t*) +", r"\1", l) for l in lines]
    return "\n".join(lines)


def abbreviations(root: ET.Element) -> list[tuple[str, str]]:
    front = root.find(f".//{NS}front")
    out = []
    for i, table in enumerate(front.iter(f"{NS}table")):
        if i not in ABBREV_TABLES:
            continue
        for row in table.iter(f"{NS}row"):
            cells = [clean("".join(c.itertext())).strip() for c in row]
            if len(cells) >= 2 and cells[0] and cells[1].startswith("="):
                out.append((cells[0], cells[1].lstrip("= ").rstrip(".")))
    return out


def abbrevs_in(body: str, abbrevs: list[tuple[str, str]], patterns) -> list[list[str]]:
    plain = re.sub(r"⟦[^|⟧]*\|([^⟧]*)⟧", r"\1", body).replace("⟪", "").replace("⟫", "")
    return [[a, e] for (a, e), p in zip(abbrevs, patterns) if p.search(plain)]


def main():
    root = ET.parse(os.path.join(SRC, "abbott-smith.tei.xml")).getroot()
    body = root.find(f".//{NS}body")
    abbrevs = abbreviations(root)
    # Single letters (B, E, T…) are too ambiguous to spot in running text.
    abbrevs = [(a, e) for a, e in abbrevs if len(a.rstrip(".")) > 1]
    patterns = [re.compile(r"(?<![\w.])" + re.escape(a) + (r"(?!\w)" if a.endswith(".") else r"(?![\w])"))
                for a, _ in abbrevs]

    core = sqlite3.connect(f"file:{CORE}?mode=ro", uri=True)
    strongs_by_lemma: dict[str, list[str]] = {}
    for num, lemma in core.execute("SELECT number, lemma FROM strongs_greek"):
        if lemma:
            strongs_by_lemma.setdefault(norm(lemma), []).append(num)
    gnt = json.loads(re.search(r"\{.*\}", open(os.path.join(SRC, "gnt2asLookups.js"), encoding="utf-8-sig").read(), re.S).group(0))
    gnt_by_head: dict[str, list[str]] = {}
    for morph_lemma, head in gnt.items():
        gnt_by_head.setdefault(norm(head), []).append(norm(morph_lemma))

    rows, unnumbered = [], []
    for parent in body.iter():
        for entry in parent.findall(f"{NS}entry"):
            n = entry.get("n") or parent.get("n") or ""
            parts = n.split("|")
            lemma = parts[0].strip()
            nums = [p for p in parts[1:] if re.fullmatch(r"G\d+", p)]
            occ = entry.find(f"{NS}note[@type='occurrencesNT']")
            nt = int(occ.text) if occ is not None and (occ.text or "").strip().isdigit() else None
            text = render(entry)
            if not lemma or not text:
                continue
            if not nums:
                unnumbered.append((lemma, nt, text))
                continue
            for num in nums:
                rows.append((num, lemma, nt, text))

    explicit = {r[0] for r in rows}
    mapped = 0
    for lemma, nt, text in unnumbered:
        keys = {norm(lemma), *gnt_by_head.get(norm(lemma), [])}
        nums = {num for k in keys for num in strongs_by_lemma.get(k, []) if num not in explicit}
        for num in sorted(nums):
            rows.append((num, lemma, nt, text))
        mapped += bool(nums)

    os.makedirs(os.path.dirname(PACK), exist_ok=True)
    con = sqlite3.connect(PACK)
    con.executescript("""
        DROP TABLE IF EXISTS abbott_smith;
        CREATE TABLE abbott_smith (
          strongs  TEXT NOT NULL,
          lemma    TEXT NOT NULL,
          nt_count INTEGER,
          body     TEXT NOT NULL,
          abbrevs  TEXT NOT NULL      -- JSON [[abbr, expansion], ...] found in body
        );
    """)
    con.executemany("INSERT INTO abbott_smith VALUES (?,?,?,?,?)",
                    [(num, lemma, nt, text, json.dumps(abbrevs_in(text, abbrevs, patterns), ensure_ascii=False))
                     for num, lemma, nt, text in rows])
    con.execute("CREATE INDEX idx_abbott_smith_strongs ON abbott_smith(strongs)")
    con.commit()

    # ── Checks ──
    distinct = con.execute("SELECT COUNT(DISTINCT strongs) FROM abbott_smith").fetchone()[0]
    g26 = con.execute("SELECT body, abbrevs, nt_count FROM abbott_smith WHERE strongs='G26'").fetchone()
    print(f"abbott_smith: {len(rows)} rows, {distinct} Strong's numbers; "
          f"{mapped}/{len(unnumbered)} unnumbered entries mapped by lemma; {len(abbrevs)} abbreviations")
    assert distinct >= 5400, distinct
    assert g26 and "love feasts" in g26[0] and "⟦Jude 1:12|" in g26[0] and g26[2] == 116, g26
    books = set(OSIS_BOOKS.values())
    bad = {b for (body_,) in con.execute("SELECT body FROM abbott_smith")
           for b in re.findall(r"⟦([^|⟧]+?) \d+:\d+\|", body_) if b not in books}
    assert not bad, bad
    print("G26 sample:\n" + g26[0][:600])
    print("abbrevs:", g26[1][:200])
    con.close()


if __name__ == "__main__":
    main()
