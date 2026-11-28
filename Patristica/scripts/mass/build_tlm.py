"""
1962 Missal (Traditional Latin Mass) propers per date, from Missale Meum + Divinum Officium (MIT).

Needs Python >= 3.13 (Missale Meum's requirement) with: python-dateutil mistune PyYAML diskcache trans
    git clone --depth 1 --recurse-submodules --shallow-submodules https://github.com/mmolenda/missalemeum.git temp/src_data/missalemeum
    py -3.14 scripts/mass/build_tlm.py 2026 2030

Output: data/online/mass/tlm/<year>/<MM>.json
  { "YYYY-MM-DD": [ { "title", "rank", "colors": ["v"], "commemorations": [titles],
                      "sections": [ {"id", "label", "en", "la"} ] }, ... ] }   (a list: some days have several Masses)
"""
import datetime
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MM = os.path.join(ROOT, "temp", "src_data", "missalemeum", "backend")
OUT = os.path.join(ROOT, "data", "online", "mass", "tlm")
sys.path.insert(0, MM)
os.chdir(MM)  # Missale Meum resolves its resource paths relative to backend/

from api import controller  # noqa: E402
from api.utils import format_propers, get_pregenerated_proper  # noqa: E402


def day_propers(d: datetime.date) -> list[dict]:
    day = controller.get_day(d, "en")
    pre = get_pregenerated_proper("en", day.get_celebration_id(), day.get_tempora_id())
    propers = pre if pre else format_propers(day.get_proper(), day)
    out = []
    for p in propers:
        info = p["info"]
        sections = []
        for s in p["sections"]:
            body = s.get("body") or []
            en = "\n\n".join(pair[0] for pair in body if isinstance(pair, list) and pair)
            la = "\n\n".join(pair[1] for pair in body if isinstance(pair, list) and len(pair) > 1)
            if isinstance(body, str):
                en = body
            sections.append({"id": s["id"], "label": s.get("label", s["id"]), "en": en, "la": la})
        out.append({
            "title": info.get("title", ""),
            "rank": info.get("rank"),
            "colors": info.get("colors", []),
            "commemorations": [c["title"] for c in info.get("commemorations", [])],
            "sections": sections,
        })
    return out


def main():
    y0, y1 = (int(a) for a in sys.argv[1:3]) if len(sys.argv) >= 3 else (2026, 2030)
    for year in range(y0, y1 + 1):
        os.makedirs(os.path.join(OUT, str(year)), exist_ok=True)
        for month in range(1, 13):
            data = {}
            d = datetime.date(year, month, 1)
            while d.month == month:
                data[d.isoformat()] = day_propers(d)
                d += datetime.timedelta(days=1)
            with open(os.path.join(OUT, str(year), f"{month:02d}.json"), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(year, "done", flush=True)
    sample = json.load(open(os.path.join(OUT, "2026", "11.json"), encoding="utf-8"))["2026-11-29"][0]
    assert "Advent" in sample["title"], sample["title"]
    intro = next(s for s in sample["sections"] if s["id"] == "Introitus")
    assert "Ps 24" in intro["en"] and "Ad te levávi" in intro["la"], intro
    print("selfcheck ok:", sample["title"])


if __name__ == "__main__":
    main()
