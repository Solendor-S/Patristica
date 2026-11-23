"""
Build src/data/eusebianCanons.ts: the Eusebian sections of the four Gospels, the canon
table each belongs to, and the sections Eusebius set parallel to it.

Primary source: CrossWire SWORD modules Eusebian_vs (verse -> section) and Eusebian_num
(section -> table, range, associated sections). TextSource=INTF, DistributionLicense=
Public Domain. Pinned by SHA-256 below (the zip is unversioned on the server).

Cross-check only (not shipped): GZancewicz/hypomnema canon tables + section ranges (MIT).
It has float-truncated refs ("10.4" for 10:40), so range differences are reported, not fatal.

Letter to Carpianus: tr. Mark DelCogliano, public domain (tertullian.org).

    python scripts/eusebian/build_eusebian.py        (run from Patristica/)
"""
import hashlib
import html
import json
import os
import re
import sqlite3
import struct
import urllib.request
import zipfile
import zlib

SWORD_ZIP = "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/Eusebian_vs.zip"
SWORD_SHA256 = "562a00bb405e6c386e013c75fabc1683cc415ba18de788d7b52a3f9009fc90dd"
HYPO = ("https://raw.githubusercontent.com/GZancewicz/hypomnema/"
        "e3df5c9aa6c0398f009e68117fd89f55bc11625c/texts/reference/eusebian_canons")
CARPIANUS = "https://www.tertullian.org/fathers/eusebius_letter_to_carpianus.htm"

SRC = "temp/eusebian-src"
OUT = "src/data/eusebianCanons.ts"
BEGIN = "// <generated>"
END = "// </generated>"
MOD = "modules/texts/ztext/eusebian/"
GOSPELS = ["Matthew", "Mark", "Luke", "John"]
OSIS = {"Matt": "Matthew", "Mark": "Mark", "Luke": "Luke", "John": "John"}
HYPO_CODES = {"Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN"}
HYPO_ABBR = {"Mt": "Matthew", "Mk": "Mark", "Lk": "Luke", "Jn": "John"}
EXPECTED = {"Matthew": 355, "Mark": 241, "Luke": 342, "John": 232}
ROMAN = {r: i for i, r in enumerate(["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"])}
CANON_GOSPELS = {
    1: {"Matthew", "Mark", "Luke", "John"}, 2: {"Matthew", "Mark", "Luke"},
    3: {"Matthew", "Luke", "John"}, 4: {"Matthew", "Mark", "John"},
    5: {"Matthew", "Luke"}, 6: {"Matthew", "Mark"}, 7: {"Matthew", "John"},
    8: {"Mark", "Luke"}, 9: {"Luke", "John"},
}


def fetch(url: str, name: str) -> bytes:
    path = os.path.join(SRC, name)
    if not os.path.exists(path):
        os.makedirs(SRC, exist_ok=True)
        with urllib.request.urlopen(url, timeout=30) as r, open(path, "wb") as f:
            f.write(r.read())
    return open(path, "rb").read()


def text(url: str, name: str) -> str:
    raw = fetch(url, name)
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode("cp1252")


# ── SWORD module readers ──────────────────────────────────────────────────────

def sword_files():
    raw = fetch(SWORD_ZIP, "Eusebian_vs.zip")
    assert hashlib.sha256(raw).hexdigest() == SWORD_SHA256, "CrossWire zip changed; re-verify"
    z = zipfile.ZipFile(os.path.join(SRC, "Eusebian_vs.zip"))
    conf = z.read("mods.d/eusebian.conf").decode()
    assert "DistributionLicense=Public Domain" in conf and "TextSource=INTF" in conf
    return {n: z.read(n) for n in z.namelist()}


def kjv_verse_counts():
    con = sqlite3.connect("file:assets/db/bible.db?mode=ro", uri=True)
    counts = {g: {} for g in GOSPELS}
    for book, ch, n in con.execute(
            "SELECT book, chapter, MAX(verse) FROM bible_verses "
            "WHERE book IN ('Matthew','Mark','Luke','John') GROUP BY book, chapter"):
        counts[book][ch] = n
    return counts


