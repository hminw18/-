"use client"

import type React from "react"
import { motion } from "framer-motion"
import { X, Clock, Calendar } from "lucide-react"
import { formatDateForDB } from "../../utils/calendar"

interface ExistingResponseDialogProps {
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onKeep: () => void
  responses: Array<{
    date: Date
    time: string
    startTime: string
    endTime: string
  }>
}

export default function ExistingResponseDialog({ 
  isOpen, 
  onClose, 
  onEdit, 
  onKeep, 
  responses 
}: ExistingResponseDialogProps) {
  if (!isOpen) return null

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

  // Group responses by date
  const groupedResponses = responses.reduce(
    (groups, response) => {
      const dateKey = formatDateForDB(response.date)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(response)
      return groups
    },
    {} as { [key: string]: typeof responses }
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">기존 응답 확인</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              이미 응답하신 기록이 있습니다. 어떻게 하시겠습니까?
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onKeep}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              기존 응답 유지
            </button>
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              응답 수정하기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}