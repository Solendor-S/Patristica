"""
Fill downloadUrl and onlineBaseUrl in assets/packs-manifest.json.

Sets:
  onlineBaseUrl  → https://raw.githubusercontent.com/Solendor-S/Patristica/main/data/online
  downloadUrl    → https://github.com/Solendor-S/Patristica/releases/download/packs-v1/{slug}.db

Also copies the updated manifest to data/packs-manifest.json for remote fetch.

python3 scripts/update_manifest_urls.py
"""

import json
import shutil
import os

MANIFEST_PATH = "assets/packs-manifest.json"
REMOTE_COPY   = "data/packs-manifest.json"
REPO          = "Solendor-S/Patristica"
RELEASE_TAG   = "packs-v1"

ONLINE_BASE = f"https://raw.githubusercontent.com/{REPO}/master/data/online"
DOWNLOAD_BASE = f"https://github.com/{REPO}/releases/download/{RELEASE_TAG}"

with open(MANIFEST_PATH, encoding="utf-8") as f:
    manifest = json.load(f)

manifest["onlineBaseUrl"] = ONLINE_BASE

updated = 0
for pack in manifest["packs"]:
    pack["downloadUrl"] = f"{DOWNLOAD_BASE}/{pack['slug']}.db"
    updated += 1

with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

os.makedirs("data", exist_ok=True)
shutil.copy2(MANIFEST_PATH, REMOTE_COPY)

print(f"Updated {updated} packs in {MANIFEST_PATH}")
print(f"onlineBaseUrl: {ONLINE_BASE}")
print(f"downloadUrl pattern: {DOWNLOAD_BASE}/{{slug}}.db")
print(f"Copied to {REMOTE_COPY}")
