"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import toast from 'react-hot-toast'
import type { Experience, TimeSlot, ComponentState, IdentityData } from "./types/calendar"
import { formatDate, isSameDay, formatDateForDB, parseDateFromDB } from "./utils/calendar"
import { generateTimeSlots } from "./utils/time-slots"
import CalendarGrid from "./components/calendar/calendar-grid"
import TimeSlotList from "./components/calendar/time-slot-list"
import { getInterviewEventByShareToken, saveCandidateTimeSelection } from "./lib/database"
import LoadingSpinner from "./components/calendar/loading-spinner"
import ErrorState from "./components/calendar/error-state"
import SuccessState from "./components/calendar/success-state"
import IdentityVerificationDialog from "./components/calendar/identity-verification-dialog"
import ExistingResponseDialog from "./components/calendar/existing-response-dialog"
import EventClosedState from "./components/calendar/event-closed-state"

interface VerticalMeetingCalendarProps {
  experience: Experience
  eventValid?: boolean
}

interface SelectedTimeSlot {
  date: Date
  slotId: string
  time: string
  startTime: string
  endTime: string
}

export default function VerticalMeetingCalendar({ experience, eventValid = false }: VerticalMeetingCalendarProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [identityData, setIdentityData] = useState<IdentityData | null>(null)
  const [existingResponses, setExistingResponses] = useState<SelectedTimeSlot[]>([])
  const [showExistingResponseDialog, setShowExistingResponseDialog] = useState(false)

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
          const dateKey = formatDateForDB(date)
          
          // Check if there are available time slots for this date
          const availableSlotsForDate = experience.availableTimeSlots?.filter((slot: any) => {
            return slot.date === dateKey
          }) || []

          if (availableSlotsForDate.length > 0) {
            // Convert available time slots to TimeSlot format
            newDateTimeSlots[dateKey] = availableSlotsForDate.map((slot: any, index: number) => ({
              id: `${slot.id || index}`,
              time: `${slot.start_time} - ${slot.end_time}`,
              startTime: slot.start_time,
              endTime: slot.end_time
            }))
          } else {
            // No available slots for this date
            newDateTimeSlots[dateKey] = []
          }
        })
        setDateTimeSlots(newDateTimeSlots)
        setState("time-selection")
      }, 500)
    }
  }, [selectedDates.length, Object.keys(dateTimeSlots).length, isAuthenticated, experience.availableTimeSlots])

  const verifyIdentityInDB = async (name: string, phone: string): Promise<any> => {
    try {
      // experience에서 eventId를 가져와야 하므로 임시로 URL에서 추출
      const eventId = window.location.pathname.split('/respond/')[1]
      if (!eventId) return null
      
      // 이벤트 데이터와 지원자 목록을 가져와서 확인
      const result = await getInterviewEventByShareToken(eventId)
      if (!result.success || !result.event) return null
      
      // 지원자 목록에서 이름과 전화번호가 일치하는 지원자 찾기
      // 기존 응답도 함께 가져오기 위해 candidate_time_selections 포함
      const candidate = result.event.candidates?.find((c: any) => 
        c.name === name && c.phone === phone
      )
      
      if (candidate) {
        // 해당 candidate의 기존 응답 조회
        const candidateWithResponses = {
          ...candidate,
          candidate_time_selections: result.event.candidates
            .find((c: any) => c.id === candidate.id)?.candidate_time_selections || []
        }
        return candidateWithResponses
      }
      
      return null
    } catch (error) {
      console.error('Identity verification error:', error)
      return null
    }
  }

  const handleInitialIdentityVerify = async (data: IdentityData) => {
    try {
      const candidate = await verifyIdentityInDB(data.name, data.phone)
      if (candidate) {
        setIdentityData({...data, candidateId: candidate.id})
        
        // Check if candidate has already responded
        if (candidate.has_responded && candidate.candidate_time_selections?.length > 0) {
          // Load existing responses
          const existingSelections = candidate.candidate_time_selections.map((selection: any) => ({
            date: parseDateFromDB(selection.selected_date),
            slotId: `${selection.selected_date}-${selection.selected_start_time}`,
            time: `${selection.selected_start_time} - ${selection.selected_end_time}`,
            startTime: selection.selected_start_time,
            endTime: selection.selected_end_time
          })).sort((a, b) => {
            // 먼저 날짜로 정렬
            const dateComparison = a.date.getTime() - b.date.getTime()
            if (dateComparison !== 0) return dateComparison
            
            // 같은 날짜라면 시작 시간으로 정렬
            return a.startTime.localeCompare(b.startTime)
          })
          
          setExistingResponses(existingSelections)
          setSelectedTimeSlots(existingSelections)
          setShowExistingResponseDialog(true)
        }
        
        setIsAuthenticated(true)
      } else {
        toast.error("등록되지 않은 사용자입니다. 관리자에게 문의해주세요.")
      }
    } catch (error) {
      toast.error("인증 중 오류가 발생했습니다. 다시 시도해주세요.")
    }
  }

  const handleSubmit = async () => {
    if (selectedTimeSlots.length === 0) return
    if (!identityData?.candidateId) {
      toast.error("인증 정보가 없습니다. 다시 시도해주세요.")
      return
    }

    try {
      // 선택된 시간을 데이터베이스 형식으로 변환
      const selections = selectedTimeSlots.map((slot, index) => ({
        date: formatDateForDB(slot.date), // Date 객체를 문자열로 변환
        startTime: slot.startTime,
        endTime: slot.endTime
      }))

      console.log('Saving selections:', selections) // 디버그용 로그

      // 데이터베이스에 저장
      const result = await saveCandidateTimeSelection(identityData.candidateId, selections)
      
      if (result.success) {
        toast.success("시간 선택이 성공적으로 저장되었습니다!")
        setState("success")
      } else {
        toast.error("응답 저장 중 오류가 발생했습니다: " + result.error)
      }
    } catch (error) {
      console.error("Error submitting time selection:", error)
      toast.error("응답 저장 중 오류가 발생했습니다.")
    }

    // Optionally reset the form or navigate to success state
    // setState("success")
  }

  const handleSlotSelect = (slotId: string, date: Date) => {
    const dateKey = formatDateForDB(date)
    const timeSlots = dateTimeSlots[dateKey] || []
    const selectedTimeSlot = timeSlots.find((slot) => slot.id === slotId)

    if (!selectedTimeSlot) return

    setSelectedTimeSlots((prev) => {
      const existingIndex = prev.findIndex((slot) => slot.slotId === slotId && isSameDay(slot.date, date))
      if (existingIndex >= 0) {
        return prev.filter((_, index) => index !== existingIndex)
      } else {
        // Use startTime and endTime from the time slot if available, otherwise parse from time string
        let startTime = (selectedTimeSlot as any).startTime
        let endTime = (selectedTimeSlot as any).endTime
        
        if (!startTime || !endTime) {
          // Fallback: parse from time string
          const timeParts = selectedTimeSlot.time.split(' - ')
          startTime = timeParts[0]?.trim() || ''
          endTime = timeParts[1]?.trim() || ''
        }
        
        const newSlots = [...prev, { 
          date, 
          slotId, 
          time: selectedTimeSlot.time,
          startTime: startTime,
          endTime: endTime
        }]
        
        // 날짜와 시간 순으로 정렬
        return newSlots.sort((a, b) => {
          // 먼저 날짜로 정렬
          const dateComparison = a.date.getTime() - b.date.getTime()
          if (dateComparison !== 0) return dateComparison
          
          // 같은 날짜라면 시작 시간으로 정렬
          return a.startTime.localeCompare(b.startTime)
        })
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

    const dateKey = formatDateForDB(date)
    if (!dateTimeSlots[dateKey]) {
      // Check if there are available time slots for this date
      console.log('Looking for slots for dateKey:', dateKey)
      console.log('Available time slots:', experience.availableTimeSlots)
      const availableSlotsForDate = experience.availableTimeSlots?.filter((slot: any) => {
        console.log('Comparing slot.date:', slot.date, 'with dateKey:', dateKey, 'match:', slot.date === dateKey)
        return slot.date === dateKey
      }) || []
      console.log('Found slots for date:', availableSlotsForDate)

      if (availableSlotsForDate.length > 0) {
        // Convert available time slots to TimeSlot format
        const timeSlots = availableSlotsForDate.map((slot: any, index: number) => ({
          id: `${slot.date}-${slot.start_time}`, // Use same format as existing selections
          time: `${slot.start_time} - ${slot.end_time}`,
          startTime: slot.start_time,
          endTime: slot.end_time
        }))
        
        console.log('Converted time slots:', timeSlots)
        console.log('Existing responses:', existingResponses)
        
        setDateTimeSlots((prevSlots) => {
          const newSlots = {
            ...prevSlots,
            [dateKey]: timeSlots,
          }
          console.log('Updated dateTimeSlots:', newSlots)
          return newSlots
        })
      } else {
        // No available slots for this date
        setDateTimeSlots((prevSlots) => ({
          ...prevSlots,
          [dateKey]: [],
        }))
      }
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

  const handleEditResponse = () => {
    setShowExistingResponseDialog(false)
    
    // Keep existing selections visible in left panel
    // selectedTimeSlots already contains existingResponses from initial login
    
    // Reset to initial state - same as normal mode
    setSelectedDates([])
    setActiveDate(null)
    
    // Keep existing responses data for when user clicks on dates
    // existingResponses already contains the original selections
    
    setState("date-selection")
  }

  const handleKeepExistingResponse = () => {
    setShowExistingResponseDialog(false)
    setState("success")
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setIdentityData(null)
    setExistingResponses([])
    handleReset()
  }

  // 이벤트가 마감되거나 일정 배정이 완료된 경우 응답/수정 불가
  if (experience.status === 'closed' || experience.status === 'scheduled' || experience.status === 'completed') {
    return (
      <EventClosedState
        eventName={experience.title}
        deadline={experience.deadline || ''}
        interviewLength={experience.interviewLength || 30}
        organizerEmail={experience.organizerEmail || ""}
      />
    )
  }

  if (!isAuthenticated) {
    if (!eventValid) {
      return (
        <div className="w-full flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">이벤트를 찾을 수 없습니다</h2>
            <p className="text-gray-600">유효하지 않은 링크이거나 만료된 이벤트입니다.</p>
          </div>
        </div>
      )
    }
    
    return (
      <div className="w-full flex flex-col">
        <IdentityVerificationDialog isOpen={true} onClose={() => {}} onVerify={handleInitialIdentityVerify} />
        <ExistingResponseDialog
          isOpen={showExistingResponseDialog}
          onClose={() => setShowExistingResponseDialog(false)}
          onEdit={handleEditResponse}
          onKeep={handleKeepExistingResponse}
          responses={existingResponses}
        />
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen">
      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col p-4">
        <div className="flex-shrink-0 pb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium">{experience.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{identityData?.name}</span>
              <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 underline">
                로그아웃
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">면접 일정을 선택해 주세요.</p>
        </div>

        <div className="space-y-4">
          <CalendarGrid
            currentMonth={currentMonth}
            selectedDates={selectedDates}
            onDateSelect={handleCalendarDateSelect}
            onMonthNavigate={handleMonthNavigate}
            availableDates={experience.availableTimeSlots?.map((slot: any) => 
              slot.date
            ) || []}
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
                        const dateKey = formatDateForDB(slot.date)
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
                    timeSlots={dateTimeSlots[formatDateForDB(activeDate)] || []}
                    selectedSlots={(() => {
                      const activeDateSelections = selectedTimeSlots
                        .filter((slot) => isSameDay(slot.date, activeDate))
                        .map((slot) => slot.slotId)
                      console.log('Active date:', activeDate, 'selectedTimeSlots:', selectedTimeSlots, 'activeDateSelections:', activeDateSelections)
                      return activeDateSelections
                    })()}
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
            <h3 className="text-xl font-semibold text-gray-900">{experience.title}</h3>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-gray-700">{identityData?.name}</span>
              <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 underline">
                로그아웃
              </button>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <p className="text-gray-600">면접 일정을 선택해 주세요.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span>{experience.interviewLength}분</span>
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
              availableDates={experience.availableTimeSlots?.map((slot: any) => 
                slot.date
              ) || []}
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
                  timeSlots={(() => {
                    const activeDateKey = formatDateForDB(activeDate)
                    const slots = dateTimeSlots[activeDateKey] || []
                    console.log('Rendering TimeSlotList with activeDateKey:', activeDateKey, 'slots:', slots, 'dateTimeSlots:', dateTimeSlots)
                    return slots
                  })()}
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

      {/* Existing Response Dialog */}
      <ExistingResponseDialog
        isOpen={showExistingResponseDialog}
        onClose={() => setShowExistingResponseDialog(false)}
        onEdit={handleEditResponse}
        onKeep={handleKeepExistingResponse}
        responses={existingResponses}
      />


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
                selectedTimeSlots={selectedTimeSlots}
                onScheduleAnother={handleReset}
                onEdit={handleEditResponse}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
