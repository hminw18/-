// Throttle using requestAnimationFrame
export const throttleRAF = (callback: (...args: any[]) => void) => {
  let rafId: number | null = null
  let lastArgs: any[] | null = null

  const throttled = (...args: any[]) => {
    lastArgs = args
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          callback(...lastArgs)
        }
        rafId = null
        lastArgs = null
      })
    }
  }

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
      lastArgs = null
    }
  }

  return throttled
}

// Calculate drag selection area
export const calculateDragSelection = (
  start: { dateIndex: number; timeIndex: number },
  end: { dateIndex: number; timeIndex: number }
) => {
  if (start.dateIndex === -1 || start.timeIndex === -1 || end.dateIndex === -1 || end.timeIndex === -1) {
    return null
  }

  const minDateIndex = Math.min(start.dateIndex, end.dateIndex)
  const maxDateIndex = Math.max(start.dateIndex, end.dateIndex)
  const minTimeIndex = Math.min(start.timeIndex, end.timeIndex)
  const maxTimeIndex = Math.max(start.timeIndex, end.timeIndex)

  return {
    startDateIndex: minDateIndex,
    endDateIndex: maxDateIndex,
    startTimeIndex: minTimeIndex,
    endTimeIndex: maxTimeIndex,
  }
}

// Check if a cell is within the selection area
export const isCellInSelection = (
  dateIndex: number,
  timeIndex: number,
  selection: {
    startDateIndex: number
    endDateIndex: number
    startTimeIndex: number
    endTimeIndex: number
  }
) => {
  return (
    dateIndex >= selection.startDateIndex &&
    dateIndex <= selection.endDateIndex &&
    timeIndex >= selection.startTimeIndex &&
    timeIndex <= selection.endTimeIndex
  )
}

// Generate slot ID
export const generateSlotId = (dateIndex: number, timeIndex: number) => {
  return `${dateIndex}-${timeIndex}`
}

// Parse slot ID
export const parseSlotId = (slotId: string) => {
  const [dateIndex, timeIndex] = slotId.split('-').map(Number)
  return { dateIndex, timeIndex }
}