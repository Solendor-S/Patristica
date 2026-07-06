'use no memo';

import React from 'react'
import { FlexWidget, TextWidget } from 'react-native-android-widget'
import type { PlanEntry, PlanWithProgress } from '../db/queries'

interface Props {
  plan: PlanWithProgress | null
  todayEntries: PlanEntry[]
  streak: number
}

export function StudyWidget({ plan, todayEntries, streak }: Props) {
  if (!plan) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#111111',
          borderRadius: 20,
        }}
      >
        <TextWidget
          text="Patristica"
          style={{ fontSize: 16, color: '#b8860b', fontFamily: 'sans-serif-medium' }}
        />
        <TextWidget
          text="No active reading plan"
          style={{ fontSize: 12, color: '#666666', marginTop: 6 }}
        />
        <FlexWidget
          clickAction="OPEN_APP"
          style={{
            marginTop: 14,
            paddingHorizontal: 20,
            paddingVertical: 10,
            backgroundColor: '#242424',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#333333',
          }}
        >
          <TextWidget
            text="Open app"
            style={{ fontSize: 12, color: '#cccccc', fontFamily: 'sans-serif-medium' }}
          />
        </FlexWidget>
      </FlexWidget>
    )
  }

  const allDone = todayEntries.length > 0 && todayEntries.every(e => e.completed_at != null)
  const pct = plan.total_days > 0
    ? Math.round((plan.completed_entries / plan.total_days) * 100)
    : 0
  const chaptersText = todayEntries.length > 0
    ? todayEntries.map(e => `${e.book} ${e.chapter}`).join('  ·  ')
    : 'Rest day'
  const filled = Math.max(1, pct)
  const empty = 100 - filled
  const dayLabel = `Day ${Math.min(plan.completed_entries + 1, plan.total_days)} of ${plan.total_days}`

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#111111',
        borderRadius: 20,
        padding: 16,
      }}
    >
      {/* Top: plan name + streak */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={plan.name.toUpperCase()}
          style={{
            fontSize: 10,
            color: '#b8860b',
            fontFamily: 'sans-serif-medium',
          }}
          maxLines={1}
        />
        {streak > 0 && (
          <TextWidget
            text={`${streak} day streak`}
            style={{ fontSize: 10, color: '#b8860b', fontFamily: 'sans-serif' }}
          />
        )}
      </FlexWidget>

      {/* Middle: chapters + day label */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text={chaptersText}
          style={{
            fontSize: 20,
            color: allDone ? '#555555' : '#f0e8d8',
            fontFamily: 'sans-serif-medium',
          }}
          maxLines={1}
        />
        <TextWidget
          text={dayLabel}
          style={{ fontSize: 11, color: '#666666', marginTop: 4, fontFamily: 'sans-serif' }}
        />
      </FlexWidget>

      {/* Bottom: progress bar + buttons */}
      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>

        {/* Progress bar */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            height: 3,
            borderRadius: 2,
            backgroundColor: '#2a2a2a',
            overflow: 'hidden',
            marginBottom: 12,
          }}
        >
          <FlexWidget style={{ flex: filled, height: 3, backgroundColor: '#b8860b' }} />
          {empty > 0 && (
            <FlexWidget style={{ flex: empty, height: 3, backgroundColor: '#2a2a2a' }} />
          )}
        </FlexWidget>

        {/* Buttons row */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            width: 'match_parent',
            flexGap: 10,
          }}
        >
          <FlexWidget
            clickAction="OPEN_APP"
            style={{
              flex: 1,
              height: 36,
              backgroundColor: '#242424',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#333333',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text="Open"
              style={{ fontSize: 12, color: '#cccccc', fontFamily: 'sans-serif-medium' }}
            />
          </FlexWidget>

          <FlexWidget
            clickAction="OPEN_APP"
            style={{
              flex: 1,
              height: 36,
              backgroundColor: allDone ? '#b8860b' : '#1e1a0d',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#b8860b',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <TextWidget
              text={allDone ? 'Done ✓' : 'Mark done'}
              style={{
                fontSize: 12,
                color: allDone ? '#ffffff' : '#b8860b',
                fontFamily: 'sans-serif-medium',
              }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  )
}
