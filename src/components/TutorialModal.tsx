import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'

interface Props {
  visible: boolean
  onComplete: () => void
  onDecline: () => void
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

interface Slide {
  icon: IoniconsName
  title: string
  body: string
}

const SLIDES: Slide[] = [
  {
    icon: 'library-outline',
    title: 'Reading',
    body: 'Tap the book name at the top to pick any book. Tap the chapter number to jump to any chapter.',
  },
  {
    icon: 'hand-left-outline',
    title: 'Verse Actions',
    body: 'Tap any verse to select it, then bookmark, highlight, share, or write a personal note.',
  },
  {
    icon: 'search',
    title: 'Search',
    body: 'Search the full Bible by keyword, or type a reference like "John 3:16" to jump straight there.',
  },
  {
    icon: 'school-outline',
    title: 'Study Tools',
    body: 'The Study tab shows Patristic commentary, cross-references, and Greek/Hebrew word studies for your selected verse.',
  },
  {
    icon: 'folder-open-outline',
    title: 'Library & History',
    body: 'Bookmarks, highlights, and notes are saved in the Library tab. History shows every chapter you have read.',
  },
]

export default function TutorialModal({ visible, onComplete, onDecline }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const [step, setStep] = useState(0) // 0 = welcome prompt, 1–5 = content slides

  useEffect(() => {
    if (visible) setStep(0)
  }, [visible])

  const isWelcome = step === 0
  const slideIndex = step - 1
  const isLast = step === SLIDES.length

  const handleNext = () => {
    if (isLast) onComplete()
    else setStep(s => s + 1)
  }

  const handleSkip = () => {
    setStep(0)
    onComplete()
  }

  const handleDecline = () => {
    setStep(0)
    onDecline()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleDecline}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {isWelcome ? (
            // ── Welcome prompt ────────────────────────────
            <>
              <View style={s.welcomeIconWrap}>
                <Ionicons name="book" size={52} color={colors.accent} />
              </View>
              <Text style={s.welcomeTitle}>Welcome to Patristica</Text>
              <Text style={s.welcomeBody}>
                Read Scripture alongside the Church Fathers. Would you like a quick tour?
              </Text>
              <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                <Text style={s.primaryBtnText}>Take the tour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.secondaryBtn} onPress={handleDecline} activeOpacity={0.7}>
                <Text style={s.secondaryBtnText}>Maybe later</Text>
              </TouchableOpacity>
            </>
          ) : (
            // ── Content slide ─────────────────────────────
            <>
              <View style={s.dots}>
                {SLIDES.map((_, i) => (
                  <View key={i} style={[s.dot, i === slideIndex && s.dotActive]} />
                ))}
              </View>

              <View style={s.slideIconWrap}>
                <Ionicons name={SLIDES[slideIndex].icon} size={56} color={colors.accent} />
              </View>
              <Text style={s.slideTitle}>{SLIDES[slideIndex].title}</Text>
              <Text style={s.slideBody}>{SLIDES[slideIndex].body}</Text>

              <View style={s.btnRow}>
                <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
                  <Text style={s.skipText}>Skip tour</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.8}>
                  <Text style={s.nextBtnText}>{isLast ? 'Get Started' : 'Next'}</Text>
                  {!isLast && <Ionicons name="arrow-forward" size={16} color={colors.bgPrimary} />}
                </TouchableOpacity>
              </View>
            </>
          )}

        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 44,
    alignItems: 'center',
    gap: 16,
  },

  // Welcome
  welcomeIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: c.accentDim,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 22, fontWeight: '700', color: c.textPrimary, textAlign: 'center',
  },
  welcomeBody: {
    fontSize: 15, color: c.textSecondary, textAlign: 'center', lineHeight: 22,
  },
  primaryBtn: {
    width: '100%', paddingVertical: 15, borderRadius: 14,
    backgroundColor: c.accent, alignItems: 'center', marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: c.bgPrimary },
  secondaryBtn: {
    width: '100%', paddingVertical: 13, borderRadius: 14,
    backgroundColor: c.bgTertiary, alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: c.textSecondary },

  // Content slides
  dots: { flexDirection: 'row', gap: 7, marginBottom: 4 },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: c.border,
  },
  dotActive: { backgroundColor: c.accent, width: 20 },

  slideIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: c.accentDim,
    alignItems: 'center', justifyContent: 'center',
  },
  slideTitle: {
    fontSize: 20, fontWeight: '700', color: c.textPrimary, textAlign: 'center',
  },
  slideBody: {
    fontSize: 15, color: c.textSecondary, textAlign: 'center', lineHeight: 23,
    paddingHorizontal: 4,
  },
  btnRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', width: '100%', marginTop: 8,
  },
  skipText: { fontSize: 14, color: c.textMuted, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.accent,
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12,
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: c.bgPrimary },
})
