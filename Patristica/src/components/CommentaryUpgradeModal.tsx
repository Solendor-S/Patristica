import React, { useEffect, useMemo, useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native'
import { File, Paths } from 'expo-file-system'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import {
  usePacks, COMMENTARY_FATHERS_PACK, COMMENTARY_LEGACY_PACK,
} from '../context/PackContext'
import { COMMENTARY_UPGRADE_MARKER } from '../db/provider'
import { packBySlug, isPackDownloaded } from '../lib/PackManager'

/**
 * Shown once, to users upgrading across schema v70 — the release that moved
 * commentary out of the bundled DB. Commentary still works with no action (it
 * reads from the online JSON), so this is an OFFLINE offer, not a paywall:
 * previously commentary worked offline for free, and now it needs either a
 * connection or the pack. Fresh installs never see it (no marker is written).
 */
export default function CommentaryUpgradeModal() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const { isInstalled, installedReady, download, isDownloading } = usePacks()

  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const markerFile = useMemo(() => new File(Paths.document, COMMENTARY_UPGRADE_MARKER), [])
  const fathersSize = packBySlug(COMMENTARY_FATHERS_PACK)?.sizeMB ?? 126
  const legacySize = packBySlug(COMMENTARY_LEGACY_PACK)?.sizeMB ?? 116

  useEffect(() => {
    if (!installedReady) return
    let marker = false
    try { marker = markerFile.exists } catch {}
    // Already have the pack (e.g. reinstalled before opening this) — nothing to say.
    if (marker && isInstalled(COMMENTARY_FATHERS_PACK)) {
      dismissMarker()
      return
    }
    if (marker) setVisible(true)
  }, [installedReady, isInstalled])

  function dismissMarker() {
    try { if (markerFile.exists) markerFile.delete() } catch {}
  }

  function close() {
    dismissMarker()
    setVisible(false)
  }

  async function downloadNow() {
    setBusy(true)
    setFailed(false)
    try {
      await download(COMMENTARY_FATHERS_PACK)
      // PackContext.download() swallows its errors and never rejects, so success
      // has to be confirmed from the filesystem — otherwise a failed download
      // would dismiss this modal as if it had worked.
      if (isPackDownloaded(COMMENTARY_FATHERS_PACK)) close()
      else setFailed(true)
    } catch {
      // Keep the modal open and the marker intact so the offer survives a failure.
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const downloading = busy || isDownloading(COMMENTARY_FATHERS_PACK)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Ionicons name="cloud-download-outline" size={44} color={colors.accent} />
          <Text style={styles.title}>Commentary now works online</Text>
          <Text style={styles.body}>
            To keep the app itself much smaller, patristic commentary now installs
            separately — and there is far more of it than before: {'\n'}
            <Text style={styles.emphasis}>60,376 entries from 55 Church Fathers.</Text>
          </Text>
          <Text style={styles.meta}>
            Church Fathers Commentary · {fathersSize} MB{'\n'}
            The wider Extended Commentary Archive ({legacySize} MB) is in Library → Downloads.
          </Text>

          {failed && (
            <Text style={styles.error}>
              Download failed. Commentary still works online — you can save it for
              offline use later from Library → Downloads.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.primary, downloading && styles.primaryBusy]}
            onPress={downloadNow}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator color={colors.bgPrimary} />
            ) : (
              <Text style={styles.primaryText}>Save offline · {fathersSize} MB</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondary} onPress={close} disabled={downloading}>
            <Text style={styles.secondaryText}>Keep using it online</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontSize: 19,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    body: {
      fontSize: 15,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emphasis: { color: colors.textPrimary, fontWeight: '600' },
    meta: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
      textAlign: 'center',
    },
    error: {
      fontSize: 13,
      color: '#c0392b',
      textAlign: 'center',
    },
    primary: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingVertical: 13,
      paddingHorizontal: 22,
      alignSelf: 'stretch',
      alignItems: 'center',
      marginTop: 4,
      minHeight: 46,
      justifyContent: 'center',
    },
    primaryBusy: { opacity: 0.7 },
    primaryText: { color: colors.bgPrimary, fontWeight: '700', fontSize: 15 },
    secondary: { paddingVertical: 8, paddingHorizontal: 16 },
    secondaryText: { color: colors.textSecondary, fontSize: 14 },
  })
}
