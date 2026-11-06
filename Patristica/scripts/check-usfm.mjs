// Self-check for stripUsfm's USFM marker handling. No test framework — run:
//   node scripts/check-usfm.mjs
// Compiles src/data/redLetter.ts (no imports, so it stands alone) and asserts
// the real verse shapes found in assets/db/bible.db strip/render correctly.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const out = mkdtempSync(join(tmpdir(), 'usfm-'))
execFileSync('npx', ['tsc', 'src/data/redLetter.ts', '--outDir', out, '--target', 'es2020', '--module', 'es2020', '--skipLibCheck'], { stdio: 'inherit', shell: true })
const { stripUsfm } = await import(pathToFileURL(join(out, 'redLetter.js')).href)

const cases = [
  // \nd nested in \add, opener orphaned inside its own brace group (1 Samuel 16:7)
  ['for {the} {\\+nd} {Lord\\+nd*} {seeth} not', 'for {the} {LORD} {seeth} not'],
  // same shape, name already capitalised (Exodus 33:9)
  ['and {the} {\\+nd} {LORD\\+nd*} talked', 'and {the} {LORD} talked'],
  // verse-initial, no preceding brace group (2 Chronicles 17:4)
  ['sought to the {\\+nd} {Lord\\+nd*} God', 'sought to the {LORD} God'],
  // \nd spanning a nested \+w span — inner markers must survive to be stripped (Matthew 22:44)
  ['The \\+nd \\+w LORD\\+w*\\+nd* \\+w said\\+w*', 'The LORD said'],
  // KJV+ shape — closer lost when Strongs were merged (1 Samuel 16:7, KJV+)
  ['for {the} {\\+nd} {Lord} H7200 not', 'for {the} {LORD} H7200 not'],
  // marker-only brace group with no \nd pair to honour (Exodus 15:13 shape)
  ['{thou} {\\+w} {hast led}', '{thou} {hast led}'],
  // ordinary cases must be untouched
  ['But the \\+w LORD\\+w* said unto Samuel', 'But the LORD said unto Samuel'],
  ['plain verse text', 'plain verse text'],
]

for (const [input, expected] of cases) {
  const got = stripUsfm(input)
  assert.equal(got, expected, `\n  in:  ${input}\n  got: ${got}\n  exp: ${expected}`)
  assert.ok(!got.includes('\\'), `residual USFM marker in: ${got}`)
}

rmSync(out, { recursive: true, force: true })
console.log(`ok — ${cases.length} cases`)
