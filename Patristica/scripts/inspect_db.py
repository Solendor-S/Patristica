import sqlite3, sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('assets/db/bible.db')
cur = conn.cursor()

patterns = [
    ('Ignatius - Ephesians',     "source LIKE '%Ignatius%Ephes%'"),
    ('Ignatius - Romans',        "source LIKE '%Ignatius%Roman%' AND source NOT LIKE '%Corinthian%'"),
    ('Against Heresies Book 3',  "source LIKE '%Against Heresies%III%' OR source LIKE '%Against Heresies%Book 3%'"),
    ('Justin - First Apology',   "source LIKE '%First Apology%'"),
    ('Justin - Dialogue Trypho', "source LIKE '%Dialogue%Trypho%'"),
    ('Tertullian Apologeticus',  "source LIKE '%Apologeticus%'"),
    ('Epistle of Polycarp',      "source LIKE '%Philippian%' AND (father_name LIKE '%Polycarp%' OR source LIKE '%Polycarp%')"),
    ('Didache',                  "source LIKE '%Didache%'"),
    ('1 Clement',                "source LIKE '%1 Clement%' OR source LIKE '%Letter to the Corinthians (Clement)%'"),
]

for label, where in patterns:
    cur.execute(f"""
        SELECT book, chapter, verse, father_name, source
        FROM commentary WHERE {where}
        ORDER BY book, chapter, verse LIMIT 2
    """)
    rows = cur.fetchall()
    if rows:
        print(f"\n{label}:")
        for b, ch, v, father, source in rows:
            print(f"  {b} {ch}:{v}  [{father}]")
            print(f"  source: {source[:70]}")

conn.close()
