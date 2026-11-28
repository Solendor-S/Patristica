"""
Verify the curated "disputed construction" entries for the Clause tab and generate
src/data/syntaxFlashpoints.ts.

Curation: scripts/syntax/curation/<batch>.json  ->  a JSON list of entries:

  {
    "id": "rom-5-12-eph-ho",                 # unique, kebab-case
    "book": "Romans", "chapter": 5, "verse": 12,   # app book name; first verse of the construction
    "words": ["ROM 5:12!27", "ROM 5:12!28"], # MACULA refs of the ambiguous words (scripts/syntax/macula.py words ...)
                                             # [] allowed only for books with no MACULA tree (deuterocanon)
    "title": "eph' hō: \"because\" or \"in whom\"?",
    "category": "referent" | "case" | "attachment" | "punctuation" | "article" | "construction",
    "summary": "Neutral 1-3 sentence explanation of why the grammar allows more than one reading.",
    "readings": [                            # 2+ readings
      {
        "label": "Causal: \"because all sinned\"",
        "rendering": "death spread to all men, because all sinned",
        "grammar": "ἐπί + dative relative as a conjunction = ἐπὶ τούτῳ ὅτι",
        "traditions": {"catholic": "...", "orthodox": "...", "protestant": "..."},   # optional; only well-attested positions
        "modern": "Most modern grammarians and translations (RSV, NAB, ESV)",       # optional
        "fathers": [                         # may be [] -- never invent
          { "father": "John Chrysostom",     # must resolve in src/data/fatherDates.ts
            "work": "Homilies on Romans", "ref": "Homily 10", "year": 391,
            "page": "210210",                # temp/newadvent_cache/<page>.htm (text: temp/na_text/<page>.txt)
            # OR "commentary": 12345         # id in the `commentary` view of temp/bible_phase2_test.db
            # OR "legacy": 12345             # id in commentary_legacy of temp/bible_phase2_test.db
            # OR "extra": "file.txt"         # scripts/doctrines/extra/<file>
            "url": "https://www.newadvent.org/fathers/210210.htm",
            "quote": "verbatim, 1-4 sentences" }
        ]
      }
    ],
    "macula_follows": 0,                      # index of the reading the MACULA tree encodes, or null if neutral
    "macula_evidence": "ᾧ parsed as relative pronoun heading a rel clause under ἐφ' (adverbial)",
    "sources": ["NET note on Rom 5:12", "Wallace, GGBB 342-3"]
  }

Every quote must appear verbatim (whitespace/curly-quote insensitive) in its source.

    python scripts/syntax/flashpoints.py --check scripts/syntax/curation/romans.json
    python scripts/syntax/flashpoints.py          # verify all + write TS
"""
import argparse
import glob
import json
import os
import re
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "doctrines"))
from natext import norm, page_text  # noqa: E402
import macula  # noqa: E402

CURATION = os.path.join("scripts", "syntax", "curation")
EXTRA = os.path.join("scripts", "doctrines", "extra")
OUT = os.path.join("src", "data", "syntaxFlashpoints.ts")
FATHERS_TS = os.path.join("src", "data", "fatherDates.ts")
BOOKS_TS = os.path.join("src", "data", "books.ts")
COMMENTARY_DB = os.path.join("temp", "bible_phase2_test.db")
CATEGORIES = {"referent", "case", "attachment", "punctuation", "article", "construction"}
ENTRY_FIELDS = {"id", "book", "chapter", "verse", "words", "title", "category", "summary", "readings",
                "macula_follows", "macula_evidence", "sources"}
READING_FIELDS = {"label", "rendering", "grammar", "traditions", "modern", "fathers"}
FATHER_FIELDS = {"father", "work", "ref", "year", "page", "commentary", "legacy", "extra", "url", "quote"}
SOURCE_KEYS = ("page", "commentary", "legacy", "extra")

_text: dict[str, str] = {}
_refs: dict[str, set] = {}
_db = None


