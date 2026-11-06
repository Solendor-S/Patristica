"""
Build word-study data for the deuterocanon from Swete's Septuagint.

Source: github.com/QuantForgeSoftware/lxx, data/morph-morpheus/ (CC BY-SA 4.0, credited in
the app). The STEPBible LXX has no tagging for these books. The text is a transcription and
its grammar is machine-generated, so expect occasional errors in both.

  temp/swete/*.txt                  <- downloaded once, pinned to SOURCE_SHA
  temp/packs/lxx-deutero.db         <- pack (upload to packs-v1)
  data/online/words/swete/...       <- same shape as generate_online_word_json.py

The text itself comes from the plain Swete column of STEPBible's early-access LXX file, which
is complete and clean. That column has no Baruch 6 or Bel, so those two come from Brenton's
public-domain Greek on eBible, whose verses match the reader's. The transcription above drops
the end of many verses and has scanning errors, so its text is only the last resort.

A word form that also occurs in the TR takes its hand-checked Strong's number and grammar
from there. Morpheus guesses wrongly on common words (it reads "Διὰ" as Zeus), so its lemma
and grammar are only the fallback, for forms the NT doesn't have. Strong's numbers cover NT
vocabulary, so some words have grammar but no lexicon entry.

Run from Patristica/: python scripts/import_swete_words.py
"""

import json
import os
import re
import shutil
import sqlite3
import unicodedata
import urllib.request
import zipfile
from collections import Counter, defaultdict

from import_webc import fetch_zip

SOURCE_SHA = "46258f8bde173998ef0633d79eff3067b9041575"
SOURCE_URL = f"https://raw.githubusercontent.com/QuantForgeSoftware/lxx/{SOURCE_SHA}/data/morph-morpheus"
SRC_DIR  = "temp/swete"
FULL_TEXT = "temp/stepbible_lxx_preview_data/LXX comparisons.txt"
BRENTON_URL = "https://eBible.org/Scriptures/grcbrent_usfm.zip"
BRENTON_ZIP = "temp/grcbrent_usfm.zip"
CORE_DB  = "assets/db/bible.db"
PACK     = "temp/packs/lxx-deutero.db"
JSON_DIR = "data/online/words/swete"
TABLE    = "lxx_deutero_words"

FULL_TEXT_BOOKS = {
    "68_Tob": "Tobit", "69_Jdt": "Judith", "71_Wis": "Wisdom of Solomon", "72_Sir": "Sirach",
    "73_Bar": "Baruch", "78_1Ma": "1 Maccabees", "79_2Ma": "2 Maccabees",
}

# source file -> app book
SOURCES = {
    "018-Jdt":   "Judith",
    "019-Tob":   "Tobit",
    "020-1Macc": "1 Maccabees",
    "021-2Macc": "2 Maccabees",
    "029-Wis":   "Wisdom of Solomon",
    "030-Sir":   "Sirach",
    "046-Bar":   "Baruch",
    "048-EpJer": "Baruch",             # the Letter of Jeremiah is Baruch 6
    "051-SusTh": "Susanna",
    "053-DanTh": "Prayer of Azariah",  # only Daniel 3:24-90 is taken from this file
    "055-BelTh": "Bel and the Dragon",
}
EXPECTED_CHAPTERS = {
    "Judith": 16, "Tobit": 14, "1 Maccabees": 16, "2 Maccabees": 15, "Wisdom of Solomon": 19,
    "Sirach": 51, "Baruch": 6, "Susanna": 1, "Prayer of Azariah": 1, "Bel and the Dragon": 1,
}

# Latin capitals the transcription uses inside Greek words, as in "ΠΑΣA".
LOOKALIKES = str.maketrans("ABEZHIKMNOPTYXo", "ΑΒΕΖΗΙΚΜΝΟΡΤΥΧο")
LATIN = re.compile("[A-Za-z]")
# Swete's alternative verse numbers are stuck to the next word: "(10)καὶ", "(²)ὅτι", "6οὐ".
EDITOR_MARK = re.compile(r"\([^()]*\)|^[\d⁰¹²³⁴-⁹]+")
# Every word in these books still holding a Latin letter after that, read from context.
# The build fails on any new one, so a source update can't slip through unseen.
SCAN_FIXES = {
    "ΒΟΗΘεαc,": "ΒΟΗΘΕΙΑΣ,",           # 2 Macc 8:23
    "¶C": "", "§C": "",                 # Wis 12:10, 14:19: editor's marks, not text
    "aκαὶ": "καὶ", "bκαὶ": "καὶ",       # Sir 17:1, 36:16
    "ῥομφαίkαν": "ῥομφαίαν",            # Sir 26:28
    "ἐκκαυθήrτεται.": "ἐκκαυθήσεται.",  # Sir 28:10
    "bλαμπρὰ": "λαμπρὰ",                # Sir 30:13
    "nὗ": "οὗ",                         # Sir 36:30
    "ἐs": "ἐπὶ", "ὶ": "",               # Sir 38:33: "ἐπὶ" was split in two
    "πολέsμοο·": "πολέμου·",            # Sir 40:6
}


