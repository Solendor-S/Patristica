"""
Novus Ordo (Roman Missal 2002 / Lectionary for Mass) daily readings per national calendar.

Calendar: Liturgical Calendar API (LitCal, Apache-2.0) — VA (General Roman), US, CA natively;
AU / EW / IE = General Roman with LitCal transfer params + scripts/mass/national/<CAL>.json overlay.
Lectionary citations (facts), merged in priority:
  1. Felix Just SJ, catholic-resources.org lectionary tables (complete; temp/src_data/fj/*.htm)
  2. LitCal lectionary JSON (temp/src_data/litcal/lect/*.json; partial)
Cross-check: catholic-readings-api (MIT; USCCB citations by date, 2025-08..2027-12).

    python scripts/mass/build_no.py [first_year last_year]      (default 2026 2035)

Output: data/online/mass/no/<CAL>/<year>.json
  { "YYYY-MM-DD": { "title", "grade", "color": [..], "season",
                    "masses": [ { "label", "readings": [ {"label", "cite", "alts": [[seg...]...]} ] } ],
                    "optional": [ { "title", "readings": [...] | null } ] } }
  seg = {"book","ch","v1","ch2","v2"} in app (English/WEBC) versification; alts[0] is the default.
"""
import datetime as dt
import glob
import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from citations import parse  # noqa: E402

SRC = os.path.join("temp", "src_data")
LITCAL = os.path.join(SRC, "litcal")
FJ = os.path.join(SRC, "fj")
CRA = os.path.join(SRC, "cra", "readings")
NATIONAL = os.path.join("scripts", "mass", "national")
OUT = os.path.join("data", "online", "mass", "no")
API = "https://litcal.johnromanodorazio.com/api/dev/calendar"
CALENDARS = ["VA", "US", "CA", "AU", "EW", "IE"]
GRADE_WORD = {"optional": 2, "memorial": 3, "feast": 4, "solemnity": 6}
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
FJ_DAYS = {"Mon": "Monday", "Tues": "Tuesday", "Tue": "Tuesday", "Wed": "Wednesday", "Thurs": "Thursday",
           "Thu": "Thursday", "Fri": "Friday", "Sat": "Saturday"}
TEMPORAL = re.compile(r"^(OrdWeekday|AdventWeekday|ChristmasWeekday|DayAfterEpiphany|LentWeekday|EasterWeekday|"
                      r"\w+OctaveEaster|\w+HolyWeek|AshWednesday|\w+AfterAshWednesday)")
SUNDAY_LIKE = re.compile(r"^(OrdSunday\d+|Advent\d|Lent\d|Easter\d|PalmSun|Easter|Christmas2|Trinity|ChristKing|"
                         r"HolyFamily|BaptismLord|Pentecost|Epiphany|Ascension|CorpusChristi)$")
# (title regex, key, cycle: fixed letter / "" / "g1" = first group; None key = skip the row)
NAMED = [
    (r"^Ascension of the Lord – ([ABC])", "Ascension", "g1"),
    (r"Pentecost Sunday: At the Vigil Mass – ABC", "Pentecost_vigil", ""),
    (r"Pentecost Sunday: ABC At the Vigil", None, ""),
    (r"Pentecost Sunday: Mass during the Day", "Pentecost", ""),
    (r"Pentecost Sunday – [BC]", None, ""),
    (r"Most Holy Trinity - A", "Trinity", "A"),
    (r"^Trinity Sunday - ([BC])", "Trinity", "g1"),
    (r"Most Holy Body and Blood", "CorpusChristi", "A"),
    (r"^Body & Blood / Corpus Christi - ([BC])", "CorpusChristi", "g1"),
    (r"Solemnity of the Most Sacr", "SacredHeart", "A"),
    (r"^Sacred Heart - ([BC])", "SacredHeart", "g1"),
    (r"The Holy Family of Jesus", "HolyFamily", ""),
    (r"^The Holy Family - [BC]", None, ""),
    (r"^The Epiphany of the Lord", "Epiphany", ""),
    (r"The Baptism of the Lord \(Feast\)", "BaptismLord", ""),
    (r"^The Baptism of the Lord - [BC]", None, ""),
    (r"Second Sunday after Christmas", "Christmas2", ""),
]
LABELS = {"first_reading": "First Reading", "responsorial_psalm": "Responsorial Psalm",
          "second_reading": "Second Reading", "gospel_acclamation": "Gospel Acclamation", "gospel": "Gospel"}


