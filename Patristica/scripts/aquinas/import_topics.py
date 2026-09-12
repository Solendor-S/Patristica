"""
Import Aquinas' topical works into temp/packs/aquinas.db -> aquinas_topics.

  Summa Theologica  — 1920 Fathers of the English Dominican Province (PD)
                      temp/aquinas-src/english/summa/{FP,FS,SS,TP,XP,X1}/*.html
  Summa Contra Gentiles — Rickaby 1905 "Of God and His Creatures" (PD, abridged)
                      temp/gentiles.xml  (curl https://www.ccel.org/ccel/aquinas/gentiles.xml)

aquinas_topics(work, part, question, article, title, text)
  summa: part I / I-II / II-II / III / Suppl. / Appendix; article 0 = question prologue
  scg:   part = book 1-4, question = chapter, article 0

Run AFTER import_catena.py (which creates the DB).

    python scripts/aquinas/import_topics.py
"""
import glob
import os
import re
import sqlite3
import sys

from bs4 import BeautifulSoup

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'newadvent'))
from parse_newadvent import clean_text as clean  # noqa: E402
from parse_early_text_refs import roman_to_int  # noqa: E402

DB = 'temp/packs/aquinas.db'
SUMMA_DIR = 'temp/aquinas-src/english/summa'
SCG_XML = 'temp/gentiles.xml'
PARTS = {'FP': 'I', 'FS': 'I-II', 'SS': 'II-II', 'TP': 'III', 'XP': 'Suppl.', 'X1': 'Appendix'}

CREATE_SQL = [
    'DROP TABLE IF EXISTS aquinas_topics',
    '''CREATE TABLE aquinas_topics (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         work TEXT NOT NULL,
         part TEXT NOT NULL,
         question INTEGER NOT NULL,
         article INTEGER NOT NULL,
         title TEXT NOT NULL,
         text TEXT NOT NULL)''',
    'CREATE INDEX idx_aquinas_topics ON aquinas_topics(work, part, question)',
]

SMALL = {'of', 'the', 'and', 'or', 'in', 'on', 'to', 'a', 'an', 'by', 'for', 'with', 'as', 'at', 'from'}


def titlecase(s: str) -> str:
    words = s.lower().split()
    out = [w if (i and w in SMALL) else w[:1].upper() + w[1:] for i, w in enumerate(words)]
    return ' '.join(out).replace("god's", "God's").replace(' God ', ' God ')


def paras_until_hr(node) -> list[str]:
    """Text of each <p> following `node` up to the next <hr> or article anchor."""
    out = []
    for sib in node.find_next_siblings():
        if sib.name == 'hr' or (sib.name == 'a' and (sib.get('name') or '').endswith('THEP1')):
            break
        if sib.name == 'p':
            t = clean(sib.get_text(' '))
            if t:
                out.append(t)
    return out


def import_summa(cur: sqlite3.Cursor) -> int:
    n = 0
    for code, part in PARTS.items():
        for path in sorted(glob.glob(os.path.join(SUMMA_DIR, code, f'{code}[0-9][0-9][0-9].html'))):
            q = int(os.path.basename(path)[2:5])
            if q == 0:
                continue  # part prologue page
            with open(path, encoding='utf-8', errors='replace') as f:
                soup = BeautifulSoup(f.read(), 'lxml')
            qh = soup.find('h3', attrs={'align': re.compile('center', re.I)})  # CCEL pages use Align="Center"
            if not qh:
                continue
            lines = [clean(x) for x in qh.get_text('\n').split('\n') if clean(x)]
            qtitle = re.sub(r'\s*\((?:[A-Z]+|\d+) ARTICLES?\)\s*$', '', lines[-1])
            qtitle = titlecase(qtitle)
            prologue = paras_until_hr(qh)
            if prologue:
                cur.execute('INSERT INTO aquinas_topics VALUES (NULL,?,?,?,?,?,?)',
                            ('summa', part, q, 0, qtitle, '\n\n'.join(prologue)))
                n += 1
            for a in soup.find_all('a', attrs={'name': re.compile(r'A(\d+)THEP1$')}):
                art = int(re.search(r'A(\d+)THEP1$', a['name']).group(1))
                h = a.find_next('h3')
                title = clean(h.get_text(' ')) if h else f'Article {art}'
                body = paras_until_hr(h) if h else []
                if not body:
                    continue
                cur.execute('INSERT INTO aquinas_topics VALUES (NULL,?,?,?,?,?,?)',
                            ('summa', part, q, art, title, '\n\n'.join(body)))
                n += 1
    return n


def import_scg(cur: sqlite3.Cursor) -> int:
    with open(SCG_XML, encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'xml')
    n = 0
    for book in soup.find_all('div1'):
        m = re.match(r'Book ([IVX]+)\.', book.get('title', ''))
        if not m:
            continue
        part = str(roman_to_int(m.group(1)))
        for ch in book.find_all('div2'):
            cm = re.match(r'Chapter ([IVXLC]+)\.\s*(.*)', ch.get('title', ''))
            if not cm:
                continue
            for note in ch.find_all('note'):  # Rickaby's annotations, not Aquinas
                note.decompose()
            paras = []
            for p in ch.find_all('p'):
                if 'chaptertitle' in (p.get('class') or ''):
                    continue
                t = clean(p.get_text(' '))
                if t:
                    paras.append(t)
            if not paras:
                continue
            cur.execute('INSERT INTO aquinas_topics VALUES (NULL,?,?,?,?,?,?)',
                        ('scg', part, roman_to_int(cm.group(1)), 0, clean(cm.group(2)), '\n\n'.join(paras)))
            n += 1
    return n


def main() -> None:
    con = sqlite3.connect(DB)
    cur = con.cursor()
    for sql in CREATE_SQL:
        cur.execute(sql)
    print(f'summa: {import_summa(cur):,} rows')
    print(f'scg:   {import_scg(cur):,} rows')
    con.commit()

    # self-checks
    arts = cur.execute("SELECT article, title FROM aquinas_topics WHERE work='summa' AND part='I' AND question=2 ORDER BY article").fetchall()
    assert [a for a, _ in arts] == [0, 1, 2, 3], arts
    assert arts[3][1] == 'Whether God exists?', arts
    books = cur.execute("SELECT COUNT(DISTINCT part) FROM aquinas_topics WHERE work='scg'").fetchone()[0]
    assert books == 4, books
    for part, in cur.execute("SELECT DISTINCT part FROM aquinas_topics WHERE work='summa'").fetchall():
        qs = cur.execute("SELECT COUNT(DISTINCT question) FROM aquinas_topics WHERE work='summa' AND part=?", (part,)).fetchone()[0]
        print(f'  {part}: {qs} questions')
    con.execute('VACUUM')
    con.close()
    print(f'{os.path.getsize(DB) / 1e6:.1f} MB -> {DB}')


if __name__ == '__main__':
    main()
