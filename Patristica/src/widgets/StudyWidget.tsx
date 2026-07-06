import React from 'react'
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget'
import type { PlanEntry, PlanWithProgress } from '../db/queries'

interface Props {
  plan: PlanWithProgress | null
  todayEntries: PlanEntry[]
  streak: number
}

const ACCENT = '#b8860b'
const BG = '#1a1a1a'
const BG_CARD = '#242424'
const TEXT_PRIMARY = '#e8e0d0'
const TEXT_MUTED = '#888888'
const BORDER = '#333333'

export function StudyWidget({ plan, todayEntries, streak }: Props) {
  if (!plan) {
    return (
      <FlexWidget
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: BG,
          borderRadius: 16,
        }}
      >
        <TextWidget
          text="📖 Patristica"
          style={{ fontSize: 15, color: ACCENT, fontFamily: 'sans-serif-medium' }}
        />
        <TextWidget
          text="No active reading plan"
          style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 4 }}
        />
      </FlexWidget>
    )
  }

  const allDone = todayEntries.length > 0 && todayEntries.every(e => e.completed_at != null)
  const pct = plan.total_entries > 0
    ? Math.round((plan.completed_entries / plan.total_entries) * 100)
    : 0
  const chaptersText = todayEntries.length > 0
    ? todayEntries.map(e => `${e.book} ${e.chapter}`).join(' · ')
    : 'No reading today'
  const streakText = streak > 0 ? `🔥 ${streak}` : ''

  // Progress bar uses flex ratio
  const filled = Math.max(1, pct)
  const empty = Math.max(0, 100 - filled)

  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        backgroundColor: BG,
        borderRadius: 16,
        padding: 14,
      }}
    >
      {/* Header row */}
      <FlexWidget
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <TextWidget
          text={`📖 ${plan.name}`}
          style={{ fontSize: 13, color: ACCENT, fontFamily: 'sans-serif-medium' }}
          maxLines={1}
        />
        {streakText ? (
          <TextWidget
            text={streakText}
            style={{ fontSize: 13, color: '#ff8c00', fontFamily: 'sans-serif-medium' }}
          />
        ) : (
          <FlexWidget style={{ width: 1 }} />
        )}
      </FlexWidget>

      {/* Chapters */}
      <TextWidget
        text={chaptersText}
        style={{
          fontSize: 17,
          color: allDone ? TEXT_MUTED : TEXT_PRIMARY,
          fontFamily: 'sans-serif-medium',
          marginTop: 8,
          textDecorationLine: allDone ? 'line-through' : 'none',
        }}
        maxLines={2}
      />

      {/* Day counter */}
      <TextWidget
        text={`Day ${Math.min(plan.completed_entries + 1, plan.total_days)} of ${plan.total_days} · ${pct}%`}
        style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}
      />

      {/* Progress bar */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          height: 4,
          borderRadius: 2,
          marginTop: 10,
          overflow: 'hidden',
          backgroundColor: BORDER,
        }}
      >
        <FlexWidget
          style={{ flex: filled, height: 4, backgroundColor: ACCENT }}
        />
        {empty > 0 && (
          <FlexWidget
            style={{ flex: empty, height: 4, backgroundColor: BORDER }}
          />
        )}
      </FlexWidget>

      {/* Action buttons row */}
      {todayEntries.length > 0 && (
        <FlexWidget
          style={{
            flexDirection: 'row',
            marginTop: 12,
            gap: 8,
          }}
        >
          {/* Open reading button */}
          {todayEntries[0] && (
            <FlexWidget
              clickAction="OPEN_READING"
              clickActionData={{
                book: todayEntries[0].book,
                chapter: String(todayEntries[0].chapter),
              }}
              style={{
                flex: 1,
                backgroundColor: BG_CARD,
                borderRadius: 8,
                paddingVertical: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TextWidget
                text="Open"
                style={{ fontSize: 12, color: TEXT_PRIMARY, fontFamily: 'sans-serif-medium' }}
              />
            </FlexWidget>
          )}

          {/* Mark done button */}
          <FlexWidget
            clickAction={allDone ? 'MARK_UNDONE' : 'MARK_DONE'}
            clickActionData={{ planId: String(plan.id) }}
            style={{
              flex: 1,
              backgroundColor: allDone ? ACCENT : BG_CARD,
              borderRadius: 8,
              paddingVertical: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text={allDone ? '✓ Done' : 'Mark done'}
              style={{
                fontSize: 12,
                color: allDone ? '#fff' : ACCENT,
                fontFamily: 'sans-serif-medium',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      )}
    </FlexWidget>
  )
}
