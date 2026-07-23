import { verseForDate, DAILY_VERSES } from './dailyVerses'

// ponytail: one runnable check on the rotation — stable per day, advances daily, cycles.
function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg) }

// Same date → same verse (stable all day)
const d = new Date(Date.UTC(2026, 0, 15))
assert(verseForDate(d) === verseForDate(new Date(Date.UTC(2026, 0, 15))), 'not stable within a day')

// Consecutive days → advance by one slot
const jan1 = verseForDate(new Date(Date.UTC(2026, 0, 1)))
const jan2 = verseForDate(new Date(Date.UTC(2026, 0, 2)))
assert(jan1 !== jan2, 'consecutive days did not advance')

// Cycles: day N and day N+corpus.length land on the same verse
const base = new Date(Date.UTC(2026, 0, 1))
const wrapped = new Date(Date.UTC(2026, 0, 1 + DAILY_VERSES.length))
assert(verseForDate(base) === verseForDate(wrapped), 'did not cycle over corpus length')

console.log('dailyVerses rotation: OK')
