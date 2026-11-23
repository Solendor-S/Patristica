"""
Verify the curated Church-Father entries for the Doctrine tab and generate
src/data/doctrineEntries.ts.

Curation lives in scripts/doctrines/curation/<group>.json:

  { "<doctrine id>": [ {
      "father":  "Ignatius of Antioch",          # must resolve in src/data/fatherDates.ts
      "work":    "Epistle to the Smyrnaeans",
      "ref":     "ch. 7",
      "year":    108,                             # approx. date of the text (sort order + era)
      "page":    "0109",                          # temp/newadvent_cache/<page>.htm …
      "extra":   "damascene-images-1.txt",        # … OR scripts/doctrines/extra/<file> (PD text not on New Advent)
      "url":     "https://www.newadvent.org/fathers/0109.htm",
      "quote":   "They abstain from the Eucharist …",   # verbatim from the source, 1–4 sentences
      "context": "…longer verbatim passage containing the quote…",   # optional
      "note":    "Earliest use of …",             # optional one-line gloss (ours, not the Father's)
      "tag":     "contested",                     # optional: contested | later rejected | condemned | heterodox
      "verse":   "John 6:53"                      # optional "Book C:V" the passage expounds
  } ] }

Every quote and context must appear verbatim (whitespace/curly-quote insensitive) in the
source text as extracted by natext.py, and the quote must sit inside its context.

    python scripts/doctrines/build_doctrine_entries.py --check scripts/doctrines/curation/a.json
    python scripts/doctrines/build_doctrine_entries.py          # verify all + write TS
"""
import argparse
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from natext import norm, page_text  # noqa: E402

CURATION = os.path.join("scripts", "doctrines", "curation")
EXTRA = os.path.join("scripts", "doctrines", "extra")
OUT = os.path.join("src", "data", "doctrineEntries.ts")
DOCTRINES_TS = os.path.join("src", "data", "doctrines.ts")
FATHERS_TS = os.path.join("src", "data", "fatherDates.ts")
BOOKS_TS = os.path.join("src", "data", "books.ts")
TAGS = {"contested", "later rejected", "condemned", "heterodox"}
FIELDS = {"father", "work", "ref", "year", "page", "extra", "url", "quote", "context", "note", "tag", "verse"}

_text_cache: dict[str, str] = {}


def source_text(e: dict) -> str:
    key = e.get("page") or "extra:" + e.get("extra", "")
    if key not in _text_cache:
        if e.get("page"):
            _text_cache[key] = norm(page_text(e["page"])[1])
        else:
            with open(os.path.join(EXTRA, e["extra"]), encoding="utf-8") as f:
                _text_cache[key] = norm(f.read())
    return _text_cache[key]


def known(path: str, pattern: str) -> list[str]:
    return re.findall(pattern, open(path, encoding="utf-8").read(), re.M)


def father_ok(name: str, fathers: list[str]) -> bool:
    # Councils ("Second Council of Nicaea") are named as such rather than added to
    # fatherDates.ts, which would make them map pins and father-list entries.
    if "Council of " in name:
        return True
    return name in fathers or any(name.lower().startswith(k.lower()) for k in fathers)


