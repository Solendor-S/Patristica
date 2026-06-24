import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useUserDb } from '../db/UserDbProvider'

export type Translation = 'KJV' | 'ASV' | 'WEB' | 'BSB' | 'SBLGNT' | 'TAGNT' | 'TR' | 'TR+' | 'KJV+' | 'I_KJV+' | 'TAHOT' | 'WLC' | 'WLC+' | 'DSS' | 'LXX' | 'LXX+' | 'E_LXX' | 'A_LXX'

export const TRANSLATIONS: { key: Translation; label: string; full: string; greekOnly?: boolean; otOriginal?: boolean; otOnly?: boolean }[] = [
  { key: 'KJV',    label: 'KJV',    full: 'King James Version' },
  { key: 'KJV+',   label: 'KJV+',   full: "King James Version with Strong's (English order)" },
  { key: 'I_KJV+', label: 'I_KJV+', full: "Interlinear KJV+ (Greek/Hebrew word order)" },
  { key: 'ASV',    label: 'ASV',    full: 'American Standard Version' },
  { key: 'WEB',    label: 'WEB',    full: 'World English Bible' },
  { key: 'BSB',    label: 'BSB',    full: 'Berean Standard Bible' },
  { key: 'SBLGNT', label: 'SBLGNT', full: 'SBL Greek New Testament',              greekOnly: true },
  { key: 'TAGNT',  label: 'TAGNT',  full: 'Translators Amalgamated GNT (NA28)',   greekOnly: true },
  { key: 'TR',     label: 'TR',     full: 'Textus Receptus (Scrivener 1894)',      greekOnly: true },
  { key: 'TR+',    label: 'TR+',    full: "Textus Receptus with Strong's",         greekOnly: true },
  { key: 'TAHOT',  label: 'TAHOT',  full: 'Translators Amalgamated Hebrew OT',    otOriginal: true },
  { key: 'WLC',    label: 'WLC',    full: 'Westminster Leningrad Codex',           otOriginal: true },
  { key: 'WLC+',   label: 'WLC+',   full: "Westminster Leningrad Codex with Strong's", otOriginal: true },
  { key: 'DSS',    label: 'DSS',    full: 'Dead Sea Scrolls (Hebrew)',             otOriginal: true },
  { key: 'LXX',    label: 'LXX',    full: 'Septuagint (Greek)',                    otOriginal: true },
  { key: 'LXX+',   label: 'LXX+',   full: "Septuagint with Strong's (Greek)",       otOriginal: true },
  { key: 'E_LXX',  label: 'E_LXX',  full: "Brenton's Septuagint (English)",       otOnly: true },
  { key: 'A_LXX',  label: 'A-LXX',  full: "Apostolic Bible LXX (English)",        otOnly: true },
]

export const GREEK_TRANSLATIONS      = new Set<Translation>(['SBLGNT', 'TAGNT', 'TR', 'TR+'])
export const OT_ORIGINAL_TRANSLATIONS = new Set<Translation>(['TAHOT', 'WLC', 'WLC+', 'DSS', 'LXX', 'LXX+'])
export const OT_ONLY_TRANSLATIONS     = new Set<Translation>(['E_LXX', 'A_LXX'])
export const OT_TRANSLATIONS          = new Set<Translation>([...OT_ORIGINAL_TRANSLATIONS, ...OT_ONLY_TRANSLATIONS])
export const ANNOTATED_TRANSLATIONS   = new Set<Translation>(['KJV+', 'I_KJV+', 'TR+', 'WLC+', 'LXX+'])

const VALID_TRANSLATIONS = new Set<string>(TRANSLATIONS.map(t => t.key))

interface ContextValue {
  translation: Translation
  setTranslation: (t: Translation) => void
}

const TranslationContext = createContext<ContextValue>({
  translation: 'KJV',
  setTranslation: () => {},
})

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [translation, setTranslationState] = useState<Translation>('KJV')

  useEffect(() => {
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'default_translation'"
    ).then(row => {
      if (row?.value && VALID_TRANSLATIONS.has(row.value)) {
        setTranslationState(row.value as Translation)
      }
    }).catch(console.error)
  }, [db])

  const setTranslation = useCallback((t: Translation) => {
    setTranslationState(t)
    db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('default_translation', ?)",
      [t]
    ).catch(console.error)
  }, [db])

  const value = useMemo<ContextValue>(() => ({ translation, setTranslation }), [translation, setTranslation])

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  return useContext(TranslationContext)
}
