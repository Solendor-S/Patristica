import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { useSelectedVerse } from '../context/SelectedVerseContext'
import { useTheme } from '../context/ThemeContext'
import { AQUINAS_PHILOSOPHY } from '../data/aquinasPhilosophy'
import type { PhilosophySection } from '../data/aquinasPhilosophy'
import { parseVerseRefs } from './DoctrinePanel'
import { ScripturePreviewModal } from './ScripturePreviewModal'
import type { ThemeColors } from '../theme/themes'
import type { RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Study'>
type Ref = { book: string; chapter: number; verse: number }

/** Metaphysics/Philosophy mode: numbered section list → section reader with tappable scripture refs. */
export default function AquinasPhilosophyView() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const db = useSQLiteContext()
  const navigation = useNavigation<NavProp>()
  const { setSelected } = useSelectedVerse()
  const [section, setSection] = useState<PhilosophySection | null>(null)
  const [preview, setPreview] = useState<Ref | null>(null)

  const onNavigate = useCallback((book: string, chapter: number, verse: number) => {
    setPreview(null)
    setSelected({ book, chapter, verse })
    navigation.navigate('Bible' as any, {
      screen: 'Reader', params: { book, chapter, verse, earlyText: false, apocrypha: false },
    })
  }, [navigation, setSelected])

  const linked = (text: string, style: object) => (
    <Text style={style}>
      {parseVerseRefs(text).map((seg, i) =>
        seg.type === 'text' ? seg.content : (
          <Text key={i} style={styles.ref}
            onPress={() => setPreview({ book: seg.book, chapter: seg.chapter, verse: seg.verse })}>
            {seg.raw}
          </Text>
        ))}
    </Text>
  )

  if (!section) {
    return (
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.intro}>
          A primer on Thomistic metaphysics — the grammar behind the Church’s language about God,
          creation and the soul. Read in order; each section builds on the last.
        </Text>
        {AQUINAS_PHILOSOPHY.map((s, i) => (
          <TouchableOpacity key={s.id} style={styles.row} onPress={() => setSection(s)} activeOpacity={0.7}>
            <Text style={styles.rowNum}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.title}</Text>
              <Text style={styles.rowSub}>{s.summary}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    )
  }

  const idx = AQUINAS_PHILOSOPHY.indexOf(section)
  const next = AQUINAS_PHILOSOPHY[idx + 1]
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.crumb}>
        <TouchableOpacity onPress={() => setSection(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.crumbText} numberOfLines={1}>{idx + 1}. {section.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.title}>{section.title}</Text>
        {section.paragraphs.map((p, i) => <View key={i}>{linked(p, styles.para)}</View>)}
        <View style={styles.scriptureBox}>
          <Text style={styles.scriptureLabel}>Where Scripture shows it</Text>
          {section.scripture.map((s, i) => <View key={i}>{linked(s, styles.scriptureItem)}</View>)}
        </View>
        {next && (
          <TouchableOpacity style={styles.nextBtn} onPress={() => setSection(next)} activeOpacity={0.7}>
            <Text style={styles.nextText}>Next: {next.title}</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.accent} />
          </TouchableOpacity>
        )}
      </ScrollView>
      {!!preview && (
        <ScripturePreviewModal
          db={db} book={preview.book} chapter={preview.chapter} verse={preview.verse}
          translation="KJV" colors={colors}
          onClose={() => setPreview(null)} onNavigate={onNavigate}
        />
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  list: { padding: 12, paddingBottom: 40, gap: 10 },
  intro: { fontSize: 13, lineHeight: 20, color: c.textMuted, fontStyle: 'italic', paddingHorizontal: 2, marginBottom: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  rowNum: { fontSize: 13, fontWeight: '700', color: c.accent, minWidth: 24 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: c.textAccent },
  rowSub: { fontSize: 12, color: c.textMuted, marginTop: 2, lineHeight: 17 },
  crumb: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  crumbText: { flex: 1, fontSize: 13, fontWeight: '600', color: c.textSecondary },
  title: { fontSize: 20, fontWeight: '700', color: c.textAccent, marginBottom: 4 },
  para: { fontSize: 15, lineHeight: 24, color: c.textPrimary },
  ref: { color: c.accent, fontWeight: '600' },
  scriptureBox: {
    marginTop: 6, backgroundColor: c.bgTertiary, borderRadius: 10, padding: 12, gap: 6,
  },
  scriptureLabel: {
    fontSize: 10, fontWeight: '700', color: c.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  scriptureItem: { fontSize: 13, lineHeight: 19, color: c.textSecondary },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
    marginTop: 8, paddingVertical: 8,
  },
  nextText: { fontSize: 13, fontWeight: '600', color: c.accent },
})
