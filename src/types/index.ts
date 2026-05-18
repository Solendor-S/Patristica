// Core Bible types
export interface BibleVerse {
  book: string
  chapter: number
  verse: number
  text: string
}

export interface SelectedVerse {
  book: string
  chapter: number
  verse: number | null
}

export interface Footnote {
  verse: number
  marker: string
  word_index: number
  content: string
}

export interface Book {
  name: string
  chapters: number
  testament: 'OT' | 'NT' | 'APOC'
  group?: string
}

export interface SearchResult {
  book: string
  chapter: number
  verse: number
  text: string
}

export interface Bookmark {
  book: string
  chapter: number
  verse: number
  createdAt: number
}

export interface Highlight {
  book: string
  chapter: number
  verse: number
  color: string
  createdAt: number
}

export interface Note {
  book: string
  chapter: number
  verse: number | null
  text: string
  updatedAt: number
}

export interface CrossRef {
  ref_book: string
  ref_chapter: number
  ref_verse: number
  text: string
}

export interface CommentaryEntry {
  id: number
  father_name: string
  father_era: string
  excerpt: string
  full_text: string
  source: string
  source_url: string
}

export interface TextualVariant {
  id: number
  testament: 'ot' | 'nt'
  word_ref: string
  main_type: string
  main_english: string
  main_hebrew: string
  variant_source: string
  variant_source_label: string
  variant_english: string
  variant_hebrew: string
  description: string
}

// Navigation param types
export type RootTabParamList = {
  Bible: undefined
  Search: undefined
  Study: undefined
  Library: undefined
  Settings: undefined
}

export type BibleStackParamList = {
  Reader: { book?: string; chapter?: number; verse?: number; apocrypha?: boolean; _ts?: number }
  BookPicker: undefined
  ChapterPicker: { book: string; apocrypha?: boolean }
  VersePicker: { book: string; chapter: number; apocrypha?: boolean }
}
