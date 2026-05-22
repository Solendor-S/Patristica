import React, { createContext, useContext, useState } from 'react'
import type { Translation } from './TranslationContext'

interface ContextValue {
  compareTrans: Translation | null
  parallelOn: boolean
  setCompareTrans: (t: Translation | null) => void
  setParallelOn: (v: boolean | ((prev: boolean) => boolean)) => void
}

const ParallelTranslationContext = createContext<ContextValue>({
  compareTrans: null,
  parallelOn: false,
  setCompareTrans: () => {},
  setParallelOn: () => {},
})

export function ParallelTranslationProvider({ children }: { children: React.ReactNode }) {
  const [compareTrans, setCompareTrans] = useState<Translation | null>(null)
  const [parallelOn, setParallelOn] = useState(false)

  return (
    <ParallelTranslationContext.Provider value={{ compareTrans, setCompareTrans, parallelOn, setParallelOn }}>
      {children}
    </ParallelTranslationContext.Provider>
  )
}

export function useParallelTranslation() { return useContext(ParallelTranslationContext) }
