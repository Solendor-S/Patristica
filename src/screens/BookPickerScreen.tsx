import React, { useState, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, StatusBar, SectionList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BOOKS, APOCRYPHA_BOOKS, APOCRYPHA_BOOK_NAMES } from '../data/books'
import { useTheme } from '../context/ThemeContext'
import { useNavDepth } from '../context/NavDepthContext'
import type { ThemeColors } from '../theme/themes'
import type { BibleStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'BookPicker'>
}

type Tab = 'OT' | 'NT' | 'APOC'

const OT_BOOKS = BOOKS.filter(b => b.testament === 'OT')
const NT_BOOKS = BOOKS.filter(b => b.testament === 'NT')

const TABS: { key: Tab; label: string; count: number }[] = [
  { key: 'OT',   label: 'Old Testament', count: OT_BOOKS.length },
  { key: 'NT',   label: 'New Testament', count: NT_BOOKS.length },
  { key: 'APOC', label: 'Apocrypha',     count: APOCRYPHA_BOOKS.length },
]

type BookEntry = typeof APOCRYPHA_BOOKS[number]
type BookPair  = [BookEntry, BookEntry | null]

const APOC_SECTIONS = [
  { title: 'Deuterocanon',    subtitle: 'Catholic & Orthodox churches' },
  { title: 'Broader Canon',   subtitle: 'Some Orthodox traditions' },
  { title: 'Ethiopian Canon', subtitle: 'Ethiopian Orthodox church' },
].map(s => {
  const books = APOCRYPHA_BOOKS.filter(b => b.group === s.title)
  const pairs: BookPair[] = []
  for (let i = 0; i < books.length; i += 2)
    pairs.push([books[i], books[i + 1] ?? null])
  return { ...s, data: pairs }
})

export default function BookPickerScreen({ navigation }: Props) {
  const { colors } = useTheme()
  const s = useMemo(() => makeStyles(colors), [colors])

  const [query, setQuery] = useState('')
  const [tab, setTab]     = useState<Tab>('OT')
  const { navDepth } = useNavDepth()

  const isSearching = query.trim().length > 0

  const searchResults = useMemo(() => {
    if (!isSearching) return []
    const q = query.toLowerCase()
    const canonical = BOOKS.filter(b => b.name.toLowerCase().includes(q))
    const apocrypha = APOCRYPHA_BOOKS.filter(b => b.name.toLowerCase().includes(q))
    return [...canonical, ...apocrypha]
  }, [query])

  const isApocBook = (name: string) => APOCRYPHA_BOOK_NAMES.has(name)

  const navigateToBook = (name: string) => {
    const apocrypha = isApocBook(name)
    if (navDepth === 'book') {
      navigation.navigate('Reader', { book: name, chapter: 1, apocrypha })
    } else {
      navigation.navigate('ChapterPicker', { book: name, apocrypha })
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
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, tab === t.key && s.tabActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
              <Text style={[s.tabCount, tab === t.key && s.tabCountActive]}>{t.count} books</Text>
            </TouchableOpacity>
          ))}
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.card, item.testament === 'APOC' && s.cardApoc]}
              activeOpacity={0.7}
              onPress={() => navigateToBook(item.name)}
            >
              <Text style={s.bookName} numberOfLines={2}>{item.name}</Text>
              <Text style={s.chapterCount}>{item.chapters} ch</Text>
              {item.testament === 'APOC' && (
                <Text style={s.apocBadge}>Apocrypha</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {!isSearching && tab !== 'APOC' && (
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
          renderItem={({ item: [a, b] }) => (
            <View style={s.row}>
              <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => navigateToBook(a.name)}>
                <Text style={s.bookName} numberOfLines={2}>{a.name}</Text>
                <Text style={s.chapterCount}>{a.chapters} ch</Text>
              </TouchableOpacity>
              {b ? (
                <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => navigateToBook(b.name)}>
                  <Text style={s.bookName} numberOfLines={2}>{b.name}</Text>
                  <Text style={s.chapterCount}>{b.chapters} ch</Text>
                </TouchableOpacity>
              ) : (
                <View style={[s.card, { opacity: 0 }]} />
              )}
            </View>
          )}
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
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 10,
    backgroundColor: c.bgTertiary,
    borderRadius: 10,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: 8, gap: 1,
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

  bookName: { fontSize: 13, fontWeight: '600', color: c.textPrimary },
  chapterCount: { fontSize: 10, color: c.textMuted },
  apocBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 2,
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
