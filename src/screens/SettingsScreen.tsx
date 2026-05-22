import React, { useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { useTheme } from '../context/ThemeContext'
import { THEMES } from '../theme/themes'
import type { ThemeColors, ThemeKey } from '../theme/themes'
import { useLineSpacing, LINE_SPACING_OPTIONS } from '../context/LineSpacingContext'
import type { LineSpacingKey } from '../context/LineSpacingContext'
import { useTranslation, TRANSLATIONS } from '../context/TranslationContext'
import type { Translation } from '../context/TranslationContext'
import { useFontSize, FONT_SIZE_DEFAULT } from '../context/FontSizeContext'
import { useNavDepth, NAV_DEPTH_OPTIONS } from '../context/NavDepthContext'
import type { NavDepthKey } from '../context/NavDepthContext'
import { useStartupMode, STARTUP_MODE_OPTIONS } from '../context/StartupModeContext'
import type { StartupModeKey } from '../context/StartupModeContext'
import { useReaderFont, FONT_FAMILY_OPTIONS, FONT_SCOPE_OPTIONS, FAMILY_MAP } from '../context/FontFamilyContext'
import type { FontFamilyKey, FontScopeKey } from '../context/FontFamilyContext'
import { useTabletLayout } from '../context/TabletLayoutContext'

// ── Appearance section ────────────────────────────────────

const THEME_OPTIONS: { key: ThemeKey; label: string; description: string }[] = [
  { key: 'dark',         label: 'Dark',         description: 'Easy on the eyes at night' },
  { key: 'light',        label: 'Light',        description: 'Clean and bright'          },
  { key: 'highContrast', label: 'High Contrast', description: 'Maximum legibility'       },
]

function AppearanceSection() {
  const { colors, themeKey, setTheme } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Appearance</Text>
      <View style={s.card}>
        {THEME_OPTIONS.map((opt, i) => {
          const selected = themeKey === opt.key
          return (
            <React.Fragment key={opt.key}>
              <TouchableOpacity
                style={[s.themeRow, selected && s.themeRowSelected]}
                activeOpacity={0.7}
                onPress={() => setTheme(opt.key)}
              >
                <View style={[s.swatch, { backgroundColor: THEMES[opt.key].bgPrimary }]}>
                  <View style={s.swatchInner} />
                </View>

                <View style={s.themeBody}>
                  <Text style={[s.themeLabel, selected && s.themeLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={s.themeDesc}>{opt.description}</Text>
                </View>

                {selected
                  ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  : <View style={s.emptyCheck} />
                }
              </TouchableOpacity>
              {i < THEME_OPTIONS.length - 1 && <View style={s.separator} />}
            </React.Fragment>
          )
        })}
      </View>
    </View>
  )
}

// ── Reading section ───────────────────────────────────────

type ExpandedRow = 'lineSpacing' | 'translation' | 'navDepth' | 'startupMode' | 'fontFamily' | 'fontScope' | 'tabletLayout' | null
type PickerOption = { key: string; label: string; description: string }

function PickerRow({
  icon, rowLabel, valueLabel, expanded, onToggle,
  options, selectedKey, onSelect, s, colors, getOptionFontFamily,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  rowLabel: string
  valueLabel: string
  expanded: boolean
  onToggle: () => void
  options: PickerOption[]
  selectedKey: string
  onSelect: (key: string) => void
  s: ReturnType<typeof makeStyles>
  colors: ThemeColors
  getOptionFontFamily?: (key: string) => string | undefined
}) {
  return (
    <>
      <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={onToggle}>
        <View style={s.iconWrap}>
          <Ionicons name={icon} size={18} color={colors.accent} />
        </View>
        <Text style={s.rowLabel}>{rowLabel}</Text>
        <View style={s.navRight}>
          <Text style={s.navValue}>{valueLabel}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-forward'}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={s.pickerContainer}>
          {options.map((opt, i) => {
            const selected = selectedKey === opt.key
            const optFont = getOptionFontFamily?.(opt.key)
            return (
              <React.Fragment key={opt.key}>
                {i > 0 && <View style={s.pickerSeparator} />}
                <TouchableOpacity
                  style={[s.pickerRow, selected && s.pickerRowSelected]}
                  activeOpacity={0.6}
                  onPress={() => onSelect(opt.key)}
                >
                  <View style={s.pickerBody}>
                    <Text style={[s.pickerLabel, selected && s.pickerLabelSelected, optFont ? { fontFamily: optFont } : undefined]}>
                      {opt.label}
                    </Text>
                    <Text style={[s.pickerDesc, optFont ? { fontFamily: optFont } : undefined]}>{opt.description}</Text>
                  </View>
                  {selected
                    ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                    : <View style={s.emptyCheck} />
                  }
                </TouchableOpacity>
              </React.Fragment>
            )
          })}
        </View>
      )}
    </>
  )
}

