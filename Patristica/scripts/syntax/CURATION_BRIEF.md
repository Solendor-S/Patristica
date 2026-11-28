# Disputed-construction curation brief (Clause tab)

Goal: an EXHAUSTIVE list of every place in your assigned books where the GRAMMAR / SYNTAX of the
original text admits two or more readings that change the sense, so the app can show a
"disputed construction" marker with both readings, which Church Fathers held each, and which
traditions (Catholic / Orthodox / Protestant) followed.

## Inclusion rule (grammar admits >= 2 readings)
- referent: pronoun / demonstrative / relative antecedent (Eph 2:8 touto; Matt 26:26 touto; Matt 16:18 taute te petra; Gen 3:15 hu')
- case: genitive / dative function (subjective vs objective genitive: Gal 2:16 pistis Christou; Rom 3:22; Col 1:15 "firstborn of all creation")
- attachment: which word a prepositional phrase / participle / clause modifies (Eph 1:4-5 "in love"; Rom 1:17 "from faith to faith")
- punctuation: clause/sentence boundary that the autographs didn't mark (Rom 9:5; John 1:3-4 ho gegonen; Dan 9:25 the weeks)
- article: article constructions (Titus 2:13; 2 Pet 1:1; John 1:1c theos without article)
- construction: force of a conjunction/construction/tense/mood (Rom 5:12 eph' ho; Matt 1:25 heos hou; Gen 1:1 bereshit; imperative vs indicative John 5:39)

ORTHODOXY RULE (user decision 2026-11-28): never include a reading contrary to the ecumenical councils
(Trinity; Christ's full divinity, consubstantiality, true humanity, one person in two natures, two wills;
divinity of the Holy Spirit; Theotokos; icons; condemned Pelagian and Origenist positions). E.g. John 1:1c
"a god"/"divine", "no distinction of person", Col 1:15 or Rev 3:14 "a creature", John 20:28 "exclamation,
not about Jesus" (condemned at Constantinople II). If removing such readings leaves fewer than 2, drop the
entry. Confessional Catholic/Orthodox/Protestant differences (Matt 1:25, 16:18, 26:26) DO stay, labelled by
tradition. Where a legitimate reading removes a proof text (Titus 2:13 "two persons", Rom 9:5 doxology),
the summary must state that the Church confesses Christ as true God regardless.

EXCLUDE: purely lexical disputes (what a word means: Prov 8:22 qanani, Luke 1:28 kecharitomene, Matt 5:32 porneia)
and textual variants (manuscript differences). Put lexical ones you notice in your backlog file
(see below) — do NOT put them in curation. Include an item only if real scholars / translations /
Fathers actually divide on it, or a standard grammar/translation note flags the ambiguity. Prioritise
theologically significant ones, but be exhaustive: go through your books chapter by chapter.
Sources to sweep: NET Bible translator notes (netbible.org), Wallace "Greek Grammar Beyond the
Basics" ambiguous examples, major commentaries' "grammatically possible" notes, KJV/RSV/NAB/ESV
footnote alternatives ("Or ..."), and patristic disputes found in the commentary DB.

## Tools (run from C:\Projects\BibleAndroidApp\Patristica, set PYTHONIOENCODING=utf-8)
- MACULA word refs for a verse:   python scripts/syntax/macula.py words "Romans" 5:12
- MACULA tree outline of it:       python scripts/syntax/macula.py tree "Romans" 5:12
  (decide macula_follows from the tree: which reading does the parse encode? null if neutral; write macula_evidence)
- Fathers on a verse (SQLite, read-only): temp/bible_phase2_test.db
    SELECT id, father_name, source, substr(full_text,1,400) FROM commentary WHERE book=? AND chapter=? AND verse=?;
    (also table commentary_legacy, same columns incl. full_text). Use the row id as "commentary": id / "legacy": id.
- New Advent texts (plain text, one file per page): temp/na_text/<page>.txt, index: temp/na_text/index.tsv
  (grep them; cite as "page": "<id>", url https://www.newadvent.org/fathers/<id>.htm)
- Valid Father names: the keys in src/data/fatherDates.ts (lines like `  'John Chrysostom': {`). Use an existing key exactly.
- App book names: src/data/books.ts (e.g. "Song of Solomon", "Psalms", "1 Corinthians").

## Output
Write a JSON list to scripts/syntax/curation/<your-batch>.json following the schema in the
docstring of scripts/syntax/flashpoints.py (read it first). Then run
    python scripts/syntax/flashpoints.py --check scripts/syntax/curation/<your-batch>.json
and fix every problem until it says "All verified." QUOTES MUST BE VERBATIM from the cited source
(copy-paste from the file / DB text; never paraphrase, never "fix" the translation). If you can't
find a Father for a reading, leave "fathers": [] — never invent. 1-4 sentences per quote. Up to
3 Fathers per reading; prefer early and diverse (Greek East / Latin West / Syriac).
"traditions" only when a tradition's position is genuinely attested (e.g. Rom 5:12: Latin West
"in whom" via Augustine; Orthodox "because"); otherwise omit the key. Keep summary neutral.
Lexical backlog: scripts/syntax/backlog/<your-batch>.json = [{"ref": "Luke 1:28", "word": "...", "note": "..."}].

Final message: count of flashpoints, list of ids, any you considered and rejected (one line each).
Do NOT edit any other files. Do not run git.
