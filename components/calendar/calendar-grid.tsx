"use client"

import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { getDaysInMonth, getFirstDayOfMonth, isToday, isSameDay, isPastDate, formatDateForDB } from "../../utils/calendar"

interface CalendarGridProps {
  currentMonth: Date
  selectedDates: Date[]
  onDateSelect: (date: Date) => void
  onMonthNavigate: (direction: "prev" | "next") => void
  availableDates?: string[]
  size?: 'normal' | 'compact'
}

export default function CalendarGrid({
  currentMonth,
  selectedDates,
  onDateSelect,
  onMonthNavigate,
  availableDates = [],
  size = 'normal'
}: CalendarGridProps) {
  const cellSize = size === 'compact' ? 'h-8 w-8' : 'h-12 w-12'
  const textSize = size === 'compact' ? 'text-xs' : 'text-sm'
  const containerHeight = size === 'compact' ? 'min-h-[350px]' : 'min-h-[500px]'
  const padding = size === 'compact' ? 'p-4' : 'p-6'

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDay = getFirstDayOfMonth(currentMonth)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className={cellSize} />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const dateKey = formatDateForDB(date)
      const isAvailable = availableDates.length === 0 || availableDates.includes(dateKey)
      const isDisabled = isPastDate(date) || !isAvailable
      const isSelected = selectedDates.some((selectedDate) => isSameDay(selectedDate, date))
      const isTodayDate = isToday(date)

      days.push(
        <motion.button
          key={day}
          type="button"
          disabled={isDisabled}
          onClick={() => onDateSelect(date)}
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          className={`${cellSize} rounded-md ${textSize} font-medium transition-colors ${
            isDisabled
              ? "text-gray-300 cursor-not-allowed"
              : isSelected
                ? "bg-blue-500 text-white shadow-md" // Enhanced styling for selected dates
                : isTodayDate
                  ? "bg-primary/10 text-primary border border-primary"
                  : "text-gray-700 hover:bg-blue-50 hover:text-blue-600" // Blue hover for consistency
          }`}
        >
          {day}
        </motion.button>,
      )
    }

    return days
  }

  return (
    <div className={`border border-gray-200 rounded-lg ${padding} flex flex-col ${containerHeight}`}>
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <button
          type="button"
          onClick={() => onMonthNavigate("prev")}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h4 className="text-lg font-semibold">
          {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </h4>
        <button
          type="button"
          onClick={() => onMonthNavigate("next")}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="grid grid-cols-7 gap-2 mb-4 flex-shrink-0">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div key={index} className={`${cellSize} flex items-center justify-center ${textSize} font-semibold text-gray-600`}>
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 auto-rows-fr">{renderCalendar()}</div>
      </div>
    </div>
  )
}
