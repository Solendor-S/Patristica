import React, { useEffect, useState } from 'react'
import { File, Paths } from 'expo-file-system'
import Constants from 'expo-constants'
import { useUserDb } from '../db/UserDbProvider'
import { pendingRelease, markChangelogSeen } from '../lib/Changelog'
import type { Release } from '../lib/Changelog'
import { COMMENTARY_UPGRADE_MARKER } from '../db/provider'
import ChangelogModal from './ChangelogModal'

/**
 * Shows the newest release notes once, when a newly published entry appears.
 * Tracks the changelog entry id rather than the app version, so an over-the-air
 * update can announce itself — under `runtimeVersion: { policy: "appVersion" }`
 * an OTA release must keep the app version unchanged to reach existing installs.
 * Fresh installs are seeded silently.
 */
export default function WhatsNewGate() {
  const db = useUserDb()
  const version = Constants.expoConfig?.version ?? ''
  const [release, setRelease] = useState<Release | null>(null)

  useEffect(() => {
    let cancelled = false

    // Don't stack two modals: when the commentary migration notice is pending it
    // takes precedence, and this waits for a later launch.
    let migrationPending = false
    try { migrationPending = new File(Paths.document, COMMENTARY_UPGRADE_MARKER).exists } catch {}
    if (migrationPending) return

    pendingRelease(db, version)
      .then(r => { if (!cancelled) setRelease(r) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [db, version])

  function close() {
    if (release) markChangelogSeen(db, release.id).catch(() => {})
    setRelease(null)
  }

  if (!release) return null
  return (
    <ChangelogModal
      visible
      onClose={close}
      onlyVersion={release.id}
      release={release}
    />
  )
}
