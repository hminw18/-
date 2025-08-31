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
import useDragSelection from "./hooks/useDragSelection"

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

  const [state, setState] = useState<ComponentState>("time-selection")
  const [availableTimes, setAvailableTimes] = useState<Array<{ date: Date; slots: Array<{ start: string; end: string }> }>>([])
  const [errorMessage, setErrorMessage] = useState("")
  
  // Generate dynamic time slots based on event time range
  const generateTimeSlots = () => {
    // Use event's configured time range from time_range field
    const timeRange = experience.timeRange || { startTime: '09:00', endTime: '18:00' }
    const startHour = parseInt(timeRange.startTime.split(':')[0])
    const startMinute = parseInt(timeRange.startTime.split(':')[1])
    const endHour = parseInt(timeRange.endTime.split(':')[0])
    const endMinute = parseInt(timeRange.endTime.split(':')[1])

    const slots = []
    
    for (let hour = startHour; hour < endHour || (hour === endHour && startMinute === 0); hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === endHour && minute >= endMinute) break
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(timeString)
      }
    }
    
    return slots
  }

  const [timeSlots, setTimeSlots] = useState<string[]>([])

  // Process available time slots from experience data
  useEffect(() => {
    if (isAuthenticated && experience.availableTimeSlots) {
      // Group available slots by date
      const processedTimes: { [key: string]: Array<{ start: string; end: string }> } = {}
      
      experience.availableTimeSlots.forEach((slot: any) => {
        const dateKey = slot.date
        if (!processedTimes[dateKey]) {
          processedTimes[dateKey] = []
        }
        processedTimes[dateKey].push({
          start: slot.start_time,
          end: slot.end_time
        })
      })

      // Convert to availableTimes format with Date objects
      const newAvailableTimes = Object.entries(processedTimes).map(([dateStr, slots]) => ({
        date: parseDateFromDB(dateStr),
        slots: slots.sort((a, b) => a.start.localeCompare(b.start))
      })).sort((a, b) => a.date.getTime() - b.date.getTime())

      setAvailableTimes(newAvailableTimes)
    }
  }, [isAuthenticated, experience.availableTimeSlots])

  // Update time slots when available times change
  useEffect(() => {
    setTimeSlots(generateTimeSlots())
  }, [availableTimes])

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
          // Store existing selections for dialog
          const existingSelections = candidate.candidate_time_selections.map((selection: any) => ({
            date: parseDateFromDB(selection.selected_date),
            slotId: `${selection.selected_date}-${selection.selected_start_time}`,
            time: `${selection.selected_start_time} - ${selection.selected_end_time}`,
            startTime: selection.selected_start_time,
            endTime: selection.selected_end_time
          }))
          
          setExistingResponses(existingSelections)
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
    const selectedSlots = getSelectedTimeSlots()
    if (selectedSlots.length === 0) {
      toast.error("최소 하나의 시간대를 선택해주세요.")
      return
    }
    if (!identityData?.candidateId) {
      toast.error("인증 정보가 없습니다. 다시 시도해주세요.")
      return
    }

    try {
      // 선택된 시간을 데이터베이스 형식으로 변환
      const selections = selectedSlots.map((slot) => ({
        date: formatDateForDB(slot.date),
        startTime: slot.start,
        endTime: slot.end
      }))

      console.log('Saving selections:', selections)

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
  }

  // Helper function to get currently selected time slots
  const getSelectedTimeSlots = () => {
    const selected: Array<{ date: Date; start: string; end: string }> = []
    availableTimes.forEach(timeEntry => {
      timeEntry.slots.forEach(slot => {
        if ((slot as any).selected) {
          selected.push({
            date: timeEntry.date,
            start: slot.start,
            end: slot.end
          })
        }
      })
    })
    return selected.sort((a, b) => {
      const dateComparison = a.date.getTime() - b.date.getTime()
      if (dateComparison !== 0) return dateComparison
      return a.start.localeCompare(b.start)
    })
  }

  // Format time ranges by merging consecutive slots
  const formatTimeRanges = (slots: Array<{ start: string; end: string }>) => {
    if (slots.length === 0) return ""

    // Extract start times and sort them
    const startTimes = slots.map(slot => slot.start).sort()

    if (startTimes.length === 0) return ""

    const ranges: string[] = []
    let rangeStart = startTimes[0]
    let currentEnd = slots.find(s => s.start === startTimes[0])?.end || startTimes[0]

    // Find the end time for the current range by looking at consecutive slots
    for (let i = 1; i < startTimes.length; i++) {
      const currentStart = startTimes[i]
      const nextEnd = slots.find(s => s.start === currentStart)?.end || currentStart
      
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

  // Check if a time slot is available for selection
  const isTimeSlotAvailable = (dateIndex: number, timeIndex: number) => {
    const date = availableTimes[dateIndex]?.date
    if (!date) return false
    
    const timeSlot = timeSlots[timeIndex]
    if (!timeSlot) return false
    
    // Check if this time slot is in the available slots for this date
    return availableTimes[dateIndex].slots.some(slot => slot.start === timeSlot)
  }

  // Check if a time slot is selected
  const isTimeSlotSelected = (dateIndex: number, timeIndex: number) => {
    const date = availableTimes[dateIndex]?.date
    if (!date) return false
    
    const timeSlot = timeSlots[timeIndex]
    if (!timeSlot) return false
    
    const timeEntry = availableTimes[dateIndex]
    const slot = timeEntry.slots.find(s => s.start === timeSlot)
    return !!(slot as any)?.selected
  }

  // Handle drag selection
  const handleSelectionComplete = (selection: { startDateIndex: number; endDateIndex: number; startTimeIndex: number; endTimeIndex: number }, mode: 'select' | 'deselect') => {
    setAvailableTimes(prevTimes => {
      const newTimes = [...prevTimes]
      
      for (let dateIndex = selection.startDateIndex; dateIndex <= selection.endDateIndex; dateIndex++) {
        for (let timeIndex = selection.startTimeIndex; timeIndex <= selection.endTimeIndex; timeIndex++) {
          // Only process if this slot is available
          if (!isTimeSlotAvailable(dateIndex, timeIndex)) continue
          
          const timeSlot = timeSlots[timeIndex]
          const slotIndex = newTimes[dateIndex].slots.findIndex(s => s.start === timeSlot)
          
          if (slotIndex >= 0) {
            if (mode === 'deselect') {
              // Remove selection
              newTimes[dateIndex].slots[slotIndex] = {
                ...newTimes[dateIndex].slots[slotIndex],
                selected: false
              } as any
            } else {
              // Add selection  
              newTimes[dateIndex].slots[slotIndex] = {
                ...newTimes[dateIndex].slots[slotIndex],
                selected: true
              } as any
            }
          }
        }
      }
      
      return newTimes
    })
  }

  // Initialize drag selection hook
  const dragSelection = useDragSelection({
    availableTimes,
    timeSlots,
    onSelectionComplete: handleSelectionComplete,
    isTimeSlotSelected,
  })

  const handleReset = () => {
    setAvailableTimes(prevTimes => 
      prevTimes.map(timeEntry => ({
        ...timeEntry,
        slots: timeEntry.slots.map(slot => ({ ...slot, selected: false } as any))
      }))
    )
  }

  const handleEditResponse = () => {
    // Load existing responses into the selection state
    if (existingResponses.length > 0) {
      // Group existing responses by date
      const groupedSelections: { [key: string]: Array<{ start: string; end: string }> } = {}
      existingResponses.forEach(response => {
        const dateKey = formatDateForDB(response.date)
        if (!groupedSelections[dateKey]) {
          groupedSelections[dateKey] = []
        }
        groupedSelections[dateKey].push({
          start: response.startTime,
          end: response.endTime
        })
      })

      // Update availableTimes to mark existing selections as selected
      setAvailableTimes(prevTimes => 
        prevTimes.map(timeEntry => {
          const dateKey = formatDateForDB(timeEntry.date)
          if (groupedSelections[dateKey]) {
            const updatedSlots = timeEntry.slots.map(slot => {
              const isSelected = groupedSelections[dateKey].some(selected => 
                selected.start === slot.start && selected.end === slot.end
              )
              return { ...slot, selected: isSelected } as any
            })
            return { ...timeEntry, slots: updatedSlots }
          }
          return timeEntry
        })
      )
    }
    
    setShowExistingResponseDialog(false)
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
    <div className="w-full min-h-screen bg-gray-50 overflow-y-auto">
      {/* Mobile Layout */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{experience.title}</h1>
              <p className="text-xs text-gray-600">{identityData?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 underline">
                로그아웃
              </button>
              <button
                onClick={handleSubmit}
                disabled={getSelectedTimeSlots().length === 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded transition-colors"
              >
                완료
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 bg-gray-50 p-4 space-y-4">
          {/* Interview Info Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">면접 정보</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-xs text-gray-700">면접 길이: {experience.interviewLength}분</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-xs text-gray-700">마감일: {new Date(experience.deadline).toLocaleString('ko-KR', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span className="text-xs text-gray-700">담당자: {experience.organizerEmail}</span>
              </div>
              {experience.description && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 bg-blue-50 px-2 py-2 rounded">
                    {experience.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Selected Times Card */}
          {getSelectedTimeSlots().length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">선택된 시간</h3>
              <div className="space-y-2">
                {Object.entries(
                  getSelectedTimeSlots().reduce(
                    (groups, slot) => {
                      const dateKey = formatDateForDB(slot.date)
                      if (!groups[dateKey]) groups[dateKey] = []
                      groups[dateKey].push(slot)
                      return groups
                    },
                    {} as { [key: string]: Array<{ date: Date; start: string; end: string }> },
                  ),
                ).map(([dateKey, slots]) => (
                  <div key={dateKey} className="p-2 bg-green-50 rounded border border-green-200">
                    <div className="mb-1">
                      <p className="text-green-800 text-xs font-semibold">{formatDate(slots[0].date)}</p>
                    </div>
                    <div>
                      <p className="text-green-700 text-xs">{formatTimeRanges(slots)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Selection Grid */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">시간대 선택</h3>
            <p className="text-xs text-gray-600 mb-3">드래그하여 원하는 시간대를 선택해 주세요.</p>
            
            {availableTimes.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <p className="text-sm">사용 가능한 시간대가 없습니다.</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table-fixed min-w-max">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-0 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                        {availableTimes.map((timeEntry, dateIndex) => (
                          <th
                            key={dateIndex}
                            className="px-1 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-12 whitespace-nowrap"
                          >
                            {timeEntry.date.toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                            })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {timeSlots.map((timeSlot, timeIndex) => (
                        <tr key={timeSlot}>
                          <td className="px-0 py-0 text-[8px] text-gray-600 font-mono border-r border-gray-200 w-12 bg-gray-50 text-center relative z-10">
                            <div className="relative -top-1">{timeSlot}</div>
                          </td>
                          {availableTimes.map((timeEntry, dateIndex) => {
                            const isAvailable = isTimeSlotAvailable(dateIndex, timeIndex)
                            const cellState = dragSelection.getCellState(dateIndex, timeIndex)
                            
                            let cellClassName = "h-5 cursor-pointer select-none border-b border-gray-200 "
                            
                            if (!isAvailable) {
                              cellClassName += "bg-gray-100 cursor-not-allowed"
                            } else {
                              switch (cellState) {
                                case 'selected':
                                  cellClassName += "bg-blue-500"
                                  break
                                case 'will-select':
                                  cellClassName += "bg-blue-200"
                                  break
                                case 'will-deselect':
                                  cellClassName += "bg-white"
                                  break
                                default:
                                  cellClassName += "bg-white hover:bg-gray-100"
                              }
                            }

                            return (
                              <td key={dateIndex} className="px-0 py-0 border-r border-gray-200 w-12">
                                <div
                                  className={cellClassName}
                                  data-slot-id={`${dateIndex}-${timeIndex}`}
                                  onMouseDown={isAvailable ? () => dragSelection.handleTimeSlotMouseDown(dateIndex, timeIndex) : undefined}
                                  onMouseEnter={isAvailable ? () => dragSelection.handleTimeSlotMouseEnter(dateIndex, timeIndex) : undefined}
                                  onTouchStart={isAvailable ? (e) => {
                                    e.preventDefault()
                                    dragSelection.handleTimeSlotMouseDown(dateIndex, timeIndex)
                                  } : undefined}
                                  onTouchMove={isAvailable ? (e) => {
                                    e.preventDefault()
                                    const touch = e.touches[0]
                                    const element = document.elementFromPoint(touch.clientX, touch.clientY)
                                    const slotId = element?.getAttribute('data-slot-id')
                                    if (slotId) {
                                      const [touchDateIndex, touchTimeIndex] = slotId.split('-').map(Number)
                                      dragSelection.handleTimeSlotMouseEnter(touchDateIndex, touchTimeIndex)
                                    }
                                  } : undefined}
                                />
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{experience.title}</h1>
              <p className="text-gray-600 mt-2">드래그하여 원하는 시간대를 선택해 주세요.</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{identityData?.name}</p>
                <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-700 underline">
                  로그아웃
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={getSelectedTimeSlots().length === 0}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
              >
                선택 완료
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 min-h-[800px]">
            {/* Left Card - Interview Info & Selected Times */}
            <div className="col-span-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">면접 정보</h3>
              
              {/* Interview Details */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span className="text-sm text-gray-700">면접 길이: {experience.interviewLength}분</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span className="text-sm text-gray-700">마감일: {new Date(experience.deadline).toLocaleString('ko-KR', { 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  <span className="text-sm text-gray-700">담당자: {experience.organizerEmail}</span>
                </div>
                {experience.description && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-md">
                      {experience.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Selected Times */}
              {getSelectedTimeSlots().length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="font-semibold text-gray-900 mb-4">선택된 시간</h4>
                  <div className="space-y-3">
                    {Object.entries(
                      getSelectedTimeSlots().reduce(
                        (groups, slot) => {
                          const dateKey = formatDateForDB(slot.date)
                          if (!groups[dateKey]) groups[dateKey] = []
                          groups[dateKey].push(slot)
                          return groups
                        },
                        {} as { [key: string]: Array<{ date: Date; start: string; end: string }> },
                      ),
                    ).map(([dateKey, slots]) => (
                      <div key={dateKey} className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="mb-2">
                          <p className="text-green-800 text-sm font-semibold">{formatDate(slots[0].date)}</p>
                        </div>
                        <div>
                          <p className="text-green-700 text-sm">{formatTimeRanges(slots)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Card - Time Selection Grid */}
            <div className="col-span-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">시간대 선택</h3>
              
              {availableTimes.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-gray-500">
                  <p>사용 가능한 시간대가 없습니다.</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="table-fixed min-w-max">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-0 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
                          {availableTimes.map((timeEntry, dateIndex) => (
                            <th
                              key={dateIndex}
                              className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap"
                            >
                              {timeEntry.date.toLocaleDateString("ko-KR", {
                                month: "short",
                                day: "numeric",
                              })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {timeSlots.map((timeSlot, timeIndex) => (
                          <tr key={timeSlot}>
                            <td className="px-0 py-0 text-[10px] text-gray-600 font-mono border-r border-gray-200 w-16 bg-gray-50 text-center relative z-10">
                              <div className="relative -top-2">{timeSlot}</div>
                            </td>
                            {availableTimes.map((timeEntry, dateIndex) => {
                              const isAvailable = isTimeSlotAvailable(dateIndex, timeIndex)
                              const cellState = dragSelection.getCellState(dateIndex, timeIndex)
                              
                              let cellClassName = "h-6 cursor-pointer select-none border-b border-gray-200 "
                              
                              if (!isAvailable) {
                                cellClassName += "bg-gray-100 cursor-not-allowed"
                              } else {
                                switch (cellState) {
                                  case 'selected':
                                    cellClassName += "bg-blue-500"
                                    break
                                  case 'will-select':
                                    cellClassName += "bg-blue-200"
                                    break
                                  case 'will-deselect':
                                    cellClassName += "bg-white"
                                    break
                                  default:
                                    cellClassName += "bg-white hover:bg-gray-100"
                                }
                              }

                              return (
                                <td key={dateIndex} className="px-0 py-0 border-r border-gray-200 w-16">
                                  <div
                                    className={cellClassName}
                                    data-slot-id={`${dateIndex}-${timeIndex}`}
                                    onMouseDown={isAvailable ? () => dragSelection.handleTimeSlotMouseDown(dateIndex, timeIndex) : undefined}
                                    onMouseEnter={isAvailable ? () => dragSelection.handleTimeSlotMouseEnter(dateIndex, timeIndex) : undefined}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
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
            className="fixed inset-0 bg-white z-50 overflow-y-auto flex items-center justify-center"
          >
            {state === "error" && <ErrorState message={errorMessage} onRetry={handleReset} />}
            {state === "success" && (
              <SuccessState
                selectedTimeSlots={getSelectedTimeSlots().map(slot => ({
                  date: slot.date,
                  slotId: `${formatDateForDB(slot.date)}-${slot.start}`,
                  time: `${slot.start} - ${slot.end}`,
                  startTime: slot.start,
                  endTime: slot.end
                }))}
                onScheduleAnother={handleReset}
                onEdit={() => setState("time-selection")}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
