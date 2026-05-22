import React, { createContext, useContext, useState } from 'react'

interface ContextValue {
  wordFocus: string | null
  setWordFocus: (s: string | null) => void
}

const WordFocusContext = createContext<ContextValue>({
  wordFocus: null,
  setWordFocus: () => {},
})

export function WordFocusProvider({ children }: { children: React.ReactNode }) {
  const [wordFocus, setWordFocus] = useState<string | null>(null)
  return (
    <WordFocusContext.Provider value={{ wordFocus, setWordFocus }}>
      {children}
    </WordFocusContext.Provider>
  )
}

export function useWordFocus() {
  return useContext(WordFocusContext)
}
