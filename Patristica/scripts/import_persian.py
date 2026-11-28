"""
Persian Old Version (1895, public domain) -> translation pack + online JSON.

Source: eBible.org pesOPV ("public domain", redistributable) via the BibleNLP/ebible corpus
(one verse per line, aligned with metadata/vref.txt), the same route import_translations.py uses
for the WEB. Promised on GitHub issue #2.

    python scripts/import_persian.py
Outputs: temp/packs/pes.db, data/online/pes/<Book>/<chapter>.json
"""
import json
import os
import shutil
import sqlite3
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from import_translations import USFM_TO_BOOK  # noqa: E402

BASE = "https://raw.githubusercontent.com/BibleNLP/ebible/main"
PACK = os.path.join("temp", "packs", "pes.db")
ONLINE = os.path.join("data", "online", "pes")
CODE = "PES"


def fetch(url: str) -> list[str]:
    with urllib.request.urlopen(url, timeout=120) as r:
        return r.read().decode("utf-8").splitlines()


def main():
    vref, lines = fetch(f"{BASE}/metadata/vref.txt"), fetch(f"{BASE}/corpus/pes-pesOPV.txt")
    assert len(vref) == len(lines), (len(vref), len(lines))
    rows = []
    for ref, text in zip(vref, lines):
        text = text.strip()
        book = USFM_TO_BOOK.get(ref.split(" ", 1)[0])
        if not text or not book or text == "<range>":
            continue
        c, v = map(int, ref.split(" ", 1)[1].split(":"))
        rows.append((CODE, book, c, v, text))

    if os.path.exists(PACK):
        os.remove(PACK)
    db = sqlite3.connect(PACK)
    db.execute("""CREATE TABLE bible_translations (
        translation TEXT NOT NULL, book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
        text TEXT NOT NULL, PRIMARY KEY (translation, book, chapter, verse))""")
    db.executemany("INSERT INTO bible_translations VALUES (?,?,?,?,?)", rows)
    db.commit()
    db.execute("VACUUM")
    db.close()

    if os.path.exists(ONLINE):
        shutil.rmtree(ONLINE)
    chapters: dict[tuple, list] = {}
    for _, b, c, v, t in rows:
        chapters.setdefault((b, c), []).append({"verse": v, "text": t})
    for (b, c), verses in chapters.items():
        os.makedirs(os.path.join(ONLINE, b), exist_ok=True)
        with open(os.path.join(ONLINE, b, f"{c}.json"), "w", encoding="utf-8") as f:
            json.dump(verses, f, ensure_ascii=False, separators=(",", ":"))

    books = {r[1] for r in rows}
    print(f"{len(rows)} verses, {len(books)} books, {len(chapters)} chapters; pack {os.path.getsize(PACK) / 1e6:.1f} MB")
    assert len(books) == 66 and len(rows) > 30000, "expected the full 66-book Bible"
    gen = dict(((b, c, v), t) for _, b, c, v, t in rows)[("Genesis", 1, 1)]
    assert gen.startswith("در ابتدا"), gen  # "In the beginning"
    print("selfcheck ok:", gen[:40])


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
