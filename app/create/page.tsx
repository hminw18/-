"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronRight, Upload, X, Plus, Calendar, Users, Mail, Clock, Eye } from "lucide-react"
import toast from 'react-hot-toast'
import CalendarGrid from "../../components/calendar/calendar-grid"
import useDragSelection from "../../hooks/useDragSelection"
import { createInterviewEvent } from "../../lib/database"
import ProtectedRoute from "../../components/auth/ProtectedRoute"
import { useAuth } from "../../contexts/AuthContext"
import AppHeader from "../../components/ui/app-header"
import { formatDate } from "../../utils/calendar"
import { getUserPlan, canCreateInterview, canAddCandidates, getPlanLimitMessage, canSendEmail, getUserEmailSettings } from "../../utils/plan"
import { sendInterviewInviteEmails, validateEmailList } from "../../utils/email"
import EmailPreviewModal, { CustomEmailTemplate } from "../../components/email/EmailPreviewModal"

interface BasicInfo {
  eventName: string
  description: string
  interviewLength: string | number
  bufferTime: string | number
  simultaneousCount: string | number
  organizerName: string
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
    description: "",
    interviewLength: 30,
    bufferTime: 10,
    simultaneousCount: 1,
    organizerName: "",
    organizerEmail: "",
  })
  const [touched, setTouched] = useState({
    eventName: false,
    description: false,
    interviewLength: false,
    simultaneousCount: false,
    organizerName: false,
    organizerEmail: false,
  })
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null)
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
    deadline: '', // 클라이언트에서 설정
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
  const [userPlan] = useState(() => getUserPlan())
  const [minDateTime, setMinDateTime] = useState('')
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [customEmailTemplate, setCustomEmailTemplate] = useState<CustomEmailTemplate | null>(null)

  // 클라이언트에서만 초기값 설정 (hydration 오류 방지)
  useEffect(() => {
    setCurrentMonth(new Date())
    setMinDateTime(new Date().toISOString().slice(0, 16))
    setReviewSettings(prev => ({
      ...prev,
      deadline: getDefaultDeadline()
    }))
  }, [])

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

  // 페이지 새로고침/종료 경고
  useEffect(() => {
    // 데이터가 입력되었는지 확인하는 함수
    const hasData = () => {
      return basicInfo.eventName.trim() || 
             basicInfo.description.trim() ||
             basicInfo.organizerEmail.trim() ||
             candidates.length > 0 ||
             availableTimes.length > 0
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasData()) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [basicInfo, candidates, availableTimes])

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
    
    // 수용 인원 초과 검사
    const maxCapacity = getMaxCapacity()
    if (candidates.length > maxCapacity) {
      toast.error(`지원자 수(${candidates.length}명)가 최대 수용 인원(${maxCapacity}명)을 초과합니다.`)
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
    
    // 현재 시점과 정확한 시간 비교 (밀리초 단위)
    if (deadlineDate.getTime() <= now.getTime()) {
      toast.error("마감일시는 현재 시점보다 미래여야 합니다.")
      return false
    }
    
    // 가장 빠른 면접 시작 시간 확인 (날짜 + 시간 조합)
    let earliestInterviewDateTime = Number.MAX_SAFE_INTEGER
    
    availableTimes.forEach(time => {
      if (time.slots.length > 0) {
        const earliestSlot = time.slots.reduce((earliest, current) => {
          const currentMinutes = timeToMinutes(current.start)
          const earliestMinutes = timeToMinutes(earliest.start)
          return currentMinutes < earliestMinutes ? current : earliest
        })
        
        // 날짜와 시간을 조합해서 정확한 DateTime 계산
        const interviewDate = new Date(time.date)
        const [hours, minutes] = earliestSlot.start.split(':').map(Number)
        interviewDate.setHours(hours, minutes, 0, 0)
        
        if (interviewDate.getTime() < earliestInterviewDateTime) {
          earliestInterviewDateTime = interviewDate.getTime()
        }
      }
    })
    
    if (deadlineDate.getTime() >= earliestInterviewDateTime) {
      toast.error("마감일시는 가장 빠른 면접 시작 시간보다 이전이어야 합니다.")
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
    // 중복 클릭 방지
    if (isCreating) {
      return
    }

    // 플랜 제한 검사
    if (!canCreateInterview(userPlan)) {
      toast.error(getPlanLimitMessage(userPlan, 'interviews'))
      return
    }

    // 종합 유효성 검사
    if (!validateAll()) {
      return
    }

    setIsCreating(true)

    try {
      const result = await createInterviewEvent({
        eventName: basicInfo.eventName,
        description: basicInfo.description,
        organizerName: basicInfo.organizerName,
        organizerEmail: basicInfo.organizerEmail,
        interviewLength: Number(basicInfo.interviewLength),
        bufferTime: Number(basicInfo.bufferTime),
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
        
        // 이메일 발송 처리
        if (sendOptions.sendEmail) {
          try {
            // 유효한 후보자만 필터링
            const emailCandidates = candidates
              .filter(c => c.name.trim() && c.email.trim())
              .map(c => ({ name: c.name.trim(), email: c.email.trim() }))
            
            const { valid, invalid } = validateEmailList(emailCandidates)
            
            if (valid.length > 0) {
              const userEmailSettings = getUserEmailSettings()
              const emailData = {
                title: basicInfo.eventName,
                organizerName: basicInfo.organizerName,
                organizerEmail: basicInfo.organizerEmail,
                deadlineDate: reviewSettings.deadline,
                eventId: result.event.id,
                fromName: userEmailSettings.fromName,
                fromEmail: userEmailSettings.fromEmail,
                customTemplate: customEmailTemplate || undefined,
              }
              
              console.log('Sending emails to:', valid)
              const emailResult = await sendInterviewInviteEmails(valid, emailData)
              console.log('Email send result:', emailResult)
              
              if (emailResult.success) {
                actions.push(`초대 이메일 발송 (${emailResult.sent}명)`)
                console.log('All emails sent successfully')
              } else {
                actions.push(`초대 이메일 발송 (${emailResult.sent}명 성공, ${emailResult.failed}명 실패)`)
                if (emailResult.errors.length > 0) {
                  console.error('Email send errors:', emailResult.errors)
                  // 에러 상세 정보를 토스트로 표시
                  emailResult.errors.forEach(error => {
                    toast.error(`${error.email}: ${error.error}`)
                  })
                }
              }
            }
            
            if (invalid.length > 0) {
              toast.warning(`${invalid.length}명의 유효하지 않은 이메일 주소가 발견되어 메일을 발송하지 않았습니다.`)
            }
          } catch (emailError) {
            console.error('Email sending failed:', emailError)
            toast.error('이메일 발송 중 오류가 발생했습니다.')
          }
        }
        
        if (sendOptions.generateLink && result.shareToken) {
          actions.push("공유 링크 생성")
        }

        if (result.shareToken) {
          console.log("공유 링크:", `${window.location.origin}/respond/${result.shareToken}`)
        }

        // 성공 메시지 표시
        if (actions.length > 0) {
          toast.success(`면접 이벤트가 성공적으로 생성되었습니다!\n\n완료된 작업:\n• ${actions.join("\n• ")}`)
        } else {
          toast.success('면접 이벤트가 성공적으로 생성되었습니다!')
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
    
    if (!basicInfo.organizerName.trim()) {
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
    if (!canAddCandidates(userPlan, candidates.length)) {
      toast.error(getPlanLimitMessage(userPlan, 'candidates'))
      return
    }
    setCandidates((prev) => [{ name: "", phone: "", email: "" }, ...prev])
  }

  const updateCandidate = (index: number, field: keyof Candidate, value: string) => {
    setCandidates((prev) => prev.map((candidate, i) => (i === index ? { ...candidate, [field]: value } : candidate)))
  }

  const removeCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index))
  }

  const handleEmailTemplateSave = (template: CustomEmailTemplate) => {
    setCustomEmailTemplate(template)
    toast.success('이메일 템플릿이 저장되었습니다.')
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 크기 제한 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("파일 크기는 2MB 이하여야 합니다.")
      return
    }

    // 파일 확장자 확인
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error("CSV 파일만 업로드 가능합니다.")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split("\n").filter((line) => line.trim())
        
        if (lines.length < 2) {
          toast.error("CSV 파일에 데이터가 없습니다.")
          return
        }

        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
        
        // 지원되는 헤더 패턴 정의 (문서화된 조건에 맞춤)
        const nameHeaders = ['name', '이름']
        const emailHeaders = ['email', '이메일', '메일']
        const phoneHeaders = ['phone', '전화', '휴대폰', 'mobile', '전화번호', '휴대폰번호', '번호']
        
        // 헤더 검증 - 정확한 매칭
        const hasName = headers.some(h => nameHeaders.includes(h))
        const hasEmail = headers.some(h => emailHeaders.includes(h))
        
        if (!hasName || !hasEmail) {
          toast.error(`CSV 파일에 필수 컬럼이 없습니다.\n필요: 이름(${nameHeaders.join('/')}) + 이메일(${emailHeaders.join('/')})`)
          return
        }

        const newCandidates: Candidate[] = []
        const failedRows: number[] = []

        // 플랜 제한 체크
        const totalCandidatesAfterUpload = candidates.length + (lines.length - 1)
        if (!canAddCandidates(userPlan, candidates.length, lines.length - 1)) {
          toast.error(getPlanLimitMessage(userPlan, 'candidates') + ` (현재: ${candidates.length}명, 업로드: ${lines.length - 1}명)`)
          return
        }

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ''))
          const candidate: Candidate = { name: "", phone: "", email: "" }

          headers.forEach((header, index) => {
            const value = values[index] || ""
            // 정확한 헤더 매칭 사용
            if (nameHeaders.includes(header)) {
              candidate.name = value
            } else if (phoneHeaders.includes(header)) {
              candidate.phone = value
            } else if (emailHeaders.includes(header)) {
              candidate.email = value
            }
          })

          // 기본 검증
          if (candidate.name.trim() && candidate.email.trim()) {
            // 이메일 형식 검증
            if (validateEmail(candidate.email)) {
              newCandidates.push(candidate)
            } else {
              failedRows.push(i + 1)
            }
          } else {
            failedRows.push(i + 1)
          }
        }

        if (newCandidates.length === 0) {
          toast.error("유효한 데이터가 없습니다. 이름과 올바른 이메일이 필요합니다.")
          return
        }

        // 중복 이메일 제거
        const existingEmails = candidates.map(c => c.email.toLowerCase())
        const uniqueNewCandidates = newCandidates.filter(candidate => 
          !existingEmails.includes(candidate.email.toLowerCase())
        )
        
        const duplicateCount = newCandidates.length - uniqueNewCandidates.length

        // 기존 지원자 목록에 새 지원자들 추가
        setCandidates((prev) => [...prev, ...uniqueNewCandidates])

        // 결과 메시지
        let message = `${uniqueNewCandidates.length}명의 지원자가 추가되었습니다.`
        if (duplicateCount > 0) {
          message += ` (${duplicateCount}명 중복 제외)`
        }
        if (failedRows.length > 0) {
          message += ` (${failedRows.length}개 행 실패)`
        }
        
        toast.success(message)

        if (failedRows.length > 0) {
          console.warn("실패한 행:", failedRows)
        }

      } catch (error) {
        console.error("CSV 파일 처리 오류:", error)
        toast.error("CSV 파일 처리 중 오류가 발생했습니다.")
      }
    }

    reader.onerror = () => {
      toast.error("파일 읽기에 실패했습니다.")
    }

    reader.readAsText(file, 'UTF-8')
    
    // 파일 입력 초기화 (같은 파일 재업로드 가능하도록)
    event.target.value = ''
  }

  const getTotalSlots = () => {
    return availableTimes.reduce((total, time) => total + time.slots.length, 0)
  }

  const getMaxInterviewSessions = () => {
    const interviewLength = typeof basicInfo.interviewLength === "number" ? basicInfo.interviewLength : 30
    const bufferTime = typeof basicInfo.bufferTime === "number" ? basicInfo.bufferTime : 10
    const totalInterviewTime = interviewLength + bufferTime // 면접시간 + 버퍼시간
    let totalSessions = 0

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

      // Calculate sessions for each continuous time range (버퍼 시간 포함)
      timeRanges.forEach(range => {
        const totalMinutes = range.end - range.start
        // 마지막 면접에는 버퍼 시간이 불필요하므로 (총시간 + 버퍼시간) / (면접시간 + 버퍼시간) 공식 사용
        const possibleSessions = Math.floor((totalMinutes + bufferTime) / totalInterviewTime)
        totalSessions += possibleSessions
      })
    })

    return totalSessions
  }

  const getMaxCapacity = () => {
    const simultaneousCount = typeof basicInfo.simultaneousCount === "number" ? basicInfo.simultaneousCount : 1
    return getMaxInterviewSessions() * simultaneousCount
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
                  placeholder="한시에 면접"
                />
                {touched.eventName && !basicInfo.eventName.trim() && (
                  <p className="mt-1 text-sm text-red-600">이벤트명을 입력해주세요.</p>
                )}
                {touched.eventName && basicInfo.eventName.trim() && basicInfo.eventName.trim().length < 2 && (
                  <p className="mt-1 text-sm text-red-600">이벤트명은 2글자 이상이어야 합니다.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">면접 설명</label>
                <textarea
                  value={basicInfo.description}
                  onChange={(e) => {
                    setBasicInfo((prev) => ({ ...prev, description: e.target.value }))
                    setTouched((prev) => ({ ...prev, description: true }))
                  }}
                  onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="면접에 대한 간단한 설명을 입력해주세요 (선택사항)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">버퍼 시간 (분) *</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={basicInfo.bufferTime}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        setBasicInfo((prev) => ({ ...prev, bufferTime: 0 }))
                      } else {
                        const numValue = Number.parseInt(value)
                        if (numValue >= 0 && numValue <= 60) {
                          setBasicInfo((prev) => ({ ...prev, bufferTime: numValue }))
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10"
                  />
                  <p className="mt-1 text-xs text-gray-500">면접 사이의 준비 시간 </p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">담당자 이름 *</label>
                  <input
                    type="text"
                    value={basicInfo.organizerName}
                    onChange={(e) => {
                      setBasicInfo((prev) => ({ ...prev, organizerName: e.target.value }))
                      setTouched((prev) => ({ ...prev, organizerName: true }))
                    }}
                    onBlur={() => setTouched((prev) => ({ ...prev, organizerName: true }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      touched.organizerName && !basicInfo.organizerName.trim()
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300'
                    }`}
                    placeholder="담당자 이름"
                  />
                  {touched.organizerName && !basicInfo.organizerName.trim() && (
                    <p className="mt-1 text-sm text-red-600">담당자 이름을 입력해주세요.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">담당자 이메일 *</label>
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
                    placeholder="담당자 이메일 (자동 입력됨)"
                  />
                  {touched.organizerEmail && !basicInfo.organizerEmail.trim() && (
                    <p className="mt-1 text-sm text-red-600">담당자 이메일을 입력해주세요.</p>
                  )}
                  {touched.organizerEmail && basicInfo.organizerEmail.trim() && !validateEmail(basicInfo.organizerEmail.trim()) && (
                    <p className="mt-1 text-sm text-red-600">올바른 이메일 형식을 입력해주세요.</p>
                  )}
                </div>
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
                {currentMonth && (
                  <CalendarGrid
                    currentMonth={currentMonth}
                    selectedDates={availableTimes.map((time) => time.date)}
                    onDateSelect={handleDateSelect}
                    onMonthNavigate={handleMonthNavigate}
                    size="compact"
                  />
                )}

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
                    <Clock className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">최대 면접 진행</p>
                      <p className="text-lg font-semibold text-gray-900">{getMaxInterviewSessions()}회</p>
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">CSV 파일 업로드</h3>
              <p className="text-sm text-gray-600 mb-4">
                여러 지원자를 한번에 등록하려면 CSV 파일을 업로드하세요. 업로드된 데이터는 아래 수기 입력 칸에 자동으로 추가됩니다.
              </p>
              
              <div className="mb-4 p-3 bg-white rounded-lg border border-blue-100">
                <h4 className="text-sm font-medium text-gray-900 mb-2">CSV 파일 형식 예시:</h4>
                <div className="text-xs font-mono bg-gray-100 p-2 rounded border overflow-x-auto">
                  <div className="text-gray-600">이름,이메일,전화번호</div>
                  <div className="text-gray-800">홍길동,hong@example.com,010-1234-5678</div>
                  <div className="text-gray-800">김철수,kim@example.com,010-9876-5432</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ✓ 헤더 지원: name/이름, email/이메일/메일, phone/전화/휴대폰/mobile<br/>
                  ✓ 최대 파일 크기: 2MB | ✓ 중복 이메일 자동 제거
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">CSV 파일 선택</span>
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
                <div className={`${candidates.length > 10 ? 'border border-gray-200 rounded-lg bg-gray-50' : ''}`}>
                  <div className="flex items-center justify-between mb-4 p-3">

                  </div>
                  <div className="space-y-4 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white">
                  {candidates.map((candidate, index) => (
                    <div key={index} className={`p-4 rounded-lg space-y-3 ${candidates.length > 10 ? 'bg-white border border-gray-100' : 'bg-gray-50'}`}>
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
                    min={minDateTime}
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
                      reviewSettings.deadline && typeof window !== 'undefined' && new Date(reviewSettings.deadline) <= new Date()
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {reviewSettings.deadline && typeof window !== 'undefined' && new Date(reviewSettings.deadline) <= new Date() && (
                    <p className="mt-1 text-sm text-red-600">마감일시는 현재 시점보다 미래여야 합니다.</p>
                  )}
                  {reviewSettings.deadline && availableTimes.length > 0 && typeof window !== 'undefined' && (() => {
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
                  {basicInfo.description && (
                    <div>
                      <p className="text-sm text-gray-600">설명</p>
                      <p className="font-medium text-gray-900">{basicInfo.description}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">면접 길이</p>
                      <p className="font-medium text-gray-900">{basicInfo.interviewLength}분</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">버퍼 시간</p>
                      <p className="font-medium text-gray-900">{basicInfo.bufferTime}분</p>
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
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{availableTimes.length}</p>
                      <p className="text-sm text-gray-600">날짜</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{getMaxInterviewSessions()}</p>
                      <p className="text-sm text-gray-600">면접 횟수</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">{getMaxCapacity()}</p>
                      <p className="text-sm text-gray-600">최대 수용</p>
                    </div>
                  </div>
                  
                  {/* 설정된 면접 시간대 목록 */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-600 mb-2">면접 진행 시간대:</p>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {availableTimes
                        .sort((a, b) => a.date.getTime() - b.date.getTime())
                        .map((availableTime, index) => {
                          // 시간 순서로 정렬된 슬롯들
                          const sortedSlots = availableTime.slots
                            .map(slot => ({ start: slot.start, startMinutes: timeToMinutes(slot.start) }))
                            .sort((a, b) => a.startMinutes - b.startMinutes)

                          // 연속된 슬롯들을 그룹화
                          const timeRanges: { start: number, end: number }[] = []
                          if (sortedSlots.length > 0) {
                            let currentRange = { start: sortedSlots[0].startMinutes, end: sortedSlots[0].startMinutes + 30 }

                            for (let i = 1; i < sortedSlots.length; i++) {
                              const slot = sortedSlots[i]
                              
                              if (slot.startMinutes === currentRange.end) {
                                // 연속된 슬롯 - 범위 확장
                                currentRange.end = slot.startMinutes + 30
                              } else {
                                // 비연속 슬롯 - 현재 범위 저장하고 새 범위 시작
                                timeRanges.push(currentRange)
                                currentRange = { start: slot.startMinutes, end: slot.startMinutes + 30 }
                              }
                            }
                            timeRanges.push(currentRange)
                          }

                          // 각 연속된 시간 범위에 대해 면접 시간대 생성
                          const interviewTimes: string[] = []
                          const interviewLength = typeof basicInfo.interviewLength === "number" ? basicInfo.interviewLength : 30
                          const bufferTime = typeof basicInfo.bufferTime === "number" ? basicInfo.bufferTime : 10
                          const totalInterviewTime = interviewLength + bufferTime

                          timeRanges.forEach(range => {
                            const totalMinutes = range.end - range.start
                            const possibleSessions = Math.floor((totalMinutes + bufferTime) / totalInterviewTime)
                            
                            // 각 면접 세션의 시작/종료 시간 계산
                            for (let session = 0; session < possibleSessions; session++) {
                              const sessionStartMinutes = range.start + (session * totalInterviewTime)
                              const sessionEndMinutes = sessionStartMinutes + interviewLength
                              
                              const startHour = Math.floor(sessionStartMinutes / 60)
                              const startMinute = sessionStartMinutes % 60
                              const endHour = Math.floor(sessionEndMinutes / 60)
                              const endMinute = sessionEndMinutes % 60
                              
                              const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`
                              const endTime = `${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`
                              
                              interviewTimes.push(`${startTime} - ${endTime}`)
                            }
                          })

                          return (
                            <div key={index} className="text-xs bg-gray-50 rounded p-2">
                              <p className="font-medium text-gray-900">
                                {formatDate(availableTime.date)}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {interviewTimes.map((timeRange, timeIndex) => (
                                  <span key={timeIndex} className="inline-block bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                    {timeRange}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )
                        })}
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
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={sendOptions.sendEmail}
                        onChange={(e) =>
                          setSendOptions((prev) => ({ ...prev, sendEmail: e.target.checked }))
                        }
                        disabled={false}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        지원자에게 초대 이메일 발송
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowEmailPreview(true)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      미리보기
                    </button>
                  </div>
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
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    생성 중...
                  </>
                ) : (
                  "면접 이벤트 생성"
                )}
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

    {/* Email Preview Modal */}
    {showEmailPreview && (
      <EmailPreviewModal
        isOpen={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        onSave={handleEmailTemplateSave}
        interviewData={{
          eventName: basicInfo.eventName,
          organizerName: user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '담당자',
          organizerEmail: basicInfo.organizerEmail,
          deadlineDate: new Date(reviewSettings.deadline).toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long',
          }),
          eventId: 'preview-event-id'
        }}
        candidateName={candidates[0]?.name || '김지원'}
        fromName={getUserEmailSettings().fromName}
        fromEmail={getUserEmailSettings().fromEmail}
      />
    )}
    </ProtectedRoute>
  )
}
