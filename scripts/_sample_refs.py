import sqlite3, re

db = sqlite3.connect('assets/db/bible.db')
rows = db.execute("SELECT book, chapter, text FROM early_texts").fetchall()

ref_re = re.compile(r'[1-3]?\s*[A-Z][a-z]+\.?\s+\d+:\d+(?:-\d+)?')
samples = []
for book, ch, text in rows:
    for m in ref_re.finditer(text):
        samples.append((m.group(0).strip(), book, ch))

unique_refs = sorted(set(s[0] for s in samples))
print(f'Total unique ref patterns: {len(unique_refs)}')
print()
for s in unique_refs[:100]:
    print(repr(s))
db.close()