function ReadingSection() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const { spacingKey, setSpacing } = useLineSpacing()
  const { translation, setTranslation } = useTranslation()
  const { setFontSize } = useFontSize()
  const { navDepth, setNavDepth } = useNavDepth()
  const { startupMode, setStartupMode } = useStartupMode()
  const { familyKey, fontScope, setFontFamily, setFontScope } = useReaderFont()
  const { tabletLayout, setTabletLayout } = useTabletLayout()
  const [expanded, setExpanded] = useState<ExpandedRow>(null)

  const toggle = (row: ExpandedRow) =>
    setExpanded(prev => (prev === row ? null : row))

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Reading</Text>
      <View style={s.card}>

        <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => setFontSize(FONT_SIZE_DEFAULT)}>
          <View style={s.iconWrap}>
            <Ionicons name="text-outline" size={18} color={colors.accent} />
          </View>
          <Text style={s.rowLabel}>Reset Font Size</Text>
        </TouchableOpacity>

        <View style={s.separator} />

        <PickerRow
          icon="reorder-four-outline"
          rowLabel="Line Spacing"
          valueLabel={LINE_SPACING_OPTIONS.find(o => o.key === spacingKey)!.label}
          expanded={expanded === 'lineSpacing'}
          onToggle={() => toggle('lineSpacing')}
          options={LINE_SPACING_OPTIONS}
          selectedKey={spacingKey}
          onSelect={key => { setSpacing(key as LineSpacingKey); setExpanded(null) }}
          s={s}
          colors={colors}
        />

        <View style={s.separator} />

        <PickerRow
          icon="options-outline"
          rowLabel="Font"
          valueLabel={FONT_FAMILY_OPTIONS.find(o => o.key === familyKey)!.label}
          expanded={expanded === 'fontFamily'}
          onToggle={() => toggle('fontFamily')}
          options={FONT_FAMILY_OPTIONS}
          selectedKey={familyKey}
          onSelect={key => { setFontFamily(key as FontFamilyKey); setExpanded(null) }}
          getOptionFontFamily={key => FAMILY_MAP[key as FontFamilyKey]}
          s={s}
          colors={colors}
        />

        <View style={s.separator} />

        <PickerRow
          icon="albums-outline"
          rowLabel="Font applies to"
          valueLabel={FONT_SCOPE_OPTIONS.find(o => o.key === fontScope)!.label}
          expanded={expanded === 'fontScope'}
          onToggle={() => toggle('fontScope')}
          options={FONT_SCOPE_OPTIONS}
          selectedKey={fontScope}
          onSelect={key => { setFontScope(key as FontScopeKey); setExpanded(null) }}
          s={s}
          colors={colors}
        />

        <View style={s.separator} />

        <PickerRow
          icon="book-outline"
          rowLabel="Default Translation"
          valueLabel={translation}
          expanded={expanded === 'translation'}
          onToggle={() => toggle('translation')}
          options={TRANSLATIONS.map(t => ({ key: t.key, label: t.label, description: t.full }))}
          selectedKey={translation}
          onSelect={key => { setTranslation(key as Translation); setExpanded(null) }}
          s={s}
          colors={colors}
        />

        <View style={s.separator} />

        <PickerRow
          icon="layers-outline"
          rowLabel="Book Navigation"
          valueLabel={NAV_DEPTH_OPTIONS.find(o => o.key === navDepth)!.label}
          expanded={expanded === 'navDepth'}
          onToggle={() => toggle('navDepth')}
          options={NAV_DEPTH_OPTIONS}
          selectedKey={navDepth}
          onSelect={key => { setNavDepth(key as NavDepthKey); setExpanded(null) }}
          s={s}
          colors={colors}
        />

        <View style={s.separator} />

        <PickerRow
          icon="bookmark-outline"
          rowLabel="Startup position"
          valueLabel={STARTUP_MODE_OPTIONS.find(o => o.key === startupMode)!.label}
          expanded={expanded === 'startupMode'}
          onToggle={() => toggle('startupMode')}
          options={STARTUP_MODE_OPTIONS}
          selectedKey={startupMode}
          onSelect={key => { setStartupMode(key as StartupModeKey); setExpanded(null) }}
          s={s}
          colors={colors}
        />

        <View style={s.separator} />

        <PickerRow
          icon="tablet-landscape-outline"
          rowLabel="Tablet layout"
          valueLabel={tabletLayout ? 'On' : 'Off'}
          expanded={expanded === 'tabletLayout'}
          onToggle={() => toggle('tabletLayout')}
          options={[
            { key: 'false', label: 'Off', description: 'Standard single-column layout' },
            { key: 'true',  label: 'On',  description: 'Split-pane in landscape — reader left, study right' },
          ]}
          selectedKey={String(tabletLayout)}
          onSelect={key => { setTabletLayout(key === 'true'); setExpanded(null) }}
          s={s}
          colors={colors}
        />

      </View>
    </View>
  )
}

