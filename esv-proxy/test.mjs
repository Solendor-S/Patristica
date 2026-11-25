// node esv-proxy/test.mjs — no network, no dependencies.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import worker, { Quota, CHAPTERS, LIMITS, IP_LIMITS } from './src/index.js'

// Book table matches the app's.
const books = readFileSync(new URL('../Patristica/src/data/books.ts', import.meta.url), 'utf8')
const canon = books.slice(books.indexOf('BOOKS: Book[]'), books.indexOf('export const BOOK_MAP'))
const app = Object.fromEntries([...canon.matchAll(/name: '([^']+)',\s*chapters: (\d+)/g)].map(m => [m[1], +m[2]]))
assert.deepEqual(CHAPTERS, app)

let clock = 1_800_000_000_000
Date.now = () => clock

const newQuota = () => {
  const data = new Map()
  const storage = {
    get: async k => structuredClone(data.get(k)),
    put: async (k, v) => { data.set(k, structuredClone(v)) },
  }
  return { quota: new Quota({ storage }), data }
}
const hit = async (q, ip) => (await q.fetch(new Request('https://quota/', { method: 'POST', body: ip }))).status

// Per-IP minute limit, and it resets.
{
  const { quota, data } = newQuota()
  for (let i = 0; i < IP_LIMITS.minute; i++) assert.equal(await hit(quota, '1.1.1.1'), 204)
  assert.equal(await hit(quota, '1.1.1.1'), 429)
  assert.equal(await hit(quota, '2.2.2.2'), 204, 'other users unaffected')
  clock += 60_000
  assert.equal(await hit(quota, '1.1.1.1'), 204)
  assert.ok(!JSON.stringify([...data]).includes('1.1.1.1'), 'IPs are never stored')
}

// Global limits hold over every rolling window, with far more demand than quota.
{
  const { quota } = newQuota()
  const granted = []
  for (let m = 0; m < 1500; m++) {
    for (let i = 0; i < 12; i++) {
      clock += 5_000
      for (let k = 0; k < 6; k++) if (await hit(quota, `ip${m}-${i}-${k}`) === 204) granted.push(clock)
    }
  }
  const worst = span => {
    let max = 0, lo = 0
    granted.forEach((t, hi) => { while (granted[lo] <= t - span) lo++; max = Math.max(max, hi - lo + 1) })
    return max
  }
  assert.ok(worst(60_000) <= LIMITS.minute, `minute ${worst(60_000)}`)
  assert.ok(worst(3_600_000) <= LIMITS.hour, `hour ${worst(3_600_000)}`)
  assert.ok(worst(86_400_000) <= LIMITS.day, `day ${worst(86_400_000)}`)
  assert.ok(worst(86_400_000) > LIMITS.day * 0.95, 'quota is actually usable')
}

// Worker.
const { quota } = newQuota()
const env = { ESV_API_KEY: 'secret', QUOTA: { idFromName: n => n, get: () => ({ fetch: (u, o) => quota.fetch(new Request(u, o)) }) } }
const call = (path, opts) => worker.fetch(new Request(`https://w.dev${path}`, opts), env)
let calls = []
let reply = () => new Response('{"passages":["[1] x"]}')
globalThis.fetch = async (url, opts) => { calls.push({ url, opts }); return reply() }

let res = await call('/chapter?book=Song%20of%20Solomon&chapter=3')
assert.equal(res.status, 200)
assert.equal(res.headers.get('cache-control'), 'no-store')
assert.ok(calls[0].url.includes('q=Song%20of%20Solomon%203&'))
assert.equal(calls[0].opts.headers.Authorization, 'Token secret')
assert.ok(!(await res.text()).includes('secret'))

calls = []
await call('/chapter?book=3%20John&chapter=1')
assert.ok(calls[0].url.includes('q=3%20John&'), 'one-chapter book by name')

calls = []
for (const bad of ['/chapter?book=John&chapter=22', '/chapter?book=John&chapter=1-21', '/chapter?book=John', '/chapter?book=constructor&chapter=1', '/chapter?book=Tobit&chapter=1']) {
  assert.equal((await call(bad)).status, 400, bad)
}
assert.equal((await call('/')).status, 404)
assert.equal((await call('/chapter?book=John&chapter=3', { method: 'POST' })).status, 404)
assert.equal(calls.length, 0, 'bad requests never reach Crossway')

reply = () => new Response('no', { status: 401 })
assert.equal((await call('/chapter?book=John&chapter=3')).status, 502)
reply = () => new Response('slow down', { status: 429 })
assert.equal((await call('/chapter?book=John&chapter=3')).status, 429)
reply = () => { throw new Error('down') }
assert.equal((await call('/chapter?book=John&chapter=3')).status, 502)

console.log('esv-proxy: all checks passed')