def verse_sections(files, counts):
    """zText NT, KJV versification: [0] empty, [1] testament, then per book a book
    header, per chapter a chapter header, then verses. Matthew is the first NT book."""
    bzs, bzz, bzv = (files[MOD + n] for n in ("nt.bzs", "nt.bzz", "nt.bzv"))
    blocks = [zlib.decompress(bzz[o:o + s])
              for o, s, _ in (struct.unpack("<III", bzs[i:i + 12]) for i in range(0, len(bzs), 12))]
    ents = [struct.unpack("<IIH", bzv[i:i + 10]) for i in range(0, len(bzv), 10)]
    out, idx = {}, 2
    for g in GOSPELS:
        idx += 1                                    # book header
        for ch in sorted(counts[g]):
            idx += 1                                # chapter header
            for v in range(1, counts[g][ch] + 1):
                b, o, s = ents[idx]
                out[(g, ch, v)] = blocks[b][o:o + s].decode() if s else ""
                idx += 1
    assert out[("Matthew", 1, 1)] == "1.1" and out[("John", 21, 25)] == "4.232", "index layout"
    # Two typos in the module (their dictionary entries have empty osisRef, and the
    # verses sit exactly between the neighbouring sections; hypomnema agrees).
    for (g, ch, vs), bad, good in ((("Matthew", 14, (3, 4, 5)), "144.2", "1.144"),
                                   (("Luke", 17, (26, 27)), "207.5", "3.207")):
        for v in vs:
            assert out[(g, ch, v)] == bad, f"source changed at {g} {ch}:{v}; re-check the typo fix"
            out[(g, ch, v)] = good
    return out


NUM_RE = re.compile(r'<EusebianNumber id="(\d)\.(\d+)" table="([IVX.]*)" osisRef="([^"]*)" assocates="([^"]*)" />')
OSIS_RE = re.compile(r"^(Matt|Mark|Luke|John)\.(\d+)\.(\d+)([a-zA-Z]?)"
                     r"(?:-(?:(?:Matt|Mark|Luke|John)\.)?(?:(\d+)\.)?(\d+)?([a-zA-Z]?))?$")


