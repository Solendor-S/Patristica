"""
Import Aquinas' Catena Aurea (Parker/Newman 1841-45 English, public domain)
from the isidore.co HTML mirror into the commentary pack schema.

Source: temp/aquinas-src/CA{Matthew,Mark,Luke,John}.htm
        (git clone --depth 1 https://github.com/Geremia/AquinasOperaOmnia)
Output: temp/packs/aquinas.db  (commentary_texts / commentary_entries / commentary view)

Each chapter is a <table>; each Lectio has a red-span English lemma whose
leading "N." numbers give the verse range, followed by one <tr> per father
quote: Latin cell (<b>Latin source</b>: ...) | English cell (label + text).
One text row per quote, one entry row per verse in the lemma range.

    python scripts/aquinas/import_catena.py
"""
import os
import re
import sqlite3
import sys

from bs4 import BeautifulSoup

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'newadvent'))
from parse_newadvent import make_excerpt, clean_text  # noqa: E402
from import_newadvent_commentary import CREATE_SQL  # noqa: E402

SRC_DIR = 'temp/aquinas-src'
OUT_DB = 'temp/packs/aquinas.db'
BOOKS = {'Matthew': 'CAMatthew', 'Mark': 'CAMark', 'Luke': 'CALuke', 'John': 'CAJohn'}
ABBR = {'Matthew': 'Matt', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John'}
ERA = 'Catena Aurea'
URL = 'https://isidore.co/aquinas/{file}.htm#{chapter}'

# English label (lower, punctuation stripped) -> fatherDates.ts key
NAMES = {
    'chrys': 'John Chrysostom', 'chrysostom': 'John Chrysostom', 'chyrs': 'John Chrysostom',
    'pseudo-chrys': 'Pseudo-Chrys', 'psuedo-chrys': 'Pseudo-Chrys', 'pseudo-chys': 'Pseudo-Chrys',
    'jerome': 'Jerome', 'pseudo-jerome': 'Pseudo-Jerome',
    'aug': 'Augustine of Hippo', 'augustine': 'Augustine of Hippo',
    'pseudo-aug': 'Pseudo-Augustine', 'pseudo-augustine': 'Pseudo-Augustine',
    'bede': 'Bede', 'remig': 'Remigius of Auxerre', 'remigius': 'Remigius of Auxerre',
    'gloss': 'Glossa Ordinaria', 'theophylact': 'Theophylact of Ohrid', 'theophyl': 'Theophylact of Ohrid',
    'theophylactus': 'Theophylact of Ohrid', 'theophlact': 'Theophylact of Ohrid',
    'greory nazianzen': 'Gregory the Theologian', 'euthymius': 'Euthymius Zigabenus',
    'titus bostrensis': 'Titus of Bostra',
    'hilary': 'Hilary of Poitiers', 'hil': 'Hilary of Poitiers',
    'origen': 'Origen', 'orig': 'Origen', 'pseudo-origen': 'Pseudo-Origen',
    'raban': 'Rabanus Maurus', 'rabanus': 'Rabanus Maurus',
    'greg': 'Gregory the Great', 'gregory': 'Gregory the Great',
    'greg nyss': 'Gregory of Nyssa', 'greg naz': 'Gregory the Theologian',
    'ambrose': 'Ambrose of Milan', 'leo': 'Leo the Great', 'pope leo': 'Leo the Great',
    'cyprian': 'Cyprian', 'chrysol': 'Peter Chrysologus', 'chrysologus': 'Peter Chrysologus',
    'cyril': 'Cyril of Alexandria', 'cyril of alexandria': 'Cyril of Alexandria',
    'euseb': 'Eusebius of Caesarea', 'eusebius': 'Eusebius of Caesarea',
    'alcuin': 'Alcuin of York', 'basil': 'Basil the Great', 'pseudo-basil': 'Pseudo-Basil',
    'athan': 'Athanasius', 'pseudo-athan': 'Pseudo-Athanasius',
    'isidore': 'Isodore of Seville', 'isidore peleus': 'Isidore of Pelusium',
    'didymus': 'Didymus the Blind', 'maxim': 'Maximus the Confessor', 'maximus': 'Maximus the Confessor',
    'max': 'Maximus the Confessor', 'epiphan': 'Epiphanius of Cyprus',
    'damascene': 'John of Damascus', 'damas': 'John of Damascus', 'haymo': 'Haimo of Auxerre',
    'dionys': 'Pseudo-Dionysius', 'dionysius ar': 'Pseudo-Dionysius',
    'theodotus': 'Theodotus', 'gennadius': 'Gennadius of Marseilles', 'nemesius': 'Nemesius of Emesa',
    'titus bost': 'Titus of Bostra', 'greek ex': 'Greek Expositor', 'greek expositor': 'Greek Expositor',
    'petrus alfonsus': 'Petrus Alfonsi',
    'the council of ephesus': 'Council of Ephesus', 'ex gestis concilii ephesini': 'Council of Ephesus',
    'ex gestis conc eph': 'Council of Ephesus',
}

_VERSE_NUM = re.compile(r'(?:^|[\s"“])(\d{1,3})\.\s')


def father_name(label: str) -> str:
    key = re.sub(r'[.;:,]+$', '', label.strip()).lower()
    key = key.replace('.', '').strip()
    if key in NAMES:
        return NAMES[key]
    # 'Jerome on Mark', 'Aug., de Cons. Evan.' -> first token
    first = re.split(r'[,\s]', key)[0]
    return NAMES.get(first, label.strip().title())


def parse_english_cell(td) -> tuple[str, str] | None:
    """(label, text) from the English <td>. Label is a blue span (Mt/Mk) or
    leading <b> (Lk/Jn). Returns None when the row is not a quote."""
    lab = td.find('span', style=re.compile('blue')) or td.find('b')
    if not lab:
        return None
    label = clean_text(lab.get_text())
    if not label or len(label) > 60:
        return None
    lab.extract()
    text = clean_text(td.get_text())
    # Mt/Mk: ', de Cons. Evan., ii, 19: Or He may...' -> drop citation up to first ':'
    # Lk/Jn: '; When the Lord...' / '. For they...'
    m = re.match(r'^[.,;:\s]*(?:[^:]{0,80}:)?\s*', text)
    if m and text[:1] in '.,;:' and ':' in text[:82]:
        text = text[m.end():]
    else:
        text = re.sub(r'^[.,;:\s]+', '', text)
    return label, text.strip()


def import_book(cur: sqlite3.Cursor, book: str, file: str, text_ids: dict[str, int]) -> int:
    path = os.path.join(SRC_DIR, f'{file}.htm')
    with open(path, encoding='utf-8', errors='replace') as f:
        soup = BeautifulSoup(f.read(), 'lxml')

    n = 0
    # one <table> per Lectio; the nearest preceding <a id="N"> is the chapter
    for table in soup.find_all('table'):
        anchor = table.find_previous('a', id=re.compile(r'^\d+$'))
        if not anchor or int(anchor['id']) == 0:
            continue
        chapter = int(anchor['id'])
        verses: list[int] = []
        last_name = ''
        for tr in table.find_all('tr'):
            tds = tr.find_all('td', recursive=False)
            if not tds:
                continue
            red = tr.find('span', style=re.compile('red'))
            if red or (len(tds) == 2 and tds[1].find('blockquote')):
                cell = tds[1] if len(tds) == 2 else tds[0]
                nums = [int(x) for x in _VERSE_NUM.findall(' ' + cell.get_text(' '))]
                if nums:
                    verses = list(range(min(nums), max(nums) + 1))
                continue
            if len(tds) != 2 or not verses:
                continue
            latin_src = tds[0].find('b')
            parsed = parse_english_cell(tds[1])
            if not parsed:
                continue
            label, text = parsed
            if len(text) < 20:
                continue
            # 'Id.' = idem, same father as the previous quote
            name = last_name if label.lower().rstrip('.') in ('id', 'pseudo-') and last_name else father_name(label)
            last_name = name
            src_work = clean_text(latin_src.get_text()) if latin_src else label
            vr = f'{verses[0]}' if len(verses) == 1 else f'{verses[0]}–{verses[-1]}'
            source = f'Catena Aurea · {ABBR[book]} {chapter}:{vr} · {src_work}'
            url = URL.format(file=file, chapter=chapter)
            if text not in text_ids:
                cur.execute('INSERT INTO commentary_texts (text) VALUES (?)', (text,))
                text_ids[text] = cur.lastrowid
            excerpt = make_excerpt(text)
            for v in verses:
                cur.execute(
                    '''INSERT INTO commentary_entries
                       (book, chapter, verse, father_name, father_era, father_era_order,
                        excerpt, text_id, source, source_url)
                       VALUES (?,?,?,?,?,?,?,?,?,?)''',
                    (book, chapter, v, name, ERA, 0, excerpt, text_ids[text], source, url))
                n += 1
    return n


def main() -> None:
    os.makedirs(os.path.dirname(OUT_DB), exist_ok=True)
    if os.path.exists(OUT_DB):
        os.remove(OUT_DB)
    con = sqlite3.connect(OUT_DB)
    cur = con.cursor()
    for sql in CREATE_SQL:
        cur.execute(sql)
    text_ids: dict[str, int] = {}
    for book, file in BOOKS.items():
        n = import_book(cur, book, file, text_ids)
        print(f'{book}: {n:,} entries')
    con.commit()

    # self-check
    rows = cur.execute(
        "SELECT father_name, excerpt FROM commentary WHERE book='Matthew' AND chapter=5 AND verse=3").fetchall()
    assert rows, 'Matthew 5:3 has no Catena entries'
    assert any(r[0] == 'Augustine of Hippo' for r in rows), rows[:3]
    unmapped = cur.execute(
        '''SELECT father_name, COUNT(*) FROM commentary_entries
           WHERE father_name NOT IN ({}) GROUP BY 1 ORDER BY 2 DESC'''.format(
            ','.join('?' * len(set(NAMES.values())))), list(set(NAMES.values()))).fetchall()
    if unmapped:
        print('unmapped labels:', unmapped)
    total, texts = cur.execute('SELECT (SELECT COUNT(*) FROM commentary_entries), (SELECT COUNT(*) FROM commentary_texts)').fetchone()
    print(f'total {total:,} entries, {texts:,} texts -> {OUT_DB}')
    con.execute('VACUUM')
    con.close()


if __name__ == '__main__':
    main()
