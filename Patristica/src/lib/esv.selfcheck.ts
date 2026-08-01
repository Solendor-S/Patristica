/**
 * Self-check for the ESV passage parser. Nothing imports this, so it never ships.
 *
 *   node --experimental-strip-types src/lib/esv.selfcheck.ts
 *
 * The parser is the only non-trivial logic in esv.ts — the fetch around it is
 * plumbing, but a bad split silently mangles Scripture, so it gets a check.
 */
import assert from 'node:assert/strict'
import { parseEsvPassage } from './esv.ts'

// Shape the API actually returns: leading indent, inline [n] markers, wrapped lines.
const sample =
  '  [1] In the beginning, God created the heavens and the earth. ' +
  '[2] The earth was without form and void, and darkness was over\n' +
  '  the face of the deep. [3] And God said, "Let there be light," and there was light.\n' +
  '\n(ESV)'

const verses = parseEsvPassage(sample, 'Genesis', 1)

assert.equal(verses.length, 3, 'should find three verses')
assert.deepEqual(verses.map(v => v.verse), [1, 2, 3], 'verse numbers in order')
assert.equal(verses[0].text, 'In the beginning, God created the heavens and the earth.')
assert.equal(
  verses[1].text,
  'The earth was without form and void, and darkness was over the face of the deep.',
  'line wrapping and indentation collapse to single spaces',
)
assert.ok(!verses[2].text.includes('(ESV)'), 'trailing (ESV) marker stripped')
assert.equal(verses[0].book, 'Genesis')
assert.equal(verses[0].chapter, 1)

// Chapters that don't start at verse 1 (the reader never asks for these, but a
// partial response must not silently renumber).
const partial = parseEsvPassage('[12] Then he said. [13] And he went.', 'John', 3)
assert.deepEqual(partial.map(v => v.verse), [12, 13], 'preserves actual verse numbers')

// Garbage in, empty out — never a half-parsed verse.
assert.deepEqual(parseEsvPassage('', 'John', 3), [], 'empty passage yields no verses')
assert.deepEqual(parseEsvPassage('no markers here', 'John', 3), [], 'unmarked text yields no verses')
assert.deepEqual(parseEsvPassage('[7]   ', 'John', 3), [], 'marker with no text is dropped')

console.log('esv parser: all checks passed')
