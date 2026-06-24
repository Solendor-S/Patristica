import React, { useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { BookPreface } from '../data/bookPrefaces'
import { EARLY_TEXT_PREFACES } from '../data/earlyTextPrefaces'

// ── Section accent colours ────────────────────────────────────────────────────
const PURPLE = '#9B7BBF'

// ── Against Heresies reference parser ────────────────────────────────────────
// Matches "Against Heresies N.C" or "Against Heresies N.C.V" anywhere in text

const AH_REF_RE = /Against Heresies (\d)\.(\d+)(?:\.(\d+))?/g

interface RefTarget { book: string; chapter: number; verse: number }
interface TextSegment { text: string; ref?: RefTarget }

function parseAHRefs(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0
  const re = new RegExp(AH_REF_RE.source, 'g')
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) segments.push({ text: text.slice(lastIndex, m.index) })
    segments.push({
      text: m[0],
      ref: {
        book:    `Against Heresies Book ${m[1]}`,
        chapter: parseInt(m[2], 10),
        verse:   m[3] ? parseInt(m[3], 10) : 1,
      },
    })
    lastIndex = m.index + m[0].length
  }

  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex) })
  return segments.length > 0 ? segments : [{ text }]
}

// ── LinkedText — renders plain text with tappable AH refs ─────────────────────

type NavFn = (book: string, chapter: number, verse: number, earlyText: boolean) => void

function LinkedText({
  text, style, linkColor, onNavigate,
}: {
  text: string
  style: object | object[]
  linkColor: string
  onNavigate: NavFn
}) {
  const segments = useMemo(() => parseAHRefs(text), [text])
  const hasLinks = segments.some(s => !!s.ref)

  if (!hasLinks) return <Text style={style}>{text}</Text>

  return (
    <Text style={style}>
      {segments.map((seg, i) =>
        seg.ref ? (
          <Text
            key={i}
            style={{ color: linkColor, textDecorationLine: 'underline' }}
            onPress={() => onNavigate(seg.ref!.book, seg.ref!.chapter, seg.ref!.verse, true)}
            suppressHighlighting
          >
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        )
      )}
    </Text>
  )
}

// ── SectionLabel ──────────────────────────────────────────────────────────────

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <View style={labelRow}>
      <View style={[labelBar, { backgroundColor: color }]} />
      <Text style={[labelText, { color }]}>{label}</Text>
      <View style={[labelLine, { backgroundColor: color }]} />
    </View>
  )
}

const labelRow:  object = { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }
const labelBar:  object = { width: 3, height: 14, borderRadius: 2, marginRight: 8 }
const labelText: object = { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }
const labelLine: object = { flex: 1, height: StyleSheet.hairlineWidth, marginLeft: 8, opacity: 0.4 }

// ── Canonical book preface ────────────────────────────────────────────────────

interface CanonicalProps {
  book: string
  preface: BookPreface
  fontSize: number
  onNavigate: NavFn
}

export function CanonicalPrefaceView({ book: _book, preface, fontSize, onNavigate }: CanonicalProps) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors, fontSize), [colors, fontSize])

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary */}
      <Text style={s.summary}>{preface.summary}</Text>

      {/* Author */}
      <View style={s.section}>
        <SectionLabel label="Author" color={colors.info} />
        <LinkedText text={preface.author} style={s.body} linkColor={colors.info} onNavigate={onNavigate} />
      </View>

      {/* Date */}
      <View style={s.section}>
        <SectionLabel label="Date of Composition" color={colors.accent} />
        <Text style={s.body}>{preface.dating}</Text>
      </View>

      {/* Key Themes */}
      <View style={s.section}>
        <SectionLabel label="Key Themes" color={colors.success} />
        {preface.themes.map((t, i) => (
          <View key={i} style={s.bulletRow}>
            <Text style={[s.bullet, { color: colors.success }]}>•</Text>
            <Text style={s.bulletText}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Evidence (optional) */}
      {preface.evidence && preface.evidence.length > 0 && (
        <View style={s.section}>
          <SectionLabel label="Evidence & Notes" color={PURPLE} />
          {preface.evidence.map((e, i) => (
            <View key={i} style={s.bulletRow}>
              <Text style={[s.bullet, { color: PURPLE }]}>•</Text>
              <LinkedText text={e} style={s.bulletText} linkColor={PURPLE} onNavigate={onNavigate} />
            </View>
          ))}
        </View>
      )}

      {/* Sources */}
      <View style={s.sourcesRow}>
        <Text style={s.sourcesLabel}>Sources</Text>
        <LinkedText
          text={preface.sources.join('  ·  ')}
          style={s.sourcesText}
          linkColor={colors.textAccent}
          onNavigate={onNavigate}
        />
      </View>
    </ScrollView>
  )
}

// ── Early-text preface ────────────────────────────────────────────────────────

interface EarlyTextProps {
  book: string
  fontSize: number
  onNavigate: NavFn
}

export function EarlyTextPrefaceView({ book, fontSize, onNavigate }: EarlyTextProps) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors, fontSize), [colors, fontSize])

  const raw = EARLY_TEXT_PREFACES[book] ?? ''
  const paragraphs = raw.split('\n\n').filter(p => p.trim().length > 0)

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      {paragraphs.map((para, i) => (
        <LinkedText
          key={i}
          text={para}
          style={i === 0 ? s.summary : s.earlyPara}
          linkColor={colors.info}
          onNavigate={onNavigate}
        />
      ))}
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function makeStyles(c: ThemeColors, fontSize: number) {
  const body  = fontSize
  const intro = fontSize + 1

  return StyleSheet.create({
    scroll:    { flex: 1, backgroundColor: c.bgPrimary },
    container: { padding: 20, paddingBottom: 60 },

    summary: {
      fontSize: intro,
      lineHeight: intro * 1.75,
      color: c.textPrimary,
      marginBottom: 24,
      fontStyle: 'italic',
    },

    section: {
      marginBottom: 20,
      backgroundColor: c.bgCard,
      borderRadius: 10,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },

    body: {
      fontSize: body,
      lineHeight: body * 1.7,
      color: c.textSecondary,
    },

    bulletRow: {
      flexDirection: 'row',
      marginTop: 4,
    },
    bullet: {
      fontSize: body,
      lineHeight: body * 1.7,
      marginRight: 8,
      width: 12,
    },
    bulletText: {
      flex: 1,
      fontSize: body,
      lineHeight: body * 1.7,
      color: c.textSecondary,
    },

    sourcesRow: {
      marginTop: 4,
      padding: 14,
      backgroundColor: c.bgSecondary,
      borderRadius: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    sourcesLabel: {
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: c.textMuted,
      marginBottom: 6,
    },
    sourcesText: {
      fontSize: body - 1,
      lineHeight: (body - 1) * 1.6,
      color: c.textMuted,
    },

    earlyPara: {
      fontSize: body,
      lineHeight: body * 1.75,
      color: c.textSecondary,
      marginTop: 16,
    },
  })
}
