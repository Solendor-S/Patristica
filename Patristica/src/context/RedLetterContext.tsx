import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'
import { getRedLetterOn, setRedLetterOn } from '../db/queries'

interface RedLetterContextValue {
  redLetterOn: boolean
  toggleRedLetter: () => void
}

const RedLetterContext = createContext<RedLetterContextValue | null>(null)

export function RedLetterProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [redLetterOn, setOn] = useState(true)

  useEffect(() => {
    getRedLetterOn(db).then(setOn).catch(() => {})
  }, [])

  const toggleRedLetter = useCallback(() => {
    setOn(prev => {
      const next = !prev
      setRedLetterOn(db, next).catch(() => {})
      return next
    })
  }, [db])

  return (
    <RedLetterContext.Provider value={{ redLetterOn, toggleRedLetter }}>
      {children}
    </RedLetterContext.Provider>
  )
}

export function useRedLetter() {
  const ctx = useContext(RedLetterContext)
  if (!ctx) throw new Error('useRedLetter requires RedLetterProvider')
  return ctx
}
