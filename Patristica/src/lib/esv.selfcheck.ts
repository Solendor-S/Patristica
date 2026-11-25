/**
 * Self-check for the ESV passage parser. Nothing imports this, so it never ships.
 *
 *   node --experimental-strip-types src/lib/esv.selfcheck.ts
 *
 * A bad split silently mangles Scripture, and a bad route leaks a reader's own key
 * to our server, so both get a check.
 */
import assert from 'node:assert/strict'
import { parseEsvPassage, fetchEsvChapter, EsvError, clearEsvCache } from './esv.ts'

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

// ── Routing ──
const PROXY = 'https://proxy.test'
let calls: { url: string; auth?: string }[] = []
let status = 200
globalThis.fetch = (async (url: string, opts?: { headers?: Record<string, string> }) => {
  calls.push({ url, auth: opts?.headers?.Authorization })
  return new Response('{"passages":["[1] Text."]}', { status })
}) as typeof fetch
const failure = async (key: string, proxy: string): Promise<EsvError> => {
  clearEsvCache()
  try { await fetchEsvChapter('John', 3, key, proxy) } catch (e) { return e as EsvError }
  throw new Error('expected a failure')
}

// No key: through the server, with no credentials attached.
await fetchEsvChapter('1 John', 3, '', PROXY)
assert.equal(calls[0].url, `${PROXY}/chapter?book=1%20John&chapter=3`)
assert.equal(calls[0].auth, undefined)

// Own key: straight to Crossway; the server never sees it.
clearEsvCache(); calls = []
await fetchEsvChapter('John', 3, 'mine', PROXY)
assert.ok(calls[0].url.startsWith('https://api.esv.org/'))
assert.equal(calls[0].auth, 'Token mine')

// One-chapter books by name alone, or Crossway returns a single verse.
clearEsvCache(); calls = []
await fetchEsvChapter('Jude', 1, 'mine', PROXY)
assert.ok(calls[0].url.includes('?q=Jude&'))

// Server out of quota or down: fall back, never ask for a key.
for (status of [429, 502]) {
  const e = await failure('', PROXY)
  assert.ok(e.unavailable && !e.needsKey, `proxy ${status}`)
}
// Own key failing keeps its own messages.
status = 401
const rejected = await failure('mine', PROXY)
assert.ok(rejected.needsKey && !rejected.unavailable)
// Neither configured: setup panel.
assert.ok((await failure('', '')).needsKey)

console.log('esv: all checks passed')
