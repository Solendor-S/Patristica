"""
Import the UBS semantic dictionaries (CC BY-SA 4.0) into temp/packs/lexicons.db:
  - UBS Dictionary of New Testament Greek (v1.1, Louw-Nida domains)
  - UBS Dictionary of Biblical Hebrew (v0.9.4, SDBH domains)

Tables
  sem_entries(entry_id, lang, strongs, lemma)        one row per Strong's code
  sem_senses(lex_id, entry_id, idx, pos, domain_key, domain_path, ln_code,
             definition, glosses, comments, ai_generated)
  sem_verse(book, chapter, verse, strongs, lex_id)   which sense a word has in a verse

sem_verse is keyed to the app's own word tables (wlc_words / greek_words_tr), not to
UBS's versification: the word study queries those tables with the reader's verse, so
each UBS reference is moved to the neighbouring verse when the Strong's number only
occurs there (Psalm titles = verse 0 in wlc_words, Hebrew vs English verse splits).

Comments use the same light markup as Abbott-Smith (⟦Book C:V|label⟧ links).

    python scripts/lexicons/import_ubs_domains.py      (run from Patristica/)
"""
import json
import os
import re
import sqlite3

SRC = "temp/lexicon-src"
PACK = "temp/packs/lexicons.db"
CORE = "assets/db/bible.db"
DICTS = {
    "G": ("UBSGreekNTDic-v1.1-en.JSON", "UBSGreekNTDicLexicalDomains-v1.1-en.JSON", "greek_words_tr"),
    "H": ("UBSHebrewDic-v0.9.4-en.JSON", "UBSHebrewDicLexicalDomains-v0.9.4-en.JSON", "wlc_words"),
}
STRONG_RE = re.compile(r"^([GH])0*(\d+)")


def norm_strongs(s: str | None) -> str | None:
    m = STRONG_RE.match(s or "")
    return f"{m.group(1)}{m.group(2)}" if m else None


def load_json(name: str):
    return json.load(open(os.path.join(SRC, name), encoding="utf-8-sig"))


def domain_labels(name: str) -> dict[str, str]:
    out = {}
    for d in load_json(name):
        loc = next((l for l in d.get("SemanticDomainLocalizations") or [] if l.get("LanguageCode") == "en"), None)
        if loc and d.get("Code"):
            out[d["Code"]] = loc["Label"]
    return out


def path_for(code: str, labels: dict[str, str]) -> str:
    """'025003' -> 'Attitudes and Emotions › Love, Affection, Compassion'"""
    parts = [labels.get(code[:i]) for i in range(3, len(code) + 1, 3)]
    return " › ".join(p for p in parts if p)


def parse_ref(ref: str):
    """'04302101500046{N:001}' -> (43, 21, 15)"""
    m = re.match(r"(\d{3})(\d{3})(\d{3})", ref)
    return (int(m.group(1)), int(m.group(2)), int(m.group(3))) if m else None


