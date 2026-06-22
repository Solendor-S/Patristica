import sqlite3
db = sqlite3.connect('assets/db/bible.db')
print('cross_refs from_book/to_book samples:')
for r in db.execute('SELECT from_book, to_book FROM cross_refs LIMIT 10').fetchall():
    print(' ', r)
print()
print('bible_verses book values (first 5 distinct):')
for r in db.execute("SELECT DISTINCT book FROM bible_verses ORDER BY book LIMIT 10").fetchall():
    print(' ', r)
print()
print('bible_verses Genesis rows:')
for r in db.execute("SELECT book, chapter, verse FROM bible_verses WHERE chapter=1 AND verse=1 LIMIT 10").fetchall():
    print(' ', r)
db.close()
