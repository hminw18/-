"use client"

import { motion } from "framer-motion"
import type { TimeSlot } from "../../types/calendar"
import { formatDate } from "../../utils/calendar"

interface SuccessStateProps {
  selectedCalendarDate: Date | null
  selectedSlot: string
  timeSlots: TimeSlot[]
  onScheduleAnother: () => void
}

export default function SuccessState({ selectedCalendarDate, selectedSlot, timeSlots }: SuccessStateProps) {
  const selectedTimeSlot = timeSlots.find((slot) => slot.id === selectedSlot)

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
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Meeting Scheduled!</h3>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
        A confirmation email with meeting details and calendar invite will be sent to you shortly.
      </p>
      <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2">
        <p className="text-gray-700">
          <strong>Date:</strong> {selectedCalendarDate && formatDate(selectedCalendarDate)}
        </p>
        <p className="text-gray-700">
          <strong>Time:</strong> {selectedTimeSlot?.time}
        </p>
      </div>
    </div>
  )
}