def db():
    global _db
    if _db is None:
        _db = sqlite3.connect(COMMENTARY_DB)
    return _db


def source_text(f: dict) -> str | None:
    k = next(k for k in SOURCE_KEYS if f.get(k) is not None)
    key = f"{k}:{f[k]}"
    if key not in _text:
        try:
            if k == "page":
                _text[key] = norm(page_text(str(f[k]))[1])
            elif k == "extra":
                _text[key] = norm(open(os.path.join(EXTRA, f[k]), encoding="utf-8").read())
            else:
                table = "commentary" if k == "commentary" else "commentary_legacy"
                row = db().execute(f"SELECT full_text FROM {table} WHERE id = ?", (int(f[k]),)).fetchone()
                _text[key] = norm(row[0]) if row and row[0] else None
        except (OSError, ValueError):
            _text[key] = None
    return _text[key]


def known(path: str, pattern: str) -> list[str]:
    return re.findall(pattern, open(path, encoding="utf-8").read(), re.M)


def father_ok(name: str, fathers: list[str]) -> bool:
    if "Council of " in name:
        return True
    return name in fathers or any(name.lower().startswith(k.lower()) for k in fathers)


def refs_for(book: str) -> set:
    if book not in _refs:
        _refs[book] = macula.all_refs(book) if book in macula.CODES else set()
    return _refs[book]


def check(e: dict, fathers, books) -> list[str]:
    errs = []
    where = e.get("id", "?")
    if set(e) - ENTRY_FIELDS:
        errs.append(f"{where}: unknown fields {set(e) - ENTRY_FIELDS}")
    for f in ("id", "book", "chapter", "verse", "title", "category", "summary", "readings"):
        if e.get(f) in (None, "", []):
            errs.append(f"{where}: missing {f}")
    if errs:
        return errs
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", e["id"]):
        errs.append(f"{where}: id must be kebab-case")
    if e["book"] not in books:
        errs.append(f"{where}: book {e['book']!r} is not an app book name")
    if e["category"] not in CATEGORIES:
        errs.append(f"{where}: category must be one of {sorted(CATEGORIES)}")
    words = e.get("words", [])
    if e["book"] in macula.CODES:
        if not words:
            errs.append(f"{where}: words required (MACULA has a tree for {e['book']})")
        bad = [w for w in words if w not in refs_for(e["book"])]
        if bad:
            errs.append(f"{where}: words not in MACULA: {bad}")
    if len(e["readings"]) < 2:
        errs.append(f"{where}: needs 2+ readings")
    mf = e.get("macula_follows")
    if e["book"] in macula.CODES:
        if mf is not None and not (isinstance(mf, int) and 0 <= mf < len(e["readings"])):
            errs.append(f"{where}: macula_follows must be a reading index or null")
        if not e.get("macula_evidence"):
            errs.append(f"{where}: macula_evidence missing (say what the tree does)")
    for i, r in enumerate(e["readings"]):
        rw = f"{where}.readings[{i}]"
        if set(r) - READING_FIELDS:
            errs.append(f"{rw}: unknown fields {set(r) - READING_FIELDS}")
        for f in ("label", "rendering", "grammar"):
            if not r.get(f):
                errs.append(f"{rw}: missing {f}")
        for t in (r.get("traditions") or {}):
            if t not in ("catholic", "orthodox", "protestant"):
                errs.append(f"{rw}: tradition key {t!r}")
        for j, f in enumerate(r.get("fathers") or []):
            fw = f"{rw}.fathers[{j}] {f.get('father', '?')}"
            if set(f) - FATHER_FIELDS:
                errs.append(f"{fw}: unknown fields {set(f) - FATHER_FIELDS}")
            for k in ("father", "work", "ref", "url", "quote"):
                if not f.get(k):
                    errs.append(f"{fw}: missing {k}")
            if not isinstance(f.get("year"), int) or not 30 <= f["year"] <= 1500:
                errs.append(f"{fw}: year must be an integer")
            if sum(f.get(k) is not None for k in SOURCE_KEYS) != 1:
                errs.append(f"{fw}: give exactly one of {SOURCE_KEYS}")
                continue
            if f.get("father") and not father_ok(f["father"], fathers):
                errs.append(f"{fw}: father not in fatherDates.ts")
            text = source_text(f)
            if text is None:
                errs.append(f"{fw}: source not found")
                continue
            q = norm(f.get("quote", ""))
            if q and q not in text:
                errs.append(f"{fw}: QUOTE NOT VERBATIM: {q[:90]!r}")
            if len(q) > 900:
                errs.append(f"{fw}: quote {len(q)} chars, trim")
    return errs


