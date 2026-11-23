"""
Plain text of a cached New Advent page (temp/newadvent_cache/<id>.htm), shared by the
curation dump and the doctrine-entry verifier so both see exactly the same text.

  - main column only (#springfield2), one paragraph per line block ("\n\n")
  - inline scripture citations (span.stiki, e.g. "Romans 1:3") removed: they are
    New Advent's links, not the translator's words
  - New Advent's donation banner removed; whitespace collapsed

    python scripts/doctrines/natext.py dump <out_dir>    write <id>.txt + index.tsv
"""
import os
import re
import sys

from bs4 import BeautifulSoup

CACHE = os.path.join("temp", "newadvent_cache")
BANNER = re.compile(r"Please help support the mission of New Advent.*?(?:\.\.\.|$)")


def norm(s: str) -> str:
    """Whitespace/quote-insensitive form used for verbatim matching."""
    s = s.replace("\xa0", " ").replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"').replace("—", "—")
    return " ".join(s.split())


def page_html(page_id: str) -> bytes:
    with open(os.path.join(CACHE, f"{page_id}.htm"), "rb") as f:
        return f.read()


def page_title(soup: BeautifulSoup) -> str:
    t = soup.title.get_text() if soup.title else ""
    return t.replace("CHURCH FATHERS:", "").strip()


def page_text(page_id: str) -> tuple[str, str]:
    """(title, text) — text has paragraphs separated by blank lines."""
    soup = BeautifulSoup(page_html(page_id), "html.parser", from_encoding="windows-1252")
    main = soup.find(id="springfield2") or soup.body
    for span in main.select("span.stiki"):
        span.decompose()
    for tag in main.find_all(["script", "style"]):
        tag.decompose()
    paras = []
    for el in main.find_all(["p", "h1", "h2", "h3", "h4", "blockquote"]):
        if el.find_parent(["p", "blockquote"]) is not None and el.name != "blockquote":
            continue
        t = " ".join(BANNER.sub("", el.get_text(" ")).replace("\xa0", " ").split())
        t = re.sub(r" ([,.;:!?)\]])", r"\1", t).replace("( ", "(").replace("[ ", "[")
        if t:
            paras.append(t)
    return page_title(soup), "\n\n".join(paras)


def dump(out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for name in sorted(os.listdir(CACHE)):
        if not name.endswith(".htm"):
            continue
        pid = name[:-4]
        try:
            title, text = page_text(pid)
        except Exception as e:  # noqa: BLE001
            print("skip", pid, e)
            continue
        with open(os.path.join(out_dir, f"{pid}.txt"), "w", encoding="utf-8") as f:
            f.write(title + "\n\n" + text)
        rows.append(f"{pid}\t{title}")
    with open(os.path.join(out_dir, "index.tsv"), "w", encoding="utf-8") as f:
        f.write("\n".join(rows))
    print(f"dumped {len(rows)} pages to {out_dir}")


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "dump":
        dump(sys.argv[2])
    else:
        print(__doc__)
