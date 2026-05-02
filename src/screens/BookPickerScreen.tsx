import React, { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, StatusBar,
} from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BOOKS } from '../data/books'
import { Colors } from '../theme/colors'
import type { BibleStackParamList } from '../types'

type Props = {
  navigation: NativeStackNavigationProp<BibleStackParamList, 'BookPicker'>
}

export default function BookPickerScreen({ navigation }: Props) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? BOOKS.filter(b => b.name.toLowerCase().includes(query.toLowerCase()))
    : BOOKS

  const otBooks = filtered.filter(b => b.testament === 'OT')
  const ntBooks = filtered.filter(b => b.testament === 'NT')

  const sections = [
    ...(otBooks.length > 0 ? [{ title: 'Old Testament', data: otBooks }] : []),
    ...(ntBooks.length > 0 ? [{ title: 'New Testament', data: ntBooks }] : []),
  ]

  const items: ({ type: 'header'; title: string } | { type: 'book'; name: string; chapters: number })[] = []
  for (const s of sections) {
    items.push({ type: 'header', title: s.title })
    for (const b of s.data) {
      items.push({ type: 'book', name: b.name, chapters: b.chapters })
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Book</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search books…"
        placeholderTextColor={Colors.textMuted}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      <FlatList
        data={items}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return <Text style={styles.sectionHeader}>{item.title}</Text>
          }
          return (
            <TouchableOpacity
              style={styles.bookRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Reader', { book: item.name, chapter: 1 })}
            >
              <Text style={styles.bookName}>{item.name}</Text>
              <Text style={styles.chapterCount}>{item.chapters} ch</Text>
            </TouchableOpacity>
          )
        }}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgSecondary,
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight ?? 0) + 10,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 18, color: Colors.textMuted },
  title: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  search: {
    margin: 12,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  bookName: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
  chapterCount: { fontSize: 13, color: Colors.textMuted },
})
