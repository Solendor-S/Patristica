import React, { useState, useCallback, useRef, useMemo } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  Keyboard, StatusBar, Modal,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { searchVerses } from '../db/queries'
import { useTranslation, TRANSLATIONS } from '../context/TranslationContext'
import { BOOKS } from '../data/books'
import { Colors } from '../theme/colors'
import type { SearchResult, RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Search'>

const OT_BOOKS = BOOKS.filter(b => b.testament === 'OT')
const NT_BOOKS = BOOKS.filter(b => b.testament === 'NT')

export default function SearchScreen() {
  const db = useSQLiteContext()
  const navigation = useNavigation<NavProp>()
  const { translation, setTranslation } = useTranslation()

  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<SearchResult[]>([])
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [bookPickerOpen, setBookPickerOpen] = useState(false)
  const [selectedBook, setSelectedBook]     = useState('')

  const inputRef = useRef<TextInput>(null)

  const queryTrimmed = query.trim()
  const highlightRegex = useMemo(() => {
    const words = queryTrimmed.split(/\s+/).filter(Boolean)
    if (words.length === 0) return null
    const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    return new RegExp(`(${escaped})`, 'gi')
  }, [queryTrimmed])

  const doSearch = useCallback(async (q: string, trans = translation, book = selectedBook) => {
    const trimmed = q.trim()
    if (!trimmed) return
    Keyboard.dismiss()
    setLoading(true)
    setSearched(true)
    const rows = await searchVerses(db, trimmed, trans, book)
    setResults(rows)
    setLoading(false)
  }, [db, translation, selectedBook])

  const navigateToVerse = (result: SearchResult) => {
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: result.book, chapter: result.chapter, verse: result.verse },
    })
  }

  const pickBook = (book: string) => {
    setSelectedBook(book)
    setBookPickerOpen(false)
    if (searched && queryTrimmed) doSearch(query, translation, book)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.versionBtn} onPress={() => setBookPickerOpen(true)} activeOpacity={0.7}>
            <Ionicons name="book-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.versionLabel} numberOfLines={1}>{selectedBook || 'All Books'}</Text>
            <Ionicons name="chevron-down" size={11} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.versionBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
            <Text style={styles.versionLabel}>{translation}</Text>
            <Ionicons name="chevron-down" size={11} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Translation picker modal */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={modal.sheet}>
            <Text style={modal.title}>Bible Translation</Text>
            {TRANSLATIONS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={modal.row}
                activeOpacity={0.7}
                onPress={() => {
                  setTranslation(t.key)
                  setPickerOpen(false)
                  if (searched && queryTrimmed) doSearch(query, t.key)
                }}
              >
                <View style={modal.info}>
                  <Text style={[modal.key, translation === t.key && modal.keyActive]}>{t.label}</Text>
                  <Text style={modal.full}>{t.full}</Text>
                </View>
                {translation === t.key && <Ionicons name="checkmark" size={18} color={Colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Book picker modal */}
      <Modal visible={bookPickerOpen} transparent animationType="slide" onRequestClose={() => setBookPickerOpen(false)}>
        <View style={modal.overlay}>
          <View style={[modal.sheet, { paddingBottom: 0 }]}>
            <Text style={modal.title}>Filter by Book</Text>
            <FlatList
              data={[{ name: '', testament: 'ALL' as any, chapters: 0 }, ...BOOKS]}
              keyExtractor={item => item.name || '__all__'}
              style={{ maxHeight: 460 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListHeaderComponent={null}
              renderItem={({ item }) => {
                if (!item.name) {
                  return (
                    <TouchableOpacity style={modal.bookRow} activeOpacity={0.7} onPress={() => pickBook('')}>
                      <Text style={[modal.bookName, !selectedBook && modal.bookNameActive]}>All Books</Text>
                      {!selectedBook && <Ionicons name="checkmark" size={16} color={Colors.accent} />}
                    </TouchableOpacity>
                  )
                }
                const isOTFirst = item.name === OT_BOOKS[0].name
                const isNTFirst = item.name === NT_BOOKS[0].name
                return (
                  <>
                    {(isOTFirst || isNTFirst) && (
                      <Text style={modal.bookSection}>{isOTFirst ? 'Old Testament' : 'New Testament'}</Text>
                    )}
                    <TouchableOpacity style={modal.bookRow} activeOpacity={0.7} onPress={() => pickBook(item.name)}>
                      <Text style={[modal.bookName, selectedBook === item.name && modal.bookNameActive]}>{item.name}</Text>
                      {selectedBook === item.name && <Ionicons name="checkmark" size={16} color={Colors.accent} />}
                    </TouchableOpacity>
                  </>
                )
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Search the Bible…"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => doSearch(query)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.searchBtn, !queryTrimmed && styles.searchBtnDisabled]}
          onPress={() => doSearch(query)}
          activeOpacity={0.7}
          disabled={!queryTrimmed}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Results count */}
      {searched && !loading && (
        <Text style={styles.resultCount}>
          {results.length === 0
            ? 'No results'
            : `${results.length}${results.length === 200 ? '+' : ''} result${results.length === 1 ? '' : 's'}`}
        </Text>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      )}

      {/* Results list */}
      {!loading && (
        <FlatList
          data={results}
          keyExtractor={item => `${item.book}-${item.chapter}-${item.verse}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const parts = highlightRegex
              ? item.text.split(highlightRegex).map((p, i) => ({ text: p, match: i % 2 === 1 }))
              : [{ text: item.text, match: false }]
            return (
              <TouchableOpacity
                style={styles.resultRow}
                activeOpacity={0.7}
                onPress={() => navigateToVerse(item)}
              >
                <Text style={styles.ref}>{item.book} {item.chapter}:{item.verse}</Text>
                <Text style={styles.verseText}>
                  {parts.map((p, i) =>
                    p.match ? <Text key={i} style={styles.matchText}>{p.text}</Text> : p.text
                  )}
                </Text>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            searched ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No verses found for "{query}"</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  headerBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  versionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.bgTertiary, borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border,
    maxWidth: 130,
  },
  versionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5, flexShrink: 1 },

  searchRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  searchBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: Colors.bgPrimary, fontWeight: '700', fontSize: 14 },

  resultCount: {
    fontSize: 12,
    color: Colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  list: { paddingBottom: 40 },
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  ref: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  verseText: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textSecondary,
  },
  matchText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    backgroundColor: Colors.accentDim,
  },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
})

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40, gap: 4,
  },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  info: { gap: 2 },
  key: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  keyActive: { color: Colors.accent },
  full: { fontSize: 12, color: Colors.textMuted },

  bookSection: {
    fontSize: 11, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6,
    paddingHorizontal: 4, paddingTop: 16, paddingBottom: 4,
  },
  bookRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  bookName: { fontSize: 15, color: Colors.textSecondary, fontWeight: '500' },
  bookNameActive: { color: Colors.accent, fontWeight: '700' },
})