def norm(word: str) -> str:
    """Accent-free lowercase, with final sigma folded, for matching words across sources."""
    word = unicodedata.normalize("NFD", word)
    word = "".join(c for c in word if unicodedata.category(c) != "Mn")
    return re.sub(r"[^Ͱ-Ͽ]", "", word.lower()).replace("ς", "σ")


def accented(word: str) -> str:
    """Lowercase with accents kept, and grave read as acute: καὶ and καί are the same word."""
    word = unicodedata.normalize("NFD", word.lower()).replace("\u0300", "\u0301")
    return re.sub(r"[^\u0370-\u03ff\u0300-\u036f]", "", word)


def robinson(pos: str, code: str, proper: bool) -> str:
    """Morpheus POS + person/tense/voice/mood/case/number/gender/degree -> the app's codes."""
    person, tense, voice, mood, *cng = code[:7]
    # D is a dual, which Koine doesn't have: Morpheus reaching for classical forms
    cng = "".join(c for c in cng if c not in "-D")
    if pos == "V-":
        if tense == "-":
            return "V"
        if mood == "P" and person != "-":   # Morpheus marks imperatives P; only they have a person
            mood = "D"
        tvm = f"V-{tense}{voice}{mood}"
        if mood == "P":
            return f"{tvm}-{cng}"
        if mood == "N":
            return tvm
        return f"{tvm}-{person}{cng[-1:] or code[5]}"
    if pos == "NP":
        return "N-PRI" if proper else ""
    simple = {"C-": "CONJ", "P-": "PREP", "D-": "ADV", "X-": "PRT"}
    if pos in simple:
        return simple[pos]
    letter = {"N-": "N", "A-": "A", "RA": "T", "RR": "R", "RI": "X"}.get(pos)
    if pos == "RP":
        letter = "P" if person != "-" else "D"
    return f"{letter}-{cng}" if cng and cng[0] in "NGDAV" else letter


assert robinson("N-", "----GSM-", False) == "N-GSM"
assert robinson("RA", "----NSN-", False) == "T-NSN"
assert robinson("V-", "3AAI-S--", False) == "V-AAI-3S"
assert robinson("V-", "-XMPGPF-", False) == "V-XMP-GPF"     # participle
assert robinson("V-", "-PAN----", False) == "V-PAN"         # infinitive
assert robinson("V-", "2PAP-S--", False) == "V-PAD-2S"      # imperative
assert robinson("C-", "--------", False) == "CONJ"
assert robinson("N-", "--------", False) == "N"             # indeclinable
assert robinson("NP", "--------", True) == "N-PRI"
assert robinson("NP", "--------", False) == ""              # capitalised word, not a name
assert robinson("RP", "1---GSM-", False) == "P-GSM"
assert robinson("RP", "----NSN-", False) == "D-NSN"
assert robinson("N-", "----NDF-", False) == "N-NF"          # dual
assert robinson("N-", "-----SM-", False) == "N"             # no case
assert accented("Διὰ,") == accented("διά")


def clean_token(token: str) -> str:
    token = re.sub(r"[\[\]†‡*<>]", "", EDITOR_MARK.sub("", token)).translate(LOOKALIKES)
    token = SCAN_FIXES.get(token, token)
    assert not LATIN.search(token), f"Latin in {token!r}"
    return token


def reader_verse(book: str, chapter: int, verse: int) -> int:
    """Swete's verse number -> the reader's, where the two differ by a clean shift. Checked by
    comparing each Greek verse's glosses with the English. Sirach 35-36 drift too, but that's
    Greek and English ordering these chapters differently, so there the panel shows a note."""
    if book == "Baruch" and chapter == 6:
        return verse + 1   # the English counts the letter's title as verse 1
    if book == "Tobit" and ((chapter == 5 and verse >= 9) or (chapter == 6 and verse >= 2)):
        return verse - 1
    return verse


