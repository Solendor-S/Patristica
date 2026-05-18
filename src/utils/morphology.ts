// Decodes morphological codes from TAGNT (Greek) and TAHOT (Hebrew) into human-readable labels.

export interface ParsedMorph {
  partOfSpeech: string
  tags: string[]  // e.g. ['Present', 'Active', 'Indicative', '3rd Person', 'Singular']
}

// ── Greek (Robinson's / TAGNT style) ─────────────────────

const GK_POS: Record<string, string> = {
  N: 'Noun', V: 'Verb', A: 'Adjective', D: 'Article',
  P: 'Personal Pronoun', R: 'Relative Pronoun', C: 'Reciprocal Pronoun',
  K: 'Correlative Pronoun', I: 'Interrogative Pronoun', X: 'Indefinite Pronoun',
  Q: 'Correlative/Interrogative Pronoun', F: 'Reflexive Pronoun',
  S: 'Possessive Pronoun', T: 'Demonstrative Pronoun',
  PREP: 'Preposition', CONJ: 'Conjunction', COND: 'Conditional Particle',
  ADV: 'Adverb', PRT: 'Particle', INJ: 'Interjection',
  HEB: 'Hebrew Transliteration', ARAM: 'Aramaic Transliteration',
}
const GK_CASE:   Record<string, string> = { N: 'Nominative', G: 'Genitive', D: 'Dative', A: 'Accusative', V: 'Vocative' }
const GK_NUMBER: Record<string, string> = { S: 'Singular', P: 'Plural' }
const GK_GENDER: Record<string, string> = { M: 'Masculine', F: 'Feminine', N: 'Neuter' }
const GK_TENSE:  Record<string, string> = { P: 'Present', I: 'Imperfect', F: 'Future', A: 'Aorist', X: 'Perfect', Y: 'Pluperfect' }
const GK_VOICE:  Record<string, string> = {
  A: 'Active', M: 'Middle', P: 'Passive', E: 'Middle/Passive',
  D: 'Middle Deponent', O: 'Passive Deponent', N: 'Middle/Passive Deponent', Q: 'Impersonal',
}
const GK_MOOD: Record<string, string> = {
  I: 'Indicative', S: 'Subjunctive', O: 'Optative', D: 'Imperative',
  N: 'Infinitive', P: 'Participle', R: 'Imperative Participle',
}
const GK_PERSON: Record<string, string> = { '1': '1st Person', '2': '2nd Person', '3': '3rd Person' }

export function decodeGreek(code: string): ParsedMorph | null {
  if (!code) return null
  const parts = code.split('-')
  const pos = parts[0]
  const posLabel = GK_POS[pos]
  if (!posLabel) return { partOfSpeech: code, tags: [] }

  // Indeclinable / uninflected words
  if (['PREP', 'CONJ', 'COND', 'ADV', 'PRT', 'INJ', 'HEB', 'ARAM'].includes(pos)) {
    return { partOfSpeech: posLabel, tags: [] }
  }

  const tags: string[] = []

  if (pos === 'V') {
    // V-TVM[-PN] or V-TVM-CNG (participle)
    const tvm = parts[1] ?? ''
    if (tvm.length >= 1 && GK_TENSE[tvm[0]]) tags.push(GK_TENSE[tvm[0]])
    if (tvm.length >= 2 && GK_VOICE[tvm[1]]) tags.push(GK_VOICE[tvm[1]])
    if (tvm.length >= 3 && GK_MOOD[tvm[2]]) tags.push(GK_MOOD[tvm[2]])

    const mood = tvm[2]
    if (mood === 'P' && parts[2]) {
      // Participle: next segment is case+number+gender
      const cng = parts[2]
      if (cng.length >= 1 && GK_CASE[cng[0]])   tags.push(GK_CASE[cng[0]])
      if (cng.length >= 2 && GK_NUMBER[cng[1]])  tags.push(GK_NUMBER[cng[1]])
      if (cng.length >= 3 && GK_GENDER[cng[2]])  tags.push(GK_GENDER[cng[2]])
    } else if (parts[2] && parts[2] !== 'P') {
      // Finite verb: next segment is person+number
      const pn = parts[2]
      if (GK_PERSON[pn[0]]) tags.push(GK_PERSON[pn[0]])
      if (GK_NUMBER[pn[1]]) tags.push(GK_NUMBER[pn[1]])
    }
  } else {
    // Noun, adjective, pronoun, article: POS-CNG[-P]
    const cng = parts[1] ?? ''
    if (cng.length >= 1 && GK_CASE[cng[0]])   tags.push(GK_CASE[cng[0]])
    if (cng.length >= 2 && GK_NUMBER[cng[1]])  tags.push(GK_NUMBER[cng[1]])
    if (cng.length >= 3 && GK_GENDER[cng[2]])  tags.push(GK_GENDER[cng[2]])
    if (parts[parts.length - 1] === 'P' && parts.length > 2) tags.push('Proper')
  }

  return { partOfSpeech: posLabel, tags }
}

