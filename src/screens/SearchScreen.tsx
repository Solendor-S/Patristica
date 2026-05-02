import React, { useState, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  Keyboard, StatusBar,
} from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { useNavigation } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { searchVerses } from '../db/queries'
import { Colors } from '../theme/colors'
import type { SearchResult, RootTabParamList } from '../types'

type NavProp = BottomTabNavigationProp<RootTabParamList, 'Search'>

function highlight(text: string, query: string) {
  if (!query.trim()) return [{ text, match: false }]
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map(p => ({ text: p, match: p.toLowerCase() === query.toLowerCase() }))
}

export default function SearchScreen() {
  const db = useSQLiteContext()
  const navigation = useNavigation<NavProp>()

  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const inputRef = useRef<TextInput>(null)

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    Keyboard.dismiss()
    setLoading(true)
    setSearched(true)
    const rows = await searchVerses(db, trimmed)
    setResults(rows)
    setLoading(false)
  }, [db])

  const navigateToVerse = (result: SearchResult) => {
    // Switch to Bible tab and navigate to the verse
    navigation.navigate('Bible' as any, {
      screen: 'Reader',
      params: { book: result.book, chapter: result.chapter, verse: result.verse },
    })
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

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
          style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]}
          onPress={() => doSearch(query)}
          activeOpacity={0.7}
          disabled={!query.trim()}
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
          keyExtractor={(_, i) => i.toString()}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const parts = highlight(item.text, query.trim())
            return (
              <TouchableOpacity
                style={styles.resultRow}
                activeOpacity={0.7}
                onPress={() => navigateToVerse(item)}
              >
                <Text style={styles.ref}>{item.book} {item.chapter}:{item.verse}</Text>
                <Text style={styles.verseText}>
                  {parts.map((p, i) =>
                    p.match
                      ? <Text key={i} style={styles.matchText}>{p.text}</Text>
                      : <Text key={i}>{p.text}</Text>
                  )}
                </Text>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            searched && !loading ? (
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
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },

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
