"""
Build the People & Places pack + online JSON from STEPBible TIPNR (CC BY 4.0), with
coordinates from TIPNR's OpenBible links (OpenBible.info, CC BY 4.0; ancient.jsonl fills gaps),
plus the hand-curated deuterocanon supplement (scripts/people/curation/*.json).

Inputs (sparse clones made by the build session, see temp/src_data):
  temp/src_data/STEPBible-Data/Proper Nouns/TIPNR*.txt
  temp/src_data/openbible_ancient.jsonl
  temp/packs/webc.db                                  (validates deuterocanon refs)

Outputs:
  temp/packs/people.db
  data/online/people/ch/<Book>/<chapter>.json        {"<verse>": [[id, name, kind, brief], ...]}
  data/online/people/e/<id>.json                     full profile
  data/online/people/index.json                      [[id, name, kind, brief, refCount], ...]  (search / browse)

    python scripts/people/build_people.py
"""
import glob
import json
import os
import re
import shutil
import sqlite3
import sys

TIPNR = glob.glob(os.path.join("temp", "src_data", "STEPBible-Data", "Proper Nouns", "TIPNR*.txt"))[0]
OPENBIBLE = os.path.join("temp", "src_data", "openbible_ancient.jsonl")
WEBC = os.path.join("temp", "packs", "webc.db")
CURATION = os.path.join("scripts", "people", "curation")
OUT_DB = os.path.join("temp", "packs", "people.db")
OUT_JSON = os.path.join("data", "online", "people")

BOOKS = {
    "Gen": "Genesis", "Exo": "Exodus", "Lev": "Leviticus", "Num": "Numbers", "Deu": "Deuteronomy",
    "Jos": "Joshua", "Jdg": "Judges", "Rut": "Ruth", "1Sa": "1 Samuel", "2Sa": "2 Samuel",
    "1Ki": "1 Kings", "2Ki": "2 Kings", "1Ch": "1 Chronicles", "2Ch": "2 Chronicles", "Ezr": "Ezra",
    "Neh": "Nehemiah", "Est": "Esther", "Job": "Job", "Psa": "Psalms", "Pro": "Proverbs",
    "Ecc": "Ecclesiastes", "Sng": "Song of Solomon", "Isa": "Isaiah", "Jer": "Jeremiah",
    "Lam": "Lamentations", "Ezk": "Ezekiel", "Dan": "Daniel", "Hos": "Hosea", "Jol": "Joel",
    "Amo": "Amos", "Oba": "Obadiah", "Jon": "Jonah", "Mic": "Micah", "Nam": "Nahum",
    "Hab": "Habakkuk", "Zep": "Zephaniah", "Hag": "Haggai", "Zec": "Zechariah", "Mal": "Malachi",
    "Mat": "Matthew", "Mrk": "Mark", "Luk": "Luke", "Jhn": "John", "Act": "Acts", "Rom": "Romans",
    "1Co": "1 Corinthians", "2Co": "2 Corinthians", "Gal": "Galatians", "Eph": "Ephesians",
    "Php": "Philippians", "Col": "Colossians", "1Th": "1 Thessalonians", "2Th": "2 Thessalonians",
    "1Ti": "1 Timothy", "2Ti": "2 Timothy", "Tit": "Titus", "Phm": "Philemon", "Heb": "Hebrews",
    "Jas": "James", "1Pe": "1 Peter", "2Pe": "2 Peter", "1Jn": "1 John", "2Jn": "2 John",
    "3Jn": "3 John", "Jud": "Jude", "Rev": "Revelation",
}
KIND = {"PERSON": "person", "PLACE": "place", "PLACE+PERSON": "place", "OTHER": "other"}
REF = re.compile(r"^([1-3][A-Z][a-z]|[A-Z][a-z]{2})\.(\d+)\.(\d+)[a-z]?$")
UID = re.compile(r"[^\s,+]+@[A-Za-z0-9.\-]+(?:\([a-z?]\))*")
COORD = re.compile(r"/@(-?\d+\.\d+),(-?\d+\.\d+)")


def parse_ref(s: str):
    m = REF.match(s.strip())
    if not m or m.group(1) not in BOOKS:
        return None
    return BOOKS[m.group(1)], int(m.group(2)), int(m.group(3))


def uids(field: str) -> list[tuple[str, str]]:
    """[(uid, suffix)] from a relations field like 'Terah@Gen.11.24-Luk + Sarah@Gen.11.29-1Pe(a)'."""
    out = []
    for m in UID.finditer(field or ""):
        tok = m.group(0)
        suffix = "".join(re.findall(r"\(([a-z?])\)", tok))
        out.append((re.sub(r"\([a-z?]\)", "", tok), suffix))
    return out


