"""
Download the pinned lexicon sources into temp/lexicon-src/ (skips files already there).

  - Abbott-Smith, A Manual Greek Lexicon of the NT (1922), TEI markup by
    translatable-exegetical-tools. Public domain.
  - UBS Dictionary of New Testament Greek + UBS Dictionary of Biblical Hebrew
    (ubsicap/ubs-open-license). CC BY-SA 4.0.

    python scripts/lexicons/fetch_sources.py        (run from Patristica/)
"""
import os
import urllib.request

SRC = "temp/lexicon-src"
AS = "https://raw.githubusercontent.com/translatable-exegetical-tools/Abbott-Smith/8c00cb244761aa23659421a8cbbbf7a3b27b7d59"
UBS = "https://raw.githubusercontent.com/ubsicap/ubs-open-license/a15a96cfaa4ca18a6c0339016645ba1e534db3c8/dictionaries"

FILES = {
    "abbott-smith.tei.xml": f"{AS}/abbott-smith.tei.xml",
    "gnt2asLookups.js": f"{AS}/gnt2asLookups.js",
    "UBSGreekNTDic-v1.1-en.JSON": f"{UBS}/greek/JSON/UBSGreekNTDic-v1.1-en.JSON",
    "UBSGreekNTDicLexicalDomains-v1.1-en.JSON": f"{UBS}/greek/JSON/UBSGreekNTDicLexicalDomains-v1.1-en.JSON",
    "UBSHebrewDic-v0.9.4-en.JSON": f"{UBS}/hebrew/JSON/UBSHebrewDic-v0.9.4-en.JSON",
    "UBSHebrewDicLexicalDomains-v0.9.4-en.JSON": f"{UBS}/hebrew/JSON/UBSHebrewDicLexicalDomains-v0.9.4-en.JSON",
}


def main():
    os.makedirs(SRC, exist_ok=True)
    for name, url in FILES.items():
        path = os.path.join(SRC, name)
        if os.path.exists(path):
            continue
        print(f"Downloading {name} ...")
        with urllib.request.urlopen(url, timeout=120) as r, open(path, "wb") as f:
            f.write(r.read())
    for name in FILES:
        print(f"  {name}: {os.path.getsize(os.path.join(SRC, name)) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
