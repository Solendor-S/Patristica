/**
 * Self-check for the canon lists. Nothing imports this, so it never ships.
 *
 *   node --experimental-strip-types --no-warnings src/data/canons.selfcheck.ts
 *
 * A misspelt name in CANON_OT_ORDER silently drops a book from the picker,
 * and the Catholic count is the one number users will check.
 */
import assert from 'node:assert/strict'
import {
  CANON_OT_ORDER, CANON_BADGE, WEBC_DEUTERO, APOCRYPHA_BOOK_NAMES,
  canonOtBooks, canonBookNames, chapterCount, greekWordRef, inCanon, isAramaic, kjvVerse, textSource, type CanonKey,
} from './books.ts'

const canons: CanonKey[] = ['protestant', 'catholic']

for (const c of canons) {
  canonOtBooks(c).forEach((b, i) => assert.ok(b, `${c}: unknown book "${CANON_OT_ORDER[c][i]}"`))
  const names = canonBookNames(c)
  assert.equal(new Set(names).size, names.length, `${c}: duplicate book`)
}

assert.equal(canonBookNames('protestant').length, 66)
assert.equal(canonBookNames('catholic').length, 73)

// Daniel's Greek portions belong to Daniel: not listed, but not left in the Apocrypha tab either.
for (const n of Object.keys(CANON_BADGE)) {
  assert.ok(!canonBookNames('catholic').includes(n), `${n} listed separately`)
  assert.ok(inCanon('catholic', n), `${n} outside Catholic canon`)
  assert.ok(!inCanon('protestant', n), `${n} inside Protestant canon`)
}
assert.equal(canonOtBooks('catholic').find(b => b.name === 'Daniel')?.chapters, 14)
assert.equal(canonOtBooks('protestant').find(b => b.name === 'Daniel')?.chapters, 12)

const has = (c: CanonKey) => new Set(canonBookNames(c))
for (const n of has('protestant')) assert.ok(has('catholic').has(n), `catholic missing ${n}`)

const cat = CANON_OT_ORDER.catholic
assert.deepEqual(cat.slice(cat.indexOf('Nehemiah'), cat.indexOf('Job')),
  ['Nehemiah', 'Tobit', 'Judith', 'Esther', '1 Maccabees', '2 Maccabees'])

// Every deuterocanonical book in the Catholic canon must route to the WEBC, or it would
// silently fall back to the apocrypha packs while the WEBC is selected.
const catholicDeutero = [...CANON_OT_ORDER.catholic.filter(n => APOCRYPHA_BOOK_NAMES.has(n)), ...Object.keys(CANON_BADGE)]
assert.deepEqual(Object.keys(WEBC_DEUTERO).sort(), [...catholicDeutero].sort())

assert.equal(chapterCount('Daniel', 'KJV', 'protestant'), 12)
assert.equal(chapterCount('Daniel', 'KJV', 'catholic'), 14)
assert.equal(chapterCount('Daniel', 'WEBC', 'protestant'), 14)
assert.equal(chapterCount('Tobit', 'KJV', 'catholic'), 14)
assert.equal(chapterCount('Didache', 'KJV', 'catholic'), 16)

assert.equal(kjvVerse('WEBC', 'Daniel', 3, 23), 23)
assert.equal(kjvVerse('WEBC', 'Daniel', 3, 24), null)   // Prayer of Azariah
assert.equal(kjvVerse('WEBC', 'Daniel', 3, 90), null)
assert.equal(kjvVerse('WEBC', 'Daniel', 3, 91), 24)
assert.equal(kjvVerse('WEBC', 'Daniel', 3, 97), 30)
assert.equal(kjvVerse('KJV', 'Daniel', 3, 24), 24)
assert.equal(kjvVerse('WEBC', 'Daniel', 4, 24), 24)

assert.deepEqual(greekWordRef('KJV', 'Tobit', 2, 3), { book: 'Tobit', chapter: 2, verse: 3 })
assert.deepEqual(greekWordRef('KJV', 'Baruch', 6, 2), { book: 'Baruch', chapter: 6, verse: 2 })
assert.deepEqual(greekWordRef('KJV', 'Daniel', 13, 5), { book: 'Susanna', chapter: 1, verse: 5 })
assert.deepEqual(greekWordRef('WEBC', 'Daniel', 14, 5), { book: 'Bel and the Dragon', chapter: 1, verse: 5 })
assert.equal(greekWordRef('KJV', 'Daniel', 12, 1), null)
assert.deepEqual(greekWordRef('WEBC', 'Daniel', 3, 24), { book: 'Prayer of Azariah', chapter: 1, verse: 1 })
assert.deepEqual(greekWordRef('WEBC', 'Prayer of Azariah', 1, 30), { book: 'Prayer of Azariah', chapter: 1, verse: 7 })
assert.deepEqual(greekWordRef('KJV', 'Prayer of Azariah', 1, 7), { book: 'Prayer of Azariah', chapter: 1, verse: 7 })
assert.equal(greekWordRef('KJV', 'Daniel', 3, 24), null)
assert.equal(greekWordRef('WEBC', 'Daniel', 3, 91), null)
assert.equal(greekWordRef('KJV', '3 Maccabees', 1, 1), null)

assert.equal(isAramaic('Daniel', 2, 3), false)
assert.equal(isAramaic('Daniel', 2, 4), true)
assert.equal(isAramaic('Daniel', 7, 28), true)
assert.equal(isAramaic('Daniel', 8, 1), false)
assert.equal(isAramaic('Ezra', 6, 18), true)
assert.equal(isAramaic('Ezra', 6, 19), false)
assert.equal(isAramaic('Ezra', 7, 12), true)
assert.equal(isAramaic('Jeremiah', 10, 11), true)
assert.equal(isAramaic('Jeremiah', 10, 12), false)

assert.equal(textSource('KJV', 'Tobit', 1, 'WEBC'), 'WEBC')
assert.equal(textSource('KJV', 'Tobit', 1, 'KJVA'), 'KJVA')
assert.equal(textSource('WEBC', 'Tobit', 1, 'KJVA'), 'WEBC')    // WEBC always has its own
assert.equal(textSource('ASV', 'Daniel', 13, 'WEBC'), 'WEBC')
assert.equal(textSource('ASV', 'Daniel', 12, 'WEBC'), 'ASV')
assert.equal(textSource('KJV', 'Genesis', 1, 'WEBC'), 'KJV')
assert.equal(textSource('KJV', '1 Esdras', 1, 'WEBC'), 'KJV')  // not in the WEBC: Apocrypha text

console.log('canons selfcheck OK')
