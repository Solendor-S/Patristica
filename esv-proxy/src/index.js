/**
 * Forwards single-chapter ESV requests from Patristica to api.esv.org, so the app's
 * access key never ships in the APK. Crossway Permissions approved this setup by email
 * (2026-11-25). What they were told, and what this must keep doing:
 *
 *   - the key stays here, as the ESV_API_KEY secret
 *   - stays under 5,000/day, 1,000/hour, 60/minute, with a per-user limit
 *   - stores no ESV text: nothing is cached or logged
 *
 * GET /chapter?book=John&chapter=3  ->  Crossway's JSON, or { error } with 4xx/5xx.
 */

// Anything not listed is refused: this must not become an open relay for the key.
export const CHAPTERS = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34, Joshua: 24, Judges: 21,
  Ruth: 4, '1 Samuel': 31, '2 Samuel': 24, '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29,
  '2 Chronicles': 36, Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31,
  Ecclesiastes: 12, 'Song of Solomon': 8, Isaiah: 66, Jeremiah: 52, Lamentations: 5, Ezekiel: 48,
  Daniel: 12, Hosea: 14, Joel: 3, Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3,
  Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 4, Matthew: 28, Mark: 16, Luke: 24, John: 21,
  Acts: 28, Romans: 16, '1 Corinthians': 16, '2 Corinthians': 13, Galatians: 6, Ephesians: 6,
  Philippians: 4, Colossians: 4, '1 Thessalonians': 5, '2 Thessalonians': 3, '1 Timothy': 6,
  '2 Timothy': 4, Titus: 3, Philemon: 1, Hebrews: 13, James: 5, '1 Peter': 5, '2 Peter': 3,
  '1 John': 5, '2 John': 1, '3 John': 1, Jude: 1, Revelation: 22,
}

// Same options as src/lib/esv.ts in the app, which parses the result.
const PARAMS = [
  'include-passage-references=false', 'include-headings=false', 'include-footnotes=false',
  'include-footnote-body=false', 'include-short-copyright=false',
  'include-passage-horizontal-lines=false', 'include-heading-horizontal-lines=false',
  'indent-paragraphs=0', 'indent-poetry=false', 'indent-poetry-lines=0', 'indent-declares=0',
  'indent-psalm-doxology=0', 'include-verse-numbers=true', 'include-first-verse-numbers=true',
].join('&')

// Below Crossway's 60 / 1,000 / 5,000 for headroom.
export const LIMITS = { minute: 55, hour: 950, day: 4800 }
export const IP_LIMITS = { minute: 20, day: 300 }

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method !== 'GET' || url.pathname !== '/chapter') return json({ error: 'not found' }, 404)

    const book = url.searchParams.get('book') ?? ''
    const chapter = url.searchParams.get('chapter') ?? ''
    if (!Object.hasOwn(CHAPTERS, book) || !/^[1-9]\d{0,2}$/.test(chapter) || +chapter > CHAPTERS[book]) {
      return json({ error: 'unknown chapter' }, 400)
    }

    // One global object, so the count is exact across every Cloudflare location.
    const quota = env.QUOTA.get(env.QUOTA.idFromName('global'))
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
    const allowed = await quota.fetch('https://quota/', { method: 'POST', body: ip })
    if (allowed.status !== 204) return json({ error: await allowed.text() }, 429)

    // Crossway reads "Jude 1" as verse 1, so one-chapter books go by name alone.
    const query = CHAPTERS[book] === 1 ? book : `${book} ${chapter}`
    let res
    try {
      res = await fetch(
        `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(query)}&${PARAMS}`,
        { headers: { Authorization: `Token ${env.ESV_API_KEY}` } },
      )
    } catch {
      return json({ error: 'upstream' }, 502)
    }
    if (res.status === 429) return json({ error: 'quota' }, 429)
    // Our key failing is our problem; never pass a 401 on as if the reader's key were bad.
    if (!res.ok) return json({ error: 'upstream' }, 502)
    return new Response(res.body, {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  },
}

/**
 * Request counter. Global counts are stored in one-minute buckets, so the windows roll.
 * Each window includes the partly elapsed oldest bucket, which can only undercount what
 * is left, never overspend it. IPs live in memory only and are never written to storage.
 */
export class Quota {
  constructor(state) {
    this.storage = state.storage
    this.ips = new Map()
    this.ipDay = 0
  }

  async fetch(request) {
    const ip = await request.text()
    const now = Math.floor(Date.now() / 60_000)

    const day = Math.floor(now / 1440)
    if (day !== this.ipDay) { this.ips.clear(); this.ipDay = day }
    const seen = this.ips.get(ip) ?? { day: 0, minute: 0, at: now }
    if (seen.at !== now) { seen.at = now; seen.minute = 0 }
    if (seen.minute >= IP_LIMITS.minute || seen.day >= IP_LIMITS.day) return new Response('ip', { status: 429 })

    const buckets = (await this.storage.get('buckets')) ?? {}
    let minute = 0, hour = 0, total = 0
    for (const [key, n] of Object.entries(buckets)) {
      const age = now - Number(key)
      if (age > 1440) { delete buckets[key]; continue }
      total += n
      if (age <= 60) hour += n
      if (age <= 1) minute += n
    }
    if (minute >= LIMITS.minute || hour >= LIMITS.hour || total >= LIMITS.day) {
      return new Response('quota', { status: 429 })
    }

    seen.day++; seen.minute++
    this.ips.set(ip, seen)
    buckets[now] = (buckets[now] ?? 0) + 1
    await this.storage.put('buckets', buckets)
    return new Response(null, { status: 204 })
  }
}
