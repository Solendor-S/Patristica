/**
 * Self-check for the \jw red-letter parser. Nothing imports this, so it never ships.
 *
 *   node --experimental-strip-types --no-warnings src/data/redLetter.selfcheck.ts
 *
 * A bad split drops or recolours words of Scripture without any error.
 */
import assert from 'node:assert/strict'
import { splitByWj, stripUsfm } from './redLetter.ts'

const seg = (t: string, red: boolean) => ({ t, red })

assert.equal(splitByWj('No words of Jesus here.'), null)

// The whole verse is his words.
assert.deepEqual(splitByWj('\\jw For God so loved the world. \\jw*'), [seg('For God so loved the world. ', true)])

// Narrator before and after.
assert.deepEqual(splitByWj('and saying, \\jw “Repent.”\\jw* Then he left.'),
  [seg('and saying, ', false), seg('“Repent.”', true), seg(' Then he left.', false)])

// Narrator between two spans stays black.
assert.deepEqual(splitByWj('\\jw “Come,”\\jw* he said, \\jw “and see.”\\jw*'),
  [seg('“Come,”', true), seg(' he said, ', false), seg('“and see.”', true)])

// Every display path goes through stripUsfm, so the marks must never reach the screen.
assert.equal(stripUsfm('saying, \\jw “Repent.”\\jw* Then he left.'), 'saying, “Repent.” Then he left.')

console.log('redLetter selfcheck OK')
