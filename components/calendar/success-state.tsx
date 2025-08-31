"use client"

import { motion } from "framer-motion"
import type { TimeSlot } from "../../types/calendar"
import { formatDate, formatDateForDB } from "../../utils/calendar"

interface SelectedTimeSlot {
  date: Date
  slotId: string
  time: string
  startTime: string
  endTime: string
}

interface SuccessStateProps {
  selectedTimeSlots: SelectedTimeSlot[]
  onScheduleAnother: () => void
  onEdit?: () => void
}

export default function SuccessState({ selectedTimeSlots, onEdit }: SuccessStateProps) {
  // Format time ranges by merging consecutive slots
  const formatTimeRanges = (slots: Array<{ startTime: string; endTime: string }>) => {
    if (slots.length === 0) return ""

    // Extract start times and sort them
    const startTimes = slots.map(slot => slot.startTime).sort()

    if (startTimes.length === 0) return ""

    const ranges: string[] = []
    let rangeStart = startTimes[0]
    let currentEnd = slots.find(s => s.startTime === startTimes[0])?.endTime || startTimes[0]

    // Find the end time for the current range by looking at consecutive slots
    for (let i = 1; i < startTimes.length; i++) {
      const currentStart = startTimes[i]
      const nextEnd = slots.find(s => s.startTime === currentStart)?.endTime || currentStart
      
      if (currentEnd === currentStart) {
        // Consecutive slot - extend current range
        currentEnd = nextEnd
      } else {
        // Non-consecutive slot - save current range and start new one
        ranges.push(`${rangeStart} - ${currentEnd}`)
        rangeStart = currentStart
        currentEnd = nextEnd
      }
    }
    ranges.push(`${rangeStart} - ${currentEnd}`) // Add the last range

    return ranges.join(", ")
  }

  // Group slots by date
  const groupedSlots = selectedTimeSlots.reduce(
    (groups, slot) => {
      const dateKey = formatDateForDB(slot.date)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(slot)
      return groups
    },
    {} as { [key: string]: SelectedTimeSlot[] }
  )
  return (
    <div className="text-center px-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center"
      >
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">시간 선택이 완료되었습니다!</h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        선택한 시간이 성공적으로 저장되었습니다. 면접 일정이 확정되면 알림을 받게 됩니다.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-3">
        <p className="text-gray-700 font-medium mb-2">선택한 시간:</p>
        {Object.entries(groupedSlots).map(([dateKey, slots], index) => (
          <div key={dateKey} className="space-y-1">
            <p className="text-gray-700">
              <strong>날짜:</strong> {formatDate(slots[0].date)}
            </p>
            <p className="text-gray-700">
              <strong>시간:</strong> {formatTimeRanges(slots)}
            </p>
            {index < Object.entries(groupedSlots).length - 1 && <hr className="my-2" />}
          </div>
        ))}
      </div>
      
      {onEdit && (
        <div className="mt-6">
          <button
            onClick={onEdit}
            className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            응답 수정하기
          </button>
        </div>
      )}
    </div>
  )
}