def read_source(name: str):
    path = f"{SRC_DIR}/{name}.txt"
    if not os.path.exists(path):
        print(f"Downloading {name} ...")
        os.makedirs(SRC_DIR, exist_ok=True)
        with urllib.request.urlopen(f"{SOURCE_URL}/{name}.txt", timeout=60) as resp, open(path, "wb") as out:
            shutil.copyfileobj(resp, out)
    with open(path, encoding="utf-8") as f:
        for line in f:
            p = line.split()
            if not p:
                continue
            ref = p[0]
            # token can hold a space, so count the trailing fields from the end
            yield (int(ref[3:6]), int(ref[6:9]), p[1], p[2], " ".join(p[3:-5]), p[-3], p[-1])


def load_lexicon():
    core = sqlite3.connect(CORE_DB)
    lemmas, definitions = {}, {}
    for number, lemma, definition in core.execute("SELECT number, lemma, definition FROM strongs_greek"):
        if lemma:
            lemmas.setdefault(norm(lemma), strongs_number(number))
        definitions[strongs_number(number)] = definition or ""
    exact, bare, glosses = defaultdict(Counter), defaultdict(Counter), defaultdict(Counter)
    for word, strongs, gloss, morph in core.execute("SELECT greek, strongs, gloss, morph FROM greek_words_tr"):
        if not strongs:
            continue
        tag = (strongs_number(strongs), morph)
        exact[accented(word)][tag] += 1
        bare[norm(word)][tag] += 1
        if gloss:
            glosses[tag[0]][gloss] += 1
    core.close()
    top = lambda forms: {f: c.most_common(1)[0][0] for f, c in forms.items()}
    return lemmas, definitions, top(exact), top(bare), glosses


def strongs_number(raw: str) -> str:
    """The sources disagree: strongs_greek has G1, the word tables G0001 (the app's form)."""
    return f"G{int(re.search(r'\d+', raw).group()):04d}"


def gloss_for(strongs: str, definitions: dict, glosses: dict) -> str:
    if not strongs:
        return ""
    if strongs in glosses:
        return glosses[strongs].most_common(1)[0][0]
    return re.split(r"[;,(]", definitions.get(strongs, ""))[0].strip()


def full_text() -> dict:
    """Swete's clean, complete text by verse: {(book, chapter, verse): text}."""
    text = {}
    with open(FULL_TEXT, encoding="utf-8", errors="replace") as f:
        for line in f:
            cols = line.rstrip("\n").split("\t")
            if len(cols) < 3 or "=" not in cols[0]:
                continue
            ref, version = cols[0].strip().rsplit("=", 1)
            m = re.fullmatch(r"(\d\d_\w+)\.(\d+)\.(\d+)", ref)
            if not m:
                continue
            code, chapter, verse = m.group(1), int(m.group(2)), int(m.group(3))
            if code == "27_Dan":
                if version in ("St", "St*") and chapter == 3 and 24 <= verse <= 90:
                    text[("Prayer of Azariah", 1, verse - 23)] = cols[2]
            elif code == "76_Sus":
                if version == "St":
                    text[("Susanna", chapter, verse)] = cols[2]
            elif code in FULL_TEXT_BOOKS and version == "S" and chapter > 0:   # 0 is Sirach's prologue
                text[(FULL_TEXT_BOOKS[code], chapter, verse)] = cols[2]
    return text


def brenton_text() -> dict:
    """{(book, chapter, verse): text} for the two books the full text lacks."""
    fetch_zip(BRENTON_URL, BRENTON_ZIP)
    text = {}
    with zipfile.ZipFile(BRENTON_ZIP) as z:
        for code, book, chapter in (("LJE", "Baruch", 6), ("BEL", "Bel and the Dragon", 1)):
            name = next(n for n in z.namelist() if code in n and n.endswith(".usfm"))
            usfm = z.read(name).decode("utf-8-sig")
            parts = re.split(r"\\v (\d+) ", usfm[usfm.index("\\v 1 "):])
            for verse, body in zip(parts[1::2], parts[2::2]):
                text[(book, chapter, int(verse))] = re.sub(r"\\[a-z]+\d*\*?", " ", body)
    return text