# ── LitCal calendars ─────────────────────────────────────────────────────────────

def national(cal: str) -> dict | None:
    p = os.path.join(NATIONAL, f"{cal}.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else None


def litcal(cal: str, year: int) -> list[dict]:
    path = os.path.join(LITCAL, f"{cal}_{year}.json")
    if not os.path.exists(path):
        if cal in ("VA", "AU", "EW", "IE"):
            params = {"locale": "en", "year_type": "CIVIL"}
            nat = national(cal)
            if nat:
                params.update({k: (str(v).lower() if isinstance(v, bool) else v) for k, v in nat["params"].items()})
                if nat.get("eternal_high_priest"):
                    params["eternal_high_priest"] = "true"
            url = f"{API}/{year}?" + "&".join(f"{k}={v}" for k, v in params.items())
        else:
            url = f"{API}/nation/{cal}/{year}?locale=en&year_type=CIVIL"
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
                data = urllib.request.urlopen(req, timeout=90).read()
                json.loads(data)
                break
            except Exception as e:  # noqa: BLE001
                if attempt == 3:
                    raise
                print("  retry", cal, year, e)
                time.sleep(5)
        open(path, "wb").write(data)
    return json.load(open(path, encoding="utf-8"))["litcal"]


def by_date(events: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for e in events:
        out.setdefault(e["date"][:10], []).append(e)
    return out


def cycle_of(e: dict) -> str:
    ly = e.get("liturgical_year") or ""
    return ly[-1] if ly[-1:] in "ABC" and ly else ""


# ── Felix Just tables ────────────────────────────────────────────────────────────

def fj_rows(page: str) -> list[dict]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(open(os.path.join(FJ, f"{page}.htm"), "rb").read(), "html.parser")
    rows, header = [], None
    for tr in soup.find_all("tr"):
        cells = [c.get_text(" ", strip=True).replace("\xa0", " ") for c in tr.find_all(["td", "th"])]
        if not cells:
            continue
        low = [c.lower() for c in cells]
        if any("gospel" in c for c in low) and any("reading" in c for c in low):
            header = low
            continue
        if header is None or len(cells) < len(header) - 1:
            continue
        rec = {"cells": cells, "header": header}
        for i, h in enumerate(header):
            if i >= len(cells):
                break
            v = cells[i]
            if "first" in h:
                rec["first"] = v
            elif "psalm" in h or h.startswith("responsorial"):
                rec["psalm"] = v
            elif "second" in h:
                rec["second"] = v
            elif "alleluia" in h or "verse" in h:
                rec["acclamation"] = v
            elif "gospel" in h:
                rec["gospel"] = v
            elif h in ("sunday", "day", "sunday or feast", "sunday or feast - year", "saint [or feast]") or "sunday" in h:
                rec["title"] = v
            elif h == "date":
                rec["date"] = v
            elif h == "rank":
                rec["rank"] = v
            elif "commons" in h:
                rec["commons"] = v
            elif re.fullmatch(r"\d{4}", h):
                rec["date"] = v + "|" + h
        rows.append(rec)
    return rows


def fj_dates(s: str) -> list[dt.date]:
    out = []
    s = s or ""
    year_hint = None
    if "|" in s:
        s, year_hint = s.split("|")
    for m in re.finditer(r"(\d{1,2})/(\d{1,2})/(\d{2})\b", s):
        out.append(dt.date(2000 + int(m.group(3)), int(m.group(1)), int(m.group(2))))
    if not out and year_hint:
        for m in re.finditer(r"\b(\d{1,2})/(\d{1,2})\b", s):
            out.append(dt.date(int(year_hint), int(m.group(1)), int(m.group(2))))
        for m in re.finditer(r"(\d{1,2})-([A-Z][a-z]{2})-(\d{2})", s):
            out.append(dt.datetime.strptime(m.group(0), "%d-%b-%y").date())
    return out


def reading_list(rec: dict) -> list[dict]:
    out = []
    for k, label in (("first", "First Reading"), ("psalm", "Responsorial Psalm"), ("second", "Second Reading"),
                     ("acclamation", "Gospel Acclamation"), ("gospel", "Gospel")):
        v = (rec.get(k) or "").strip()
        if not v or v in (".", "x") or "no bibl" in v.lower() or v.startswith("(see"):
            continue
        v = re.sub(r"^†\s*", "", v)
        v = re.sub(r"\(\s*or\s*,\s*in Y(?:ea)?r ([ABC]),\s*([^)]*)\)", r"or, in Year \1, \2", v)
        v = re.sub(r"or\s*,?\s*in Y(?:ea)?r ([ABC]),", r"or, in Year \1,", " ".join(v.split()))
        v = re.sub(r"\s*-\s*Vg\b.*$", "", v)
        v = re.sub(r"^(optional|opt\.):\s*", "", v)
        v = re.sub(r"\bor (reading|Psalm) from Year A\b", "", v)
        v = re.sub(r"^Sequence\s*:.*?Alleluia:\s*", "", v, flags=re.I)
        v = re.sub(r"^SEQUENCE\s*:.*?Alleluia:\s*", "", v)
        out.append({"label": label, "cite": v.strip(" ;")})
    return out


# ── temporal (season/week) keys ──────────────────────────────────────────────────

def temporal_key(d: dt.date, days: dict[str, list[dict]]) -> str | None:
    evs = days.get(d.isoformat(), [])
    for e in evs:
        if TEMPORAL.match(e["event_key"]) and not e.get("is_vigil_mass"):
            return e["event_key"]
    if d.weekday() == 6:
        return None
    if d.month == 12 and 17 <= d.day <= 24:
        return f"AdventWeekdayDec{d.day}"
    # borrow the week number from another weekday of the same week
    monday = d - dt.timedelta(days=d.weekday())
    for i in range(6):
        for e in days.get((monday + dt.timedelta(days=i)).isoformat(), []):
            m = re.match(r"^(OrdWeekday|LentWeekday|EasterWeekday|AdventWeekday)(\d+)(\w+day)$", e["event_key"])
            if m:
                season = (evs[0].get("liturgical_season") if evs else e.get("liturgical_season"))
                if season == e.get("liturgical_season"):
                    return f"{m.group(1)}{m.group(2)}{DAYS[d.weekday()]}"
    # or from the Sunday that starts the week
    sun = days.get((monday - dt.timedelta(days=1)).isoformat(), [])
    for e in sun:
        m = re.match(r"^(OrdSunday|Lent|Easter|Advent)(\d+)$", e["event_key"])
        if m:
            pre = {"OrdSunday": "OrdWeekday", "Lent": "LentWeekday", "Easter": "EasterWeekday", "Advent": "AdventWeekday"}[m.group(1)]
            return f"{pre}{m.group(2)}{DAYS[d.weekday()]}"
    for weeks in (1, -1, 2, -2):
        mon = monday + dt.timedelta(days=7 * weeks)
        for i in range(6):
            for e in days.get((mon + dt.timedelta(days=i)).isoformat(), []):
                m = re.match(r"^OrdWeekday(\d+)\w+day$", e["event_key"])
                if m and (not evs or evs[0].get("liturgical_season") in ("ORDINARY_TIME", "", None)):
                    n = int(m.group(1)) - weeks
                    if 1 <= n <= 34:
                        return f"OrdWeekday{n}{DAYS[d.weekday()]}"
    if d.month in (12, 1):
        nm = d.strftime("%b")
        return f"ChristmasWeekday{nm}{d.day}" if (d.month == 12 or d.day < 7) else f"DayAfterEpiphany{nm}{d.day}"
    return None


# ── lectionary table ─────────────────────────────────────────────────────────────

def build_lectionary() -> tuple[dict, dict]:
    """lect[(key, cycle)] -> [{label, cite}] ; sanct[(month, day)] -> [(title, readings|None)]"""
    lect: dict = {}
    va = {}
    for y in range(2025, 2032):
        va.update(by_date(litcal("VA", y)))

    def put(key, cyc, readings, src):
        if readings and not any(r["label"] == "Gospel" for r in readings) and "Vigil" not in key:
            return
        lect.setdefault((key, cyc), (readings, src))

    # Ordinary Time Sundays + OT weekdays: by title
    for cyc in "ABC":
        for r in fj_rows(f"1998USL-Ordinary{cyc}"):
            m = re.search(r"(\d+)\s*(?:st|nd|rd|th)\s+Sunday in Ordinary Time", r.get("title", ""))
            if m:
                put(f"OrdSunday{m.group(1)}", cyc, reading_list(r), "fj")
            else:
                for d in fj_dates(r.get("date", "")):
                    for e in va.get(d.isoformat(), []):
                        if not e.get("is_vigil_mass") and e["grade"] >= 4:
                            put(e["event_key"], cyc, reading_list(r), "fj")
    for cyc, page in (("I", "2002USL-Weekdays-OT-I"), ("II", "2002USL-Weekdays-OT-II")):
        for r in fj_rows(page):
            m = re.match(r"Week (\d+) - (\w+)", r.get("title", ""))
            if m and m.group(2) in FJ_DAYS:
                put(f"OrdWeekday{m.group(1)}{FJ_DAYS[m.group(2)]}", cyc, reading_list(r), "fj")

    # seasonal Sundays / solemnities / weekdays: by date onto LitCal keys
    for page in ("1998USL-Advent", "1998USL-Christmas", "1998USL-Lent", "1998USL-Easter", "1998USL-Solemnities",
                 "2002USL-Weekdays-AdventChristmas", "2002USL-Weekdays-Lent", "2002USL-Weekdays-Easter"):
        for r in fj_rows(page):
            title = r.get("title", "")
            readings = reading_list(r)
            if "Use at least three" in (r.get("first") or ""):
                continue  # Easter Vigil prose cell: LitCal has it structured
            mt = re.search(r"(\d+)\s*(?:st|nd|rd|th)\s+Sunday of (Advent|Lent|Easter)\s*[-–]\s*([ABC])\b", title)
            if mt:
                put(f"{mt.group(2)}{mt.group(1)}", mt.group(3), readings, "fj")
                continue
            if re.search(r"Easter Sunday.*Mass of Easter Day", title):
                put("Easter", "", readings, "fj")
                continue
            if "At the Procession" in title:
                continue
            hit = next(((m, k, c) for rx, k, c in NAMED for m in [re.search(rx, title)] if m), None)
            if hit:
                m, k, c = hit
                if k:
                    put(k, m.group(1) if c == "g1" else c, readings, "fj")
                continue
            mp = re.search(r"Palm Sunday.*[-–]\s*([ABC])\b", title)
            if mp:
                put("PalmSun", mp.group(1), readings, "fj")
                continue
            if "Weekdays" in page:
                mc = re.match(r"\[?(Dec|Jan)\.?\s+(\d+)\b", title) or re.match(r"(December|January)\s+(\d+)\b", title)
                if mc and not ("Dec" in mc.group(1) and int(mc.group(2)) < 29 and int(mc.group(2)) > 16):
                    put(f"ChristmasWeekday{mc.group(1)[:3]}{mc.group(2)}", "", readings, "fj")
            for d in fj_dates(r.get("date", "")):
                evs = va.get(d.isoformat(), [])
                vigil = "Vigil" in title or "Mass at Dawn" in title or "Night" in title
                for e in evs:
                    key = e["event_key"]
                    if bool(e.get("is_vigil_mass")) != ("Vigil" in title):
                        continue
                    if "Weekdays" in page:
                        if TEMPORAL.match(key):
                            put(key, "", readings, "fj")
                        continue
                    if not (SUNDAY_LIKE.match(key) or e["grade"] >= 5 or key.endswith("_vigil")):
                        continue
                    sub = ("night" if "Night" in title else "dawn" if "Dawn" in title else
                           "day" if "during the Day" in title else "evening" if "Evening" in title else "")
                    cyc = cycle_of(e) if re.search(r"- [ABC]\b|– [ABC]\b", title) else ""
                    put(key + (":" + sub if sub else ""), cyc, readings, "fj")
                if not evs and "Weekdays" in page:
                    tk = temporal_key(d, va)
                    if tk:
                        put(tk, "", readings, "fj")

    # LitCal lectionary as fallback
    for f in glob.glob(os.path.join(LITCAL, "lect", "*.json")):
        name = os.path.basename(f)[:-5]
        cyc = {"dominicale_et_festivum_A": "A", "dominicale_et_festivum_B": "B", "dominicale_et_festivum_C": "C",
               "feriale_per_annum_I": "I", "feriale_per_annum_II": "II"}.get(name, "")
        for key, val in json.load(open(f, encoding="utf-8")).items():
            if isinstance(val, dict) and "gospel" not in val and all(isinstance(v, dict) for v in val.values()):
                for sub, v in val.items():
                    rl = [{"label": LABELS.get(k, k.replace("_", " ").title()), "cite": c} for k, c in v.items() if c]
                    put(f"{key}:{sub}" if sub != "vigil" else f"{key}_vigil", cyc, rl, "litcal")
            elif isinstance(val, dict):
                rl = [{"label": LABELS.get(k, re.sub(r"_(\d)$", r" \1", k).replace("_", " ").title()), "cite": c}
                      for k, c in val.items() if c]
                put(key, cyc, rl, "litcal")

    # Sanctoral by date
    sanct: dict = {}
    months = {m: i + 1 for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"])}
    months.update({"Jun": 6, "Jul": 7, "Sep": 9})
    for r in fj_rows("1998USL-Solemnities"):
        m = re.match(r"([A-Z][a-z]+)\.?\s+(\d+):\s*(.*)", r["cells"][1] if len(r["cells"]) > 1 else "")
        if m and m.group(1) in months:
            sanct.setdefault((months[m.group(1)], int(m.group(2))), []).append((m.group(3), reading_list(r) or None))
    for r in fj_rows("2002USL-Sanctoral"):
        cells = r["cells"]
        m = re.match(r"([A-Z][a-z]+)\.?\s+(\d+)", cells[1] if len(cells) > 1 else "")
        if not m or m.group(1) not in months:
            continue
        title = cells[2]
        rl = reading_list(r)
        sanct.setdefault((months[m.group(1)], int(m.group(2))), []).append((title, rl or None))
    return lect, sanct


def lookup(lect, key, cyc):
    if key in MANUAL:
        return MANUAL[key]
    for k in ((key, cyc), (key, "")):
        if k in lect and lect[k][0]:
            return lect[k][0]
    for c in ("A", "B", "C", "I", "II"):
        if (key, c) in lect and lect[(key, c)][0] and cyc == "":
            return lect[(key, c)][0]
    return None


def sunday_cycle(d: dt.date) -> str:
    """Year A/B/C of the liturgical year containing d (Advent 1 = Sunday from Nov 27 to Dec 3)."""
    nov27 = dt.date(d.year, 11, 27)
    adv1 = nov27 + dt.timedelta(days=(6 - nov27.weekday()) % 7)
    ends = d.year + 1 if d >= adv1 else d.year
    return "ABC"[(ends - 2026) % 3]


def pick_cycle(cite: str, cyc: str) -> str:
    """'A: Matt 17:1-9 B: Mark 9:2-10 C: Luke 9:28b-36' -> the cycle's citation;
    'X or, in Year A, Y' -> Y in Year A, else X."""
    m = re.match(r"^(.*?)\s*or, in Year ([ABC]),\s*(.*)$", cite)
    if m:
        x, y = m.group(1).strip(" ;,"), m.group(3).strip(" ;,")
        return f"{y} | {x}" if cyc == m.group(2) else f"{x} | {y}"
    parts = re.split(r"\b([ABC])[:)]\s*", cite)
    if len(parts) >= 5 and cyc:
        labelled = dict(zip(parts[1::2], parts[2::2]))
        if cyc in labelled:
            return labelled[cyc].strip(" ;,")
    return cite


CYCLE = {"c": ""}


def resolve(readings):
    if not readings:
        return None
    out = []
    for r in readings:
        cite = pick_cycle(r["cite"], CYCLE["c"])
        out.append({"label": r["label"], "cite": cite, "alts": parse(cite)})
    return out


def norm_name(s: str) -> str:
    return re.sub(r"[^a-z]", "", re.sub(r"\b(st|sts|saint|saints|blessed|bl|the|of|and|pope|martyr|martyrs|virgin|bishop|priest|doctor|church|religious|abbot)\b", "", s.lower()))


def sanct_readings(sanct, d: dt.date, name: str, orig: str | None = None):
    if orig:
        d = dt.date.fromisoformat(orig)
    rows = sanct.get((d.month, d.day), [])
    if not rows:
        return None
    n = norm_name(name)
    best = max(rows, key=lambda r: len(os.path.commonprefix([norm_name(r[0]), n])) + (5 if norm_name(r[0])[:6] in n else 0))
    return best[1]


# ── days ─────────────────────────────────────────────────────────────────────────

def apply_national(cal: str, year: int, days: dict[str, list[dict]]):
    nat = national(cal)
    if not nat:
        return
    for mv in nat.get("moved", []):
        for k, evs in list(days.items()):
            for e in list(evs):
                if e["event_key"] == mv["key"]:
                    evs.remove(e)
                    to = f"{year}-{mv['to']}"
                    days.setdefault(to, []).append({**e, "date": to, "_orig": e.get("_orig") or e["date"][:10]})
    for sp in nat.get("suppressed", []):
        for evs in days.values():
            evs[:] = [e for e in evs if e["event_key"] != sp["key"]]
    cels = list(nat.get("celebrations", []))
    for region in (nat.get("regions") or {}).values():
        pass  # regional (e.g. Wales) propers are not applied to the national calendar
    for c in cels:
        date = f"{year}-{c['date']}"
        evs = days.setdefault(date, [])
        g = GRADE_WORD.get(c.get("grade"), 2)
        existing = next((e for e in evs if e["event_key"] == c["key"]), None)
        if existing:
            existing["grade"] = max(existing["grade"], g) if "RANK" in (c.get("note") or "") else g
            existing["_nat_readings"] = c.get("readings")
            continue
        if c.get("replaces_key"):
            evs[:] = [e for e in evs if e["event_key"] != c["replaces_key"]]
        sunday = dt.date.fromisoformat(date).weekday() == 6
        if sunday and g < 6:
            continue  # a feast/memorial yields to the Sunday
        season = evs[0].get("liturgical_season") if evs else ""
        evs.append({"event_key": c["key"], "name": c["title"], "grade": g, "color": ["white"],
                    "liturgical_season": season, "date": date, "type": "fixed", "_nat_readings": c.get("readings")})
    if nat.get("holyday_transfer"):
        for key in ("StsPeterPaulAp", "Assumption", "AllSaints"):
            for k, evs in list(days.items()):
                for e in list(evs):
                    if e["event_key"] == key:
                        d = dt.date.fromisoformat(k)
                        to = d + dt.timedelta(days=1) if d.weekday() == 5 else d - dt.timedelta(days=1) if d.weekday() == 0 else None
                        if to:
                            evs.remove(e)
                            days.setdefault(to.isoformat(), []).append({**e, "date": to.isoformat(), "_orig": e.get("_orig") or k})


def nat_readings(spec):
    if not spec:
        return None
    out = []
    for k, label in (("first", "First Reading"), ("psalm", "Responsorial Psalm"), ("second", "Second Reading"),
                     ("gospel", "Gospel")):
        if spec.get(k):
            out.append({"label": label, "cite": spec[k]})
    return out or None


MANUAL = json.load(open(os.path.join("scripts", "mass", "manual_readings.json"), encoding="utf-8"))


def day_entry(d: dt.date, days, lect, sanct, problems):
    CYCLE["c"] = sunday_cycle(d)
    evs = [e for e in days.get(d.isoformat(), [])]
    main = [e for e in evs if not e.get("is_vigil_mass")]
    tk = temporal_key(d, days)
    if not main:
        if not tk:
            problems.append(f"{d}: no events")
            return None
        season = next((e.get("liturgical_season") for k in (-1, 1) for e in days.get((d + dt.timedelta(days=k)).isoformat(), [])), "")
        main = [{"event_key": tk, "name": "Weekday", "grade": 0, "color": [], "liturgical_season": season, "type": "mobile"}]
    main.sort(key=lambda e: -e["grade"])
    p = main[0]
    masses = []
    wcyc = "I" if d.year % 2 else "II"

    def weekday_readings():
        if not tk:
            return None
        return lookup(lect, tk, wcyc if tk.startswith("OrdWeekday") else "")

    key, cyc = p["event_key"], cycle_of(p) or CYCLE["c"]
    if p["grade"] >= 4 or SUNDAY_LIKE.match(key) or not TEMPORAL.match(key) and p["grade"] >= 4:
        subs = [(k[0].split(":", 1)[1], v[0]) for k, v in lect.items() if k[0].startswith(key + ":") and (k[1] in (cyc, "")) and v[0]]
        if subs:
            order = {"vigil": 0, "night": 1, "dawn": 2, "day": 3, "evening": 4}
            seen = set()
            for sub, rl in sorted(subs, key=lambda s: order.get(s[0], 9)):
                if sub in seen:
                    continue
                seen.add(sub)
                masses.append({"label": {"night": "Mass during the Night", "dawn": "Mass at Dawn", "day": "Mass during the Day",
                                         "evening": "Evening Mass"}.get(sub, sub.title()), "readings": resolve(rl)})
        else:
            rl = nat_readings(p.get("_nat_readings")) or lookup(lect, key, cyc) or sanct_readings(sanct, d, p["name"], p.get("_orig")) if p["type"] == "fixed" else lookup(lect, key, cyc)
            if rl is None and p.get("_nat_readings") is None and p["type"] == "fixed":
                rl = sanct_readings(sanct, d, p["name"], p.get("_orig"))
            if rl is None:
                rl = weekday_readings()
                if p["grade"] >= 4:
                    problems.append(f"{d}: no proper readings for {key} ({p['name']}), using weekday")
            masses.append({"label": "", "readings": resolve(rl)})
    else:
        rl = weekday_readings()
        if rl is None:
            problems.append(f"{d}: no weekday readings for {tk!r} (main {key})")
        masses.append({"label": "", "readings": resolve(rl)})
        if p["grade"] >= 2 and not TEMPORAL.match(key):
            own = nat_readings(p.get("_nat_readings")) or (sanct_readings(sanct, d, p["name"], p.get("_orig")) if p.get("type") == "fixed" else lookup(lect, key, ""))
            if own:
                masses.append({"label": f"Proper of the {'Memorial' if p['grade'] == 3 else 'Optional Memorial'}",
                               "readings": resolve(own)})
    # solemnity vigil Masses (on the eve) with their own readings
    for e in evs:
        if e.get("is_vigil_mass") and not SUNDAY_LIKE.match(e.get("is_vigil_for", "")):
            rl = lookup(lect, e["event_key"], cycle_of(e) or CYCLE["c"])
            if rl:
                masses.append({"label": f"Vigil Mass: {e['name'].replace(' Vigil Mass', '')}", "readings": resolve(rl)})
    optional = []
    for e in main[1:]:
        if e["grade"] in (2, 3) and not TEMPORAL.match(e["event_key"]):
            own = nat_readings(e.get("_nat_readings")) or (sanct_readings(sanct, d, e["name"], e.get("_orig")) if e.get("type") == "fixed" else None)
            optional.append({"title": e["name"], "readings": resolve(own)})
    for m in masses:
        if not m["readings"] or not any(r["label"] == "Gospel" and r["alts"] for r in m["readings"]):
            problems.append(f"{d}: mass {m['label']!r} for {key} has no resolvable Gospel")
    return {"title": p["name"], "grade": p["grade"], "color": p.get("color", []), "season": p.get("liturgical_season", ""),
            "masses": masses, "optional": optional}


def build_year(cal, year, lect, sanct, problems):
    days = by_date(litcal(cal, year))
    # neighbours for temporal keys at year edges
    for y in (year - 1, year + 1):
        for k, v in by_date(litcal(cal, y)).items():
            days.setdefault(k, v)
    apply_national(cal, year, days)
    out = {}
    d = dt.date(year, 1, 1)
    while d.year == year:
        e = day_entry(d, days, lect, sanct, problems)
        if e:
            out[d.isoformat()] = e
        d += dt.timedelta(days=1)
    os.makedirs(os.path.join(OUT, cal), exist_ok=True)
    with open(os.path.join(OUT, cal, f"{year}.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    return out


def crosscheck():
    """Compare our US Gospels with catholic-readings-api (USCCB) for overlapping dates."""
    same = diff = 0
    samples = []
    for f in sorted(glob.glob(os.path.join(CRA, "*", "*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        date = d["date"]
        y = int(date[:4])
        path = os.path.join(OUT, "US", f"{y}.json")
        if not os.path.exists(path):
            continue
        ours = json.load(open(path, encoding="utf-8")).get(date)
        theirs = parse(d["readings"].get("gospel", ""))
        if not ours or not theirs:
            continue
        cand = [r["alts"] for m in ours["masses"] for r in m["readings"] or [] if r["label"] == "Gospel"]
        flat = [a for alts in cand for a in alts]
        if theirs[0] in flat:
            same += 1
        else:
            diff += 1
            samples.append(f"{date} ({ours['title']}): ours {[r['cite'] for m in ours['masses'] for r in m['readings'] or [] if r['label']=='Gospel']} vs USCCB {d['readings'].get('gospel')}")
    print(f"crosscheck vs USCCB: {same} match, {diff} differ")
    with open(os.path.join("temp", "mass_crosscheck.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(samples))
    return same, diff


def selfcheck():
    def gospel(cal, date):
        e = json.load(open(os.path.join(OUT, cal, f"{date[:4]}.json"), encoding="utf-8"))[date]
        return e, [r["cite"] for m in e["masses"] for r in m["readings"] or [] if r["label"] == "Gospel"]
    e, g = gospel("VA", "2026-11-29")
    assert any("Mark 13:33" in x for x in g), (e["title"], g)
    e, g = gospel("VA", "2027-02-10")
    assert any("Matt" in x and "6:1" in x for x in g), (e["title"], g)
    e, _ = gospel("VA", "2027-03-28")
    assert "Easter" in e["title"], e["title"]
    e, _ = gospel("VA", "2026-12-25")
    assert len(e["masses"]) >= 3, [m["label"] for m in e["masses"]]
    assert "Ascension" in gospel("VA", "2027-05-06")[0]["title"]
    assert "Ascension" in gospel("AU", "2027-05-09")[0]["title"]
    print("selfcheck ok")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    y0, y1 = (int(a) for a in sys.argv[1:3]) if len(sys.argv) >= 3 else (2026, 2035)
    lect, sanct = build_lectionary()
    print(f"lectionary: {len(lect)} keys ({sum(1 for v in lect.values() if v[1]=='fj')} from Felix Just), sanctoral dates {len(sanct)}")
    problems: list[str] = []
    for cal in CALENDARS:
        for y in range(y0, y1 + 1):
            build_year(cal, y, lect, sanct, problems)
        print(f"  {cal} done", flush=True)
    with open(os.path.join("temp", "mass_problems.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(problems))
    hard = [p for p in problems if "no resolvable Gospel" in p or "no weekday readings" in p or "no events" in p]
    print(f"{len(problems)} notes, {len(hard)} hard problems (temp/mass_problems.txt)")
    crosscheck()
    selfcheck()
    if hard:
        sys.exit(1)


if __name__ == "__main__":
    main()
