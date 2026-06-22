import sqlite3
db = sqlite3.connect('assets/db/bible.db')
rows = db.execute("SELECT DISTINCT book FROM bible_verses WHERE book LIKE 'Gen%'").fetchall()
print('books starting with Gen:', rows)
rows2 = db.execute("SELECT book, chapter, verse, translation FROM bible_verses WHERE book='Genesis' AND chapter=1 AND verse=1 LIMIT 5").fetchall()
print('Genesis 1:1:', rows2)
rows3 = db.execute("SELECT DISTINCT book FROM bible_verses ORDER BY book").fetchall()
print('All books:', [r[0] for r in rows3])
db.close()