def parse_tipnr() -> list[dict]:
    lines = open(TIPNR, encoding="utf-8").read().split("\n")
    recs, cur, kind = [], None, None
    started = False
    for raw in lines:
        line = raw.rstrip("\t ")
        if line.startswith("$"):
            m = re.match(r"^\$=+\s*([A-Z+]+)", line)
            kind = KIND.get(m.group(1)) if m else None
            if m and m.group(1) == "PERSON":
                started = True
            cur = None
            continue
        if not started or kind is None or not line:
            continue
        if cur is None and "@" in line.split("\t")[0] and not line.startswith("–"):
            f = line.split("\t")
            uid = f[0].split("=")[0].strip()
            cur = {"uid": uid, "name": uid.split("@")[0].replace("_", " "), "kind": kind,
                   "names": [], "refs": set(), "rel": [], "lat": None, "lng": None, "gender": None,
                   "brief": "", "short": "", "desc": f[1].strip() if len(f) > 1 else ""}
            if kind == "person":
                parents = f[2] if len(f) > 2 else ""
                male, _, female = parents.partition("+")
                for u, s in uids(male):
                    cur["rel"].append(("ancestor" if s in ("a", "d") else "father", u))
                for u, s in uids(female):
                    cur["rel"].append(("ancestor" if s in ("a", "d") else "mother", u))
                for col, rel in ((3, "sibling"), (4, "spouse"), (5, "child")):
                    for u, s in uids(f[col] if len(f) > col else ""):
                        cur["rel"].append((rel if not s else ("descendant" if rel == "child" else rel), u))
                g = next((x.strip() for x in f if x.strip() in ("Male", "Female")), None)
                cur["gender"] = g
            else:
                m2 = COORD.search(line)
                if m2:
                    cur["lat"], cur["lng"] = float(m2.group(1)), float(m2.group(2))
                cur["openbible"] = f[1].strip() if len(f) > 1 else ""
            recs.append(cur)
            continue
        if cur is None:
            continue
        if line.startswith("–"):
            f = line.split("\t")
            sig = f[0].strip("– ").strip()
            if sig.startswith("Total") or len(f) < 5:
                continue
            uniq = f[1].strip()
            form = uniq.split("|")[0].split("@")[0] if "|" in uniq else (f[3].split("=")[0].split(";")[0].strip() or cur["name"])
            strong = f[2].split("«")[0].strip()
            if form and form not in [n[0] for n in cur["names"]]:
                cur["names"].append((form, strong))
            elif strong and (form, strong) not in cur["names"]:
                cur["names"].append((form, strong))
            for r in f[-1].split(";"):
                p = parse_ref(r)
                if p:
                    cur["refs"].add(p)
        elif line.startswith("@Brief="):
            cur["brief"] = line[7:].strip()
        elif line.startswith("@Short="):
            cur["short"] = line[7:].split("\t")[0].strip()
        elif line.startswith("@Briefest=") and not cur["brief"]:
            cur["brief"] = line[10:].strip()
    return recs


def openbible_coords() -> dict[str, tuple[float, float]]:
    out = {}
    if not os.path.exists(OPENBIBLE):
        return out
    for line in open(OPENBIBLE, encoding="utf-8"):
        d = json.loads(line)
        name = d.get("friendly_id") or d.get("name")
        best = None
        for ident in d.get("identifications", []):
            for res in ident.get("resolutions", []):
                ll = res.get("lonlat")
                if ll:
                    lon, lat = map(float, ll.split(","))
                    score = ident.get("score", {}).get("time_total", 0)
                    if best is None or score > best[0]:
                        best = (score, lat, lon)
        if name and best:
            out[name] = (best[1], best[2])
    return out


def webc_verses() -> set:
    c = sqlite3.connect(WEBC)
    return {(b, ch, v) for b, ch, v in c.execute("SELECT book, chapter, verse FROM bible_translations")}


RELS = {"father", "mother", "sibling", "spouse", "child", "ancestor", "descendant"}


