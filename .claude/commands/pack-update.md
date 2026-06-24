---
description: Rebuild downloadable packs and upload to GitHub Release packs-v1
---

# Pack Update

Rebuild the Patristica downloadable pack system and push to GitHub Release.

## Instructions

### Step 1: Identify what changed

Ask the user what changed — which data was added/updated (commentary, lexicons, interlinear, etc.). This determines which pack(s) to rebuild.

### Step 2: Run the pack generation script

```bash
cd Patristica/scripts
python generate_packs.py
```

(Adjust script name to what actually exists in `Patristica/scripts/` — check with `ls Patristica/scripts/`)

### Step 3: Verify output

Check that pack files were generated in `Patristica/temp/packs/` or wherever the script outputs them. Confirm sizes look reasonable.

### Step 4: Update packs-manifest.json

The manifest at `Patristica/assets/packs-manifest.json` (and `Patristica/data/packs-manifest.json`) needs to reflect the new pack versions. Update version/size fields for any changed packs.

### Step 5: Upload to GitHub Release

Upload new pack files to the `packs-v1` release on `luvlylavnder/bible-app-data`:

```bash
gh release upload packs-v1 <pack-file> --repo luvlylavnder/bible-app-data --clobber
```

### Step 6: Verify

Download the manifest URL from the release and confirm the pack appears correctly.

### Step 7: Remind

- If `assets/packs-manifest.json` changed → it's bundled, needs an EAS build to propagate
- If only `data/online/packs-manifest.json` changed → OTA update via `eas update` is enough
