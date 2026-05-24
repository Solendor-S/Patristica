"""
Rebuild KJV+ (English word order) from existing bible.db data.

Uses data already in the DB — no external download needed:
  - I_KJV+ rows in bible_translations  (Strong's numbers, Greek/Hebrew word order)
  - bible_verses                        (plain KJV text, English word order)

Algorithm: for each verse, greedily match each interlinear English phrase against the
KJV token sequence left-to-right, then reconstruct with Strong's numbers in KJV order.

Usage:
  python scripts/rebuild_kjvplus_english.py --db assets/db/bible.db
"""

import argparse
import re
import sqlite3

STRONGS_RE = re.compile(r'^[GH]\d+$')


def parse_interlinear(text: str) -> list[tuple[str, str]]:
    """'word STRONGS word2 STRONGS2 ...' → [(phrase, strongs), ...]"""
    pairs: list[tuple[str, str]] = []
    pending: str | None = None
    for p in text.split(' '):
        if STRONGS_RE.match(p):
            if pending is not None:
                phrase = pending.strip()
                if phrase:
                    pairs.append((phrase, p))
                pending = None
        else:
            pending = (pending + ' ' + p) if pending is not None else p
    return pairs


def _norm(w: str) -> str:
    """Lowercase + strip punctuation for fuzzy token comparison."""
    return re.sub(r"[^a-z']", '', w.lower())


def strip_usfm(text: str) -> str:
    """Remove \\+w / \\+w* USFM inline markers so alignment sees clean words."""
    text = re.sub(r'\\\+?w\*', '', text)
    text = re.sub(r'\\\+?w\s*', '', text)
    text = re.sub(r'\{([^}]*)\}', r'\1', text)   # {added} → added
    return re.sub(r'\s+', ' ', text).strip()


def align(kjv_text: str, interlinear_text: str) -> str:
    """
    Place Strong's numbers from the interlinear into KJV English word order.
    Returns a string in the same 'word STRONGS word2 STRONGS2' inline format.
    """
    pairs = parse_interlinear(interlinear_text)
    if not pairs:
        return strip_usfm(kjv_text)

    clean_text = strip_usfm(kjv_text)
    kjv_words = clean_text.split()
    kjv_norm  = [_norm(w) for w in kjv_words]
    n_kjv     = len(kjv_words)

    tag_at: dict[int, str] = {}  # kjv_word_index → strongs (appended after that word)
    used = [False] * n_kjv

    # Match longer phrases before shorter ones so "the beginning" (H7225)
    # is claimed before a bare "the" (H3588) can consume the slot.
    for phrase, strongs in sorted(pairs, key=lambda x: len(x[0].split()), reverse=True):
        phrase_norm = [_norm(w) for w in phrase.split() if _norm(w)]
        if not phrase_norm:
            continue
        n = len(phrase_norm)
        if n > n_kjv:
            continue

        # Pass 1: find first unused span that matches
        matched = False
        for i in range(n_kjv - n + 1):
            if any(used[i:i + n]):
                continue
            if kjv_norm[i:i + n] == phrase_norm:
                for j in range(i, i + n):
                    used[j] = True
                tag_at[i + n - 1] = strongs
                matched = True
                break

        # Pass 2 (fallback): relax used constraint — handles repeated words
        # where the interlinear has more entries than KJV occurrences
        if not matched:
            for i in range(n_kjv - n + 1):
                if kjv_norm[i:i + n] == phrase_norm:
                    tag_at[i + n - 1] = strongs
                    break

    # Reconstruct in KJV word order
    parts: list[str] = []
    for i, word in enumerate(kjv_words):
        parts.append(word)
        if i in tag_at:
            parts.append(tag_at[i])
    return ' '.join(parts)


def rebuild(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    cur  = conn.cursor()

    inter_rows = cur.execute(
        "SELECT book, chapter, verse, text FROM bible_translations WHERE translation='I_KJV+'"
    ).fetchall()
    print(f"Loaded {len(inter_rows)} I_KJV+ verses")

    inter_map = {(b, c, v): t for b, c, v, t in inter_rows}

    kjv_rows = cur.execute(
        "SELECT book, chapter, verse, text FROM bible_verses"
    ).fetchall()
    print(f"Loaded {len(kjv_rows)} KJV verses")

    records: list[tuple] = []
    for book, chapter, verse, kjv_text in kjv_rows:
        inter_text = inter_map.get((book, chapter, verse))
        if inter_text is None:
            continue
        records.append(('KJV+', book, chapter, verse, align(kjv_text, inter_text)))

    cur.execute("DELETE FROM bible_translations WHERE translation='KJV+'")
    cur.executemany(
        "INSERT INTO bible_translations (translation, book, chapter, verse, text) VALUES (?,?,?,?,?)",
        records,
    )
    conn.commit()
    conn.close()
    print(f"Inserted {len(records)} English-ordered KJV+ verses")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', required=True, help='Path to bible.db')
    args = parser.parse_args()
    rebuild(args.db)
