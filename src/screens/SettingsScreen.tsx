import React, { useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert, Linking, Switch, Modal,
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
import { useStrongsInSearch } from '../context/StrongsInSearchContext'
import { useFocusMode } from '../context/FocusModeContext'
import { useSpaceSaver } from '../context/SpaceSaverContext'
import { useSearchOrder } from '../context/SearchOrderContext'
import type { SearchMode } from '../context/SearchOrderContext'

// ── Shared components ─────────────────────────────────────

function SwitchRow({ icon, label, description, value, onToggle, colors, s }: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  description: string
  value: boolean
  onToggle: () => void
  colors: ThemeColors
  s: ReturnType<typeof makeStyles>
}) {
  return (
    <View style={s.row}>
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={[s.themeDesc, { marginTop: 1 }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.bgPrimary}
      />
    </View>
  )
}

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

type ExpandedRow = 'lineSpacing' | 'translation' | 'navDepth' | 'startupMode' | 'fontFamily' | 'fontScope' | 'tabletLayout' | 'searchMode' | null
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
  const { focusMode, toggleFocusMode } = useFocusMode()
  const { spaceSaverOn, toggleSpaceSaver } = useSpaceSaver()
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

        <SwitchRow
          icon="eye-outline"
          label="Focus Mode"
          description="Bold the first half of each word to guide the eye"
          value={focusMode}
          onToggle={toggleFocusMode}
          colors={colors}
          s={s}
        />

        <View style={s.separator} />

        <SwitchRow
          icon="expand-outline"
          label="Space Saver"
          description="Hide navigation bars when scrolling down, reveal on scroll up"
          value={spaceSaverOn}
          onToggle={toggleSpaceSaver}
          colors={colors}
          s={s}
        />

        <View style={s.separator} />

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

// ── Search section ────────────────────────────────────────

const SEARCH_MODE_OPTIONS: PickerOption[] = [
  {
    key: 'default',
    label: 'Default',
    description: 'Fuzzy matching with typo correction and relevance ranking',
  },
  {
    key: 'exact_words',
    label: 'Exact Words',
    description: "Match whole words only — 'am' won't return 'firmament'",
  },
  {
    key: 'exact_phrase',
    label: 'Exact Phrase',
    description: "Match consecutive words in order — 'in the beginning' finds that exact phrase",
  },
]

function SearchSection() {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])
  const { strongsInSearch, toggleStrongsInSearch } = useStrongsInSearch()
  const { biblicalOrder, toggleBiblicalOrder, searchMode, setSearchMode } = useSearchOrder()
  const [expanded, setExpanded] = useState<'searchMode' | null>(null)

  const searchModeLabel = SEARCH_MODE_OPTIONS.find(o => o.key === searchMode)?.label ?? 'Default'

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Search</Text>
      <View style={s.card}>
        <SwitchRow
          icon="pricetag-outline"
          label="Strong's in Search"
          description="Tap H/G tags in KJV+ results to view definitions"
          value={strongsInSearch}
          onToggle={toggleStrongsInSearch}
          colors={colors}
          s={s}
        />

        <View style={s.separator} />

        <SwitchRow
          icon="list-outline"
          label="Biblical Book Order"
          description="Sort results Genesis → Revelation instead of by relevance"
          value={biblicalOrder}
          onToggle={toggleBiblicalOrder}
          colors={colors}
          s={s}
        />

        <View style={s.separator} />

        <PickerRow
          icon="search-outline"
          rowLabel="Search Mode"
          valueLabel={searchModeLabel}
          expanded={expanded === 'searchMode'}
          onToggle={() => setExpanded(prev => prev === 'searchMode' ? null : 'searchMode')}
          options={SEARCH_MODE_OPTIONS}
          selectedKey={searchMode}
          onSelect={key => { setSearchMode(key as SearchMode); setExpanded(null) }}
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
  const [creditsVisible, setCreditsVisible] = useState(false)

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

        <View style={s.separator} />

        <TouchableOpacity
          style={s.row}
          activeOpacity={0.6}
          onPress={() => Linking.openURL('mailto:sargonshlimon1234@gmail.com')}
        >
          <View style={s.iconWrap}>
            <Ionicons name="mail-outline" size={18} color={colors.accent} />
          </View>
          <Text style={s.rowLabel}>Email</Text>
          <View style={s.navRight}>
            <Text style={s.navValue}>sargonshlimon1234@gmail.com</Text>
          </View>
        </TouchableOpacity>

        <View style={s.separator} />

        <TouchableOpacity
          style={s.row}
          activeOpacity={0.6}
          onPress={() => Linking.openURL('https://github.com/Solendor-S')}
        >
          <View style={s.iconWrap}>
            <Ionicons name="logo-github" size={18} color={colors.accent} />
          </View>
          <Text style={s.rowLabel}>GitHub</Text>
          <View style={s.navRight}>
            <Text style={s.navValue}>Solendor-S</Text>
          </View>
        </TouchableOpacity>

        <View style={s.separator} />

        <TouchableOpacity
          style={s.row}
          activeOpacity={0.6}
          onPress={() => setCreditsVisible(true)}
        >
          <View style={s.iconWrap}>
            <Ionicons name="ribbon-outline" size={18} color={colors.accent} />
          </View>
          <Text style={s.rowLabel}>Credits</Text>
          <View style={s.navRight}>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      <CreditsModal visible={creditsVisible} onClose={() => setCreditsVisible(false)} />
    </View>
  )
}

