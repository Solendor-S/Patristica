import React, { createContext, useContext, useState } from 'react'

interface SelectedVerse {
  book: string
  chapter: number
  verse: number
}

interface ContextValue {
  selected: SelectedVerse | null
  setSelected: (v: SelectedVerse | null) => void
}

const SelectedVerseContext = createContext<ContextValue>({
  selected: null,
  setSelected: () => {},
})

export function SelectedVerseProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<SelectedVerse | null>(null)
  return (
    <SelectedVerseContext.Provider value={{ selected, setSelected }}>
      {children}
    </SelectedVerseContext.Provider>
  )
}

export function useSelectedVerse() {
  return useContext(SelectedVerseContext)
}
