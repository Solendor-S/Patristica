import requests
from bs4 import BeautifulSoup
import sys
sys.path.insert(0, '.')
# Import the scraper function directly
import importlib.util, types

spec = importlib.util.spec_from_file_location("ie", "scripts/import_ecatena.py")
mod  = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

url  = 'https://www.earlychristianwritings.com/e-catena/romans8.html'
resp = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
soup = BeautifulSoup(resp.text, 'html.parser')
entries = mod.scrape_chapter_page(soup, url)
print(f"Entries found: {len(entries)}")
for e in entries[:5]:
    print(f"  {e['book']} {e['chapter']}:{e['verse']} | {e['father_name']} | {e['source'][:40]}")
    print(f"    quote: {e['quote'][:80]}")
