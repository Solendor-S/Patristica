import sqlite3
db = sqlite3.connect('assets/db/bible.db')
print('bible_verses schema:')
for r in db.execute("PRAGMA table_info(bible_verses)").fetchall():
    print(' ', r)
print()
print('Sample rows:')
for r in db.execute("SELECT * FROM bible_verses WHERE book='Genesis' AND chapter=1 LIMIT 3").fetchall():
    print(' ', r)
db.close()