def main():
    lemmas, definitions, exact, bare_forms, glosses = load_lexicon()
    tagged = defaultdict(list)                     # (book, chapter, verse) -> transcription words
    machine = defaultdict(Counter)                 # word form -> its Morpheus readings

    for name, book in SOURCES.items():
        for chapter, verse, pos, code, token, lemma, method in read_source(name):
            if name == "048-EpJer":
                chapter = 6
            if name == "029-Wis" and chapter > 15:   # the source skips 15: its 16 is Wisdom 15
                chapter -= 1
            if name == "053-DanTh":
                if chapter != 3 or not 24 <= verse <= 90:
                    continue
                chapter, verse = 1, verse - 23

            token = clean_token(token)
            lemma = EDITOR_MARK.sub("", lemma).translate(LOOKALIKES)
            if not norm(token):   # the whole token was a marker or stray punctuation
                continue
            tagged[(book, chapter, reader_verse(book, chapter, verse))].append(token)
            machine[accented(token)][(pos, code, lemma)] += 1

    def word_row(position: int, token: str) -> dict:
        bare = norm(token)
        # Accents are lost in the capitalised words that open a section, so match those bare.
        hit = bare_forms.get(bare) if token.isupper() else exact.get(accented(token))
        if hit:
            strongs, morph = hit
        else:
            guess = machine.get(accented(token))
            pos, code, lemma = guess.most_common(1)[0][0] if guess else ("NP", "--------", "")
            strongs = lemmas.get(norm(lemma)) or bare_forms.get(bare, ("",))[0]
            # NP is also Morpheus giving up on a capitalised word it can't read.
            morph = robinson(pos, code, token[:1].isupper() and not token.isupper())
        return {
            "p": position, "t": token, "tr": re.sub("σ$", "ς", bare), "s": strongs,
            "g": gloss_for(strongs, definitions, glosses), "m": morph,
        }

    full = defaultdict(list)
    for (book, chapter, verse), line in sorted(full_text().items()):
        tokens = [t for t in map(clean_token, line.split()) if norm(t)]
        full[(book, chapter, reader_verse(book, chapter, verse))] += tokens
    brenton = brenton_text()
    for key, line in brenton.items():
        full[key] = [t for t in map(clean_token, line.split()) if norm(t)]

    verses = {}
    linked, total = Counter(), Counter()
    kept = Counter()
    for key in sorted(tagged.keys() | full.keys()):
        tokens = full.get(key, [])
        # The transcription follows the English verse order and the full text the Greek, which
        # differ in Sirach 30-36. Different words at one verse number means the two aren't the
        # same verse, so keep the one that lines up with the reader. A verse the transcription
        # merely cut short still matches, so it's replaced.
        words = {norm(t) for t in tokens}
        short = tagged.get(key, [])
        same = sum(norm(t) in words for t in short)
        if not tokens or (key not in brenton and short and same < len(short) * 0.5):
            tokens = short
            kept[key[0]] += 1
        verses[key] = [word_row(i, t) for i, t in enumerate(tokens)]
        total[key[0]] += len(tokens)
        linked[key[0]] += sum(1 for w in verses[key] if w["s"])
    print(f"Verses taken from the transcription: {kept.most_common()}")

    for book, want in EXPECTED_CHAPTERS.items():
        got = {c for b, c, _ in verses if b == book}
        assert got == set(range(1, want + 1)), f"{book}: chapters {sorted(got)}"

    os.makedirs(os.path.dirname(PACK), exist_ok=True)
    if os.path.exists(PACK):
        os.remove(PACK)
    db = sqlite3.connect(PACK)
    db.execute(f"""
        CREATE TABLE {TABLE} (
            book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL,
            position INTEGER NOT NULL, greek TEXT NOT NULL, translit TEXT, strongs TEXT,
            gloss TEXT, morph TEXT, PRIMARY KEY (book, chapter, verse, position)
        )
    """)
    db.executemany(
        f"INSERT INTO {TABLE} VALUES (?,?,?,?,?,?,?,?,?)",
        [(b, c, v, w["p"], w["t"], w["tr"], w["s"], w["g"], w["m"])
         for (b, c, v), ws in verses.items() for w in ws],
    )
    db.commit()
    db.execute("VACUUM")
    db.close()

    shutil.rmtree(JSON_DIR, ignore_errors=True)
    chapters = defaultdict(dict)
    for (b, c, v), ws in verses.items():
        chapters[(b, c)][str(v)] = ws
    for (b, c), data in chapters.items():
        os.makedirs(f"{JSON_DIR}/{b}", exist_ok=True)
        with open(f"{JSON_DIR}/{b}/{c}.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))

    print(f"{sum(total.values())} words, {len(chapters)} chapter files")
    print(f"{PACK}: {os.path.getsize(PACK) / 1048576:.1f} MB")
    for book in EXPECTED_CHAPTERS:
        print(f"  {book}: {total[book]} words, {linked[book] / total[book]:.1%} linked to a lexicon entry")


if __name__ == "__main__":
    main()
