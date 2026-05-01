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

export interface Book {
  name: string
  chapters: number
  testament: 'OT' | 'NT'
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

export interface Note {
  book: string
  chapter: number
  verse: number | null
  text: string
  updatedAt: number
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

// Navigation param types
export type RootTabParamList = {
  Bible: undefined
  Search: undefined
  Study: undefined
  Bookmarks: undefined
}

export type BibleStackParamList = {
  Reader: { book?: string; chapter?: number; verse?: number }
  BookPicker: undefined
  ChapterPicker: { book: string }
}
