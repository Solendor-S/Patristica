---
description: Bump DB_SCHEMA_VERSION, rebuild bible.db, update migration code
---

# DB Schema Update

Bump the database schema version and update migration logic in Patristica.

## Instructions

### Step 1: Find current version

```bash
grep -r "DB_SCHEMA_VERSION" Patristica/src/db/
```

Note the current version number.

### Step 2: Confirm the schema change

Ask the user what changed in the schema — new tables, new columns, index changes, etc.

### Step 3: Bump version

In the file that defines `DB_SCHEMA_VERSION` (likely `Patristica/src/db/database.ts` or similar), increment the version by 1.

### Step 4: Add migration

In the migration switch/if block (same file or `Patristica/src/db/migrations.ts`), add a new case for the new version number that applies the schema change.

### Step 5: Rebuild bible.db

If the schema change requires regenerating the bundled database:
```bash
cd Patristica/scripts
python <relevant-build-script>.py
```

Then copy the output to `Patristica/assets/db/bible.db` (this file is gitignored — copy manually).

### Step 6: Push bible-app-data

If any data files in `Patristica/bible-app-data/` changed:
```bash
cd Patristica/bible-app-data
git add -A
git commit -m "Update DB for schema version <N>"
git push
```

### Step 7: Remind

- A schema version bump requires a new EAS build (the bundled DB is baked into the APK)
- OTA updates alone won't help users who already have the app — they need the new build