def load_curation(recs: list[dict], files: list[str] | None = None) -> list[str]:
    """Merge scripts/people/curation/*.json. Returns problems.

    Schema: {"entities": [{"key": "Tobias@Tob.1.9" (new uid, TIPNR style, using its first deutero ref),
      "same_as": "<TIPNR uid>" (optional: the same person/place as an existing TIPNR entity -> only refs/names are added),
      "name", "kind": "person"|"place"|"other", "names": [forms], "brief", "short", "gender": "Male"|"Female",
      "lat", "lng" (places, optional), "refs": ["Tobit 1:9", ...] (WEBC versification),
      "relations": [{"rel": "father|mother|sibling|spouse|child|ancestor|descendant", "key": "<uid or new key>"}]}]}
    """
    by_uid = {r["uid"]: r for r in recs}
    webc = webc_verses()
    errs = []
    files = files or sorted(glob.glob(os.path.join(CURATION, "*.json")))
    new = []
    for path in files:
        for e in json.load(open(path, encoding="utf-8"))["entities"]:
            refs = set()
            for s in e.get("refs", []):
                m = re.match(r"^(.+) (\d+):(\d+)$", s)
                if not m or (m.group(1), int(m.group(2)), int(m.group(3))) not in webc:
                    errs.append(f"{os.path.basename(path)}: {e.get('key')}: bad ref {s!r}")
                    continue
                refs.add((m.group(1), int(m.group(2)), int(m.group(3))))
            if not e.get("key") or ("@" not in e["key"]):
                errs.append(f"{os.path.basename(path)}: entity without a uid-style key: {e.get('name')}")
                continue
            if not e.get("same_as") and (e.get("kind") not in ("person", "place", "other") or not e.get("name")):
                errs.append(f"{e['key']}: needs name + kind person|place|other")
                continue
            if not refs:
                errs.append(f"{e['key']}: no valid refs")
            if e.get("same_as"):
                tgt = by_uid.get(e["same_as"])
                if not tgt:
                    errs.append(f"{e.get('key')}: same_as {e['same_as']!r} not a TIPNR uid")
                    continue
                tgt["refs"] |= refs
                for n in e.get("names", []):
                    if n not in [x[0] for x in tgt["names"]]:
                        tgt["names"].append((n, ""))
                by_uid[e["key"]] = tgt
                continue
            rec = {"uid": e["key"], "name": e["name"], "kind": e["kind"], "names": [(n, "") for n in e.get("names", [e["name"]])],
                   "refs": refs, "rel": [], "lat": e.get("lat"), "lng": e.get("lng"), "gender": e.get("gender"),
                   "brief": e.get("brief", ""), "short": e.get("short", ""), "desc": "", "_rel": e.get("relations", [])}
            new.append(rec)
            by_uid[e["key"]] = rec
    for rec in new:
        for r in rec.pop("_rel"):
            if r.get("rel") not in RELS or r.get("key") not in by_uid:
                errs.append(f"{rec['uid']}: bad relation {r}")
                continue
            rec["rel"].append((r["rel"], by_uid[r["key"]]["uid"]))
    recs.extend(new)
    return errs


