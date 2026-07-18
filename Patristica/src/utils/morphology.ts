// Decodes morphological codes from TAGNT (Greek) and TAHOT (Hebrew) into human-readable labels.

export interface ParsedMorph {
  partOfSpeech: string
  tags: string[]  // e.g. ['Present', 'Active', 'Indicative', '3rd Person', 'Singular']
}

// ── Greek (Robinson's / TAGNT style) ─────────────────────

const GK_POS: Record<string, string> = {
  N: 'Noun', V: 'Verb', A: 'Adjective', T: 'Article',
  P: 'Personal Pronoun', R: 'Relative Pronoun', C: 'Reciprocal Pronoun',
  K: 'Correlative Pronoun', I: 'Interrogative Pronoun', X: 'Indefinite Pronoun',
  Q: 'Correlative/Interrogative Pronoun', F: 'Reflexive Pronoun',
  S: 'Possessive Pronoun', D: 'Demonstrative Pronoun',
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
// Robinson indeclinable suffixes: PRoper, NUmeral, Letter, Other, ARamaic/Hebrew Indeclinable.
const GK_INDECL = new Set(['PRI', 'NUI', 'LI', 'OI', 'ARI', 'HEI'])

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
    // Indeclinable codes carry no case/number/gender (e.g. N-PRI proper name, A-NUI numeral).
    if (GK_INDECL.has(cng)) {
      if (cng === 'PRI') tags.push('Proper')
      return { partOfSpeech: posLabel, tags }
    }
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
const HB_GENDER: Record<string, string> = { m: 'Masculine', f: 'Feminine', c: 'Common', b: 'Common' }
const HB_NUMBER: Record<string, string> = { s: 'Singular', p: 'Plural', d: 'Dual' }

// Aramaic (Daniel 2:4b–7:28, Ezra 4:8–6:18; 7:12–26) uses the same POS/gender/number
// letters as Hebrew but a different set of verb stems and aspects.
const ARAM_STEM: Record<string, string> = {
  q: 'Peal', Q: 'Peil', u: 'Hithpeel', i: 'Ithpeel', p: 'Pael', P: 'Ithpaal',
  M: 'Hithpaal', a: 'Aphel', h: 'Haphel', H: 'Hophal', s: 'Saphel', e: 'Shaphel',
  t: 'Hishtaphel', v: 'Ishtaphel', w: 'Hithaphel',
}
const ARAM_FORM: Record<string, string> = {
  p: 'Perfect', q: 'Sequential Perfect', i: 'Imperfect', u: 'Imperfect',
  w: 'Sequential Imperfect', h: 'Cohortative', j: 'Jussive', v: 'Imperative',
  r: 'Active Participle', s: 'Passive Participle',
  a: 'Infinitive Absolute', c: 'Infinitive Construct',
}
const HB_STATE:  Record<string, string> = { a: 'Absolute', c: 'Construct', d: 'Determined' }
const HB_POS: Record<string, string> = {
  V: 'Verb', N: 'Noun', A: 'Adjective', P: 'Pronoun',
  R: 'Relative Pronoun', T: 'Article', C: 'Conjunction',
  S: 'Preposition/Particle', M: 'Numeral', I: 'Interjection',
}

// ── Dead Sea Scrolls (Abegg/Qumran feature:value tags) ──────────
// Format: "sp:verb vs:qal vt:wayy gn:m nu:s ps:3". gn/nu/ps/st letters match Hebrew.
const DSS_SP: Record<string, string> = {
  verb: 'Verb', subs: 'Noun', adjv: 'Adjective', ptcl: 'Particle',
  pron: 'Pronoun', numr: 'Numeral', suff: 'Suffix',
}
const DSS_VS: Record<string, string> = {
  qal: 'Qal', nifal: 'Niphal', piel: 'Piel', pual: 'Pual', hifil: 'Hiphil',
  hofal: 'Hophal', hophal: 'Hophal', hitpael: 'Hithpael', passive: 'Passive',
  peal: 'Peal', peil: 'Peil', pael: 'Pael', aphel: 'Aphel', haphel: 'Haphel',
  hithpeel: 'Hithpeel', ithpeel: 'Ithpeel', hithpaal: 'Hithpaal', ithpaal: 'Ithpaal',
  shaphel: 'Shaphel', hishtafel: 'Hishtaphel',
}
const DSS_VT: Record<string, string> = {
  perf: 'Perfect', impf: 'Imperfect', wayy: 'Sequential Imperfect', weqt: 'Sequential Perfect',
  impv: 'Imperative', infc: 'Infinitive Construct', infa: 'Infinitive Absolute',
  ptca: 'Active Participle', ptcp: 'Passive Participle', juss: 'Jussive', coho: 'Cohortative',
}
const cap = (s: string) => s ? s[0].toUpperCase() + s.slice(1) : s

function decodeDss(code: string): ParsedMorph {
  const f: Record<string, string> = {}
  for (const tok of code.split(/\s+/)) {
    const i = tok.indexOf(':')
    if (i > 0) f[tok.slice(0, i)] = tok.slice(i + 1)
  }
  const posLabel = DSS_SP[f.sp] ?? (f.sp ? cap(f.sp) : 'Unknown')
  const tags: string[] = []
  if (f.sp === 'verb') {
    if (f.vs) tags.push(DSS_VS[f.vs] ?? cap(f.vs))
    if (f.vt) tags.push(DSS_VT[f.vt] ?? cap(f.vt))
    if (HB_PERSON[f.ps]) tags.push(HB_PERSON[f.ps])
    if (HB_GENDER[f.gn]) tags.push(HB_GENDER[f.gn])
    if (HB_NUMBER[f.nu]) tags.push(HB_NUMBER[f.nu])
    if (HB_STATE[f.st])  tags.push(HB_STATE[f.st])
  } else {
    if (HB_PERSON[f.ps]) tags.push(HB_PERSON[f.ps])
    if (HB_GENDER[f.gn]) tags.push(HB_GENDER[f.gn])
    if (HB_NUMBER[f.nu]) tags.push(HB_NUMBER[f.nu])
    if (HB_STATE[f.st])  tags.push(HB_STATE[f.st])
  }
  return { partOfSpeech: posLabel, tags }
}

// Pick the main content segment from a slash-chained code (prefixes + root + suffixes),
// e.g. "C/R/Aampc" → "Aampc". Prefers verb > noun > adjective > pronoun over prep/particle/suffix.
const POS_PRIORITY = ['V', 'N', 'A', 'P', 'R', 'D', 'T', 'C', 'S']
function pickRoot(stem: string): string {
  const segs = stem.split('/').filter(Boolean)
  if (segs.length <= 1) return segs[0] ?? ''
  for (const p of POS_PRIORITY) {
    const hit = segs.find(s => s[0] === p)
    if (hit) return hit
  }
  return segs[0]
}

export function decodeHebrew(code: string): ParsedMorph | null {
  if (!code) return null
  if (code.includes(':')) return decodeDss(code)  // DSS Abegg feature:value format

  // TAHOT prefixes a language marker (H=Hebrew, A=Aramaic) before an uppercase POS letter.
  // WLC/other codes carry no marker and start with the POS letter directly, so only treat a
  // leading H/A as a marker when the next char is an uppercase POS letter (not a lowercase subtype).
  const marked = (code[0] === 'H' || code[0] === 'A') && /[A-Z]/.test(code[1] ?? '')
  const aramaic = marked && code[0] === 'A'
  const body = marked ? code.slice(1) : code
  const stem = pickRoot(body)
  if (!stem) return { partOfSpeech: 'Particle', tags: [] }

  const pos = stem[0]
  const posLabel = HB_POS[pos] ?? 'Unknown'
  const rest = stem.slice(1)
  const tags: string[] = []

  if (pos === 'V') {
    const STEMS = aramaic ? ARAM_STEM : HB_STEM
    const FORMS = aramaic ? ARAM_FORM : HB_VERB_FORM
    const stemCode = rest[0]
    const formCode = rest[1]
    if (stemCode && STEMS[stemCode]) tags.push(STEMS[stemCode])
    if (formCode && FORMS[formCode]) tags.push(FORMS[formCode])
    // Participles carry gender+number+state (no person); infinitives carry nothing;
    // finite forms carry person+gender+number.
    if (formCode === 'r' || formCode === 's') {
      if (HB_GENDER[rest[2]]) tags.push(HB_GENDER[rest[2]])
      if (HB_NUMBER[rest[3]]) tags.push(HB_NUMBER[rest[3]])
      if (HB_STATE[rest[4]])  tags.push(HB_STATE[rest[4]])
    } else if (formCode !== 'a' && formCode !== 'c') {
      if (HB_PERSON[rest[2]]) tags.push(HB_PERSON[rest[2]])
      if (HB_GENDER[rest[3]]) tags.push(HB_GENDER[rest[3]])
      if (HB_NUMBER[rest[4]]) tags.push(HB_NUMBER[rest[4]])
    }
  } else if (pos === 'N' || pos === 'A') {
    // Noun/Adjective: pos + subtype + gender + number + state (e.g. Ncmpa, Aampc).
    // The subtype letter (c=common, p=proper, g=gentilic…) sits before gender — skip it.
    const subtype = rest[0]
    if (pos === 'N' && subtype === 'p') tags.push('Proper')
    if (pos === 'N' && subtype === 'g') tags.push('Gentilic')
    if (HB_GENDER[rest[1]]) tags.push(HB_GENDER[rest[1]])
    if (HB_NUMBER[rest[2]]) tags.push(HB_NUMBER[rest[2]])
    if (HB_STATE[rest[3]])  tags.push(HB_STATE[rest[3]])
  } else {
    // Pronoun/particle fallback: pos + gender + number + state
    if (HB_GENDER[rest[0]]) tags.push(HB_GENDER[rest[0]])
    if (HB_NUMBER[rest[1]]) tags.push(HB_NUMBER[rest[1]])
    if (HB_STATE[rest[2]])  tags.push(HB_STATE[rest[2]])
  }

  return { partOfSpeech: posLabel, tags }
}

export function decodeMorphology(code: string, lang: 'greek' | 'hebrew'): ParsedMorph | null {
  if (!code) return null
  return lang === 'greek' ? decodeGreek(code) : decodeHebrew(code)
}

const SHARED_TAG_EXAMPLES: Record<string, string> = {
  '1st Person': 'I / we — the speaker. "I am the resurrection" (Jesus speaking).',
  '2nd Person': 'You — the one addressed. "You are Peter" (spoken to Simon).',
  '3rd Person': 'He / she / it / they — a third party. "He believed" (about Abraham).',
  'Singular':   'One person or thing. "The Word was God."',
  'Plural':     'More than one. "You (all) are the light of the world."',
  'Masculine':  'Grammatical class — e.g. λόγος (word) / זָכָר (male).',
  'Feminine':   'Grammatical class — e.g. ἀγάπη (love) / נְקֵבָה (female).',
  'Imperative': '"Repent and be baptised" — a direct command.',
}

export const GREEK_TAG_EXAMPLES: Record<string, string> = {
  ...SHARED_TAG_EXAMPLES,
  'Present':    '"God so loves the world" — the loving is continuous, not a one-time event.',
  'Imperfect':  '"He was teaching in the synagogue" — describes ongoing past action.',
  'Future':     '"You will see the Son of Man coming" — a definite future event.',
  'Aorist':     '"In the beginning God created" — a single completed act, not ongoing.',
  'Perfect':    '"It is finished" (τετέλεσται) — a past act with effects that still stand.',
  'Pluperfect': '"He had already healed him" — completed before another past moment.',
  'Active':          '"God loves" — God is the one performing the action.',
  'Middle':          '"He armed himself" — the subject acts for his own benefit.',
  'Passive':         '"He was baptised" — the subject receives the action from another.',
  'Middle/Passive':  'Form is ambiguous — context determines whether middle or passive.',
  'Middle Deponent': 'Looks passive/middle but means something active, e.g. "I come" (ἔρχομαι).',
  'Passive Deponent':'Passive form, active meaning — common in later Greek.',
  'Indicative':  '"He rose on the third day" — asserts a real, historical fact.',
  'Subjunctive': '"That you may believe" — expresses purpose or possibility.',
  'Optative':    '"May it never be!" (μὴ γένοιτο) — Paul\'s strong wish or prayer.',
  'Infinitive':  '"To love God" — the verb used as a noun or purpose clause.',
  'Participle':  '"Having risen, he appeared…" — verbal adjective describing circumstances.',
  'Nominative': '"God loved the world" — God (θεός) is nominative, the one doing the loving.',
  'Genitive':   '"The love of God" — "of God" (θεοῦ) shows whose love or origin.',
  'Dative':     '"Grace to you" — "to you" (ὑμῖν) is the recipient, the indirect object.',
  'Accusative': '"He sent his Son" — "his Son" (τὸν υἱόν) is the direct object.',
  'Vocative':   '"Our Father" — direct address. "Lord!" (κύριε) is vocative.',
  'Neuter':    'Grammatical class — e.g. πνεῦμα (spirit), τέκνον (child).',
  'Proper':    'A personal or place name — e.g. Ἰησοῦς (Jesus), Παῦλος (Paul).',
}

export const HEBREW_TAG_EXAMPLES: Record<string, string> = {
  ...SHARED_TAG_EXAMPLES,
  'Qal':       '"He heard" (שָׁמַע) — the plain active form of the verb.',
  'Niphal':    '"He was called" — passive or reflexive, e.g. "let it be called seas".',
  'Piel':      '"He blessed them" — intensive/causative, stronger than Qal.',
  'Pual':      'Passive of Piel — "they were scattered."',
  'Hiphil':    '"He made them cross" — causative active, "to cause someone to do".',
  'Hophal':    '"He was brought" — causative passive, "to be caused to do".',
  'Hithpael':  '"He sanctified himself" — reflexive or reciprocal intensive.',
  'Perfect':              '"He spoke" (qatal) — completed action, typically past.',
  'Imperfect':            '"He will speak" (yiqtol) — incomplete or future action.',
  'Active Participle':    '"The one keeping" — ongoing action used as a noun or adjective.',
  'Passive Participle':   '"The written word" — a completed state, used adjectivally.',
  'Infinitive Construct': '"To love the Lord" — verbal noun, often with a preposition.',
  'Infinitive Absolute':  '"He surely died" — paired with main verb to intensify meaning.',
  'Absolute':   '"A king" (מֶלֶךְ) — the noun stands alone.',
  'Construct':  '"King of Israel" — the noun is bound to the following word.',
  'Determined': '"The king" (הַמֶּלֶךְ) — equivalent to the English definite article.',
  'Common': 'Applies to both masculine and feminine, e.g. "the fathers and mothers".',
  'Dual':   '"Two tablets", "hands", "eyes" — always a pair of the noun.',
  'Gentilic': '"the Hittite", "an Egyptian" — a noun naming someone by people or place.',
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
  'Determined': 'The noun carries the definite article (or Aramaic emphatic state).',
  // Aramaic verb stems (Daniel & Ezra)
  'Peal':      'The basic Aramaic verb stem — simple active action (like Hebrew Qal).',
  'Peil':      'Passive of the Peal stem.',
  'Pael':      'Intensive active Aramaic stem (like Hebrew Piel).',
  'Ithpaal':   'Reflexive/passive of the Pael stem.',
  'Hithpaal':  'Reflexive or intensive-passive Aramaic stem.',
  'Hithpeel':  'Reflexive or passive of the Peal stem.',
  'Ithpeel':   'Reflexive or passive of the Peal stem.',
  'Aphel':     'Causative active Aramaic stem (like Hebrew Hiphil).',
  'Haphel':    'Causative active Aramaic stem — "to cause to do".',
  'Hophal':    'Causative passive Aramaic stem — "to be caused to do".',
  'Shaphel':   'Causative Aramaic stem formed with a š-prefix.',
  'Saphel':    'Causative Aramaic stem formed with an s-prefix.',
  'Hishtaphel':'Reflexive of the causative Shaphel stem.',
  'Ishtaphel': 'Reflexive of the causative Shaphel stem.',
  'Hithaphel': 'Reflexive of the causative Aphel stem.',
  // Aramaic / extended verb aspects
  'Sequential Perfect':   'Perfect linked to a preceding verb (waw-conjunctive).',
  'Sequential Imperfect': 'Imperfect linked to a preceding verb (waw-consecutive).',
  'Cohortative':          'Expresses the speaker\'s wish or resolve — "let me/us…".',
  'Jussive':              'Expresses a third-person command or wish — "let him…".',
  // Hebrew gender/number
  'Common': 'Common gender — applies to both masculine and feminine.',
  'Dual':   'Refers to exactly two of something.',
  'Gentilic': 'A noun derived from a people or place name (e.g. Hittite, Egyptian).',
}

// ── Compact parsing code (BibleHub style, e.g. "V-Qal-Perf-3ms") ──
// Segment tokens get their own hyphen slot; person/gender/number/case/state
// collapse into one trailing cluster like "3ms".
const MORPH_SHORT: Record<string, string> = {
  // POS
  Verb: 'V', Noun: 'N', Adjective: 'Adj', Article: 'Art',
  'Personal Pronoun': 'Pron', 'Relative Pronoun': 'Rel', 'Demonstrative Pronoun': 'Dem',
  Pronoun: 'Pron', Preposition: 'Prep', Conjunction: 'Conj', Adverb: 'Adv',
  Particle: 'Prt', Interjection: 'Interj', Numeral: 'Num',
  // Greek tense
  Present: 'Pres', Imperfect: 'Impf', Future: 'Fut', Aorist: 'Aor', Perfect: 'Perf', Pluperfect: 'Plup',
  // Greek voice
  Active: 'Act', Middle: 'Mid', Passive: 'Pass', 'Middle/Passive': 'M/P',
  'Middle Deponent': 'MidD', 'Passive Deponent': 'PasD',
  // Greek mood
  Indicative: 'Ind', Subjunctive: 'Sub', Optative: 'Opt', Imperative: 'Impv',
  Infinitive: 'Inf', Participle: 'Ptc',
  // Hebrew verb forms (stems Qal/Niphal/… stay as-is)
  'Infinitive Construct': 'InfC', 'Infinitive Absolute': 'InfA',
  'Active Participle': 'ActPtc', 'Passive Participle': 'PasPtc',
  'Sequential Perfect': 'SeqPerf', 'Sequential Imperfect': 'SeqImpf',
  Cohortative: 'Coho', Jussive: 'Juss',
}
// Tags that collapse into the trailing cluster, mapped to their short letter ('' = omit).
const MORPH_CLUSTER: Record<string, string> = {
  '1st Person': '1', '2nd Person': '2', '3rd Person': '3',
  Masculine: 'm', Feminine: 'f', Neuter: 'n', Common: 'c',
  Singular: 's', Plural: 'p', Dual: 'd',
  Nominative: 'N', Genitive: 'G', Dative: 'D', Accusative: 'A', Vocative: 'V',
  Construct: '', Determined: '', Absolute: '',
  Proper: '', Gentilic: '',
}

// Turns a raw morph code into a short parsing label, e.g. "HVqp3ms" → "V-Qal-Perf-3ms".
export function compactMorph(code: string, lang: 'greek' | 'hebrew'): string {
  const parsed = decodeMorphology(code, lang)
  if (!parsed) return ''
  const pos = MORPH_SHORT[parsed.partOfSpeech] ?? parsed.partOfSpeech
  const segs: string[] = []
  let cluster = ''
  for (const tag of parsed.tags) {
    if (tag in MORPH_CLUSTER) cluster += MORPH_CLUSTER[tag]
    else segs.push(MORPH_SHORT[tag] ?? tag)
  }
  const parts = [pos, ...segs]
  if (cluster) parts.push(cluster)
  return parts.join('-')
}
