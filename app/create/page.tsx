"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Upload, X, Plus, Calendar, Users, Mail } from "lucide-react"
import toast from 'react-hot-toast'
import CalendarGrid from "../../components/calendar/calendar-grid"
import useDragSelection from "../../hooks/useDragSelection"
import { createInterviewEvent } from "../../lib/database"
import ProtectedRoute from "../../components/auth/ProtectedRoute"
import { useAuth } from "../../contexts/AuthContext"
import AppHeader from "../../components/ui/app-header"

interface BasicInfo {
  eventName: string
  interviewLength: string | number
  simultaneousCount: string | number
  organizerEmail: string
}

interface TimeSlot {
  start: string
  end: string
}

interface AvailableTime {
  date: Date
  slots: TimeSlot[]
}

interface Candidate {
  name: string
  phone: string
  email: string
}

interface TimeRange {
  startTime: string
  endTime: string
}

interface ReviewSettings {
  deadline: string
  reminderOptions: {
    oneDayBefore: boolean
    threeHoursBefore: boolean
    oneHourBefore: boolean
  }
}

type Step = "basic-info" | "available-times" | "candidates" | "review"

export default function CreateInterviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<Step>("basic-info")
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    eventName: "",
    interviewLength: 30,
    simultaneousCount: 1,
    organizerEmail: "",
  })
  const [touched, setTouched] = useState({
    eventName: false,
    interviewLength: false,
    simultaneousCount: false,
    organizerEmail: false,
  })
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [timeRange, setTimeRange] = useState<TimeRange>({
    startTime: "09:00",
    endTime: "18:00",
  })

  // 기본 마감일시: 현재 날짜로부터 3일 후 18:00 또는 실제 면접일자가 3일 뒤보다 이르면 그 전날 18:00
  const getDefaultDeadline = (currentAvailableTimes = availableTimes) => {
    const today = new Date()
    const defaultDate = new Date()
    defaultDate.setDate(today.getDate() + 3)
    
    // 로컬 시간으로 18시 설정 (UTC 변환 방지)
    const year = defaultDate.getFullYear()
    const month = String(defaultDate.getMonth() + 1).padStart(2, '0')
    const day = String(defaultDate.getDate()).padStart(2, '0')
    const defaultDeadlineString = `${year}-${month}-${day}T18:00`
    
    // 가장 빠른 면접 날짜 찾기
    if (currentAvailableTimes.length > 0) {
      const earliestInterviewDate = currentAvailableTimes
        .map(time => time.date)
        .sort((a, b) => a.getTime() - b.getTime())[0]
      
      // 가장 빠른 면접 날짜가 기본 마감일(3일 후)보다 이르면, 면접일 전날 18:00로 설정
      if (earliestInterviewDate < defaultDate) {
        const deadlineDate = new Date(earliestInterviewDate)
        deadlineDate.setDate(deadlineDate.getDate() - 1)
        
        const deadlineYear = deadlineDate.getFullYear()
        const deadlineMonth = String(deadlineDate.getMonth() + 1).padStart(2, '0')
        const deadlineDay = String(deadlineDate.getDate()).padStart(2, '0')
        const calculatedDeadlineString = `${deadlineYear}-${deadlineMonth}-${deadlineDay}T18:00`
        
        // 마감일이 오늘보다 이전이면 오늘 18:00으로 설정
        if (deadlineDate <= today) {
          const todayYear = today.getFullYear()
          const todayMonth = String(today.getMonth() + 1).padStart(2, '0')
          const todayDay = String(today.getDate()).padStart(2, '0')
          return `${todayYear}-${todayMonth}-${todayDay}T18:00`
        }
        
        return calculatedDeadlineString
      }
    }
    
    return defaultDeadlineString
  }

  const [reviewSettings, setReviewSettings] = useState<ReviewSettings>({
    deadline: getDefaultDeadline(),
    reminderOptions: {
      oneDayBefore: true,
      threeHoursBefore: true,
      oneHourBefore: false,
    },
  })

  const [sendOptions, setSendOptions] = useState({
    sendEmail: true,
    generateLink: true,
  })

  const [isCreating, setIsCreating] = useState(false)

  // 사용자 로그인 정보로 기본값 설정
  useEffect(() => {
    if (user?.email && !basicInfo.organizerEmail) {
      setBasicInfo(prev => ({
        ...prev,
        organizerEmail: user.email
      }))
    }
  }, [user, basicInfo.organizerEmail])

  // 면접 시간이 변경될 때마다 마감일시 업데이트
  useEffect(() => {
    setReviewSettings(prev => ({
      ...prev,
      deadline: getDefaultDeadline(availableTimes)
    }))
  }, [availableTimes])

  // 지원자 정보 검증 함수
  const validateCandidates = (): boolean => {
    if (candidates.length === 0) {
      toast.error("최소 1명의 지원자를 등록해주세요.")
      return false
    }
    
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      
      if (!candidate.name.trim()) {
        toast.error(`${i + 1}번째 지원자의 이름을 입력해주세요.`)
        return false
      }
      
      if (candidate.name.trim().length < 2) {
        toast.error(`${i + 1}번째 지원자의 이름은 2글자 이상이어야 합니다.`)
        return false
      }
      
      if (!candidate.email.trim()) {
        toast.error(`${i + 1}번째 지원자의 이메일을 입력해주세요.`)
        return false
      }
      
      if (!validateEmail(candidate.email.trim())) {
        toast.error(`${i + 1}번째 지원자의 이메일 형식이 올바르지 않습니다.`)
        return false
      }
      
      if (candidate.phone.trim() && !validatePhone(candidate.phone.trim())) {
        toast.error(`${i + 1}번째 지원자의 전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)`)
        return false
      }
    }
    
    // 중복 이메일 검사
    const emails = candidates.map(c => c.email.trim().toLowerCase())
    const uniqueEmails = new Set(emails)
    if (emails.length !== uniqueEmails.size) {
      toast.error("중복된 이메일 주소가 있습니다.")
      return false
    }
    
    return true
  }

  // 가용 시간 검증 함수
  const validateAvailableTimes = (): boolean => {
    if (availableTimes.length === 0) {
      toast.error("가용 시간을 설정해주세요.")
      return false
    }
    
    const hasEmptySlots = availableTimes.some(time => time.slots.length === 0)
    if (hasEmptySlots) {
      toast.error("모든 선택된 날짜에 시간을 설정해주세요.")
      return false
    }
    
    return true
  }

  // 마감일시 검증 함수
  const validateDeadline = (): boolean => {
    if (!reviewSettings.deadline) {
      toast.error("마감일시를 설정해주세요.")
      return false
    }
    
    const deadlineDate = new Date(reviewSettings.deadline)
    const now = new Date()
    
    if (deadlineDate <= now) {
      toast.error("마감일시는 현재 시점보다 미래여야 합니다.")
      return false
    }
    
    // 가장 빠른 면접 날짜 확인
    const earliestInterviewDate = Math.min(...availableTimes.map(time => time.date.getTime()))
    if (deadlineDate.getTime() >= earliestInterviewDate) {
      toast.error("마감일시는 면접 날짜보다 이전이어야 합니다.")
      return false
    }
    
    return true
  }

  // 종합 검증 함수
  const validateAll = (): boolean => {
    return validateBasicInfo() && validateAvailableTimes() && validateCandidates() && validateDeadline()
  }

  // 면접 이벤트 생성 핸들러
  const handleCreateInterviewEvent = async () => {
    // 종합 유효성 검사
    if (!validateAll()) {
      return
    }

    setIsCreating(true)

    try {
      const result = await createInterviewEvent({
        eventName: basicInfo.eventName,
        organizerEmail: basicInfo.organizerEmail,
        interviewLength: Number(basicInfo.interviewLength),
        simultaneousCount: Number(basicInfo.simultaneousCount),
        deadline: new Date(reviewSettings.deadline),
        reminderSettings: reviewSettings.reminderOptions,
        sendOptions,
        timeRange,
        availableTimes,
        candidates
      })

      if (result.success) {
        const actions = []
        if (sendOptions.sendEmail) {
          actions.push("초대 이메일 발송")
        }
        if (sendOptions.generateLink && result.shareToken) {
          actions.push("공유 링크 생성")
        }

        if (result.shareToken) {
          console.log("공유 링크:", `${window.location.origin}/respond/${result.shareToken}`)
        }

        // 대시보드로 이동
        router.push(`/events/${result.event.id}/dashboard`)
      } else {
        throw new Error(result.error || "면접 이벤트 생성에 실패했습니다.")
      }
    } catch (error) {
      console.error("Error creating interview event:", error)
      toast.error("면접 이벤트 생성 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsCreating(false)
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    const [startHour, startMinute] = timeRange.startTime.split(":").map(Number)
    const [endHour, endMinute] = timeRange.endTime.split(":").map(Number)

    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute

    for (let totalMinutes = startTotalMinutes; totalMinutes < endTotalMinutes; totalMinutes += 30) {
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      slots.push(time)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Helper function to check if a time slot is selected
  const isTimeSlotSelected = (dateIndex: number, timeIndex: number) => {
    if (dateIndex >= availableTimes.length) return false
    const time = timeSlots[timeIndex]
    if (!time) return false
    
    return availableTimes[dateIndex]?.slots.some((slot) => slot.start === time) || false
  }

  // Handle selection completion from drag hook
  const handleSelectionComplete = (selection: any, mode: 'select' | 'deselect') => {
    const newAvailableTimes = [...availableTimes]

    // Process each date in the drag range
    for (let dateIndex = selection.startDateIndex; dateIndex <= selection.endDateIndex; dateIndex++) {
      if (dateIndex >= newAvailableTimes.length) continue
      
      const newSlots = [...newAvailableTimes[dateIndex].slots]

      // Process each time slot in the drag range
      for (let timeIndex = selection.startTimeIndex; timeIndex <= selection.endTimeIndex; timeIndex++) {
        if (timeIndex >= timeSlots.length) continue
        
        const time = timeSlots[timeIndex]
        const existingIndex = newSlots.findIndex((slot) => slot.start === time)

        if (mode === "deselect") {
          // Only remove if already selected
          if (existingIndex >= 0) {
            newSlots.splice(existingIndex, 1)
          }
        } else {
          // Only add if not selected
          if (existingIndex < 0) {
            const startHour = Number.parseInt(time.split(":")[0])
            const startMinute = Number.parseInt(time.split(":")[1])
            const endMinute = startMinute + 30
            const endHour = endMinute >= 60 ? startHour + 1 : startHour
            const finalEndMinute = endMinute >= 60 ? endMinute - 60 : endMinute
            const endTime = `${endHour.toString().padStart(2, "0")}:${finalEndMinute.toString().padStart(2, "0")}`

            newSlots.push({ start: time, end: endTime })
          }
        }
      }

      newAvailableTimes[dateIndex].slots = newSlots
    }

    setAvailableTimes(newAvailableTimes)
  }

  // Initialize drag selection hook
  const dragSelection = useDragSelection({
    availableTimes,
    timeSlots,
    onSelectionComplete: handleSelectionComplete,
    isTimeSlotSelected,
  })

  // 이메일 형식 검증 함수
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 전화번호 형식 검증 함수 (한국 전화번호)
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^01[016789]-?\d{3,4}-?\d{4}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  // 기본 정보 검증 함수 (토스트 없이 boolean만 반환)
  const validateBasicInfo = (): boolean => {
    if (!basicInfo.eventName.trim()) {
      return false
    }
    
    if (basicInfo.eventName.trim().length < 2) {
      return false
    }
    
    if (!basicInfo.organizerEmail.trim()) {
      return false
    }
    
    if (!validateEmail(basicInfo.organizerEmail.trim())) {
      return false
    }
    
    const interviewLength = Number(basicInfo.interviewLength)
    if (!interviewLength || interviewLength < 15) {
      return false
    }
    
    if (interviewLength > 300) {
      return false
    }
    
    const simultaneousCount = Number(basicInfo.simultaneousCount)
    if (!simultaneousCount || simultaneousCount < 1) {
      return false
    }
    
    if (simultaneousCount > 50) {
      return false
    }
    
    return true
  }

  const handleBasicInfoSubmit = () => {
    if (!validateBasicInfo()) {
      return
    }
    setCurrentStep("available-times")
  }

  const handleDateSelect = (date: Date) => {
    const existingIndex = availableTimes.findIndex((time) => time.date.toDateString() === date.toDateString())

    if (existingIndex >= 0) {
      // Remove the date if already selected
      setAvailableTimes((prev) => prev.filter((_, index) => index !== existingIndex))
      // If this was the selected date, clear selection
      if (selectedDate?.toDateString() === date.toDateString()) {
        setSelectedDate(null)
      }
    } else {
      // Add new date
      setSelectedDate(date)
      setAvailableTimes((prev) => [...prev, { date, slots: [] }].sort((a, b) => a.date.getTime() - b.date.getTime()))
    }
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

  const addCandidate = () => {
    setCandidates((prev) => [...prev, { name: "", phone: "", email: "" }])
  }

  const updateCandidate = (index: number, field: keyof Candidate, value: string) => {
    setCandidates((prev) => prev.map((candidate, i) => (i === index ? { ...candidate, [field]: value } : candidate)))
  }

  const removeCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

      const newCandidates: Candidate[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        const candidate: Candidate = { name: "", phone: "", email: "" }

        headers.forEach((header, index) => {
          if (header.includes("name") || header.includes("이름")) {
            candidate.name = values[index] || ""
          } else if (header.includes("phone") || header.includes("전화")) {
            candidate.phone = values[index] || ""
          } else if (header.includes("email") || header.includes("이메일")) {
            candidate.email = values[index] || ""
          }
        })

        if (candidate.name && candidate.email) {
          newCandidates.push(candidate)
        }
      }

      setCandidates((prev) => [...prev, ...newCandidates])
    }
    reader.readAsText(file)
  }

  const getTotalSlots = () => {
    return availableTimes.reduce((total, time) => total + time.slots.length, 0)
  }

  const getMaxCapacity = () => {
    const interviewLength = typeof basicInfo.interviewLength === "number" ? basicInfo.interviewLength : 30
    const simultaneousCount = typeof basicInfo.simultaneousCount === "number" ? basicInfo.simultaneousCount : 1

    let totalCapacity = 0

    // Process each date's time slots
    availableTimes.forEach(availableTime => {
      if (availableTime.slots.length === 0) return

      // Sort slots by start time and merge consecutive slots
      const sortedSlots = availableTime.slots
        .map(slot => ({ start: slot.start, startMinutes: timeToMinutes(slot.start) }))
        .sort((a, b) => a.startMinutes - b.startMinutes)

      // Group consecutive slots into continuous time ranges
      const timeRanges = []
      let currentRange = { start: sortedSlots[0].startMinutes, end: sortedSlots[0].startMinutes + 30 }

      for (let i = 1; i < sortedSlots.length; i++) {
        const slot = sortedSlots[i]
        
        if (slot.startMinutes === currentRange.end) {
          // Consecutive slot - extend current range
          currentRange.end = slot.startMinutes + 30
        } else {
          // Non-consecutive slot - save current range and start new one
          timeRanges.push(currentRange)
          currentRange = { start: slot.startMinutes, end: slot.startMinutes + 30 }
        }
      }
      timeRanges.push(currentRange) // Add the last range

      // Calculate capacity for each continuous time range
      timeRanges.forEach(range => {
        const totalMinutes = range.end - range.start
        const possibleInterviews = Math.floor(totalMinutes / interviewLength)
        totalCapacity += possibleInterviews * simultaneousCount
      })
    })

    return totalCapacity
  }

  const formatTimeRanges = (slots: any[]) => {
    if (slots.length === 0) return ""

    // Extract start times from slot objects and sort them
    const startTimes = slots
      .map((slot) => (typeof slot === "object" && slot.start ? slot.start : slot))
      .filter((time) => typeof time === "string")
      .sort()

    if (startTimes.length === 0) return ""

    const ranges: string[] = []
    let rangeStart = startTimes[0]
    let currentEnd = startTimes[0]

    // Find the end time for the current range by looking at consecutive slots
    for (let i = 0; i < startTimes.length; i++) {
      const currentTime = startTimes[i]
      const currentMinutes = timeToMinutes(currentTime)

      if (i === 0) {
        rangeStart = currentTime
        currentEnd = currentTime
      } else {
        const prevMinutes = timeToMinutes(startTimes[i - 1])

        // Check if current time is consecutive (30 minutes after previous)
        if (currentMinutes === prevMinutes + 30) {
          currentEnd = currentTime
        } else {
          // End current range and start new one
          const endTime = addMinutesToTime(currentEnd, 30)
          if (rangeStart === currentEnd) {
            ranges.push(`${rangeStart}~${endTime}`)
          } else {
            const rangeEndTime = addMinutesToTime(currentEnd, 30)
            ranges.push(`${rangeStart}~${rangeEndTime}`)
          }
          rangeStart = currentTime
          currentEnd = currentTime
        }
      }
    }

    // Add final range
    const finalEndTime = addMinutesToTime(currentEnd, 30)
    if (rangeStart === currentEnd) {
      ranges.push(`${rangeStart}~${finalEndTime}`)
    } else {
      ranges.push(`${rangeStart}~${finalEndTime}`)
    }

    return ranges.join(", ")
  }

  const addMinutesToTime = (timeString: string, minutesToAdd: number) => {
    const [hours, minutes] = timeString.split(":").map(Number)
    const totalMinutes = hours * 60 + minutes + minutesToAdd
    const newHours = Math.floor(totalMinutes / 60)
    const newMinutes = totalMinutes % 60
    return `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`
  }

  const timeToMinutes = (timeString: string | any) => {
    const timeStr = typeof timeString === "string" ? timeString : String(timeString)

    if (!timeStr || !timeStr.includes(":")) {
      return 0
    }

    const [hours, minutes] = timeStr.split(":").map(Number)
    return hours * 60 + minutes
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "basic-info":
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">기본 정보</h2>
              <p className="text-gray-600">면접 일정의 기본 정보를 입력해주세요.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이벤트명 *</label>
                <input
                  type="text"
                  value={basicInfo.eventName}
                  onChange={(e) => {
                    setBasicInfo((prev) => ({ ...prev, eventName: e.target.value }))
                    setTouched((prev) => ({ ...prev, eventName: true }))
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, eventName: true }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    touched.eventName && (!basicInfo.eventName.trim() || (basicInfo.eventName.trim() && basicInfo.eventName.trim().length < 2))
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="학부대학 CES 실리콘밸리 면접"
                />
                {touched.eventName && !basicInfo.eventName.trim() && (
                  <p className="mt-1 text-sm text-red-600">이벤트명을 입력해주세요.</p>
                )}
                {touched.eventName && basicInfo.eventName.trim() && basicInfo.eventName.trim().length < 2 && (
                  <p className="mt-1 text-sm text-red-600">이벤트명은 2글자 이상이어야 합니다.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">면접 길이 (분) *</label>
                  <input
                    type="number"
                    value={basicInfo.interviewLength}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        setBasicInfo((prev) => ({ ...prev, interviewLength: "" as any }))
                      } else {
                        const numValue = Number.parseInt(value)
                        if (!isNaN(numValue)) {
                          setBasicInfo((prev) => ({ ...prev, interviewLength: numValue }))
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "") {
                        setBasicInfo((prev) => ({ ...prev, interviewLength: 20 }))
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      basicInfo.interviewLength && (Number(basicInfo.interviewLength) < 15 || Number(basicInfo.interviewLength) > 300)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    min="15"
                    step="15"
                  />
                  {basicInfo.interviewLength && Number(basicInfo.interviewLength) < 15 && (
                    <p className="mt-1 text-sm text-red-600">면접 길이는 15분 이상이어야 합니다.</p>
                  )}
                  {basicInfo.interviewLength && Number(basicInfo.interviewLength) > 300 && (
                    <p className="mt-1 text-sm text-red-600">면접 길이는 300분을 초과할 수 없습니다.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">동시 인원 *</label>
                  <input
                    type="number"
                    value={basicInfo.simultaneousCount}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        setBasicInfo((prev) => ({ ...prev, simultaneousCount: "" as any }))
                      } else {
                        const numValue = Number.parseInt(value)
                        if (!isNaN(numValue)) {
                          setBasicInfo((prev) => ({ ...prev, simultaneousCount: numValue }))
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "") {
                        setBasicInfo((prev) => ({ ...prev, simultaneousCount: 1 }))
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      basicInfo.simultaneousCount && (Number(basicInfo.simultaneousCount) < 1 || Number(basicInfo.simultaneousCount) > 50)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    min="1"
                  />
                  {basicInfo.simultaneousCount && Number(basicInfo.simultaneousCount) < 1 && (
                    <p className="mt-1 text-sm text-red-600">동시 인원은 1명 이상이어야 합니다.</p>
                  )}
                  {basicInfo.simultaneousCount && Number(basicInfo.simultaneousCount) > 50 && (
                    <p className="mt-1 text-sm text-red-600">동시 인원은 50명을 초과할 수 없습니다.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">주최자 이메일 *</label>
                <input
                  type="email"
                  value={basicInfo.organizerEmail}
                  onChange={(e) => {
                    setBasicInfo((prev) => ({ ...prev, organizerEmail: e.target.value }))
                    setTouched((prev) => ({ ...prev, organizerEmail: true }))
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, organizerEmail: true }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    touched.organizerEmail && (!basicInfo.organizerEmail.trim() || (basicInfo.organizerEmail.trim() && !validateEmail(basicInfo.organizerEmail.trim())))
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="주최자 이메일 (자동 입력됨)"
                />
                {touched.organizerEmail && !basicInfo.organizerEmail.trim() && (
                  <p className="mt-1 text-sm text-red-600">주최자 이메일을 입력해주세요.</p>
                )}
                {touched.organizerEmail && basicInfo.organizerEmail.trim() && !validateEmail(basicInfo.organizerEmail.trim()) && (
                  <p className="mt-1 text-sm text-red-600">올바른 이메일 형식을 입력해주세요.</p>
                )}
              </div>
            </div>

            <button
              onClick={handleBasicInfoSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              다음
            </button>
          </div>
        )

      case "available-times":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">가용 시간 입력</h2>
              <p className="text-gray-600">면접 가능한 날짜와 시간을 드래그로 선택해주세요.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Calendar */}
              <div className="lg:col-span-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">날짜 선택</h3>
                <CalendarGrid
                  currentMonth={currentMonth}
                  selectedDates={availableTimes.map((time) => time.date)}
                  onDateSelect={handleDateSelect}
                  onMonthNavigate={handleMonthNavigate}
                  size="compact"
                />

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">시간 범위 설정</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">시작 시간</label>
                      <select
                        value={timeRange.startTime}
                        onChange={(e) => setTimeRange((prev) => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Array.from({ length: 48 }, (_, i) => {
                          const totalMinutes = i * 30
                          const hour = Math.floor(totalMinutes / 60)
                          const minute = totalMinutes % 60
                          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
                          return (
                            <option key={`start-${timeString}`} value={timeString}>
                              {timeString}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">종료 시간</label>
                      <select
                        value={timeRange.endTime}
                        onChange={(e) => setTimeRange((prev) => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Array.from({ length: 48 }, (_, i) => {
                          const totalMinutes = i * 30
                          const hour = Math.floor(totalMinutes / 60)
                          const minute = totalMinutes % 60
                          const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
                          return (
                            <option key={`end-${timeString}`} value={timeString}>
                              {timeString}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Table */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">시간 선택 (드래그로 선택)</h3>
                {availableTimes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p>먼저 날짜를 선택해주세요</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table-fixed min-w-max">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-0 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
                            {availableTimes.map((availableTime, index) => (
                              <th
                                key={index}
                                className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap"
                              >
                                {availableTime.date.toLocaleDateString("ko-KR", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {timeSlots.map((time, timeIndex) => (
                            <tr key={time}>
                              <td className="px-0 py-0 text-[10px] text-gray-600 font-mono border-r border-gray-200 w-16 bg-gray-50 text-center relative z-10">
                                <div className="relative -top-2">{time}</div>
                              </td>
                              {availableTimes.map((availableTime, dateIndex) => {
                                const timeIndex = timeSlots.indexOf(time)
                                const cellState = dragSelection.getCellState(dateIndex, timeIndex)
                                
                                let cellClassName = "h-6 cursor-pointer select-none border-b border-gray-200 "
                                
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

                                return (
                                  <td key={dateIndex} className="px-0 py-0 border-r border-gray-200 w-16">
                                    <div
                                      className={cellClassName}
                                      data-slot-id={`${dateIndex}-${timeIndex}`}
                                      onMouseDown={() => dragSelection.handleTimeSlotMouseDown(dateIndex, timeIndex)}
                                      onMouseEnter={() => dragSelection.handleTimeSlotMouseEnter(dateIndex, timeIndex)}
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

              {/* Summary */}
              <div className="lg:col-span-1 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">요약</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">선택된 날짜</p>
                      <p className="text-lg font-semibold text-gray-900">{availableTimes.length}일</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">최대 수용 인원</p>
                      <p className="text-lg font-semibold text-gray-900">{getMaxCapacity()}명</p>
                    </div>
                  </div>
                </div>

                {availableTimes.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">선택된 시간</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableTimes.map((time, index) => (
                        <div key={index} className="text-xs">
                          <p className="font-medium text-gray-800">{time.date.toLocaleDateString("ko-KR")}</p>
                          <p className="text-gray-600">{formatTimeRanges(time.slots)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep("basic-info")}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => {
                  if (!validateAvailableTimes()) {
                    return
                  }
                  setCurrentStep("candidates")
                }}
                disabled={availableTimes.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        )

      case "candidates":
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">지원자 등록</h2>
              <p className="text-gray-600">면접 대상자들을 등록해주세요.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">CSV 파일 업로드</h3>
              <p className="text-sm text-gray-600 mb-4">
                이름, 전화번호, 이메일 컬럼이 포함된 CSV 파일을 업로드하세요.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">파일 선택</span>
                <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
              </label>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">수기 입력</h3>
                <button
                  onClick={addCandidate}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  지원자 추가
                </button>
              </div>

              {candidates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>등록된 지원자가 없습니다.</p>
                  <p className="text-sm">CSV 파일을 업로드하거나 수기로 추가해주세요.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {candidates.map((candidate, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <input
                            type="text"
                            placeholder="이름 *"
                            value={candidate.name}
                            onChange={(e) => updateCandidate(index, "name", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              candidate.name.trim() && candidate.name.trim().length < 2
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                            }`}
                          />
                          {candidate.name.trim() && candidate.name.trim().length < 2 && (
                            <p className="mt-1 text-xs text-red-600">2글자 이상 입력해주세요.</p>
                          )}
                        </div>
                        <div>
                          <input
                            type="tel"
                            placeholder="전화번호 (선택)"
                            value={candidate.phone}
                            onChange={(e) => updateCandidate(index, "phone", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              candidate.phone.trim() && !validatePhone(candidate.phone.trim())
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                            }`}
                          />
                          {candidate.phone.trim() && !validatePhone(candidate.phone.trim()) && (
                            <p className="mt-1 text-xs text-red-600">올바른 전화번호 형식을 입력해주세요. (예: 010-1234-5678)</p>
                          )}
                        </div>
                        <div>
                          <input
                            type="email"
                            placeholder="이메일 *"
                            value={candidate.email}
                            onChange={(e) => updateCandidate(index, "email", e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              candidate.email.trim() && !validateEmail(candidate.email.trim())
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-300 bg-white'
                            }`}
                          />
                          {candidate.email.trim() && !validateEmail(candidate.email.trim()) && (
                            <p className="mt-1 text-xs text-red-600">올바른 이메일 형식을 입력해주세요.</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeCandidate(index)}
                          className="flex items-center justify-center px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors h-fit"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep("available-times")}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => {
                  if (!validateCandidates()) {
                    return
                  }
                  setCurrentStep("review")
                }}
                disabled={candidates.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                다음
              </button>
            </div>
          </div>
        )

      case "review":
        return (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">검토 & 발송</h2>
              <p className="text-gray-600">설정한 내용을 확인하고 마감일시와 알림 설정을 완료하세요.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">마감일시 및 알림 설정</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">마감 일시 (KST) *</label>
                  <input
                    type="datetime-local"
                    value={reviewSettings.deadline}
                    onChange={(e) => setReviewSettings((prev) => ({ ...prev, deadline: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition-all duration-200 hover:border-gray-400 focus:shadow-md text-gray-900 font-medium
                      [&::-webkit-calendar-picker-indicator]:opacity-100 
                      [&::-webkit-calendar-picker-indicator]:cursor-pointer
                      [&::-webkit-calendar-picker-indicator]:rounded-lg
                      [&::-webkit-calendar-picker-indicator]:p-2
                      [&::-webkit-calendar-picker-indicator]:hover:bg-blue-50
                      [&::-webkit-calendar-picker-indicator]:transition-colors
                      [&::-webkit-datetime-edit]:text-gray-900
                      [&::-webkit-datetime-edit-fields-wrapper]:gap-2
                      [&::-webkit-datetime-edit-text]:text-gray-500
                      [&::-webkit-datetime-edit-month-field]:bg-gray-50
                      [&::-webkit-datetime-edit-month-field]:rounded
                      [&::-webkit-datetime-edit-month-field]:px-1
                      [&::-webkit-datetime-edit-day-field]:bg-gray-50
                      [&::-webkit-datetime-edit-day-field]:rounded
                      [&::-webkit-datetime-edit-day-field]:px-1
                      [&::-webkit-datetime-edit-year-field]:bg-gray-50
                      [&::-webkit-datetime-edit-year-field]:rounded
                      [&::-webkit-datetime-edit-year-field]:px-1
                      [&::-webkit-datetime-edit-hour-field]:bg-blue-50
                      [&::-webkit-datetime-edit-hour-field]:rounded
                      [&::-webkit-datetime-edit-hour-field]:px-1
                      [&::-webkit-datetime-edit-minute-field]:bg-blue-50
                      [&::-webkit-datetime-edit-minute-field]:rounded
                      [&::-webkit-datetime-edit-minute-field]:px-1 ${
                      reviewSettings.deadline && new Date(reviewSettings.deadline) <= new Date()
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {reviewSettings.deadline && new Date(reviewSettings.deadline) <= new Date() && (
                    <p className="mt-1 text-sm text-red-600">마감일시는 현재 시점보다 미래여야 합니다.</p>
                  )}
                  {reviewSettings.deadline && availableTimes.length > 0 && (() => {
                    const deadlineDate = new Date(reviewSettings.deadline)
                    const earliestInterviewDate = Math.min(...availableTimes.map(time => time.date.getTime()))
                    return deadlineDate.getTime() >= earliestInterviewDate && (
                      <p className="mt-1 text-sm text-red-600">마감일시는 면접 날짜보다 이전이어야 합니다.</p>
                    )
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">리마인드 알림</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={reviewSettings.reminderOptions.oneDayBefore}
                        onChange={(e) =>
                          setReviewSettings((prev) => ({
                            ...prev,
                            reminderOptions: { ...prev.reminderOptions, oneDayBefore: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">면접 1일 전 알림</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={reviewSettings.reminderOptions.threeHoursBefore}
                        onChange={(e) =>
                          setReviewSettings((prev) => ({
                            ...prev,
                            reminderOptions: { ...prev.reminderOptions, threeHoursBefore: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">면접 3시간 전 알림</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={reviewSettings.reminderOptions.oneHourBefore}
                        onChange={(e) =>
                          setReviewSettings((prev) => ({
                            ...prev,
                            reminderOptions: { ...prev.reminderOptions, oneHourBefore: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">면접 1시간 전 알림</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">이벤트명</p>
                    <p className="font-medium text-gray-900">{basicInfo.eventName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">면접 길이</p>
                      <p className="font-medium text-gray-900">{basicInfo.interviewLength}분</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">동시 인원</p>
                      <p className="font-medium text-gray-900">{basicInfo.simultaneousCount}명</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">마감 일시</p>
                    <p className="font-medium text-gray-900">
                      {reviewSettings.deadline ? new Date(reviewSettings.deadline).toLocaleString("ko-KR") : "미설정"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">주최자 이메일</p>
                    <p className="font-medium text-gray-900">{basicInfo.organizerEmail}</p>
                  </div>
                </div>
              </div>

              {/* Available Times Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">가용 시간</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{availableTimes.length}</p>
                      <p className="text-sm text-gray-600">날짜</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{getTotalSlots()}</p>
                      <p className="text-sm text-gray-600">슬롯</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{getMaxCapacity()}</p>
                      <p className="text-sm text-gray-600">최대 수용</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Candidates Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">지원자</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">총 지원자 수</span>
                    <span className="font-medium text-gray-900">{candidates.length}명</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">수용 가능 여부</span>
                    <span
                      className={`font-medium ${candidates.length <= getMaxCapacity() ? "text-green-600" : "text-red-600"}`}
                    >
                      {candidates.length <= getMaxCapacity() ? "수용 가능" : "수용 초과"}
                    </span>
                  </div>
                  {candidates.length > getMaxCapacity() && (
                    <p className="text-sm text-red-600">{candidates.length - getMaxCapacity()}명이 초과되었습니다.</p>
                  )}
                </div>
              </div>

              {/* Send Options */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">발송 옵션</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sendOptions.sendEmail}
                      onChange={(e) =>
                        setSendOptions((prev) => ({ ...prev, sendEmail: e.target.checked }))
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">지원자에게 초대 이메일 발송</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sendOptions.generateLink}
                      onChange={(e) =>
                        setSendOptions((prev) => ({ ...prev, generateLink: e.target.checked }))
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">공유용 링크 생성 및 복사</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep("candidates")}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                이전
              </button>
              <button
                onClick={handleCreateInterviewEvent}
                disabled={isCreating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isCreating ? "생성 중..." : "면접 이벤트 생성"}
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const handleStepNavigation = (stepKey: Step) => {
    const stepOrder = ["basic-info", "available-times", "candidates", "review"]
    const currentStepIndex = stepOrder.indexOf(currentStep)
    const targetStepIndex = stepOrder.indexOf(stepKey)

    // Only allow navigation to current step or previous steps
    if (targetStepIndex <= currentStepIndex) {
      setCurrentStep(stepKey)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader>
        <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-semibold text-gray-900">면접 일정 생성</h1>

            {/* Step Indicator */}
            <div className="flex items-center space-x-4">
              {[
                { key: "basic-info", label: "기본정보" },
                { key: "available-times", label: "가용시간" },
                { key: "candidates", label: "지원자" },
                { key: "review", label: "검토" },
              ].map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <div
                    onClick={() => handleStepNavigation(step.key as Step)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                      currentStep === step.key
                        ? "bg-blue-600 text-white"
                        : Object.keys({ "basic-info": 1, "available-times": 2, candidates: 3, review: 4 }).indexOf(
                              currentStep,
                            ) > index
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:block">{step.label}</span>
                  {index < 3 && <ChevronRight className="w-4 h-4 text-gray-400 ml-4" />}
                </div>
              ))}
            </div>
        </div>
      </AppHeader>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
    </ProtectedRoute>
  )
}