def build():
    sys.stdout.reconfigure(encoding="utf-8")
    recs = parse_tipnr()
    errs = load_curation(recs)
    if errs:
        print("\n".join(errs[:80]))
        print(f"{len(errs)} curation problem(s)")
        sys.exit(1)

    ob = openbible_coords()
    filled = 0
    for r in recs:
        if r["kind"] == "place" and r["lat"] is None:
            hit = ob.get(r.get("openbible") or "") or ob.get(r["name"])
            if hit:
                r["lat"], r["lng"] = hit
                filled += 1

    recs = [r for r in recs if r["refs"]]
    recs.sort(key=lambda r: (r["name"].lower(), r["uid"]))
    ids = {r["uid"]: i + 1 for i, r in enumerate(recs)}
    for r in recs:
        r["id"] = ids[r["uid"]]

    # inverse relations so a child's profile shows the parent even if only the parent lists it
    inverse = {"father": "child", "mother": "child", "child": None, "spouse": "spouse", "sibling": "sibling"}
    rels = set()
    for r in recs:
        for rel, u in r["rel"]:
            if u in ids and ids[u] != r["id"]:
                rels.add((r["id"], rel, ids[u]))
                inv = inverse.get(rel)
                if inv:
                    rels.add((ids[u], inv, r["id"]))
        # children listed by the parent -> parent relation on the child
        for rel, u in r["rel"]:
            if rel == "child" and u in ids:
                pr = "mother" if r.get("gender") == "Female" else "father"
                rels.add((ids[u], pr, r["id"]))

    if os.path.exists(OUT_DB):
        os.remove(OUT_DB)
    db = sqlite3.connect(OUT_DB)
    db.executescript("""
        CREATE TABLE pn_entity (id INTEGER PRIMARY KEY, uid TEXT, name TEXT, kind TEXT, brief TEXT,
                                short TEXT, gender TEXT, lat REAL, lng REAL, ref_count INTEGER);
        CREATE TABLE pn_name (entity_id INTEGER, form TEXT, strongs TEXT);
        CREATE TABLE pn_ref (entity_id INTEGER, book TEXT, chapter INTEGER, verse INTEGER);
        CREATE TABLE pn_rel (entity_id INTEGER, rel TEXT, other_id INTEGER);
    """)
    for r in recs:
        db.execute("INSERT INTO pn_entity VALUES (?,?,?,?,?,?,?,?,?,?)",
                   (r["id"], r["uid"], r["name"], r["kind"], r["brief"] or r["desc"], r["short"],
                    r["gender"], r["lat"], r["lng"], len(r["refs"])))
        db.executemany("INSERT INTO pn_name VALUES (?,?,?)", [(r["id"], f, s) for f, s in r["names"]])
        db.executemany("INSERT INTO pn_ref VALUES (?,?,?,?)", [(r["id"], *x) for x in sorted(r["refs"])])
    db.executemany("INSERT INTO pn_rel VALUES (?,?,?)", sorted(rels))
    db.executescript("""
        CREATE INDEX idx_pn_ref_bcv ON pn_ref(book, chapter, verse);
        CREATE INDEX idx_pn_ref_entity ON pn_ref(entity_id);
        CREATE INDEX idx_pn_name_form ON pn_name(form);
        CREATE INDEX idx_pn_name_strongs ON pn_name(strongs);
        CREATE INDEX idx_pn_rel_entity ON pn_rel(entity_id);
    """)
    db.commit()
    db.execute("VACUUM")
    db.close()

    # online JSON
    if os.path.exists(OUT_JSON):
        shutil.rmtree(OUT_JSON)
    by_id = {r["id"]: r for r in recs}
    chapters: dict[tuple, dict] = {}
    for r in recs:
        for b, c, v in r["refs"]:
            chapters.setdefault((b, c), {}).setdefault(str(v), []).append([r["id"], r["name"], r["kind"], r["brief"] or r["desc"]])
    for (b, c), verses in chapters.items():
        d = os.path.join(OUT_JSON, "ch", b)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, f"{c}.json"), "w", encoding="utf-8") as f:
            json.dump(verses, f, ensure_ascii=False, separators=(",", ":"))
    rel_by: dict[int, list] = {}
    for a, rel, b in sorted(rels):
        rel_by.setdefault(a, []).append([rel, b, by_id[b]["name"]])
    os.makedirs(os.path.join(OUT_JSON, "e"), exist_ok=True)
    for r in recs:
        prof = {"id": r["id"], "uid": r["uid"], "name": r["name"], "kind": r["kind"],
                "brief": r["brief"] or r["desc"], "short": r["short"], "gender": r["gender"],
                "lat": r["lat"], "lng": r["lng"], "names": r["names"],
                "refs": [[b, c, v] for b, c, v in sorted(r["refs"], key=ref_order)],
                "rel": rel_by.get(r["id"], [])}
        with open(os.path.join(OUT_JSON, "e", f"{r['id']}.json"), "w", encoding="utf-8") as f:
            json.dump(prof, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT_JSON, "index.json"), "w", encoding="utf-8") as f:
        json.dump([[r["id"], r["name"], r["kind"], r["brief"] or r["desc"], len(r["refs"])] for r in recs],
                  f, ensure_ascii=False, separators=(",", ":"))

    kinds = {}
    for r in recs:
        kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
    pins = sum(1 for r in recs if r["kind"] == "place" and r["lat"] is not None)
    print(f"{len(recs)} entities {kinds}; places with coords {pins} (OpenBible filled {filled}); "
          f"relations {len(rels)}; pack {os.path.getsize(OUT_DB) / 1e6:.1f} MB")
    selfcheck()


_ORDER = list(BOOKS.values())


def ref_order(x):
    b = x[0]
    return (_ORDER.index(b) if b in _ORDER else 100, x[1], x[2])


def selfcheck():
    db = sqlite3.connect(OUT_DB)
    ab = db.execute("SELECT id FROM pn_entity WHERE uid LIKE 'Abraham@Gen.11.26%'").fetchone()
    assert ab, "Abraham missing"
    forms = {f for (f,) in db.execute("SELECT form FROM pn_name WHERE entity_id=?", ab)}
    assert {"Abraham", "Abram"} <= forms, forms
    rel = {(r, n) for r, n in db.execute(
        "SELECT r.rel, e.name FROM pn_rel r JOIN pn_entity e ON e.id=r.other_id WHERE r.entity_id=?", ab)}
    assert ("spouse", "Sarah") in rel and ("child", "Isaac") in rel and ("father", "Terah") in rel, rel
    lat, lng = db.execute("SELECT lat, lng FROM pn_entity WHERE uid LIKE 'Bethel@Gen.12.8%'").fetchone()
    assert abs(lat - 31.93) < 0.05 and abs(lng - 35.22) < 0.05, (lat, lng)
    hits = {n for (n,) in db.execute(
        "SELECT e.name FROM pn_ref r JOIN pn_entity e ON e.id=r.entity_id WHERE r.book='Genesis' AND r.chapter=13 AND r.verse=3")}
    assert {"Abraham", "Bethel", "Ai", "Negeb"} & hits >= {"Bethel", "Ai"}, hits
    print("selfcheck ok")


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "--check":
        sys.stdout.reconfigure(encoding="utf-8")
        problems = load_curation(parse_tipnr(), [sys.argv[2]])
        print("\n".join(problems) or "All valid.")
        sys.exit(1 if problems else 0)
    build()