// ── Hebrew (STEPBible TAHOT style) ───────────────────────
// Format examples: HVqp3ms  HNcmsa  HR/Ncfsa  HT  HSp/Vqr3ms

const HB_STEM: Record<string, string> = {
  q: 'Qal', N: 'Niphal', D: 'Piel', u: 'Pual',
  H: 'Hiphil', h: 'Hophal', t: 'Hithpael', A: 'Hithpaal',
  i: 'Nithpael', j: 'Poel', k: 'Hithpoel',
}
const HB_VERB_FORM: Record<string, string> = {
  p: 'Perfect', q: 'Imperfect', v: 'Imperative',
  c: 'Infinitive Construct', a: 'Infinitive Absolute',
  r: 'Active Participle', s: 'Passive Participle',
}
const HB_PERSON: Record<string, string> = { '1': '1st Person', '2': '2nd Person', '3': '3rd Person' }
const HB_GENDER: Record<string, string> = { m: 'Masculine', f: 'Feminine', c: 'Common' }
const HB_NUMBER: Record<string, string> = { s: 'Singular', p: 'Plural', d: 'Dual' }
const HB_STATE:  Record<string, string> = { a: 'Absolute', c: 'Construct', d: 'Determined' }
const HB_POS: Record<string, string> = {
  V: 'Verb', N: 'Noun', A: 'Adjective', P: 'Pronoun',
  R: 'Relative Pronoun', T: 'Article', C: 'Conjunction',
  S: 'Preposition/Particle', M: 'Numeral', I: 'Interjection',
}

export function decodeHebrew(code: string): ParsedMorph | null {
  if (!code) return null

  // Strip leading H (Hebrew marker) and any prefix before /
  let stem = code.startsWith('H') ? code.slice(1) : code
  const slashIdx = stem.indexOf('/')
  if (slashIdx !== -1) stem = stem.slice(slashIdx + 1)  // take the root word, ignore prefix

  if (!stem) return { partOfSpeech: 'Particle', tags: [] }

  const pos = stem[0]
  const posLabel = HB_POS[pos] ?? 'Unknown'
  const rest = stem.slice(1)
  const tags: string[] = []

  if (pos === 'V') {
    // V + stem + form + person + gender + number
    const stemCode = rest[0]
    const formCode = rest[1]
    const personCode = rest[2]
    const genderCode = rest[3]
    const numberCode = rest[4]
    if (stemCode && HB_STEM[stemCode])       tags.push(HB_STEM[stemCode])
    if (formCode && HB_VERB_FORM[formCode])  tags.push(HB_VERB_FORM[formCode])
    if (personCode && HB_PERSON[personCode]) tags.push(HB_PERSON[personCode])
    if (genderCode && HB_GENDER[genderCode]) tags.push(HB_GENDER[genderCode])
    if (numberCode && HB_NUMBER[numberCode]) tags.push(HB_NUMBER[numberCode])
  } else {
    // Noun/Adj/Pronoun: pos + gender + number + state
    const genderCode = rest[0]
    const numberCode = rest[1]
    const stateCode  = rest[2]
    if (genderCode && HB_GENDER[genderCode]) tags.push(HB_GENDER[genderCode])
    if (numberCode && HB_NUMBER[numberCode]) tags.push(HB_NUMBER[numberCode])
    if (stateCode  && HB_STATE[stateCode])   tags.push(HB_STATE[stateCode])
  }

  return { partOfSpeech: posLabel, tags }
}

