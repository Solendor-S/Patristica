import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Pressable, ScrollView,
} from 'react-native'
import type { SQLiteDatabase } from 'expo-sqlite'
import { stripUsfm } from '../data/redLetter'
import type { ThemeColors } from '../theme/themes'
import { shortBookName } from '../data/books'

export type VerseRow = { verse: number; text: string }

interface Props {
  db: SQLiteDatabase
  book: string
  chapter: number
  verse: number
  translation: string
  preloadedText?: string
  chapterVerses?: VerseRow[]
  colors: ThemeColors
  onClose: () => void
  onNavigate: (book: string, chapter: number, verse: number) => void
}

export function ScripturePreviewModal({
  db, book, chapter, verse, translation,
  preloadedText, chapterVerses,
  colors, onClose, onNavigate,
}: Props) {
  const [verseText, setVerseText] = useState<string | null>(preloadedText ?? null)
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const targetY = useRef<number>(0)
  const s = useMemo(() => makeStyles(colors), [colors])

  // Load single verse text (skipped if preloadedText provided)
  useEffect(() => {
    if (preloadedText) { setVerseText(preloadedText); return }
    setVerseText(null)
    const run = async () => {
      try {
        const row = await db.getFirstAsync<{ text: string }>(
          'SELECT text FROM bible_verses WHERE book=? AND chapter=? AND verse=? LIMIT 1',
          [book, chapter, verse]
        )
        setVerseText(row?.text ?? '')
      } catch { setVerseText('') }
    }
    run()
  }, [db, book, chapter, verse, preloadedText])

  // Scroll to target verse after chapter data arrives
  useEffect(() => {
    if (!expanded || !chapterVerses?.length) return
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetY.current, animated: false })
    }, 80)
  }, [expanded, chapterVerses])

  const cleanText = verseText ? stripUsfm(verseText) : null
  const refLabel = `${shortBookName(book)} ${chapter}:${verse}`

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[s.sheet, expanded && s.sheetExpanded]}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {expanded ? `${shortBookName(book)} ${chapter} (${translation})` : `${refLabel} (${translation})`}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={s.closeBtn}><Text style={s.closeBtnText}>Close</Text></View>
            </TouchableOpacity>
          </View>

          {/* Body */}
          {expanded ? (
            !chapterVerses ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <ScrollView ref={scrollRef} style={s.chapterList} contentContainerStyle={s.chapterContent}>
                {chapterVerses.map(item => {
                  const isTarget = item.verse === verse
                  return (
                    <Text
                      key={item.verse}
                      style={[s.verseText, isTarget && s.verseTextTarget]}
                      onLayout={isTarget ? e => { targetY.current = e.nativeEvent.layout.y } : undefined}
                    >
                      <Text style={[s.verseNum, isTarget && s.verseNumTarget]}>{item.verse} </Text>
                      {stripUsfm(item.text)}
                    </Text>
                  )
                })}
                {chapterVerses.length === 0 && (
                  <Text style={[s.verseText, { fontStyle: 'italic', color: colors.textSecondary }]}>No verses found.</Text>
                )}
              </ScrollView>
            )
          ) : (
            <View style={s.body}>
              {cleanText === null ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} />
              ) : cleanText === '' ? (
                <Text style={[s.verseText, { color: colors.textSecondary, fontStyle: 'italic' }]}>Verse not found.</Text>
              ) : (
                <Text style={s.verseText}>
                  <Text style={s.verseNum}>{verse} </Text>
                  {cleanText}
                </Text>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={s.actions}>
            <TouchableOpacity
              style={s.actionRow}
              activeOpacity={0.7}
              onPress={() => { onNavigate(book, chapter, verse); onClose() }}
            >
              <Text style={s.actionText}>Go to {refLabel}</Text>
            </TouchableOpacity>
            {!expanded && (
              <>
                <View style={s.actionDivider} />
                <TouchableOpacity style={s.actionRow} activeOpacity={0.7} onPress={() => setExpanded(true)}>
                  <Text style={s.actionText}>See full chapter</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        </View>
      </View>
    </Modal>
  )
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    sheet: {
      backgroundColor: c.bgCard,
      borderRadius: 12,
      overflow: 'hidden',
      maxHeight: '75%',
    },
    sheetExpanded: {
      height: '87%',
      maxHeight: '87%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.accent,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    headerTitle: {
      flex: 1,
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    closeBtn: {
      backgroundColor: 'rgba(0,0,0,0.25)',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    closeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    body: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      maxHeight: 260,
    },
    loadingWrap: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    chapterList: { flex: 1 },
    chapterContent: { paddingHorizontal: 16, paddingVertical: 10 },
    verseText: {
      color: c.textPrimary,
      fontSize: 15,
      lineHeight: 24,
      paddingVertical: 4,
    },
    verseTextTarget: {
      textDecorationLine: 'underline',
      color: c.textPrimary,
    },
    verseNum: { color: c.accent, fontWeight: '700' },
    verseNumTarget: { color: c.accent },
    actions: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    actionRow: { paddingHorizontal: 16, paddingVertical: 14 },
    actionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: c.border },
    actionText: {
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'center',
    },
  })
}
