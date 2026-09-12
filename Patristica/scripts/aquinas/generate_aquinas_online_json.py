"""
Dump aquinas_topics -> data/online/aquinas/ for the no-pack fallback.

  aquinas/index.json                      titles only, one fetch for browse mode
    { summa: { [part]: [{q, t, a:[{a, t}]}] }, scg: { [book]: [{q, t}] } }
  aquinas/{work}/{part}/{question}.json   [{a, t, x}]  full text

Catena verse JSON comes from the existing commentary generator:
  python scripts/generate_commentary_online_json.py  (SOURCES includes aquinas-catena)

    python scripts/aquinas/generate_aquinas_online_json.py
"""
import collections
import json
import os
import shutil
import sqlite3

DB = 'temp/packs/aquinas.db'
OUT = 'data/online/aquinas'


def main() -> None:
    con = sqlite3.connect(DB)
    rows = con.execute(
        'SELECT work, part, question, article, title, text FROM aquinas_topics '
        'ORDER BY work, part, question, article').fetchall()
    con.close()

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)

    index: dict = {'summa': collections.defaultdict(list), 'scg': collections.defaultdict(list)}
    per_q: dict[tuple, list] = collections.defaultdict(list)
    for work, part, q, a, title, text in rows:
        per_q[(work, part, q)].append({'a': a, 't': title, 'x': text})

    total = 0
    for (work, part, q), arts in per_q.items():
        d = os.path.join(OUT, work, part)
        os.makedirs(d, exist_ok=True)
        payload = json.dumps(arts, ensure_ascii=False, separators=(',', ':'))
        with open(os.path.join(d, f'{q}.json'), 'w', encoding='utf-8') as f:
            f.write(payload)
        total += len(payload.encode('utf-8'))
        head = next((x for x in arts if x['a'] == 0), arts[0])
        entry = {'q': q, 't': head['t']}
        if work == 'summa':
            entry['a'] = [{'a': x['a'], 't': x['t']} for x in arts if x['a'] > 0]
        index[work][part].append(entry)

    idx = json.dumps(index, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        f.write(idx)
    print(f'{len(per_q):,} question files ({total / 1e6:.1f} MB), '
          f'index.json {len(idx.encode()) / 1e3:.0f} KB -> {OUT}')


if __name__ == '__main__':
    main()
