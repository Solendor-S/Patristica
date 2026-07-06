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

// Sentinel value meaning "use whatever was last active"
export const STARTUP_LAST_USED = '__last_used__'
export type StartupTranslation = Translation | typeof STARTUP_LAST_USED

interface ContextValue {
  translation: Translation
  setTranslation: (t: Translation) => void
  startupTranslation: StartupTranslation
  setStartupTranslation: (t: StartupTranslation) => void
}

const TranslationContext = createContext<ContextValue>({
  translation: 'KJV',
  setTranslation: () => {},
  startupTranslation: STARTUP_LAST_USED,
  setStartupTranslation: () => {},
})

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const db = useUserDb()
  const [translation, setTranslationState] = useState<Translation>('KJV')
  const [startupTranslation, setStartupTranslationState] = useState<StartupTranslation>(STARTUP_LAST_USED)

  useEffect(() => {
    const load = async () => {
      const [startupRow, lastUsedRow, legacyRow] = await Promise.all([
        db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'startup_translation'"),
        db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'last_used_translation'"),
        db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'default_translation'"),
      ])
      const startup = startupRow?.value ?? STARTUP_LAST_USED
      setStartupTranslationState(startup as StartupTranslation)
      // Resolve what to actually load; fall back to legacy key for existing users
      if (startup === STARTUP_LAST_USED) {
        const last = lastUsedRow?.value ?? legacyRow?.value
        if (last && VALID_TRANSLATIONS.has(last)) setTranslationState(last as Translation)
      } else if (VALID_TRANSLATIONS.has(startup)) {
        setTranslationState(startup as Translation)
      }
    }
    load().catch(console.error)
  }, [db])

  const setTranslation = useCallback((t: Translation) => {
    setTranslationState(t)
    db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('last_used_translation', ?)",
      [t]
    ).catch(console.error)
  }, [db])

  const setStartupTranslation = useCallback((t: StartupTranslation) => {
    setStartupTranslationState(t)
    db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('startup_translation', ?)",
      [t]
    ).catch(console.error)
  }, [db])

  const value = useMemo<ContextValue>(
    () => ({ translation, setTranslation, startupTranslation, setStartupTranslation }),
    [translation, setTranslation, startupTranslation, setStartupTranslation]
  )

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  return useContext(TranslationContext)
}
