"""
Import Swete's Septuagint (LXX) Greek text into bible.db (lxx_words table).

Source:
  nathans/lxx-swete on GitHub — CC BY-SA 4.0
  https://github.com/nathans/lxx-swete

  Format: one text file per book, one word per line:
    <book_num>.<chapter>.<verse> <greek_word>

Usage:
  python scripts/import_lxx.py --db assets/db/bible.db [--src path/to/lxx-swete/data/]

  If --src is omitted the script downloads the repo zip from GitHub automatically.

Note:
  Ecclesiastes is absent from this LXX dataset (gap in source).
  Ezra (ch 1-10) and Nehemiah (ch 11-23) are combined in 18.Esdras_B.txt;
  the script splits them automatically.
"""

import argparse
import sqlite3
import sys
import urllib.request
import zipfile
from pathlib import Path

SWETE_ZIP_URL = 'https://github.com/nathans/lxx-swete/archive/refs/heads/master.zip'

# App canonical book name → (filename_stem, chapter_offset_for_app)
# chapter_offset: subtract this from file chapter to get app chapter
# book_filter: if set, only import chapters <= this value (for split files)
SWETE_BOOK_MAP: dict[str, tuple[str, int, int | None]] = {
    'Genesis':         ('01.Genesis',          0, None),
    'Exodus':          ('02.Exodus',            0, None),
    'Leviticus':       ('03.Leviticus',         0, None),
    'Numbers':         ('04.Numeri',            0, None),
    'Deuteronomy':     ('05.Deuteronomium',     0, None),
    'Joshua':          ('06.Josue',             0, None),
    'Judges':          ('08.Judices',           0, None),
    'Ruth':            ('10.Ruth',              0, None),
    '1 Samuel':        ('11.Regnorum_I',        0, None),
    '2 Samuel':        ('12.Regnorum_II',       0, None),
    '1 Kings':         ('13.Regnorum_III',      0, None),
    '2 Kings':         ('14.Regnorum_IV',       0, None),
    '1 Chronicles':    ('15.Paralipomenon_I',   0, None),
    '2 Chronicles':    ('16.Paralipomenon_II',  0, None),
    # Esdras_B chapters 1-10 = Ezra, chapters 11-23 = Nehemiah (offset 10)
    'Ezra':            ('18.Esdras_B',          0, 10),   # import ch 1-10 only
    'Nehemiah':        ('18.Esdras_B',         10, None),  # ch 11-23 → app ch 1-13
    'Esther':          ('19.Esther',            0, None),
    'Job':             ('32.Job',               0, None),
    'Psalms':          ('27.Psalmi',            0, None),
    'Proverbs':        ('29.Proverbia',         0, None),
    # Ecclesiastes: absent from this LXX source — skipped
    'Song of Solomon': ('31.Canticum',          0, None),
    'Isaiah':          ('48.Isaias',            0, None),
    'Jeremiah':        ('49.Jeremias',          0, None),
    'Lamentations':    ('51.Threni_seu_Lamentationes', 0, None),
    'Ezekiel':         ('53.Ezechiel',          0, None),
    'Daniel':          ('57.Daniel_Theodotionis_versio', 0, None),
    'Hosea':           ('36.Osee',              0, None),
    'Joel':            ('39.Joel',              0, None),
    'Amos':            ('37.Amos',              0, None),
    'Obadiah':         ('40.Abdias',            0, None),
    'Jonah':           ('41.Jonas',             0, None),
    'Micah':           ('38.Michaeas',          0, None),
    'Nahum':           ('42.Nahum',             0, None),
    'Habakkuk':        ('43.Habacuc',           0, None),
    'Zephaniah':       ('44.Sophonias',         0, None),
    'Haggai':          ('45.Aggaeus',           0, None),
    'Zechariah':       ('46.Zacharias',         0, None),
    'Malachi':         ('47.Malachias',         0, None),
}


def download_swete(dest_dir: Path) -> Path:
    zip_path = dest_dir / 'lxx-swete.zip'
    print('Downloading nathans/lxx-swete from GitHub…')
    urllib.request.urlretrieve(SWETE_ZIP_URL, zip_path)
    print('Extracting…')
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(dest_dir)
    # Extracted folder is lxx-swete-master/data/
    data_dir = dest_dir / 'lxx-swete-master' / 'data'
    print(f'Done. Data directory: {data_dir}')
    return data_dir


