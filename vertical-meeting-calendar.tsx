"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import type { Experience, TimeSlot, ComponentState, IdentityData } from "./types/calendar"
import { formatDate, isSameDay } from "./utils/calendar"
import { generateTimeSlots } from "./utils/time-slots"
import CalendarGrid from "./components/calendar/calendar-grid"
import TimeSlotList from "./components/calendar/time-slot-list"
import LoadingSpinner from "./components/calendar/loading-spinner"
import ErrorState from "./components/calendar/error-state"
import SuccessState from "./components/calendar/success-state"
import IdentityVerificationDialog from "./components/calendar/identity-verification-dialog"

interface VerticalMeetingCalendarProps {
  experience: Experience
}

interface SelectedTimeSlot {
  date: Date
  slotId: string
  time: string
}

export default function VerticalMeetingCalendar({ experience }: VerticalMeetingCalendarProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [identityData, setIdentityData] = useState<IdentityData | null>(null)

  const [state, setState] = useState<ComponentState>("date-selection")
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [activeDate, setActiveDate] = useState<Date | null>(null)
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<SelectedTimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>("")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dateTimeSlots, setDateTimeSlots] = useState<{ [key: string]: TimeSlot[] }>({})
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    setCurrentMonth(new Date())
  }, [])

  useEffect(() => {
    if (selectedDates.length > 0 && Object.keys(dateTimeSlots).length === 0 && isAuthenticated) {
      setState("loading")
      setTimeout(() => {
        const newDateTimeSlots: { [key: string]: TimeSlot[] } = {}
        selectedDates.forEach((date) => {
          const dateKey = date.toISOString().split("T")[0]
          newDateTimeSlots[dateKey] = generateTimeSlots()
        })
        setDateTimeSlots(newDateTimeSlots)
        setState("time-selection")
      }, 500)
    }
  }, [selectedDates.length, Object.keys(dateTimeSlots).length, isAuthenticated])

  const verifyIdentityInDB = async (name: string, phone: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const mockUsers = [
      { name: "김철수", phone: "010-1234-5678" },
      { name: "이영희", phone: "010-9876-5432" },
      { name: "박민수", phone: "010-5555-1234" },
    ]
    return mockUsers.some((user) => user.name === name && user.phone === phone)
  }

  const handleInitialIdentityVerify = async (data: IdentityData) => {
    try {
      const isVerified = await verifyIdentityInDB(data.name, data.phone)
      if (isVerified) {
        setIdentityData(data)
        setIsAuthenticated(true)
      } else {
        alert("등록되지 않은 사용자입니다. 관리자에게 문의해주세요.")
      }
    } catch (error) {
      alert("인증 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }

  const handleSubmit = () => {
    if (selectedTimeSlots.length === 0) return

    console.log("Selected time slots:", selectedTimeSlots)

    // For now, we'll show a success message
    alert(`${selectedTimeSlots.length}개의 시간대가 선택되었습니다.`)

    // Optionally reset the form or navigate to success state
    // setState("success")
  }

  const handleSlotSelect = (slotId: string, date: Date) => {
    const dateKey = date.toISOString().split("T")[0]
    const timeSlots = dateTimeSlots[dateKey] || []
    const selectedTimeSlot = timeSlots.find((slot) => slot.id === slotId)

    if (!selectedTimeSlot) return

    setSelectedTimeSlots((prev) => {
      const existingIndex = prev.findIndex((slot) => slot.slotId === slotId && isSameDay(slot.date, date))
      if (existingIndex >= 0) {
        return prev.filter((_, index) => index !== existingIndex)
      } else {
        return [...prev, { date, slotId, time: selectedTimeSlot.time }]
      }
    })
  }

  const handleRemoveTimeSlot = (slotToRemove: SelectedTimeSlot) => {
    setSelectedTimeSlots((prev) =>
      prev.filter((slot) => !(slot.slotId === slotToRemove.slotId && isSameDay(slot.date, slotToRemove.date))),
    )
  }

  const handleCalendarDateSelect = (date: Date) => {
    setSelectedDates([date])
    setActiveDate(date)
    setSelectedSlot("")

    const dateKey = date.toISOString().split("T")[0]
    if (!dateTimeSlots[dateKey]) {
      setDateTimeSlots((prevSlots) => ({
        ...prevSlots,
        [dateKey]: generateTimeSlots(),
      }))
    }

    setState("time-selection")
  }

  const handleMonthNavigate = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev)
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const handleReset = () => {
    setSelectedDates([])
    setActiveDate(null)
    setSelectedTimeSlots([])
    setSelectedSlot("")
    setErrorMessage("")
    setDateTimeSlots({})
    setState("date-selection")
    setCurrentMonth(new Date())
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setIdentityData(null)
    handleReset()
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full flex flex-col">
        <IdentityVerificationDialog isOpen={true} onClose={() => {}} onVerify={handleInitialIdentityVerify} />
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen">
      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col p-4">
        <div className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">Book a call with John Doe</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{identityData?.name}</span>
              <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 underline">
                로그아웃
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">Schedule a 45-minute call to discuss about JavaScript.</p>
        </div>

        <div className="space-y-4">
          <CalendarGrid
            currentMonth={currentMonth}
            selectedDates={selectedDates}
            onDateSelect={handleCalendarDateSelect}
            onMonthNavigate={handleMonthNavigate}
          />

          {selectedDates.length > 0 && (
            <div className="space-y-2">
              {selectedDates.map((date, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    activeDate && isSameDay(activeDate, date)
                      ? "bg-blue-100 border-2 border-blue-300"
                      : "bg-blue-50 hover:bg-blue-100"
                  }`}
                  onClick={() => setActiveDate(date)}
                >
                  <p className="text-sm font-medium text-gray-700">{formatDate(date)}</p>
                </div>
              ))}
            </div>
          )}

          {selectedDates.length > 0 && activeDate && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900">Choose times for {formatDate(activeDate)}</h4>

              {selectedTimeSlots.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-700">Selected Times</h5>
                  {Object.entries(
                    selectedTimeSlots.reduce(
                      (groups, slot) => {
                        const dateKey = slot.date.toISOString().split("T")[0]
                        if (!groups[dateKey]) groups[dateKey] = []
                        groups[dateKey].push(slot)
                        return groups
                      },
                      {} as { [key: string]: SelectedTimeSlot[] },
                    ),
                  ).map(([dateKey, slots]) => (
                    <div key={dateKey} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="mb-2">
                        <p className="text-green-800 text-sm font-semibold">{formatDate(slots[0].date)}</p>
                      </div>
                      <div className="space-y-2">
                        {slots.map((slot, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <p className="text-green-700 text-sm">{slot.time}</p>
                            <button
                              onClick={() => handleRemoveTimeSlot(slot)}
                              className="p-1 hover:bg-green-100 rounded-md transition-colors"
                            >
                              <X className="w-3 h-3 text-green-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {state === "time-selection" && (
                <div className="p-4 bg-white border border-gray-200 rounded-lg">
                  <TimeSlotList
                    timeSlots={dateTimeSlots[activeDate.toISOString().split("T")[0]] || []}
                    selectedSlots={selectedTimeSlots
                      .filter((slot) => isSameDay(slot.date, activeDate))
                      .map((slot) => slot.slotId)}
                    onSlotSelect={(slotId) => handleSlotSelect(slotId, activeDate)}
                  />
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Submit Selected Times ({selectedTimeSlots.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 min-h-screen w-full">
        {/* Left Column */}
        <div className="lg:col-span-3 flex flex-col p-6 bg-gray-50 border-r border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Book a call with John Doe</h3>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-gray-700">{identityData?.name}</span>
              <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 underline">
                로그아웃
              </button>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <p className="text-gray-600">Schedule a 45-minute call to discuss about JavaScript.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>45 minutes</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Video call</span>
              </div>
            </div>
          </div>

          {selectedTimeSlots.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Selected Times</h4>
              {Object.entries(
                selectedTimeSlots.reduce(
                  (groups, slot) => {
                    const dateKey = slot.date.toISOString().split("T")[0]
                    if (!groups[dateKey]) groups[dateKey] = []
                    groups[dateKey].push(slot)
                    return groups
                  },
                  {} as { [key: string]: SelectedTimeSlot[] },
                ),
              ).map(([dateKey, slots]) => (
                <div key={dateKey} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="mb-2">
                    <p className="text-green-800 text-sm font-semibold">{formatDate(slots[0].date)}</p>
                  </div>
                  <div className="space-y-2">
                    {slots.map((slot, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <p className="text-green-700 text-sm">{slot.time}</p>
                        <button
                          onClick={() => handleRemoveTimeSlot(slot)}
                          className="p-1 hover:bg-green-100 rounded-md transition-colors"
                        >
                          <X className="w-3 h-3 text-green-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center Column */}
        <div className="lg:col-span-5 flex flex-col p-6">
          <h3 className="text-2xl font-semibold text-gray-900 mb-8">Choose dates</h3>
          <div className="flex-1 flex items-center justify-center">
            <CalendarGrid
              currentMonth={currentMonth}
              selectedDates={selectedDates}
              onDateSelect={handleCalendarDateSelect}
              onMonthNavigate={handleMonthNavigate}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col p-6 bg-gray-50 border-l border-gray-200">
          {selectedDates.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p className="text-center">날짜를 선택해주세요</p>
            </div>
          )}

          {selectedDates.length > 0 && !activeDate && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p className="text-center">시간을 선택할 날짜를 클릭해주세요</p>
            </div>
          )}

          {state === "loading" && (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          )}

          {state === "time-selection" && activeDate && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold text-gray-900">Choose times for {formatDate(activeDate)}</h4>
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <TimeSlotList
                  timeSlots={dateTimeSlots[activeDate.toISOString().split("T")[0]] || []}
                  selectedSlots={selectedTimeSlots
                    .filter((slot) => isSameDay(slot.date, activeDate))
                    .map((slot) => slot.slotId)}
                  onSlotSelect={(slotId) => handleSlotSelect(slotId, activeDate)}
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Submit Selected Times ({selectedTimeSlots.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success/Error States */}
      <AnimatePresence>
        {(state === "error" || state === "success") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-white z-50 flex items-center justify-center"
          >
            {state === "error" && <ErrorState message={errorMessage} onRetry={handleReset} />}
            {state === "success" && (
              <SuccessState
                selectedCalendarDate={selectedDates[0]}
                selectedSlot={selectedSlot}
                timeSlots={Object.values(dateTimeSlots).flat()}
                onScheduleAnother={handleReset}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