def section_entries(files):
    """section id -> (canon, range | None, associated ids) from the zLD dictionary."""
    p = MOD + "eusebian"
    idx, dat, zdx, zdt = (files[p + e] for e in (".idx", ".dat", ".zdx", ".zdt"))
    blocks = [zlib.decompress(zdt[o:o + s])
              for o, s in (struct.unpack("<II", zdx[i:i + 8]) for i in range(0, len(zdx), 8))]
    out = {}
    for i in range(len(idx) // 8):
        o, s = struct.unpack("<II", idx[i * 8:i * 8 + 8])
        _, rest = dat[o:o + s].split(b"\n", 1)
        b, e = struct.unpack("<II", rest[:8])
        blk = blocks[b]
        eo, es = struct.unpack("<II", blk[4 + e * 8:12 + e * 8])
        m = NUM_RE.match(blk[eo:eo + es].decode().rstrip("\x00"))
        assert m, blk[eo:eo + es]
        g, sec, table, ref, assoc = int(m[1]), int(m[2]), m[3], m[4], m[5]
        rng = None
        if ref:
            r = OSIS_RE.match(ref)
            assert r, f"unparsed osisRef {ref!r}"
            c1, v1, l1 = int(r[2]), int(r[3]), r[4].lower()
            if r[6]:
                c2, v2, l2 = int(r[5] or c1), int(r[6]), r[7].lower()
            elif r[7]:                              # '16b-E': parts of one verse
                c2, v2, l2 = c1, v1, r[7].lower()
            else:
                c2, v2, l2 = c1, v1, l1
            rng = (c1, v1, l1, c2, v2, l2)
        ids = [tuple(int(x) for x in a.split(".")) for a in assoc.split()]
        out[(g, sec)] = ([ROMAN[t] for t in table.split(".") if t], rng, ids)
    return out


# ── hypomnema (cross-check, and fallback for empty osisRef) ───────────────────

HREF_RE = re.compile(r"^(\d+)\.(\d+)([A-Z]*)(?:-(?:(?:(\d+)\.)?(\d+))?([A-Z]*))?$")


def hypo_ranges():
    out = {}
    for gi, g in enumerate(GOSPELS, 1):
        for line in text(f"{HYPO}/data/{HYPO_CODES[g]}-sections.txt", f"{HYPO_CODES[g]}-sections.txt").splitlines():
            if not line.strip():
                continue
            sec, _, ref = line.split("\t")
            m = HREF_RE.match(re.sub(r"\([^)]*\)", "", ref).replace(" ", ""))
            if not m:
                continue
            c1, v1, l1, c2, v2, l2 = m.groups()
            c1, v1 = int(c1), int(v1)
            c2 = int(c2) if c2 else c1
            v2 = int(v2) if v2 else v1
            out[(gi, int(sec))] = (c1, v1, l1.lower(), c2, v2, (l2 or (l1 if not m[5] else "")).lower())
    return out


def hypo_pairs():
    pairs = set()
    for i in range(1, 14):
        lines = [l for l in text(f"{HYPO}/data/canon-{i}.txt", f"canon-{i}.txt").splitlines() if l.strip()]
        header = [GOSPELS.index(HYPO_ABBR[h]) + 1 for h in lines[0].split("\t")]
        for line in lines[1:]:
            ids = list(zip(header, (int(c) for c in line.split("\t"))))
            pairs.update((a, b) for a in ids for b in ids if a != b)
    return pairs


# ── Build + validate ──────────────────────────────────────────────────────────

def build():
    files = sword_files()
    counts = kjv_verse_counts()
    by_verse = verse_sections(files, counts)
    entries = section_entries(files)
    hranges = hypo_ranges()

    # Range per section from the verse index (authoritative for coverage).
    span = {}
    for (g, ch, v), sid in sorted(by_verse.items(), key=lambda kv: (GOSPELS.index(kv[0][0]), kv[0][1], kv[0][2])):
        assert sid, f"{g} {ch}:{v} has no section"
        key = tuple(int(x) for x in sid.split("."))
        assert key[0] == GOSPELS.index(g) + 1, f"{g} {ch}:{v} -> {sid}"
        lo, hi = span.get(key, ((ch, v), (ch, v)))
        span[key] = (min(lo, (ch, v)), max(hi, (ch, v)))

    sections = {g: [] for g in GOSPELS}
    notes = []
    for gi, g in enumerate(GOSPELS, 1):
        for sec in range(1, EXPECTED[g] + 1):
            key = (gi, sec)
            canons, rng, assoc = entries.get(key, ([], None, []))
            if rng is None:
                if key in span:                     # e.g. Mark's longer ending: no dictionary entry
                    (c1, v1), (c2, v2) = span[key]
                    rng = (c1, v1, "", c2, v2, "")
                else:
                    rng = hranges.get(key)
                    notes.append(f"{g} §{sec}: range from hypomnema {rng}")
            assert rng, f"{g} §{sec} has no range"
            sections[g].append([sec, canons, *rng, sorted(a[0] * 1000 + a[1] for a in assoc)])

    # Every verse lies inside the range of the section the verse index gives it.
    for (g, ch, v), sid in by_verse.items():
        sec = int(sid.split(".")[1])
        r = sections[g][sec - 1]
        assert (r[2], r[3]) <= (ch, v) <= (r[5], r[6]), f"{g} {ch}:{v} outside §{sec} {r[2:8]}"

    # Associations are symmetric and agree with the canon tables' Gospel sets.
    assoc_set = {(GOSPELS.index(g) + 1, r[0], a // 1000, a % 1000) for g in GOSPELS for r in sections[g] for a in r[8]}
    asym = [x for x in assoc_set if (x[2], x[3], x[0], x[1]) not in assoc_set]
    for g in GOSPELS:
        for r in sections[g]:
            others = {GOSPELS[a // 1000 - 1] for a in r[8]} | {g}
            for c in r[1]:
                if c <= 9:     # every table it sits in has its Gospels among the parallels
                    assert CANON_GOSPELS[c] <= others, f"{g} §{r[0]} canon {c} lacks {CANON_GOSPELS[c] - others}"
            if r[1] == [10]:
                assert not r[8], f"{g} §{r[0]} is Canon X but has parallels"

    counts_ok = {g: len(sections[g]) for g in GOSPELS}
    assert counts_ok == EXPECTED, counts_ok

    # Cross-check against hypomnema.
    hp = hypo_pairs()
    ours = {((gi, s), (a // 1000, a % 1000)) for gi, g in enumerate(GOSPELS, 1) for s, *_r in sections[g]
            for a in sections[g][s - 1][8]}
    pair_missing = [p for p in hp if p not in ours]
    range_diff = [(k, hranges[k], tuple(sections[GOSPELS[k[0] - 1]][k[1] - 1][2:8]))
                  for k in hranges if (hranges[k][0], hranges[k][1], hranges[k][3], hranges[k][4])
                  != tuple(sections[GOSPELS[k[0] - 1]][k[1] - 1][i] for i in (2, 3, 5, 6))]
    total_pairs = max(len(hp), 1)
    print(f"Sections: {counts_ok}; associations {len(assoc_set)} ({len(asym)} one-way)")
    print(f"Cross-check vs hypomnema: {len(pair_missing)}/{len(hp)} table pairs missing from ours; "
          f"{len(range_diff)}/{len(hranges)} ranges differ (hypomnema has float-truncated refs)")
    for p in pair_missing[:15]:
        print("  missing pair", p)
    for d in range_diff[:15]:
        print("  range", d)
    for n in notes:
        print("  note:", n)
    assert len(pair_missing) <= 0.02 * total_pairs, "pairing cross-check over 2%"
    assert len(range_diff) <= 0.05 * len(hranges), "range cross-check over 5%"
    return sections


# ── Letter to Carpianus ───────────────────────────────────────────────────────

def carpianus_paragraphs():
    t = text(CARPIANUS, "carpianus.htm")
    t = re.sub(r"(?is)<(script|style).*?</\1>", "", t)
    t = re.sub(r"(?i)<br\s*/?>", " ", t)
    t = re.sub(r"(?i)</p>", "\n\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", "", t))
    body = t[re.search(r"Eusebius\s+to Carpianus his", t).start():t.index("Footnotes")]
    paras = [re.sub(r"\s+", " ", p).strip() for p in re.split(r"\n\s*\n", body)]
    paras = [re.sub(r"(?<=[A-Za-z.,;'])\d+", "", p) for p in paras if p]   # footnote markers
    assert paras[0].startswith("Eusebius to Carpianus"), paras[0]
    assert len(paras) == 5 and "tenth is for unique things" in paras[2], paras
    return paras


# ── Emit ──────────────────────────────────────────────────────────────────────

def emit(sections, letter):
    lines = [
        BEGIN,
        "// GENERATED by scripts/eusebian/build_eusebian.py. Do not edit this block by hand.",
        "// Eusebian sections and canon tables: INTF data via the CrossWire Eusebian modules",
        "// (public domain). Letter to Carpianus: tr. Mark DelCogliano, public domain.",
        "",
        "export type Gospel = 'Matthew' | 'Mark' | 'Luke' | 'John'",
        "export const GOSPELS: Gospel[] = ['Matthew', 'Mark', 'Luke', 'John']",
        "",
        "/** [section, canons (1-10; empty = none), startCh, startV, startPart, endCh, endV, endPart,",
        " *   parallels]. Parts are '' or a sub-verse letter ('b' = second part of the verse).",
        " *   Parallels are gospelIndex * 1000 + section, gospelIndex 1-4 in GOSPELS order. */",
        "export type SectionTuple = [number, number[], number, number, string, number, number, string, number[]]",
        "",
        "export const SECTIONS: Record<Gospel, SectionTuple[]> = {",
    ]
    for g in GOSPELS:
        lines.append(f"  {g}: [")
        for r in sections[g]:
            lines.append("    " + json.dumps(r, separators=(",", ":")) + ",")
        lines.append("  ],")
    lines += [
        "}",
        "",
        "export const CARPIANUS: string[] = " + json.dumps(letter, ensure_ascii=False, indent=2),
        END,
    ]
    # Hand-written helpers live below END in the same module: a separate file would need
    # a runtime relative import, which tsc and node's type stripper can't agree on.
    cur = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else END
    assert END in cur, f"{OUT} lost its {END} marker"
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + cur.split(END, 1)[1])
    print(f"Wrote {OUT} ({os.path.getsize(OUT) / 1024:.1f} KB)")


if __name__ == "__main__":
    emit(build(), carpianus_paragraphs())
