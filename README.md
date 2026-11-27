# Patristica

**Read the Bible with the early church.** Patristica is an Android Bible study app that pairs Scripture with the writings of the Church Fathers — verse-by-verse patristic commentary, apostolic-era texts, original-language word study, and the historical world of the early church, all offline-first.

[Get it on Google Play](https://play.google.com/store/apps/details?id=com.patristica.app)

---

## Features

### 📖 Bible Reader
- KJV with Strong's numbers bundled; ASV, WEB, WEB Catholic, BSB, Septuagint (LXX), Dead Sea Scrolls and SBL Greek NT available as free downloadable packs
- ESV, NASB (1995 and 2020) and NKJV read online, served through our own licensed proxies
- Full Deuterocanon and broader canon (Tobit through 4 Maccabees, 1 Enoch, Jubilees, Meqabyan) as optional packs
- Cross-references, textual variants, chapter overviews, psalm headings, footnotes
- Bookmarks, notes, reading history, full-text search, reading plans with a home-screen widget and daily notifications

### ⛪ Church Fathers
- **Verse-by-verse patristic commentary**: tap any verse and read what Irenaeus, Justin Martyr, Tertullian, Origen, Cyprian, Clement of Alexandria and dozens more said about it
- Two collections: **Hand-picked** (citations extracted directly from each father's works, with links to the full source text) and **All** (adds a broader aggregated set)
- Filter by tradition (Eastern, Western, Alexandrian, Syrian, North African), browse by father, chronological ordering with dates and biographies
- Full early-church texts readable in-app: the Didache, 1–2 Clement, the seven letters of Ignatius, Epistle of Barnabas, Shepherd-era writings, Justin Martyr, Against Heresies, and more (as packs)

### 🏛️ Early Church Study
- Interactive timeline of the early church with category filters
- Councils, creeds (tappable from councils), heresies, schisms, and doctrine development panels
- Roman persecutions and canon-formation history
- Geographic map of the Church Fathers
- Josephus cross-references and other historical sources tied to relevant verses

### 🔤 Original Languages
- Word study panel: tap a word for Strong's, Thayer's, and Brown-Driver-Briggs definitions
- Greek NT (SBLGNT), tagged Greek and Hebrew texts (TAGNT / TAHOT via packs), LXX with online fallback
- Morphology decoding with plain-English explanations of tenses, stems, cases, and moods
- Interlinear KJV+ with per-word Strong's tags

---

## Tech Stack

- **React Native + Expo** (EAS build/update), TypeScript
- **SQLite** (expo-sqlite): a bundled core database plus optional downloadable pack databases
- **Python** data pipeline for building the database and content packs

## Repository Layout

```
├── Patristica/              # The app
│   ├── src/                 # React Native source (screens, components, db, lib)
│   ├── assets/              # Icons, splash, bundled bible.db, pack manifest
│   ├── scripts/             # Python data-processing / import pipelines
│   │   └── newadvent/       # Church-father citation scraping pipeline
│   ├── data/online/         # Per-chapter JSON served via raw.githubusercontent
│   └── package.json
├── esv-proxy/               # Cloudflare Worker: ESV via Crossway's API (key stays server-side)
├── apibible-proxy/          # Cloudflare Worker: NASB/NKJV via API.Bible, 29-day chapter cache
├── docs/                    # Privacy policy (GitHub Pages)
└── README.md
```

## Data Architecture

Patristica is offline-first with a three-tier content model:

1. **Core database** (bundled): KJV+ text, commentary, cross-references, lexicons, historical data — works with no network at all.
2. **Content packs** (~50, hosted on the [`packs-v1` GitHub Release](https://github.com/Solendor-S/Patristica/releases/tag/packs-v1)): extra translations, deuterocanon, early-church texts, and scholarly tagged texts. Installed from the Library tab; a remote manifest keeps the catalog current without app updates.
3. **Online preview**: per-chapter JSON lets uninstalled content be read on demand before downloading the pack.
4. **Licensed translations** (ESV, NASB, NKJV): never bundled or packed. The app fetches each chapter live through a small Cloudflare Worker that holds our API key, so no key ships in the APK. These read in the main reader only, and fall back to the KJV if the service is unavailable.

The patristic commentary is built by our own pipeline (`Patristica/scripts/newadvent/`): it crawls each father's works, extracts the in-text scripture citations, normalizes versification (including Vulgate→Hebrew psalm numbering), validates every reference against the canon, and links each excerpt back to its source page.

## Development

```bash
cd Patristica
npm install
npx expo start                                        # Metro dev server
eas build --platform android --profile development    # dev build
eas update                                            # push OTA JS update
```

A schema/database change requires a new EAS build (the database is baked into the APK); JS-only changes ship over-the-air via `eas update`.

## Content Sources & Attribution

Patristica stands on the shoulders of many public-domain and openly licensed projects:

- **Bible texts**: King James Version, American Standard Version, World English Bible and World English Bible Catholic (public domain); [Berean Standard Bible](https://berean.bible) (public domain); SBL Greek New Testament; Septuagint
- **Licensed texts** (non-commercial, used by permission): ESV® © 2001 Crossway, via the [ESV API](https://api.esv.org); NASB® © The Lockman Foundation and NKJV® © 1982 Thomas Nelson, via [API.Bible](https://api.bible). All rights reserved.
- **Tagged texts**: TAGNT / TAHOT from [STEPBible](https://github.com/STEPBible/STEPBible-Data) (CC BY 4.0)
- **Church Fathers**: the Ante-Nicene Fathers translations (Roberts–Donaldson, public domain), accessed via [New Advent](https://www.newadvent.org/fathers/); every commentary entry links to its source page
- **Additional commentary**: [e-Catena](https://www.earlychristianwritings.com/e-catena/) and the [HistoricalChristianFaith Commentaries Database](https://github.com/HistoricalChristianFaith/Commentaries-Database)
- **Lexicons**: Strong's Concordance, Thayer's Greek Lexicon, Brown-Driver-Briggs (public domain)
- **Historical sources**: Josephus (Whiston translation, public domain)

If you are a rights holder and have a concern about any content in this app, please open an issue.

## Contributing

Issues and pull requests are welcome — especially corrections to commentary accuracy, father metadata (dates, locations, traditions), and citation coverage.
