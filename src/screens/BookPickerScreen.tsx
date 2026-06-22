import React, { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  StyleSheet, TextInput, StatusBar, SectionList, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import { BOOKS, APOCRYPHA_BOOKS, APOCRYPHA_BOOK_NAMES, EARLY_TEXTS, EARLY_TEXT_NAMES } from '../data/books'
import { StackActions } from '@react-navigation/native'
import { pendingNav } from '../navigation/pendingNav'
import { useTheme } from '../context/ThemeContext'
import { useNavDepth } from '../context/NavDepthContext'
import { usePacks } from '../context/PackContext'
import type { ThemeColors } from '../theme/themes'
import type { BibleStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'BookPicker'>
  route: RouteProp<BibleStackParamList, 'BookPicker'>
}

type Tab = 'OT' | 'NT' | 'APOC' | 'EARLY'

const OT_BOOKS = BOOKS.filter(b => b.testament === 'OT')
const NT_BOOKS = BOOKS.filter(b => b.testament === 'NT')

const TABS: { key: Tab; label: string; count: number }[] = [
  { key: 'OT',    label: 'Old Testament', count: OT_BOOKS.length },
  { key: 'NT',    label: 'New Testament', count: NT_BOOKS.length },
  { key: 'APOC',  label: 'Apocrypha',     count: APOCRYPHA_BOOKS.length },
  { key: 'EARLY', label: 'Early Texts',   count: EARLY_TEXTS.length },
]

type BookEntry = typeof APOCRYPHA_BOOKS[number] | typeof EARLY_TEXTS[number]
type BookPair  = [BookEntry, BookEntry | null]

function buildSectionPairs<T extends { group?: string }>(
  arr: T[],
  defs: { title: string; subtitle: string }[]
): { title: string; subtitle: string; data: [T, T | null][] }[] {
  return defs.map(s => {
    const books = arr.filter(b => b.group === s.title)
    const pairs: [T, T | null][] = []
    for (let i = 0; i < books.length; i += 2)
      pairs.push([books[i], books[i + 1] ?? null])
    return { ...s, data: pairs }
  })
}

const APOC_SECTIONS = buildSectionPairs(APOCRYPHA_BOOKS, [
  { title: 'Deuterocanon',    subtitle: 'Catholic & Orthodox churches' },
  { title: 'Broader Canon',   subtitle: 'Some Orthodox traditions' },
  { title: 'Ethiopian Canon', subtitle: 'Ethiopian Orthodox church' },
])

const EARLY_SECTIONS = buildSectionPairs(EARLY_TEXTS, [
  { title: 'Early Church Writings', subtitle: 'Pre-canon Christian texts' },
  { title: 'Ignatius Letters',      subtitle: 'Letters of Ignatius of Antioch (c. 107 AD)' },
  { title: 'Apostolic Fathers',     subtitle: 'Sub-apostolic writings (c. 70–160 AD)' },
  { title: 'Apologists',            subtitle: 'Second-century defences of the faith (c. 155–197 AD)' },
  { title: 'Irenaeus',              subtitle: 'Against Heresies Books 1–5 (c. 180 AD)' },
  { title: 'Spurious',              subtitle: 'Disputed or pseudonymous authorship' },
])

if (__DEV__) {
  const _knownSections = new Set(EARLY_SECTIONS.map(sec => sec.title))
  for (const e of EARLY_TEXTS) {
    if (!_knownSections.has(e.group)) {
      console.warn(
        `[BookPickerScreen] EARLY_TEXTS entry "${e.name}" has group "${e.group}" ` +
        `with no matching section — it will not appear in the EARLY tab`
      )
    }
  }
}

function BookCard({
  entry, cardStyle, badge, onPress, s,
  packSlug, packInstalled, packDownloading, onDownload,
}: {
  entry: BookEntry | null
  cardStyle: object | object[]
  badge?: string
  onPress: (name: string) => void
  s: ReturnType<typeof makeStyles>
  packSlug?: string
  packInstalled?: boolean
  packDownloading?: boolean
  onDownload?: (slug: string) => void
}) {
  if (!entry) return <View style={[s.card, { opacity: 0 }]} />
  const needsPack = !!packSlug
  const downloaded = !needsPack || packInstalled
  return (
    <TouchableOpacity style={cardStyle} activeOpacity={0.7} onPress={() => onPress(entry.name)}>
      <View style={{ flex: 1 }}>
        <Text style={s.bookName} numberOfLines={2}>{entry.name}</Text>
        <Text style={s.chapterCount}>{entry.chapters} ch</Text>
        {'date' in entry && !!entry.date && <Text style={s.earlyDate}>{entry.date}</Text>}
        {!!badge && <Text style={s.mutedBadge}>{badge}</Text>}
      </View>
      {needsPack && !downloaded && !packDownloading && (
        <TouchableOpacity
          style={{ position: 'absolute', top: 4, right: 4 }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          onPress={e => { e.stopPropagation?.(); packSlug && onDownload?.(packSlug) }}
          activeOpacity={0.7}
        >
          <Ionicons name="cloud-download-outline" size={14} color="#aaa" />
        </TouchableOpacity>
      )}
      {needsPack && packDownloading && (
        <ActivityIndicator size={12} style={{ position: 'absolute', top: 4, right: 4 }} />
      )}
    </TouchableOpacity>
  )
}

export default function BookPickerScreen({ navigation, route }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const [query, setQuery] = useState('')
  const [tab, setTab]     = useState<Tab>(route.params?.initialTab ?? 'OT')
  const { navDepth } = useNavDepth()
  const { isInstalled, isDownloading, download, packForContent } = usePacks()

  const isSearching = query.trim().length > 0

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    const q = query.toLowerCase()
    const canonical = BOOKS.filter(b => b.name.toLowerCase().includes(q))
    const apocrypha = APOCRYPHA_BOOKS.filter(b => b.name.toLowerCase().includes(q))
    const early     = EARLY_TEXTS.filter(b => b.name.toLowerCase().includes(q))
    return [...canonical, ...apocrypha, ...early]
  }, [query])

  const isApocBook  = (name: string) => APOCRYPHA_BOOK_NAMES.has(name)

  const navigateToBook = (name: string) => {
    const apocrypha = isApocBook(name)
    const earlyText = EARLY_TEXT_NAMES.has(name)
    if (navDepth === 'book') {
      // Write selection to the pending-nav inbox, then pop back to Reader.
      // Reader's focus listener will consume this and call setParams() itself,
      // ensuring the reading-history logic fires correctly.
      pendingNav.current = { book: name, chapter: 1, apocrypha, earlyText }
      navigation.dispatch(StackActions.popToTop())
    } else {
      navigation.navigate('ChapterPicker', { book: name, apocrypha, earlyText })
    }
  }

  const tabBooks = tab === 'OT' ? OT_BOOKS : NT_BOOKS

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.title}>Select Book</Text>
      </View>

      <TextInput
        style={s.search}
        placeholder="Search books…"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {!isSearching && (
        <View style={s.tabBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabBarContent}
          >
            {TABS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[s.tab, tab === t.key && s.tabActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
                <Text style={[s.tabCount, tab === t.key && s.tabCountActive]}>{t.count} texts</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {isSearching && searchResults.length === 0 && (
        <View style={s.noResults}>
          <Text style={s.noResultsText}>No books found for "{query}"</Text>
        </View>
      )}

      {isSearching && (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.name}
          numColumns={3}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          renderItem={({ item }) => {
            const cardStyle = item.testament === 'APOC'  ? [s.card, s.cardApoc]
                            : item.testament === 'EARLY' ? [s.card, s.cardEarly]
                            : s.card
            const badge = item.testament === 'APOC'  ? 'Apocrypha'
                        : item.testament === 'EARLY' ? 'Early Text'
                        : undefined
            return <BookCard entry={item} cardStyle={cardStyle} badge={badge} onPress={navigateToBook} s={s} />
          }}
        />
      )}

      {!isSearching && (tab === 'OT' || tab === 'NT') && (
        <FlatList
          key={tab}
          data={tabBooks}
          keyExtractor={item => item.name}
          numColumns={3}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.7}
              onPress={() => navigateToBook(item.name)}
            >
              <Text style={s.bookName} numberOfLines={2}>{item.name}</Text>
              <Text style={s.chapterCount}>{item.chapters} ch</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {!isSearching && tab === 'EARLY' && (
        <SectionList
          sections={EARLY_SECTIONS}
          keyExtractor={([a]) => a.name}
          contentContainerStyle={s.grid}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={s.disclaimer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={s.disclaimerText}>
                Early Christian writings outside the biblical canon. Included for historical and devotional study.
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.sectionSubtitle}>{section.subtitle}</Text>
            </View>
          )}
          renderItem={({ item: [a, b], section }) => {
            const spurious = section.title === 'Spurious'
            const cardStyle = [s.card, spurious ? s.cardSpurious : s.cardEarly]
            const badge = spurious ? 'Spurious' : undefined
            const slugA = a ? packForContent('early_text', a.name)?.slug : undefined
            const slugB = b ? packForContent('early_text', b.name)?.slug : undefined
            return (
              <View style={s.row}>
                <BookCard entry={a} cardStyle={cardStyle} badge={badge} onPress={navigateToBook} s={s}
                  packSlug={slugA} packInstalled={!slugA || isInstalled(slugA)}
                  packDownloading={!!slugA && isDownloading(slugA)} onDownload={download} />
                <BookCard entry={b} cardStyle={cardStyle} badge={badge} onPress={navigateToBook} s={s}
                  packSlug={slugB} packInstalled={!slugB || isInstalled(slugB)}
                  packDownloading={!!slugB && isDownloading(slugB)} onDownload={download} />
              </View>
            )
          }}
        />
      )}

      {!isSearching && tab === 'APOC' && (
        <SectionList
          sections={APOC_SECTIONS}
          keyExtractor={([a]) => a.name}
          contentContainerStyle={s.grid}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={s.disclaimer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
              <Text style={s.disclaimerText}>
                These writings are not part of the Protestant canon. Shown for historical and devotional study only.
              </Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>{section.title}</Text>
              <Text style={s.sectionSubtitle}>{section.subtitle}</Text>
            </View>
          )}
          renderItem={({ item: [a, b] }) => {
            const slugA = a ? packForContent('apocrypha', a.name)?.slug : undefined
            const slugB = b ? packForContent('apocrypha', b.name)?.slug : undefined
            return (
              <View style={s.row}>
                <BookCard entry={a} cardStyle={s.card} onPress={navigateToBook} s={s}
                  packSlug={slugA} packInstalled={!slugA || isInstalled(slugA)}
                  packDownloading={!!slugA && isDownloading(slugA)} onDownload={download} />
                <BookCard entry={b} cardStyle={s.card} onPress={navigateToBook} s={s}
                  packSlug={slugB} packInstalled={!slugB || isInstalled(slugB)}
                  packDownloading={!!slugB && isDownloading(slugB)} onDownload={download} />
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, color: c.textMuted },
  title: { fontSize: 17, fontWeight: '700', color: c.textPrimary },

  search: {
    margin: 12,
    marginBottom: 0,
    backgroundColor: c.bgTertiary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: c.textPrimary,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },

  tabBar: {
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: c.bgTertiary,
    borderRadius: 10,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  tabBarContent: {
    flexDirection: 'row',
  },
  tab: {
    minWidth: 110,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 1,
  },
  tabActive: { backgroundColor: c.bgCard },
  tabLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted },
  tabLabelActive: { color: c.textPrimary },
  tabCount: { fontSize: 10, color: c.textMuted },
  tabCountActive: { color: c.textSecondary },

  noResults: { alignItems: 'center', marginTop: 40 },
  noResultsText: { fontSize: 14, color: c.textMuted },

  grid: { padding: 12, gap: 8, paddingBottom: 40 },
  row:  { flexDirection: 'row', gap: 8 },

  card: {
    flex: 1,
    backgroundColor: c.bgCard,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 3,
  },
  cardApoc: {
    borderColor: c.textMuted,
    opacity: 0.85,
  },
  cardEarly: {
    borderColor: c.accent,
    opacity: 0.9,
  },
  cardSpurious: {
    borderColor: c.textMuted,
    opacity: 0.75,
  },

  bookName: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  chapterCount: { fontSize: 10, color: c.textMuted },
  mutedBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  earlyDate: {
    fontSize: 10,
    color: c.textMuted,
    marginTop: 1,
  },

  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: c.bgSecondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: c.textMuted,
    lineHeight: 18,
  },

  sectionHeader: { marginTop: 12, marginBottom: 6 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: c.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  sectionSubtitle: { fontSize: 11, color: c.textMuted, marginTop: 1 },

})