def find_book_file(src_dir: Path, stem: str) -> Path | None:
    candidate = src_dir / f'{stem}.txt'
    if candidate.exists():
        return candidate
    # Handle extracted zip subdirectory
    matches = list(src_dir.rglob(f'{stem}.txt'))
    return matches[0] if matches else None


def parse_swete_file(path: Path, app_book: str, chapter_offset: int, max_file_chapter: int | None):
    """
    Yield word dicts from a Swete LXX text file.
    Line format: <book>.<chapter>.<verse> <greek_word>
    """
    verse_pos: dict = {}

    with open(path, encoding='utf-8', errors='replace') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            parts = line.split(None, 1)
            if len(parts) < 2:
                continue

            ref, greek = parts[0], parts[1].strip()
            if not greek:
                continue

            ref_parts = ref.split('.')
            if len(ref_parts) < 3:
                continue

            try:
                file_chapter = int(ref_parts[1])
                verse = int(ref_parts[2])
            except ValueError:
                continue

            # For split files (Esdras_B): filter chapter range
            if max_file_chapter is not None and file_chapter > max_file_chapter:
                continue
            if chapter_offset > 0 and file_chapter <= chapter_offset:
                continue

            app_chapter = file_chapter - chapter_offset

            key = (app_chapter, verse)
            pos = verse_pos.get(key, 0)
            verse_pos[key] = pos + 1

            yield {
                'book':     app_book,
                'chapter':  app_chapter,
                'verse':    verse,
                'position': pos,
                'greek':    greek,
            }


def import_lxx(db_path: str, src_dir: Path) -> None:
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS lxx_words (
            book     TEXT    NOT NULL,
            chapter  INTEGER NOT NULL,
            verse    INTEGER NOT NULL,
            position INTEGER NOT NULL,
            greek    TEXT    NOT NULL,
            translit TEXT,
            strongs  TEXT,
            gloss    TEXT,
            morph    TEXT,
            PRIMARY KEY (book, chapter, verse, position)
        )
    ''')
    cur.execute('DELETE FROM lxx_words')

    total_words = 0
    books_imported = 0

    for app_book, (stem, ch_offset, max_ch) in SWETE_BOOK_MAP.items():
        f = find_book_file(src_dir, stem)
        if not f:
            print(f'  [skip] {app_book} ({stem}) — file not found')
            continue

        rows = []
        for word in parse_swete_file(f, app_book, ch_offset, max_ch):
            rows.append((
                word['book'], word['chapter'], word['verse'], word['position'],
                word['greek'], None, None, None, None,
            ))

        if rows:
            cur.executemany(
                'INSERT OR REPLACE INTO lxx_words (book, chapter, verse, position, greek, translit, strongs, gloss, morph) VALUES (?,?,?,?,?,?,?,?,?)',
                rows,
            )
            print(f'  {app_book}: {len(rows)} words')
            total_words += len(rows)
            books_imported += 1
        else:
            print(f'  [empty] {app_book} — 0 words (check chapter filter)')

    con.commit()
    con.close()
    print(f'\nDone. {books_imported} books, {total_words} words imported into lxx_words.')
    print('Note: Ecclesiastes is absent from this LXX source.')


def main():
    parser = argparse.ArgumentParser(description="Import Swete's LXX into bible.db lxx_words table")
    parser.add_argument('--db',  required=True, help='Path to bible.db')
    parser.add_argument('--src', help='Path to lxx-swete data/ directory (downloads if omitted)')
    args = parser.parse_args()

    if args.src:
        src_dir = Path(args.src)
    else:
        dl_dir = Path('temp/lxx_swete_dl')
        dl_dir.mkdir(parents=True, exist_ok=True)
        src_dir = download_swete(dl_dir)

    if not src_dir.exists():
        print(f'Error: {src_dir} not found', file=sys.stderr)
        sys.exit(1)

    import_lxx(args.db, src_dir)


if __name__ == '__main__':
    main()
