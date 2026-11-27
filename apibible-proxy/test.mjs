// node apibible-proxy/test.mjs — no network, no dependencies.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import worker, { BOOKS, TTL } from './src/index.js'

// Book table matches the app's.
const books = readFileSync(new URL('../Patristica/src/data/books.ts', import.meta.url), 'utf8')
const canon = books.slice(books.indexOf('BOOKS: Book[]'), books.indexOf('export const BOOK_MAP'))
const app = Object.fromEntries([...canon.matchAll(/name: '([^']+)',\s*chapters: (\d+)/g)].map(m => [m[1], +m[2]]))
assert.deepEqual(Object.fromEntries(Object.entries(BOOKS).map(([b, [, n]]) => [b, n])), app)
assert.equal(new Set(Object.values(BOOKS).map(([id]) => id)).size, 66, 'book ids unique')
assert.ok(TTL < 30 * 86_400, 'refresh inside 30 days')

const kv = new Map()
const env = {
  API_BIBLE_KEY: 'secret',
  CACHE: { get: async k => kv.get(k) ?? null, put: async (k, v, o) => { kv.set(k, v); assert.equal(o.expirationTtl, TTL) } },
}
const call = (path, opts) => worker.fetch(new Request(`https://w.dev${path}`, opts), env)
let calls = []
let reply = () => new Response(JSON.stringify({ data: { content: '[1] x [2] y', copyright: 'NKJV ©' } }))
globalThis.fetch = async (url, opts) => { calls.push({ url, opts }); return reply() }

let res = await call('/chapter?bible=NKJV&book=Song%20of%20Solomon&chapter=3')
assert.equal(res.status, 200)
assert.deepEqual(await res.json(), { content: '[1] x [2] y', copyright: 'NKJV ©' })
assert.ok(calls[0].url.startsWith('https://rest.api.bible/v1/bibles/63097d2a0a2f7db3-01/chapters/SNG.3?'))
assert.equal(calls[0].opts.headers['api-key'], 'secret')

// Second read is served from cache: no upstream call.
calls = []
res = await call('/chapter?bible=NKJV&book=Song%20of%20Solomon&chapter=3')
assert.equal(res.status, 200)
assert.equal(calls.length, 0, 'cache hit')
assert.ok(!(await res.text()).includes('secret'))

for (const bad of ['/chapter?bible=NKJV&book=John&chapter=22', '/chapter?bible=ESV&book=John&chapter=1',
  '/chapter?bible=NKJV&book=John&chapter=1-21', '/chapter?bible=NKJV&book=Tobit&chapter=1',
  '/chapter?bible=constructor&book=John&chapter=1', '/chapter?bible=NKJV&book=constructor&chapter=1']) {
  assert.equal((await call(bad)).status, 400, bad)
}
assert.equal((await call('/')).status, 404)
assert.equal((await call('/chapter?bible=NKJV&book=John&chapter=3', { method: 'POST' })).status, 404)
assert.equal(calls.length, 0, 'bad requests never reach API.Bible')

// Failures aren't cached.
kv.clear()
reply = () => new Response('no', { status: 403 })
assert.equal((await call('/chapter?bible=NASB95&book=John&chapter=3')).status, 502)
reply = () => new Response('slow down', { status: 429 })
assert.equal((await call('/chapter?bible=NASB95&book=John&chapter=3')).status, 429)
reply = () => { throw new Error('down') }
assert.equal((await call('/chapter?bible=NASB95&book=John&chapter=3')).status, 502)
assert.equal(kv.size, 0)

console.log('apibible-proxy: all checks passed')
