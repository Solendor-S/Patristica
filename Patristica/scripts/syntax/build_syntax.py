"""
Build the Clause-view packs (syntax_nt, syntax_ot) + online JSON from MACULA lowfat trees.

    python scripts/syntax/build_syntax.py            # both
    python scripts/syntax/build_syntax.py nt         # or ot

Fetch the sources first (sparse clones, ~600 MB):
    cd temp/src_data
    git clone --depth 1 --filter=blob:none --sparse https://github.com/Clear-Bible/macula-greek.git
    (cd macula-greek && git sparse-checkout set SBLGNT/lowfat)
    git clone --depth 1 --filter=blob:none --sparse https://github.com/Clear-Bible/macula-hebrew.git
    (cd macula-hebrew && git sparse-checkout set WLC/lowfat)

Pack tables:
  syn_sentence(id, book, start_ch, start_v, end_ch, end_v, rows)   rows = JSON outline (see macula.py);
                                                                    word refs are stored without the book code ("5:12!27")
  syn_verse(book, chapter, verse, sentence_id)
Online: data/online/syntax/<Book>/<chapter>.json = {"s": {"<id>": [sc, sv, ec, ev, rows]}, "v": {"<verse>": [ids]}}
"""
import json
import os
import shutil
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import macula  # noqa: E402

PACKS = os.path.join("temp", "packs")
ONLINE = os.path.join("data", "online", "syntax")


def compact(rows: list[dict]) -> list:
    out = []
    for r in rows:
        # refs arrive already in app numbering (see app_rows); store them without the book code
        words = [[w[0].split(" ", 1)[-1], w[1], w[2], w[3], w[4]] for w in r["w"]]
        out.append([r["d"], r["r"], words])
    return out


def build(part: str):
    books = macula.NT if part == "nt" else macula.OT
    path = os.path.join(PACKS, f"syntax_{part}.db")
    if os.path.exists(path):
        os.remove(path)
    db = sqlite3.connect(path)
    db.executescript("""
        CREATE TABLE syn_sentence (id INTEGER PRIMARY KEY, book TEXT, start_ch INTEGER, start_v INTEGER,
                                   end_ch INTEGER, end_v INTEGER, rows TEXT);
        CREATE TABLE syn_verse (book TEXT, chapter INTEGER, verse INTEGER, sentence_id INTEGER);
    """)
    sid = 0 if part == "nt" else 1_000_000
    for book in books:
        chapters: dict[int, dict] = {}
        for s in macula.sentences(book):
            rows = macula.outline(s, macula.lang_of(book))
            # OT refs move to English numbering once, so they line up with the app's verses
            app_rows = [{**r, "w": [[macula.app_ref(w[0]), *w[1:]] for w in r["w"]]} for r in rows]
            verses = [v for v in macula.sentence_verses(app_rows) if v[0] == book]
            if not verses:
                continue
            sid += 1
            rj = compact(app_rows)
            (sc, sv), (ec, ev) = verses[0][1:], verses[-1][1:]
            db.execute("INSERT INTO syn_sentence VALUES (?,?,?,?,?,?,?)",
                       (sid, book, sc, sv, ec, ev, json.dumps(rj, ensure_ascii=False, separators=(",", ":"))))
            db.executemany("INSERT INTO syn_verse VALUES (?,?,?,?)", [(book, c, v, sid) for _, c, v in verses])
            for _, c, v in verses:
                ch = chapters.setdefault(c, {"s": {}, "v": {}})
                ch["s"][str(sid)] = [sc, sv, ec, ev, rj]
                ids = ch["v"].setdefault(str(v), [])
                if sid not in ids:
                    ids.append(sid)
        d = os.path.join(ONLINE, book)
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d)
        for c, data in chapters.items():
            with open(os.path.join(d, f"{c}.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        macula.sentences.cache_clear()
        print(f"  {book}: {len(chapters)} chapters", flush=True)
    db.executescript("CREATE INDEX idx_syn_verse ON syn_verse(book, chapter, verse);")
    db.commit()
    db.execute("VACUUM")
    db.close()
    print(f"{path}: {os.path.getsize(path) / 1e6:.1f} MB")


def selfcheck():
    db = sqlite3.connect(os.path.join(PACKS, "syntax_nt.db"))
    a = db.execute("SELECT sentence_id FROM syn_verse WHERE book='Ephesians' AND chapter=1 AND verse=3").fetchall()
    b = db.execute("SELECT sentence_id FROM syn_verse WHERE book='Ephesians' AND chapter=1 AND verse=6").fetchall()
    assert set(a) & set(b), (a, b)  # MACULA splits Eph 1:3-14 into 3:6, 7:10, 11:12, 13:14
    rows = json.loads(db.execute(
        "SELECT rows FROM syn_sentence s JOIN syn_verse v ON v.sentence_id=s.id "
        "WHERE v.book='Romans' AND v.chapter=5 AND v.verse=12").fetchone()[0])
    refs = {w[0] for r in rows for w in r[2]}
    assert {"5:12!27", "5:12!28"} <= refs
    print("selfcheck ok")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parts = sys.argv[1:] or ["nt", "ot"]
    for p in parts:
        build(p)
    if "nt" in parts:
        selfcheck()