def check_entries(doctrine: str, entries: list[dict], fathers, books, doctrine_ids) -> list[str]:
    errs = []
    if doctrine not in doctrine_ids:
        errs.append(f"{doctrine}: unknown doctrine id (known: {', '.join(doctrine_ids)})")
    for i, e in enumerate(entries):
        where = f"{doctrine}[{i}] {e.get('father', '?')} — {e.get('work', '?')}"
        extra_fields = set(e) - FIELDS
        if extra_fields:
            errs.append(f"{where}: unknown fields {extra_fields}")
        for f in ("father", "work", "ref", "url", "quote"):
            if not e.get(f):
                errs.append(f"{where}: missing {f}")
        if not isinstance(e.get("year"), int) or not 30 <= e["year"] <= 1500:
            errs.append(f"{where}: year must be an integer (approx. date of the text)")
        if bool(e.get("page")) == bool(e.get("extra")):
            errs.append(f"{where}: give exactly one of page / extra")
            continue
        if e.get("page") and not os.path.exists(os.path.join("temp", "newadvent_cache", f"{e['page']}.htm")):
            errs.append(f"{where}: page {e['page']} not in cache")
            continue
        if e.get("extra") and not os.path.exists(os.path.join(EXTRA, e["extra"])):
            errs.append(f"{where}: extra file {e['extra']} missing")
            continue
        if e.get("father") and not father_ok(e["father"], fathers):
            errs.append(f"{where}: father not in fatherDates.ts (use an existing key)")
        if e.get("tag") and e["tag"] not in TAGS:
            errs.append(f"{where}: tag must be one of {sorted(TAGS)}")
        if e.get("verse"):
            m = re.match(r"^(.+) (\d+):(\d+)$", e["verse"])
            if not m or m.group(1) not in books:
                errs.append(f"{where}: verse {e['verse']!r} not 'Book C:V' with an app book name")
        text = source_text(e)
        q = norm(e.get("quote", ""))
        if q and q not in text:
            errs.append(f"{where}: QUOTE NOT VERBATIM in source: {q[:90]!r}")
        if e.get("context"):
            c = norm(e["context"])
            if c not in text:
                errs.append(f"{where}: CONTEXT NOT VERBATIM in source: {c[:90]!r}")
            elif q and q not in c:
                errs.append(f"{where}: quote is not inside its context")
            elif len(c) <= len(q) + 20:
                errs.append(f"{where}: context adds nothing — drop it")
        if q and len(q) > 900:
            errs.append(f"{where}: quote is {len(q)} chars — trim to the key sentences")
    n = len(entries)
    if not 8 <= n <= 12:
        errs.append(f"{doctrine}: {n} entries (target 8–12)")
    return errs


def emit(all_entries: dict[str, list[dict]], doctrine_ids: list[str]):
    lines = [
        "// GENERATED by scripts/doctrines/build_doctrine_entries.py from scripts/doctrines/curation/.",
        "// Every quote is verified verbatim against its public-domain source text. Do not edit by hand.",
        "",
        "export interface DoctrineEntry {",
        "  father: string",
        "  work: string",
        "  ref: string",
        "  year: number",
        "  url: string",
        "  quote: string",
        "  context?: string",
        "  note?: string",
        "  tag?: 'contested' | 'later rejected' | 'condemned' | 'heterodox'",
        "  verse?: string",
        "}",
        "",
        "export const DOCTRINE_ENTRIES: Record<string, DoctrineEntry[]> = {",
    ]
    keep = ("father", "work", "ref", "year", "url", "quote", "context", "note", "tag", "verse")
    for did in doctrine_ids:
        if did not in all_entries:
            continue
        lines.append(f"  {json.dumps(did)}: [")
        for e in sorted(all_entries[did], key=lambda x: x["year"]):
            obj = {k: (" ".join(e[k].split()) if k in ("quote", "context") else e[k]) for k in keep if e.get(k)}
            lines.append("    " + json.dumps(obj, ensure_ascii=False) + ",")
        lines.append("  ],")
    lines += ["}", ""]
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
    print(f"Wrote {OUT} ({os.path.getsize(OUT) / 1024:.0f} KB)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", help="verify one curation file only; no output written")
    args = ap.parse_args()

    fathers = known(FATHERS_TS, r"^  '([^']+)':")
    books = set(known(BOOKS_TS, r"name: *'([^']+)'"))
    doctrine_ids = known(DOCTRINES_TS, r"^    id: '([^']+)'")
    files = [args.check] if args.check else sorted(glob.glob(os.path.join(CURATION, "*.json")))

    all_entries: dict[str, list[dict]] = {}
    errs = []
    for path in files:
        data = json.load(open(path, encoding="utf-8"))
        for did, entries in data.items():
            errs += check_entries(did, entries, fathers, books, doctrine_ids)
            all_entries.setdefault(did, []).extend(entries)

    for did, entries in all_entries.items():
        print(f"  {did:<14} {len(entries):>2} entries")
    if errs:
        print(f"\n{len(errs)} problem(s):")
        for e in errs:
            print("  - " + e)
        sys.exit(1)
    print("All quotes verified.")
    if not args.check:
        missing = [d for d in doctrine_ids if d not in all_entries]
        if missing:
            print("Missing doctrines:", ", ".join(missing))
            sys.exit(1)
        emit(all_entries, doctrine_ids)


if __name__ == "__main__":
    main()