// ── Data section ─────────────────────────────────────────

function DataSection() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const { setTheme } = useTheme()
  const { setSpacing } = useLineSpacing()
  const { setTranslation } = useTranslation()
  const { setFontSize } = useFontSize()
  const { setFontFamily, setFontScope } = useReaderFont()

  const handleReset = () => {
    Alert.alert(
      'Reset All Settings',
      'This will restore all appearance and reading settings to their defaults.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setTheme('dark')
            setSpacing('normal')
            setTranslation('KJV')
            setFontSize(FONT_SIZE_DEFAULT)
            setFontFamily('system')
            setFontScope('verses')
          },
        },
      ],
    )
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Data</Text>
      <View style={s.card}>
        <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={handleReset}>
          <View style={[s.iconWrap, s.iconWrapDestructive]}>
            <Ionicons name="refresh-outline" size={18} color="#e57373" />
          </View>
          <Text style={[s.rowLabel, s.rowLabelDestructive]}>Reset All Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── About section ─────────────────────────────────────────

function AboutSection() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const version = Constants.expoConfig?.version ?? '—'

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>About</Text>
      <View style={s.card}>
        <View style={s.row}>
          <View style={s.iconWrap}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
          </View>
          <Text style={s.rowLabel}>Version</Text>
          <View style={s.navRight}>
            <Text style={s.navValue}>{version}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────

export default function SettingsScreen() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <AppearanceSection />
        <ReadingSection />
        <DataSection />
        <AboutSection />
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: c.bgPrimary },

  header: {
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: c.textPrimary },

  scroll: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 40 },

  section:      { marginBottom: 28 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: c.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 8, paddingHorizontal: 4,
  },

  card: {
    backgroundColor: c.bgCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },

  // Theme picker rows
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  themeRowSelected: {
    backgroundColor: c.accentDim,
  },
  swatch: {
    width: 40, height: 40, borderRadius: 10,
    marginRight: 14,
    borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchInner: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  themeBody:        { flex: 1 },
  themeLabel:       { fontSize: 15, fontWeight: '600', color: c.textPrimary },
  themeLabelSelected: { color: c.accent },
  themeDesc:        { fontSize: 12, color: c.textMuted, marginTop: 2 },
  emptyCheck:       { width: 22, height: 22 },

  // Generic rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: c.accentDim,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  iconWrapDestructive: { backgroundColor: 'rgba(229,115,115,0.12)' },
  rowLabel:            { flex: 1, fontSize: 15, color: c.textPrimary },
  rowLabelDestructive: { color: '#e57373' },
  navRight:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navValue:  { fontSize: 14, color: c.textMuted },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginLeft: 58,
  },

  // Inline picker (line spacing / translation)
  pickerContainer: {
    backgroundColor: c.bgTertiary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingRight: 14,
    paddingLeft: 58,
  },
  pickerRowSelected: { backgroundColor: c.accentDim },
  pickerBody:        { flex: 1 },
  pickerLabel:       { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  pickerLabelSelected: { color: c.accent },
  pickerDesc:        { fontSize: 12, color: c.textMuted, marginTop: 1 },
  pickerSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginLeft: 58,
  },
})
