/**
 * Serves NASB95, NASB20 and NKJV chapters from API.Bible (Starter plan, non-commercial),
 * so the app's key never ships in the APK. Terms this must keep honouring:
 *
 *   - the key stays here, as the API_BIBLE_KEY secret
 *   - cached text is refreshed at least every 30 days (TTL below is 29)
 *   - text is passed through unmodified, with the copyright line API.Bible sends
 *   - only chapters a reader actually opens are fetched: never prefill or bulk-copy
 *
 * GET /chapter?bible=NKJV&book=John&chapter=3  ->  { content, copyright } or { error }.
 *
 * ponytail: no rate limiter. Each valid chapter costs at most one upstream call per TTL,
 * so 3 Bibles x 1,189 chapters caps usage near 3,700/month, under Starter's 5,000.
 * Add a counter like esv-proxy's Quota if more Bibles join and that sum passes 5,000.
 */

export const BIBLES = {
  NASB95: 'b8ee27bcd1cae43a-01',
  NASB20: 'a761ca71e0b3ddcf-01',
  NKJV: '63097d2a0a2f7db3-01',
}

// App book name -> [API.Bible book id, chapters]. Anything not listed is refused.
export const BOOKS = {
  Genesis: ['GEN', 50], Exodus: ['EXO', 40], Leviticus: ['LEV', 27], Numbers: ['NUM', 36],
  Deuteronomy: ['DEU', 34], Joshua: ['JOS', 24], Judges: ['JDG', 21], Ruth: ['RUT', 4],
  '1 Samuel': ['1SA', 31], '2 Samuel': ['2SA', 24], '1 Kings': ['1KI', 22], '2 Kings': ['2KI', 25],
  '1 Chronicles': ['1CH', 29], '2 Chronicles': ['2CH', 36], Ezra: ['EZR', 10], Nehemiah: ['NEH', 13],
  Esther: ['EST', 10], Job: ['JOB', 42], Psalms: ['PSA', 150], Proverbs: ['PRO', 31],
  Ecclesiastes: ['ECC', 12], 'Song of Solomon': ['SNG', 8], Isaiah: ['ISA', 66], Jeremiah: ['JER', 52],
  Lamentations: ['LAM', 5], Ezekiel: ['EZK', 48], Daniel: ['DAN', 12], Hosea: ['HOS', 14],
  Joel: ['JOL', 3], Amos: ['AMO', 9], Obadiah: ['OBA', 1], Jonah: ['JON', 4], Micah: ['MIC', 7],
  Nahum: ['NAM', 3], Habakkuk: ['HAB', 3], Zephaniah: ['ZEP', 3], Haggai: ['HAG', 2],
  Zechariah: ['ZEC', 14], Malachi: ['MAL', 4], Matthew: ['MAT', 28], Mark: ['MRK', 16],
  Luke: ['LUK', 24], John: ['JHN', 21], Acts: ['ACT', 28], Romans: ['ROM', 16],
  '1 Corinthians': ['1CO', 16], '2 Corinthians': ['2CO', 13], Galatians: ['GAL', 6],
  Ephesians: ['EPH', 6], Philippians: ['PHP', 4], Colossians: ['COL', 4],
  '1 Thessalonians': ['1TH', 5], '2 Thessalonians': ['2TH', 3], '1 Timothy': ['1TI', 6],
  '2 Timothy': ['2TI', 4], Titus: ['TIT', 3], Philemon: ['PHM', 1], Hebrews: ['HEB', 13],
  James: ['JAS', 5], '1 Peter': ['1PE', 5], '2 Peter': ['2PE', 3], '1 John': ['1JN', 5],
  '2 John': ['2JN', 1], '3 John': ['3JN', 1], Jude: ['JUD', 1], Revelation: ['REV', 22],
}

export const TTL = 29 * 86_400

const PARAMS = 'content-type=text&include-notes=false&include-titles=false' +
  '&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false'

const json = (body, status = 200) => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method !== 'GET' || url.pathname !== '/chapter') return json({ error: 'not found' }, 404)

    const bible = url.searchParams.get('bible') ?? ''
    const book = url.searchParams.get('book') ?? ''
    const chapter = url.searchParams.get('chapter') ?? ''
    if (!Object.hasOwn(BIBLES, bible) || !Object.hasOwn(BOOKS, book) ||
        !/^[1-9]\d{0,2}$/.test(chapter) || +chapter > BOOKS[book][1]) {
      return json({ error: 'unknown chapter' }, 400)
    }

    const id = `${BOOKS[book][0]}.${chapter}`
    const key = `${bible}:${id}`
    const cached = await env.CACHE.get(key)
    if (cached) return json(cached)

    let res
    try {
      res = await fetch(`https://rest.api.bible/v1/bibles/${BIBLES[bible]}/chapters/${id}?${PARAMS}`,
        { headers: { 'api-key': env.API_BIBLE_KEY } })
    } catch {
      return json({ error: 'upstream' }, 502)
    }
    if (res.status === 429) return json({ error: 'quota' }, 429)
    if (!res.ok) return json({ error: 'upstream' }, 502)

    const { data } = await res.json()
    const body = JSON.stringify({ content: data?.content ?? '', copyright: data?.copyright ?? '' })
    if (data?.content) await env.CACHE.put(key, body, { expirationTtl: TTL })
    return json(body)
  },
}
