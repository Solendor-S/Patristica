/**
 * Self-check for the Eusebian canon lookup. Nothing imports this, so it never ships.
 *
 *   node --experimental-strip-types --no-warnings src/data/eusebianCanons.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { parallelsForVerse, formatRange, GOSPELS, SECTIONS } from './eusebianCanons.ts'

const refs = (book: string, ch: number, v: number) =>
  parallelsForVerse(book, ch, v).flatMap(p => p.parallels.map(x => `${x.gospel} ${formatRange(x)}`))

// The baptism: Canon I, all four Gospels.
const baptism = parallelsForVerse('Matthew', 3, 16)
assert.equal(baptism.length, 1)
assert.ok(baptism[0].canons.includes(1), `baptism canons ${baptism[0].canons}`)
assert.deepEqual(new Set(baptism[0].parallels.map(p => p.gospel)), new Set(['Mark', 'Luke', 'John']))

// Feeding of the five thousand is in all four.
const feeding = parallelsForVerse('Matthew', 14, 19)
assert.deepEqual(new Set(feeding.flatMap(f => f.parallels.map(p => p.gospel))), new Set(['Mark', 'Luke', 'John']))

// Cana (John 2:1) is unique to John: Canon X, no parallels.
const cana = parallelsForVerse('John', 2, 1)
assert.deepEqual(cana.map(c => c.canons), [[10]])
assert.equal(cana[0].parallels.length, 0)

// Mark's longer ending sits outside the tables.
const longer = parallelsForVerse('Mark', 16, 9)
assert.equal(longer[0].section, 234)
assert.deepEqual(longer[0].canons, [])

// Beatitude transposition: Matt 5:4 is §27, 5:5 is §26.
assert.equal(parallelsForVerse('Matthew', 5, 4)[0].section, 27)
assert.equal(parallelsForVerse('Matthew', 5, 5)[0].section, 26)

// Not a Gospel → nothing.
assert.deepEqual(parallelsForVerse('Romans', 1, 1), [])

// Formatting.
assert.equal(formatRange({ gospel: 'Mark', section: 4, canons: [1], startCh: 1, startV: 7, startPart: 'b', endCh: 1, endV: 8, endPart: '' }), '1:7b–8')
assert.equal(formatRange({ gospel: 'Luke', section: 10, canons: [1], startCh: 3, startV: 16, startPart: 'b', endCh: 3, endV: 16, endPart: 'e' }), '3:16b–e')

// Every parallel link is symmetric.
for (const g of GOSPELS) {
  SECTIONS[g].forEach(([sec, , , , , , , , par]) => {
    for (const id of par) {
      const other = GOSPELS[Math.floor(id / 1000) - 1]
      const back = SECTIONS[other][(id % 1000) - 1][8]
      assert.ok(back.includes((GOSPELS.indexOf(g) + 1) * 1000 + sec), `${g} §${sec} ↔ ${other} §${id % 1000}`)
    }
  })
}

console.log('eusebian ok:', refs('Matthew', 3, 16).join('; '))
