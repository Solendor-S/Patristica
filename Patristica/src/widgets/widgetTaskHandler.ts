'use no memo';

import React from 'react'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'
import { StudyWidget } from './StudyWidget'

// Widget task handler — deliberately does NOT open SQLite.
// Opening user.db here conflicts with the app's expo-sqlite connection in New Arch.
// Instead:
//   - WIDGET_ADDED / WIDGET_UPDATE: render a "loading" fallback; the app's
//     ReadingPlanContext.pushWidgetUpdate() immediately overwrites it with live data.
//   - WIDGET_CLICK MARK_DONE/MARK_UNDONE: launch the app via deep link; the app
//     handles the action and calls pushWidgetUpdate() to re-render the widget.
//   - WIDGET_CLICK OPEN_READING: deep link handled by the widget framework automatically.

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { taskType, clickAction } = props

  if (taskType === 'WIDGET_CLICK') {
    // OPEN_READING and MARK_DONE/MARK_UNDONE use clickAction deep links.
    // The widget framework launches the app automatically for clickAction links.
    // Nothing to do here — the app handles state changes and will call
    // requestWidgetUpdate() via ReadingPlanContext after marking done.
    return
  }

  // For WIDGET_ADDED, WIDGET_UPDATE, WIDGET_RESIZED: render placeholder.
  // The app's pushWidgetUpdate() will render real data as soon as the app is open.
  props.renderWidget(
    React.createElement(StudyWidget, { plan: null, todayEntries: [], streak: 0 })
  )
}