export function decodeMorphology(code: string, lang: 'greek' | 'hebrew'): ParsedMorph | null {
  if (!code) return null
  return lang === 'greek' ? decodeGreek(code) : decodeHebrew(code)
}

export const TAG_DEFINITIONS: Record<string, string> = {
  // Greek tense
  'Present':    'Action occurring now, typically ongoing or repeated.',
  'Imperfect':  'Past action that was ongoing, repeated, or left incomplete.',
  'Future':     'Action that will occur in the future.',
  'Aorist':     'A simple past action viewed as a single whole, without regard to duration.',
  'Perfect':    'A past action whose results persist into the present.',
  'Pluperfect': 'A past action whose results were complete before another past event.',
  // Voice
  'Active':          'The subject performs the action.',
  'Middle':          'The subject acts on or for itself.',
  'Passive':         'The subject receives the action.',
  'Middle/Passive':  'Either middle or passive — indistinct in this form.',
  'Middle Deponent': 'Middle in form but active in meaning.',
  'Passive Deponent':'Passive in form but active in meaning.',
  // Mood
  'Indicative':  'States a fact or reality.',
  'Subjunctive': 'Expresses possibility, probability, or contingency.',
  'Optative':    'Expresses a wish or remote possibility.',
  'Imperative':  'A direct command or strong request.',
  'Infinitive':  'The verbal noun — the base form of the verb.',
  'Participle':  'A verbal adjective — combines properties of both verb and adjective.',
  // Person
  '1st Person': 'The speaker — I (singular) or we (plural).',
  '2nd Person': 'The one addressed — you.',
  '3rd Person': 'A third party — he, she, it, or they.',
  // Number
  'Singular': 'Refers to one person or thing.',
  'Plural':   'Refers to more than one person or thing.',
  // Case
  'Nominative': 'The subject of the verb.',
  'Genitive':   'Shows possession or relationship — translated "of".',
  'Dative':     'The indirect object — translated "to" or "for".',
  'Accusative': 'The direct object of the verb.',
  'Vocative':   'Direct address — "O Lord", "O God".',
  // Gender
  'Masculine': 'Masculine grammatical gender.',
  'Feminine':  'Feminine grammatical gender.',
  'Neuter':    'Neuter grammatical gender.',
  'Proper':    'A proper name.',
  // Hebrew stems
  'Qal':       'The basic Hebrew verb stem — simple active action.',
  'Niphal':    'Passive or reflexive of the Qal stem.',
  'Piel':      'Intensive active stem — often causative or factitive.',
  'Pual':      'Intensive passive stem.',
  'Hiphil':    'Causative active stem — "to cause to do".',
  'Hophal':    'Causative passive stem — "to be caused to do".',
  'Hithpael':  'Reflexive or reciprocal intensive stem.',
  // Hebrew verbal forms
  'Perfect':              'Completed action (qatal) — typically past.',
  'Imperfect':            'Incomplete action (yiqtol) — typically future or continuous.',
  'Active Participle':    'Ongoing action used as an adjective or noun.',
  'Passive Participle':   'A completed state used as an adjective or noun.',
  'Infinitive Construct': 'Verbal noun used with prepositions and complements.',
  'Infinitive Absolute':  'Emphatic verbal noun that intensifies the main verb.',
  // Hebrew noun state
  'Absolute':   'The noun stands alone, not in a possessive chain.',
  'Construct':  'The noun is linked to the following noun in a genitive chain.',
  'Determined': 'The noun carries the definite article.',
  // Hebrew gender/number
  'Common': 'Common gender — applies to both masculine and feminine.',
  'Dual':   'Refers to exactly two of something.',
}
