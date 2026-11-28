# Patristica

**Read the Bible with the early church.** Patristica is an Android Bible study app that pairs Scripture with the writings of the Church Fathers — verse-by-verse patristic commentary, apostolic-era texts, original-language word study, and the historical world of the early church, all offline-first.

[Get it on Google Play](https://play.google.com/store/apps/details?id=com.patristica.app)

---

## Features

### 📖 Bible Reader
- KJV with Strong's numbers bundled; ASV, WEB, WEB Catholic, BSB, Septuagint (LXX), Dead Sea Scrolls and SBL Greek NT available as free downloadable packs
- ESV, NASB (1995 and 2020) and NKJV read online, served through our own licensed proxies
- Full Deuterocanon and broader canon (Tobit through 4 Maccabees, 1 Enoch, Jubilees, Meqabyan) as optional packs
- Canon setting: Catholic (73 books, deuterocanon in the Old Testament, Susanna and Bel as Daniel 13–14) or Protestant, with a choice of WEB Catholic or KJV Apocrypha for deuterocanonical text
- Parallel translation columns and split view (two passages side by side)
- Cross-references, textual variants, chapter overviews, psalm headings, footnotes
- Bookmarks, notes, reading history, full-text search, reading plans with a home-screen widget and daily notifications

### ⛪ Church Fathers
- **Verse-by-verse patristic commentary**: tap any verse and read what Irenaeus, Justin Martyr, Tertullian, Origen, Cyprian, Clement of Alexandria and dozens more said about it
- Two collections: **Hand-picked** (citations extracted directly from each father's works, with links to the full source text) and **All** (adds a broader aggregated set)
- Filter by tradition (Eastern, Western, Alexandrian, Syrian, North African), browse by father, chronological ordering with dates and biographies
- Consensus view: how each tradition's fathers read a verse, at a glance
- Influence network and correspondence: who shaped whom, and who wrote to whom
- **Aquinas**: the Catena Aurea verse by verse, plus the Summa Theologica and Summa Contra Gentiles to browse
- Full early-church texts readable in-app: the Didache, 1–2 Clement, the seven letters of Ignatius, Epistle of Barnabas, Shepherd-era writings, Justin Martyr, Against Heresies, and more (as packs)

### 🏛️ Early Church Study
- Interactive timeline of the early church with category filters
- Councils, creeds (tappable from councils), heresies and schisms
- **Doctrine** tab: 133 hand-picked, verbatim-checked passages from the fathers tracing how each doctrine developed, with dissenting voices labelled
- **Gospel Parallels**: where the other Gospels tell the same passage, via the ancient Eusebian Canons
- Roman persecutions and canon-formation history
- Geographic map of the Church Fathers
- Josephus cross-references and other historical sources tied to relevant verses
- **Passage Guide**: one screen summarising everything the app has on a verse — Fathers (with the tradition breakdown), cross-references, parallels, people and places, doctrine, variants and your notes
- **People & Places**: every named person and place in the Bible, deuterocanon included, with all references, family links, Strong's numbers and a map pin

### ⛪ Daily Mass
- **Mass** tab opens on today's Mass: the Novus Ordo readings for your national calendar (General Roman, Australia, Canada, England & Wales, Ireland, USA) in your chosen translation, or the full 1962 Missal propers in English and Latin
- Links straight to the Fathers' commentary on the day's Gospel

### 🔤 Original Languages
- Word study panel: tap a word for Strong's, Thayer's, Abbott-Smith and Brown-Driver-Briggs definitions, plus UBS semantic domains marking the sense used in the verse
- Greek NT (SBLGNT, Textus Receptus), tagged Greek and Hebrew texts (TAGNT / TAHOT / WLC via packs), LXX with online fallback, and the biblical Dead Sea Scrolls in Hebrew
- Morphology decoding with plain-English explanations of tenses, stems, cases, and moods
- Interlinear KJV+ with per-word Strong's tags
- **Clause view**: the sentence structure of every Greek NT and Hebrew OT verse as an indented outline, with 287 "disputed constructions" (e.g. Rom 5:12, John 1:3-4, Gen 3:15) showing each grammatical reading, the Fathers who held it (verbatim-checked) and which traditions followed

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
- **Tagged texts**: TAGNT / TAHOT / WLC and the tagged LXX from [STEPBible](https://github.com/STEPBible/STEPBible-Data) (CC BY 4.0)
- **Dead Sea Scrolls**: Martin G. Abegg's biblical scrolls transcription via [ETCBC/dss](https://github.com/ETCBC/dss) (CC BY-NC 4.0)
- **Church Fathers**: the Ante-Nicene Fathers translations (Roberts–Donaldson, public domain), accessed via [New Advent](https://www.newadvent.org/fathers/); every commentary entry links to its source page
- **Additional commentary**: [e-Catena](https://www.earlychristianwritings.com/e-catena/) and the [HistoricalChristianFaith Commentaries Database](https://github.com/HistoricalChristianFaith/Commentaries-Database)
- **Lexicons**: Strong's Concordance, Thayer's Greek Lexicon, Brown-Driver-Briggs, Abbott-Smith (public domain); [UBS dictionaries](https://github.com/ubsicap/ubs-open-license) of Greek and Hebrew semantic domains (CC BY-SA 4.0)
- **Aquinas**: Catena Aurea (Newman edition, 1841), Summa Theologica (Dominican translation, 1920), Summa Contra Gentiles (Rickaby, 1905), all public domain
- **Eusebian Canons**: INTF data via the CrossWire modules (public domain)
- **Historical sources**: Josephus (Whiston translation, public domain)
- **People & Places**: [STEPBible TIPNR](https://github.com/STEPBible/STEPBible-Data) proper names (CC BY 4.0) with coordinates from [OpenBible.info Bible Geocoding Data](https://github.com/openbibleinfo/Bible-Geocoding-Data) (CC BY 4.0); deuterocanon entries curated for Patristica
- **Syntax trees**: [MACULA Greek](https://github.com/Clear-Bible/macula-greek) and [MACULA Hebrew](https://github.com/Clear-Bible/macula-hebrew) © Biblica, Inc. (CC BY 4.0); versification mapping from STEPBible TVTMS (CC BY 4.0)
- **Mass**: calendar from the [Liturgical Calendar API](https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI) (Apache-2.0); lectionary citations from Felix Just SJ's [Catholic Lectionary Website](https://catholic-resources.org/Lectionary/) and LitCal, checked against [catholic-readings-api](https://github.com/cpbjr/catholic-readings-api) (MIT); 1962 propers from [Missale Meum](https://github.com/mmolenda/missalemeum) and [Divinum Officium](https://github.com/DivinumOfficium/divinum-officium) (MIT)

If you are a rights holder and have a concern about any content in this app, please open an issue.

## Contributing

Issues and pull requests are welcome — especially corrections to commentary accuracy, father metadata (dates, locations, traditions), and citation coverage.
