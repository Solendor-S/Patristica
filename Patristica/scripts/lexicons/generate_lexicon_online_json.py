"""
Generate the online fallback for the lexicons pack into data/online/lexicons/ (served from
master via raw.githubusercontent, like the commentary JSON). Sharded to keep the file
count low; shapes match src/lib/PackManager.ts fetchOnline* helpers.

  as/{n // 100}.json            {"G26": [{"l", "n", "b", "a"}]}         Abbott-Smith
  sem/{G|H}/{n // 100}.json     {"G26": [{"l", "s": [sense, ...]}]}     UBS entries
  sem-verse/{Book}/{ch}.json    {"35": {"G26": [lex_id, ...]}}          sense used in verse
  domains/{G|H}/{key}.json      [{"s", "l", "g", "d"}]                   words in a domain

sense = {"id", "p", "k", "dp", "ln", "d", "g", "c", "ai"}

    python scripts/lexicons/generate_lexicon_online_json.py   (run from Patristica/)
"""
import json
import os
import re
import shutil
import sqlite3

PACK = "temp/packs/lexicons.db"
OUT = "data/online/lexicons"


def shard(strongs: str) -> tuple[str, int]:
    m = re.match(r"^([GH])(\d+)", strongs)
    return m.group(1), int(m.group(2)) // 100


def write(path: str, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


def main():
    con = sqlite3.connect(f"file:{PACK}?mode=ro", uri=True)
    if os.path.exists(OUT):
        shutil.rmtree(OUT)

    shards: dict[str, dict] = {}
    for strongs, lemma, nt, body, abbrevs in con.execute(
            "SELECT strongs, lemma, nt_count, body, abbrevs FROM abbott_smith ORDER BY rowid"):
        _, n = shard(strongs)
        shards.setdefault(f"as/{n}.json", {}).setdefault(strongs, []).append(
            {"l": lemma, "n": nt, "b": body, "a": json.loads(abbrevs)})

    senses_by_entry: dict[str, list] = {}
    for row in con.execute("""SELECT lex_id, entry_id, pos, domain_key, domain_path, ln_code, definition,
                                     glosses, comments, ai_generated FROM sem_senses ORDER BY entry_id, idx"""):
        lex_id, eid, pos, key, path, ln, d, g, c, ai = row
        senses_by_entry.setdefault(eid, []).append(
            {"id": lex_id, "p": pos, "k": key, "dp": path, "ln": ln, "d": d, "g": g, "c": c, "ai": ai})
    for eid, lang, strongs, lemma in con.execute("SELECT entry_id, lang, strongs, lemma FROM sem_entries ORDER BY rowid"):
        _, n = shard(strongs)
        shards.setdefault(f"sem/{lang}/{n}.json", {}).setdefault(strongs, []).append(
            {"l": lemma, "s": senses_by_entry.get(eid, [])})

    for book, ch, v, strongs, lex_id in con.execute(
            "SELECT book, chapter, verse, strongs, lex_id FROM sem_verse ORDER BY book, chapter, verse"):
        f = shards.setdefault(f"sem-verse/{book}/{ch}.json", {})
        f.setdefault(str(v), {}).setdefault(strongs, []).append(lex_id)

    # Domain members: one row per Strong's number (its first sense in that domain).
    seen = set()
    for lang, strongs, lemma, key, g, d in con.execute("""
            SELECT e.lang, e.strongs, e.lemma, s.domain_key, s.glosses, s.definition
            FROM sem_senses s JOIN sem_entries e ON e.entry_id = s.entry_id
            WHERE s.domain_key IS NOT NULL ORDER BY e.lang, s.domain_key, e.strongs, s.idx"""):
        if (lang, key, strongs) in seen:
            continue
        seen.add((lang, key, strongs))
        shards.setdefault(f"domains/{lang}/{key}.json", []).append(
            {"s": strongs, "l": lemma, "g": (g or "").split("; ")[0], "d": d})

    for rel, data in shards.items():
        write(os.path.join(OUT, rel), data)

    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(OUT) for f in fs)
    print(f"Wrote {len(shards)} files to {OUT} ({total / 1024 / 1024:.1f} MB)")
    for prefix in ("as/", "sem/", "sem-verse/", "domains/"):
        print(f"  {prefix:<11} {sum(1 for k in shards if k.startswith(prefix))} files")


if __name__ == "__main__":
    main()