def main():
    core = sqlite3.connect(f"file:{CORE}?mode=ro", uri=True)
    book_by_num = {o: b for b, o in core.execute("SELECT DISTINCT book, book_order FROM bible_verses")}
    assert book_by_num[1] == "Genesis" and book_by_num[40] == "Matthew" and book_by_num[66] == "Revelation", book_by_num
    pointed = {norm_strongs(n): l for n, l in core.execute("SELECT number, lemma FROM strongs_hebrew") if l}

    def ref_link(ids: str) -> str:
        out = []
        for rid in ids.split():
            r = parse_ref(rid)
            if r and r[0] in book_by_num:
                label = f"{book_by_num[r[0]]} {r[1]}:{r[2]}"
                out.append(f"⟦{label}|{label}⟧")
        return ", ".join(out)

    def clean_comments(c: str | None) -> str:
        if not c:
            return ""
        c = re.sub(r"\{L:([^<{}]*)<[^>]*>\}", r"\1", c)
        c = re.sub(r"\{S:([^{}]*)\}", lambda m: ref_link(m.group(1)), c)
        c = re.sub(r"\{D:([^{}]*)\}", r"LN \1", c)
        c = re.sub(r"\{A:([^{}]*)\}", r"\1", c)
        c = re.sub(r"\{N:[^{}]*\}", "", c)
        c = re.sub(r"\[[a-z]\]", "", c)
        return re.sub(r"\s+", " ", c).strip()

    con = sqlite3.connect(PACK)
    con.executescript("""
        DROP TABLE IF EXISTS sem_entries;
        DROP TABLE IF EXISTS sem_senses;
        DROP TABLE IF EXISTS sem_verse;
        CREATE TABLE sem_entries (entry_id TEXT NOT NULL, lang TEXT NOT NULL, strongs TEXT NOT NULL, lemma TEXT NOT NULL);
        CREATE TABLE sem_senses (
          lex_id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, idx INTEGER NOT NULL, pos TEXT,
          domain_key TEXT, domain_path TEXT, ln_code TEXT,
          definition TEXT, glosses TEXT, comments TEXT, ai_generated INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE sem_verse (book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
                                strongs TEXT NOT NULL, lex_id TEXT NOT NULL);
    """)

    for lang, (dict_file, domain_file, word_table) in DICTS.items():
        labels = domain_labels(domain_file)
        print(f"[{lang}] loading word table {word_table} ...")
        words: dict[tuple, set] = {}
        for b, c, v, s in core.execute(f"SELECT book, chapter, verse, strongs FROM {word_table}"):
            ns = norm_strongs(s)
            if ns:
                words.setdefault((b, c, v), set()).add(ns)

        def align(book: str, ch: int, v: int, strongs: list[str]):
            """Verse in the app's word table where this word actually is."""
            for cand in (v, v - 1, v + 1, v - 2, 0):
                if cand >= 0 and any(s in words.get((book, ch, cand), ()) for s in strongs):
                    return cand
            return v

        entries = senses = verse_rows = moved = 0
        sense_rows, entry_rows, verse_set = [], [], set()
        for e in load_json(dict_file):
            codes = sorted({n for n in (norm_strongs(s) for s in e.get("StrongCodes") or []) if n})
            if not codes:
                continue
            entries += 1
            eid = lang + e["MainId"]          # UBS ids are only unique within one dictionary
            lemma = e.get("Lemma") or ""
            if lang == "H":   # UBS Hebrew lemmas are unpointed; prefer the pointed Strong's lemma
                lemma = pointed.get(codes[0]) or lemma
            entry_rows += [(eid, lang, s, lemma) for s in codes]
            idx = 0
            for bf in e.get("BaseForms") or []:
                pos = ", ".join(bf.get("PartsOfSpeech") or [])
                for m in bf.get("LEXMeanings") or []:
                    sense = next((s for s in m.get("LEXSenses") or [] if s.get("LanguageCode") == "en"), None)
                    if not sense:
                        continue
                    dom = (m.get("LEXSubDomains") or m.get("LEXDomains") or [None])[0]
                    key = dom.get("DomainCode") if dom else None
                    if lang == "G":
                        path = path_for(key, labels) if key else ""
                    else:
                        # Hebrew contextual meanings: "People" within "Love" → "Love › People"
                        path = dom.get("Domain", "") if dom else ""
                        if dom and dom.get("DomainSource"):
                            path = f"{dom['DomainSource']} › {path}"
                    definition = (sense.get("DefinitionShort") or sense.get("DefinitionLong") or "").lstrip("= ").strip()
                    sense_rows.append((
                        lang + m["LEXID"], eid, idx, pos, key, path, m.get("LEXEntryCode") or None,
                        definition, "; ".join(sense.get("Glosses") or []),
                        clean_comments(sense.get("Comments")), int(bool(sense.get("AIGenerated"))),
                    ))
                    idx += 1
                    senses += 1
                    for ref in m.get("LEXReferences") or []:
                        r = parse_ref(ref)
                        if not r or r[0] not in book_by_num:
                            continue
                        book = book_by_num[r[0]]
                        v = align(book, r[1], r[2], codes)
                        moved += v != r[2]
                        for s in codes:
                            verse_set.add((book, r[1], v, s, lang + m["LEXID"]))
        con.executemany("INSERT INTO sem_entries VALUES (?,?,?,?)", entry_rows)
        con.executemany("INSERT INTO sem_senses VALUES (?,?,?,?,?,?,?,?,?,?,?)", sense_rows)
        con.executemany("INSERT INTO sem_verse VALUES (?,?,?,?,?)", sorted(verse_set))
        verse_rows = len(verse_set)
        print(f"[{lang}] {entries} entries, {senses} senses, {verse_rows} verse rows ({moved} refs realigned)")

    con.executescript("""
        CREATE INDEX idx_sem_entries_strongs ON sem_entries(strongs);
        CREATE INDEX idx_sem_senses_entry ON sem_senses(entry_id);
        CREATE INDEX idx_sem_senses_domain ON sem_senses(domain_key);
        CREATE INDEX idx_sem_verse_ref ON sem_verse(book, chapter, verse);
    """)
    con.commit()

    # ── Checks ──
    q = lambda sql, *a: con.execute(sql, a).fetchall()
    g26 = q("SELECT s.domain_key, s.domain_path, s.ln_code FROM sem_entries e JOIN sem_senses s ON s.entry_id=e.entry_id WHERE e.strongs='G26'")
    assert any(k == "025003" for k, _, _ in g26), g26
    assert q("SELECT 1 FROM sem_verse WHERE book='John' AND chapter=13 AND verse=35 AND strongs='G26'"), "John 13:35 G26"
    h157 = q("SELECT s.glosses FROM sem_entries e JOIN sem_senses s ON s.entry_id=e.entry_id WHERE e.strongs='H157'")
    assert any("love" in g for (g,) in h157), h157
    # Greek and Hebrew ids must not collide (H157's entry id once matched G155 "request").
    assert not any("request" in g for (g,) in h157), h157
    assert not q("SELECT 1 FROM sem_senses s JOIN sem_entries e ON e.entry_id=s.entry_id "
                 "WHERE substr(s.lex_id,1,1) != e.lang LIMIT 1"), "sense/entry language mismatch"
    # Psalm 3: UBS v2 ("LORD, how…") must land on wlc verse 1, as the reader numbers it.
    assert q("SELECT 1 FROM sem_verse WHERE book='Psalms' AND chapter=3 AND verse=1 AND strongs='H3068'"), "Ps 3 alignment"
    for lang, want in (("G", 0.95), ("H", 0.90)):
        table = "strongs_greek" if lang == "G" else "strongs_hebrew"
        # coverage of Strong's numbers actually used in the word tables
        used = {norm_strongs(s) for (s,) in core.execute(
            f"SELECT DISTINCT strongs FROM {'greek_words_tr' if lang == 'G' else 'wlc_words'}")} - {None}
        have = {s for (s,) in q("SELECT DISTINCT strongs FROM sem_entries WHERE lang=?", lang)}
        cov = len(used & have) / len(used)
        print(f"[{lang}] coverage of Strong's numbers used in the text: {cov:.1%} ({table})")
        assert cov >= want, cov
    print("G26 senses:", g26)
    con.close()


if __name__ == "__main__":
    main()
