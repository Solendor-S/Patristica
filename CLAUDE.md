# BibleAndroidApp Workspace

Workspace hub for the Patristica Bible app (React Native / Expo / EAS).

## Structure

```
BibleAndroidApp/
├── Patristica/          ← All app code lives here
│   ├── src/             ← React Native source
│   ├── assets/          ← Icons, splash, bundled DB
│   ├── android/         ← Native Android project (gitignored)
│   ├── scripts/         ← Python data-processing scripts
│   ├── bible-app-data/  ← Standalone git repo (gitignored here, backed up separately)
│   ├── temp/            ← Working files (gitignored)
│   └── package.json
└── .claude/             ← Workspace Claude environment
```

## App Development

All app work happens inside `Patristica/`. Always cd there before running npm/expo/eas commands.

```bash
cd Patristica

npm install              # Install deps (first time or after package.json changes)
npx expo start           # Start Metro dev server
eas build --platform android --profile development   # EAS dev build
eas update               # Push OTA update
```

## Key Files

| Path | Purpose |
|------|---------|
| `Patristica/src/db/` | SQLite setup, schema version, migrations |
| `Patristica/src/screens/` | All screen components |
| `Patristica/src/components/` | Reusable UI components |
| `Patristica/assets/db/` | Bundled bible.db (copy manually from BibleApp) |
| `Patristica/scripts/` | Python scripts for data processing / pack building |
| `Patristica/data/online/` | Online packs manifest |

## Data & Packs

- `Patristica/bible-app-data/` — Standalone git repo; push separately to `luvlylavnder/bible-app-data`
- Packs uploaded to GitHub Release `packs-v1` on `luvlylavnder/bible-app-data`
- `DB_SCHEMA_VERSION` in `Patristica/src/db/` controls DB migration gating

## Claude Commands

| Command | Purpose |
|---------|---------|
| `/eas-build` | EAS build (development / preview / production) |
| `/pack-update` | Rebuild packs, upload to GitHub Release, bump manifest |
| `/db-schema-update` | Bump DB_SCHEMA_VERSION, rebuild bible.db, push submodule |
| `/worktree-init` | Create isolated worktree for a branch |
| `/worktree-deliver` | Commit, push, open PR from current worktree |

## Security

Never hardcode API keys, tokens, or IDs. Use `.env` files (gitignored). EAS secrets set via `eas secret:create`.