// ── Credits modal ─────────────────────────────────────────

const CREDITS: { title: string; body: string; url?: string }[] = [
  {
    title: 'Hebrew Old Testament',
    body: 'TAHOT (Translators Amalgamated Hebrew Old Testament) and the Westminster Leningrad Codex (WLC), via the STEPBible Tyndale datasets (CC BY 4.0).',
    url: 'https://github.com/STEPBible/STEPBible-Data',
  },
  {
    title: 'Greek New Testament',
    body: 'SBL Greek New Testament (SBLGNT), Translators Amalgamated GNT (TAGNT), and the Textus Receptus (Scrivener 1894).',
  },
  {
    title: 'Greek Old Testament (LXX)',
    body: 'Septuagint text based on Rahlfs with CCAT morphology, and the Apostolic Bible (Poole), both tagged and provided by STEPBible (CC BY 4.0). Thanks to David Instone-Brewer for sharing the dataset.',
    url: 'https://stepbible.org',
  },
  {
    title: "Lexicons & Strong's",
    body: "Thayer's Greek Lexicon and the Brown-Driver-Briggs Hebrew Lexicon (public domain), with Strong's Concordance numbering.",
  },
]

function CreditsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.creditsOverlay}>
        <View style={s.creditsSheet}>
          <View style={s.creditsHeader}>
            <Text style={s.creditsTitle}>Credits & Attribution</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.creditsScroll}>
            {CREDITS.map((c, i) => (
              <React.Fragment key={c.title}>
                {i > 0 && <View style={s.separator} />}
                <TouchableOpacity
                  style={s.creditRow}
                  activeOpacity={c.url ? 0.6 : 1}
                  disabled={!c.url}
                  onPress={() => c.url && Linking.openURL(c.url)}
                >
                  <Text style={s.creditTitle}>{c.title}</Text>
                  <Text style={s.creditBody}>{c.body}</Text>
                  {!!c.url && <Text style={s.creditLink}>{c.url}</Text>}
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
        <SearchSection />
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

  // Credits modal
  creditsOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  creditsSheet: {
    backgroundColor: c.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, maxHeight: '75%',
  },
  creditsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  creditsTitle: { fontSize: 17, fontWeight: '700', color: c.textPrimary },
  creditsScroll: { paddingVertical: 8 },
  creditRow:   { paddingHorizontal: 20, paddingVertical: 14, gap: 4 },
  creditTitle: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  creditBody:  { fontSize: 13, lineHeight: 19, color: c.textMuted },
  creditLink:  { fontSize: 12, color: c.accent, marginTop: 2 },
})
