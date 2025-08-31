"use client"

import { motion } from "framer-motion"
import type { TimeSlot } from "../../types/calendar"

interface TimeSlotListProps {
  timeSlots: TimeSlot[]
  selectedSlots: string[] // Changed from selectedSlot to selectedSlots array
  onSlotSelect: (slotId: string) => void
}

export default function TimeSlotList({ timeSlots, selectedSlots, onSlotSelect }: TimeSlotListProps) {
  return (
    <div className="h-full overflow-y-scroll pr-2">
      <div className="space-y-2">
          {timeSlots.map((slot) => {
            const isSelected = selectedSlots.includes(slot.id)

            return (
              <motion.button
                key={slot.id}
                type="button"
                onClick={() => onSlotSelect(slot.id)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`w-full p-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  isSelected
                    ? "bg-primary border-primary text-white"
                    : "border-gray-200 text-gray-700 hover:border-primary hover:bg-primary/5"
                }`}
              >
                {slot.time}
              </motion.button>
            )
          })}
        </div>
    </div>
  )
}