def emit(entries: list[dict]):
    order = {b: i for i, b in enumerate(known(BOOKS_TS, r"name: *'([^']+)'"))}
    entries.sort(key=lambda e: (order.get(e["book"], 999), e["chapter"], e["verse"]))
    lines = [
        "// GENERATED by scripts/syntax/flashpoints.py from scripts/syntax/curation/.",
        "// Every Father quote is verified verbatim against its public-domain source. Do not edit by hand.",
        "",
        "export interface FlashpointFather { father: string; work: string; ref: string; year: number; url: string; quote: string }",
        "export interface FlashpointReading {",
        "  label: string; rendering: string; grammar: string",
        "  traditions?: { catholic?: string; orthodox?: string; protestant?: string }",
        "  modern?: string",
        "  fathers: FlashpointFather[]",
        "}",
        "export interface Flashpoint {",
        "  id: string; book: string; chapter: number; verse: number",
        "  words: string[]; title: string; category: string; summary: string",
        "  readings: FlashpointReading[]",
        "  maculaFollows: number | null",
        "  sources: string[]",
        "}",
        "",
        "export const FLASHPOINTS: Flashpoint[] = [",
    ]
    fk = ("father", "work", "ref", "year", "url", "quote")
    for e in entries:
        obj = {
            "id": e["id"], "book": e["book"], "chapter": e["chapter"], "verse": e["verse"],
            "words": [macula.app_ref(w) for w in e.get("words", [])], "title": e["title"], "category": e["category"],
            "summary": " ".join(e["summary"].split()),
            "readings": [{
                **{k: r[k] for k in ("label", "rendering", "grammar") if r.get(k)},
                **({"traditions": r["traditions"]} if r.get("traditions") else {}),
                **({"modern": r["modern"]} if r.get("modern") else {}),
                "fathers": [{k: (" ".join(f[k].split()) if k == "quote" else f[k]) for k in fk}
                            for f in r.get("fathers") or []],
            } for r in e["readings"]],
            "maculaFollows": e.get("macula_follows"),
            "sources": e.get("sources", []),
        }
        lines.append("  " + json.dumps(obj, ensure_ascii=False) + ",")
    lines += ["]", ""]
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    print(f"Wrote {OUT} ({os.path.getsize(OUT) / 1024:.0f} KB, {len(entries)} flashpoints)")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", help="verify one curation file only; nothing written")
    args = ap.parse_args()
    fathers = known(FATHERS_TS, r"^  '([^']+)':")
    books = set(known(BOOKS_TS, r"name: *'([^']+)'"))
    files = [args.check] if args.check else sorted(glob.glob(os.path.join(CURATION, "*.json")))
    entries, errs, ids = [], [], set()
    for path in files:
        for e in json.load(open(path, encoding="utf-8")):
            errs += check(e, fathers, books)
            if e.get("id") in ids:
                errs.append(f"{e['id']}: duplicate id")
            ids.add(e.get("id"))
            entries.append(e)
    nq = sum(len(r.get("fathers") or []) for e in entries for r in e.get("readings", []))
    print(f"{len(entries)} flashpoints, {nq} Father quotes in {len(files)} file(s)")
    if errs:
        print(f"\n{len(errs)} problem(s):")
        for x in errs:
            print("  - " + x)
        sys.exit(1)
    print("All verified.")
    if not args.check:
        emit(entries)


if __name__ == "__main__":
    main()
