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
  canonOtBooks, canonBookNames, chapterCount, inCanon, kjvVerse, type CanonKey,
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

console.log('canons selfcheck OK')
