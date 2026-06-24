import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'
import { getOnboardingDone, setOnboardingDone } from '../db/queries'

interface OnboardingContextValue {
  showTutorial: boolean
  showFab: boolean
  openTutorial: () => void
  onTourComplete: () => void
  onTourDecline: () => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [showTutorial, setShowTutorial] = useState(false)
  const [showFab, setShowFab] = useState(false)

  useEffect(() => {
    getOnboardingDone(db)
      .then(done => { if (!done) setShowTutorial(true) })
      .catch(() => {})
  }, [])

  const openTutorial = useCallback(() => setShowTutorial(true), [])

  const onTourComplete = useCallback(() => {
    setShowTutorial(false)
    setShowFab(false)
    setOnboardingDone(db).catch(() => {})
  }, [db])

  const onTourDecline = useCallback(() => {
    setShowTutorial(false)
    setShowFab(true)
    setOnboardingDone(db).catch(() => {})
  }, [db])

  return (
    <OnboardingContext.Provider value={{ showTutorial, showFab, openTutorial, onTourComplete, onTourDecline }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding requires OnboardingProvider')
  return ctx
}
