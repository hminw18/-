"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Mail, Edit, Trash2, CheckCircle, XCircle, ArrowLeft, Send, Settings, RefreshCw, Copy, Link as LinkIcon, Users } from "lucide-react"
import Link from "next/link"
import toast from 'react-hot-toast'
import { getInterviewEvent, closeInterviewEvent, deleteInterviewEvent, generateInterviewSchedule, getScheduledInterviews, updateSessionLocation } from "../../../../lib/database"
import { sendConfirmationEmails, sendReminderEmails } from "../../../../utils/email"
import ProtectedRoute from "../../../../components/auth/ProtectedRoute"
import { useAuth } from "../../../../contexts/AuthContext"
import { parseDateFromDB, formatDateForDB } from "../../../../utils/calendar"
import EditEventModal from "../../../../components/ui/edit-event-modal"
import ConfirmationDialog from "../../../../components/ui/confirmation-dialog"
import AppHeader from "../../../../components/ui/app-header"
import EmailPreviewModal, { CustomEmailTemplate } from "../../../../components/email/EmailPreviewModal"

interface Candidate {
  id: string
  name: string
  phone: string
  email: string
  hasResponded: boolean
  respondedAt?: string
  selectedTimes: Array<{
    date: string
    startTime: string
    endTime: string
    preferenceOrder: number
  }>
}

interface InterviewEvent {
  id: string
  eventName: string
  createdAt: Date
  status: "collecting" | "closed" | "completed" | "scheduled" | "failed"
  interviewLength: number
  simultaneousCount: number
  organizerName: string
  organizerEmail: string
  deadline: string
  shareToken?: string
  candidates: Candidate[]
  availableTimeSlots: Array<{
    id: string
    date: string
    startTime: string
    endTime: string
  }>
  scheduledSlots?: { candidateId: string; time: string; date: string }[]
}

// 실제 데이터베이스에서 이벤트 상세 정보 가져오기
async function fetchEventDetails(eventId: string): Promise<InterviewEvent | null> {
  try {
    const result = await getInterviewEvent(eventId)
    
    if (!result.success || !result.event) {
      return null
    }

    const dbEvent = result.event
    
    // 지원자 데이터 변환
    const candidates: Candidate[] = dbEvent.candidates?.map(candidate => {
      console.log('Processing candidate:', candidate.name, 'selections:', candidate.candidate_time_selections)
      return {
        id: candidate.id,
        name: candidate.name,
        phone: candidate.phone,
        email: candidate.email,
        hasResponded: candidate.has_responded,
        respondedAt: candidate.responded_at,
        selectedTimes: candidate.candidate_time_selections?.map(selection => {
          console.log('Processing selection:', selection)
          return {
            date: selection.selected_date,
            startTime: selection.selected_start_time,
            endTime: selection.selected_end_time,
            preferenceOrder: selection.preference_order
          }
        }).sort((a, b) => {
          // 먼저 날짜로 정렬
          const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime()
          if (dateComparison !== 0) return dateComparison
          
          // 같은 날짜라면 시작 시간으로 정렬
          return a.startTime.localeCompare(b.startTime)
        }) || []
      }
    }) || []

    // 가용 시간 슬롯 변환 및 정렬
    const availableTimeSlots = dbEvent.available_time_slots?.map(slot => ({
      id: slot.id,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time
    })).sort((a, b) => {
      // 먼저 날짜로 정렬
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateComparison !== 0) return dateComparison
      
      // 같은 날짜라면 시작 시간으로 정렬
      return a.startTime.localeCompare(b.startTime)
    }) || []

    return {
      id: dbEvent.id,
      eventName: dbEvent.event_name,
      createdAt: new Date(dbEvent.created_at),
      status: dbEvent.status as InterviewEvent['status'],
      interviewLength: dbEvent.interview_length,
      simultaneousCount: dbEvent.simultaneous_count,
      organizerName: dbEvent.organizer_name || undefined,
      organizerEmail: dbEvent.organizer_email,
      deadline: dbEvent.deadline,
      shareToken: dbEvent.share_token,
      candidates,
      availableTimeSlots
    }
  } catch (error) {
    console.error('Error fetching event details:', error)
    return null
  }
}


const getStatusColor = (status: InterviewEvent["status"]) => {
  switch (status) {
    case "collecting":
      return "bg-blue-100 text-blue-800"
    case "closed":
      return "bg-gray-100 text-gray-800"
    case "scheduled":
      return "bg-green-100 text-green-800"
    case "completed":
      return "bg-purple-100 text-purple-800"
    case "failed":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusText = (status: InterviewEvent["status"]) => {
  switch (status) {
    case "collecting":
      return "응답 수집 중"
    case "closed":
      return "마감"
    case "scheduled":
      return "일정 배정 완료"
    case "completed":
      return "면접 완료"
    case "failed":
      return "일정 배정 실패"
    default:
      return status
  }
}

export default function EventDashboardPage() {
  const params = useParams()
  const eventId = params.eventid as string
  const [event, setEvent] = useState<InterviewEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [scheduledInterviews, setScheduledInterviews] = useState<any[]>([])
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false)
  const [selectedInterviews, setSelectedInterviews] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [sessionLocations, setSessionLocations] = useState<{[sessionId: string]: string}>({})
  const [editingLocation, setEditingLocation] = useState<string | null>(null)
  
  // 리마인더 메일 관련 상태
  const [showReminderPreview, setShowReminderPreview] = useState(false)
  const [reminderType, setReminderType] = useState<"all" | "unresponded" | string>("unresponded")
  const [reminderRecipients, setReminderRecipients] = useState<Array<{name: string, email: string}>>([])
  const [isSendingReminder, setIsSendingReminder] = useState(false)

  // 확정 메일 관련 상태
  const [showConfirmationPreview, setShowConfirmationPreview] = useState(false)
  const [confirmationData, setConfirmationData] = useState<any>(null)
  const [confirmationRecipients, setConfirmationRecipients] = useState<Array<{name: string, email: string}>>([])
  const [isSendingConfirmation, setIsSendingConfirmation] = useState(false)

  // Format time ranges by merging consecutive slots
  const formatTimeRanges = (slots: Array<{ startTime: string; endTime: string; date: string }>) => {
    if (slots.length === 0) return ""

    // Group by date first
    const groupedByDate: { [key: string]: Array<{ startTime: string; endTime: string }> } = {}
    slots.forEach(slot => {
      if (!groupedByDate[slot.date]) {
        groupedByDate[slot.date] = []
      }
      groupedByDate[slot.date].push({ startTime: slot.startTime, endTime: slot.endTime })
    })

    // Format each date group
    const dateResults: string[] = []
    Object.entries(groupedByDate).forEach(([date, timeSlots]) => {
      // Sort slots by start time
      const sortedSlots = timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime))
      
      const ranges: string[] = []
      let rangeStart = sortedSlots[0].startTime
      let currentEnd = sortedSlots[0].endTime

      // Find consecutive slots and merge them
      for (let i = 1; i < sortedSlots.length; i++) {
        const currentStart = sortedSlots[i].startTime
        const nextEnd = sortedSlots[i].endTime
        
        if (currentEnd === currentStart) {
          // Consecutive slot - extend current range
          currentEnd = nextEnd
        } else {
          // Non-consecutive slot - save current range and start new one
          ranges.push(`${rangeStart}-${currentEnd}`)
          rangeStart = currentStart
          currentEnd = nextEnd
        }
      }
      ranges.push(`${rangeStart}-${currentEnd}`) // Add the last range

      dateResults.push(`${date} ${ranges.join(", ")}`)
    })

    return dateResults.join(" | ")
  }


  const loadEventData = async () => {
    setLoading(true)
    setError(null)
    try {
      const eventData = await fetchEventDetails(eventId)
      if (eventData) {
        setEvent(eventData)
        
        // 스케줄이 생성된 이벤트라면 스케줄 데이터도 로드
        if (eventData.status === 'scheduled') {
          const scheduleResult = await getScheduledInterviews(eventId)
          if (scheduleResult.success) {
            setScheduledInterviews(scheduleResult.data)
            
            // 장소 정보 로드
            const locationMap: {[sessionId: string]: string} = {}
            scheduleResult.data.forEach((interview: any) => {
              if (interview.session_id) {
                if (interview.meeting_room) {
                  locationMap[interview.session_id] = interview.meeting_room
                } else if (!locationMap[interview.session_id]) {
                  locationMap[interview.session_id] = ''
                }
              }
            })
            setSessionLocations(locationMap)
          }
        }
      } else {
        setError('이벤트를 찾을 수 없습니다.')
        setEvent(null)
      }
    } catch (err) {
      console.error('Error loading event:', err)
      setError('이벤트 데이터를 불러오는데 실패했습니다.')
      setEvent(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEventData()
  }, [eventId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">이벤트 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">이벤트를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-4">요청하신 이벤트가 존재하지 않습니다.</p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            이벤트 목록으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const respondedCandidates = event.candidates.filter((c) => c.hasResponded)
  const unrespondedCandidates = event.candidates.filter((c) => !c.hasResponded)

  const handleAutoSchedule = async () => {
    if (event.status !== "closed") {
      toast.error("마감된 이벤트만 일정 배정이 가능합니다.")
      return
    }

    const respondedCount = event.candidates.filter(c => c.hasResponded).length
    if (respondedCount === 0) {
      toast.error("응답한 지원자가 없어 스케줄을 생성할 수 없습니다.")
      return
    }

    setIsGeneratingSchedule(true)
    try {
      const result = await generateInterviewSchedule(eventId)
      
      if (result.success) {
        const { scheduledCandidates, unscheduledCandidates, utilizationRate, totalSessions } = result.result
        
        toast.success(
          `일정 자동 배정 완료!\n` +
          `배정: ${scheduledCandidates}명, 미배정: ${unscheduledCandidates}명\n` +
          `총 ${totalSessions}개 세션, 배정률: ${Math.round(utilizationRate * 100)}%`
        )
        
        setEvent((prev) => (prev ? { ...prev, status: "scheduled" } : null))
        loadEventData()
      } else {
        toast.error(`일정 배정 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('Error generating schedule:', error)
      toast.error('일정 배정 중 오류가 발생했습니다.')
    } finally {
      setIsGeneratingSchedule(false)
    }
  }

  const handleSendReminder = (type: "all" | "unresponded" | string) => {
    if (!event) return
    
    let recipients: Array<{name: string, email: string}> = []
    
    if (type === "all") {
      recipients = event.candidates.map(c => ({ name: c.name, email: c.email }))
    } else if (type === "unresponded") {
      recipients = unrespondedCandidates.map(c => ({ name: c.name, email: c.email }))
    } else {
      const candidate = event.candidates.find((c) => c.id === type)
      if (candidate) {
        recipients = [{ name: candidate.name, email: candidate.email }]
      }
    }
    
    if (recipients.length === 0) {
      toast.error("발송할 대상이 없습니다.")
      return
    }
    
    setReminderType(type)
    setReminderRecipients(recipients)
    setShowReminderPreview(true)
  }

  const handleReminderSend = async (customTemplate?: CustomEmailTemplate) => {
    if (!event || reminderRecipients.length === 0) return
    
    setIsSendingReminder(true)
    try {
      // customTemplate이 없으면 에러 발생시켜서 미리보기를 강제로 사용하게 함
      if (!customTemplate) {
        toast.error('미리보기 템플릿이 생성되지 않았습니다. 다시 시도해주세요.')
        setIsSendingReminder(false)
        return
      }

      // 미리보기에서 생성된 템플릿을 사용하여 발송 (100% 보장)
      const interviewData = {
        title: event.eventName,
        organizerName: event.organizerName,
        organizerEmail: event.organizerEmail,
        deadlineDate: event.deadline,
        eventId: event.id,
        customTemplate // 반드시 미리보기 템플릿 사용
      }
      
      console.log('Sending reminder with customTemplate:', customTemplate.subject)
      const result = await sendReminderEmails(reminderRecipients, interviewData)
      
      if (result.success) {
        toast.success(`${result.sent}명에게 리마인드 메일을 발송했습니다!`)
        setShowReminderPreview(false)
      } else {
        toast.error(`메일 발송에 실패했습니다: ${result.failed}명 실패`)
      }
    } catch (error) {
      console.error('Error sending reminder emails:', error)
      toast.error('리마인드 메일 발송 중 오류가 발생했습니다.')
    } finally {
      setIsSendingReminder(false)
    }
  }

  const handleBulkEmailPreview = (sessionId: string, candidateIds: string[]) => {
    if (!event) return

    // 세션 정보 찾기
    const sessionInterviews = scheduledInterviews.filter(
      (interview: any) => interview.session_id === sessionId
    )

    if (sessionInterviews.length === 0) {
      toast.error('해당 세션의 면접 정보를 찾을 수 없습니다.')
      return
    }

    const sampleInterview = sessionInterviews[0]
    
    // 날짜/시간 포맷팅
    const scheduledDate = new Date(sampleInterview.scheduled_date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: 'Asia/Seoul'
    })
    
    const scheduledTime = `${sampleInterview.scheduled_start_time.substring(0, 5)} - ${sampleInterview.scheduled_end_time.substring(0, 5)}`

    // 수신자 정보 준비
    const recipients = sessionInterviews.map((interview: any) => ({
      name: interview.candidates?.name || '지원자',
      email: interview.candidates?.email || ''
    })).filter(r => r.email)

    if (recipients.length === 0) {
      toast.error('이메일을 보낼 수 있는 지원자가 없습니다.')
      return
    }

    // 확정 메일 데이터 설정
    setConfirmationData({
      title: event.eventName,
      organizerName: event.organizerName,
      organizerEmail: event.organizerEmail,
      scheduledDate,
      scheduledTime,
      meetingLocation: sessionLocations[sessionId] || undefined,
      meetingLink: sampleInterview.meeting_link || undefined
    })
    setConfirmationRecipients(recipients)
    setShowConfirmationPreview(true)
  }

  const handleConfirmationSend = async (customTemplate?: CustomEmailTemplate) => {
    if (!confirmationData || confirmationRecipients.length === 0) return
    
    setIsSendingConfirmation(true)
    try {
      if (confirmationData.isBulkSend) {
        // 벌크 발송 - 각 지원자별로 개별 일정 정보로 메일 발송
        let successCount = 0
        let failCount = 0

        for (const interview of scheduledInterviews) {
          if (!interview.candidates?.email) continue

          const scheduledDate = new Date(interview.scheduled_date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
            timeZone: 'Asia/Seoul'
          })
          
          const scheduledTime = `${interview.scheduled_start_time.substring(0, 5)} - ${interview.scheduled_end_time.substring(0, 5)}`

          try {
            const result = await sendConfirmationEmails(
              [{ name: interview.candidates.name, email: interview.candidates.email }], 
              {
                title: confirmationData.title,
                organizerName: confirmationData.organizerName,
                organizerEmail: confirmationData.organizerEmail,
                scheduledDate,
                scheduledTime,
                meetingLocation: sessionLocations[interview.session_id] || undefined,
                meetingLink: interview.meeting_link || undefined,
                customTemplate
              }
            )
            if (result.success) successCount++
            else failCount++
          } catch (error) {
            failCount++
          }
        }

        if (failCount === 0) {
          toast.success(`전체 ${successCount}명에게 확정 메일을 발송했습니다!`)
        } else {
          toast.success(`확정 메일 발송 완료: 성공 ${successCount}명, 실패 ${failCount}명`)
        }
        setShowConfirmationPreview(false)
      } else {
        // 단일 세션 발송
        const result = await sendConfirmationEmails(confirmationRecipients, {
          ...confirmationData,
          customTemplate
        })

        if (result.success) {
          toast.success(`${result.sent}명에게 확정 메일을 발송했습니다!`)
          setShowConfirmationPreview(false)
        } else {
          toast.error(`메일 발송에 실패했습니다: ${result.failed}명 실패`)
        }
      }
    } catch (error) {
      console.error('Error sending confirmation emails:', error)
      toast.error('확정 메일 발송 중 오류가 발생했습니다.')
    } finally {
      setIsSendingConfirmation(false)
    }
  }

  const handleLocationUpdate = async (sessionId: string, location: string) => {
    try {
      const result = await updateSessionLocation(sessionId, location)
      
      if (result.success) {
        toast.success('장소 정보가 저장되었습니다!')
      } else {
        toast.error(`장소 정보 저장에 실패했습니다: ${result.error}`)
      }
    } catch (error) {
      console.error('Error updating location:', error)
      toast.error('장소 정보 저장 중 오류가 발생했습니다.')
    }
  }

  // 세션별 데이터 준비
  const getSessionGroups = () => {
    if (!scheduledInterviews || scheduledInterviews.length === 0) {
      return []
    }

    // 세션별로 그룹핑
    const sessionMap = new Map()
    
    scheduledInterviews.forEach(interview => {
      const sessionId = interview.session_id
      
      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId,
          date: interview.scheduled_date,
          startTime: interview.scheduled_start_time,
          endTime: interview.scheduled_end_time,
          candidates: []
        })
      }
      
      if (interview.candidates) {
        sessionMap.get(sessionId).candidates.push({
          id: interview.candidates.id,
          name: interview.candidates.name,
          email: interview.candidates.email,
          phone: interview.candidates.phone
        })
      }
    })

    return Array.from(sessionMap.values()).sort((a, b) => {
      // 날짜순, 시간순으로 정렬
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime()
      if (dateCompare !== 0) return dateCompare
      return a.startTime.localeCompare(b.startTime)
    })
  }


  const handleCopyShareLink = async () => {
    if (!event?.shareToken) {
      toast.error("공유 링크가 없습니다. 이벤트 설정을 확인해주세요.")
      return
    }

    const shareLink = `${window.location.origin}/respond/${event.shareToken}`
    
    try {
      await navigator.clipboard.writeText(shareLink)
      toast.success("공유 링크가 클립보드에 복사되었습니다!")
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = shareLink
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        document.execCommand('copy')
        toast.success("공유 링크가 클립보드에 복사되었습니다!")
      } catch (fallbackErr) {
        toast.error("링크 복사에 실패했습니다. 수동으로 복사해주세요: " + shareLink)
      }
      
      document.body.removeChild(textArea)
    }
  }

  const handleGenerateSchedule = async () => {
    if (!event) return

    const respondedCount = event.candidates.filter(c => c.hasResponded).length
    if (respondedCount === 0) {
      toast.error("응답한 지원자가 없어 스케줄을 생성할 수 없습니다.")
      return
    }

    setIsGeneratingSchedule(true)
    try {
      const result = await generateInterviewSchedule(eventId)
      
      if (result.success) {
        const { scheduledCandidates, unscheduledCandidates, utilizationRate, totalSessions } = result.result
        
        toast.success(
          `스케줄 생성 완료!\n` +
          `배정: ${scheduledCandidates}명, 미배정: ${unscheduledCandidates}명\n` +
          `총 ${totalSessions}개 세션, 배정률: ${Math.round(utilizationRate * 100)}%`
        )
        
        // 상태 업데이트 및 데이터 새로고침
        setEvent((prev) => (prev ? { ...prev, status: "scheduled" } : null))
        loadEventData()
      } else {
        toast.error(`스케줄 생성 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('Error generating schedule:', error)
      toast.error('스케줄 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGeneratingSchedule(false)
    }
  }

  const handleCloseEvent = async () => {
    const result = await closeInterviewEvent(eventId)
    if (result.success) {
      toast.success("이벤트가 마감되었습니다!")
      loadEventData() // 데이터 새로고침
    } else {
      toast.error("이벤트 마감에 실패했습니다: " + result.error)
    }
    setShowCloseDialog(false)
  }

  const handleDeleteEvent = async () => {
    const result = await deleteInterviewEvent(eventId)
    if (result.success) {
      toast.success("이벤트가 삭제되었습니다!")
      window.location.href = '/events' // 이벤트 목록으로 이동
    } else {
      toast.error("이벤트 삭제에 실패했습니다: " + result.error)
    }
    setShowDeleteDialog(false)
  }

  // 체크박스 관리 함수들
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    if (checked) {
      const allIds = new Set(scheduledInterviews.map(interview => interview.candidate_id))
      setSelectedInterviews(allIds)
    } else {
      setSelectedInterviews(new Set())
    }
  }

  const handleSelectInterview = (candidateId: string, checked: boolean) => {
    const newSelected = new Set(selectedInterviews)
    if (checked) {
      newSelected.add(candidateId)
    } else {
      newSelected.delete(candidateId)
    }
    setSelectedInterviews(newSelected)
    
    // 전체 선택 상태 업데이트
    const uniqueCandidateIds = new Set(scheduledInterviews.map(interview => interview.candidate_id))
    setSelectAll(newSelected.size === uniqueCandidateIds.size && uniqueCandidateIds.size > 0)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader>
        <div className="flex items-center gap-4 w-full">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">이벤트 목록</span>
          </Link>
          <div className="h-6 w-px bg-gray-300 hidden sm:block" />
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{event.eventName}</h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)} flex-shrink-0`}
          >
            {getStatusText(event.status)}
          </span>
        </div>
      </AppHeader>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Basic Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">기본 정보</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">수정</span>
                </button>
                {event.status === "collecting" && (
                  <button
                    onClick={() => setShowCloseDialog(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">마감</span>
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">생성일</p>
                <p className="font-medium text-gray-900">
                  {event.createdAt.toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "Asia/Seoul"
                  })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">면접 길이</p>
                  <p className="font-medium text-gray-900">{event.interviewLength}분</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">동시 인원</p>
                  <p className="font-medium text-gray-900">{event.simultaneousCount}명</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">마감 일시</p>
                <p className="font-medium text-gray-900">
                  {new Date(event.deadline).toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "long", 
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    weekday: "short",
                    timeZone: "Asia/Seoul"
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">주최자</p>
                <p className="font-medium text-gray-900">{event.organizerEmail}</p>
              </div>
            </div>
          </div>

          {/* Response Status */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">응답 현황</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{event.candidates.length}</p>
                  <p className="text-sm text-gray-600">총 지원자</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{respondedCandidates.length}</p>
                  <p className="text-sm text-gray-600">응답 완료</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{unrespondedCandidates.length}</p>
                  <p className="text-sm text-gray-600">미응답</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${(respondedCandidates.length / event.candidates.length) * 100}%`,
                  }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                응답률: {Math.round((respondedCandidates.length / event.candidates.length) * 100)}%
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">액션</h3>
            <div className="space-y-3">
              {event.status === "closed" && !event.scheduledSlots && (
                <button
                  onClick={handleAutoSchedule}
                  disabled={isGeneratingSchedule}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isGeneratingSchedule ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      일정 배정 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">일정 자동 배정</span>
                      <span className="sm:hidden">배정</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleCopyShareLink}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">링크 복사</span>
                <span className="sm:hidden">복사</span>
              </button>
              <button
                onClick={() => handleSendReminder("unresponded")}
                disabled={unrespondedCandidates.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">미응답자 리마인드 ({unrespondedCandidates.length}명)</span>
                <span className="sm:hidden">리마인드 ({unrespondedCandidates.length})</span>
              </button>
              <button
                onClick={() => handleSendReminder("all")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">전체 리마인드</span>
                <span className="sm:hidden">전체</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scheduled Results - Horizontal Table Layout */}
        {event.status === 'scheduled' && scheduledInterviews.length > 0 && (
          <div className="mt-8 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">배정된 일정</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      면접 세션
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지원자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이메일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      연락처
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      장소
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // 세션별로 그룹화
                    const sessionGroups = scheduledInterviews.reduce((groups: any, interview: any) => {
                      const sessionId = interview.session_id
                      if (!groups[sessionId]) {
                        groups[sessionId] = {
                          session_id: sessionId,
                          scheduled_date: interview.scheduled_date,
                          scheduled_start_time: interview.scheduled_start_time,
                          scheduled_end_time: interview.scheduled_end_time,
                          candidates: []
                        }
                      }
                      groups[sessionId].candidates.push({
                        candidate_id: interview.candidate_id,
                        name: interview.candidates?.name,
                        email: interview.candidates?.email,
                        phone: interview.candidates?.phone
                      })
                      return groups
                    }, {})

                    return Object.values(sessionGroups).map((session: any, index: number) => (
                      <tr key={`session-${session.session_id}-${index}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={session.candidates.every((candidate: any) => selectedInterviews.has(candidate.candidate_id))}
                            onChange={(e) => {
                              session.candidates.forEach((candidate: any) => {
                                handleSelectInterview(candidate.candidate_id, e.target.checked)
                              })
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(session.scheduled_date).toLocaleDateString('ko-KR', {
                                month: 'short',
                                day: 'numeric',
                                weekday: 'short',
                                timeZone: 'Asia/Seoul'
                              })}
                            </div>
                            <div className="text-xs text-gray-600">
                              {session.scheduled_start_time.substring(0, 5)} - {session.scheduled_end_time.substring(0, 5)}
                            </div>
                            <div className="text-xs text-gray-500">
                              #{index + 1}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {session.candidates.map((candidate: any, idx: number) => (
                              <div key={`${session.session_id}-${candidate.candidate_id}-${idx}`} className="font-medium text-gray-900 text-sm">
                                {candidate.name}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {session.candidates.map((candidate: any, idx: number) => (
                              <div key={`${session.session_id}-${candidate.candidate_id}-${idx}`} className="text-sm text-gray-600">
                                {candidate.email}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {session.candidates.map((candidate: any, idx: number) => (
                              <div key={`${session.session_id}-${candidate.candidate_id}-${idx}`} className="text-sm text-gray-600">
                                {candidate.phone}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap w-32">
                          {editingLocation === session.session_id ? (
                            <input
                              type="text"
                              value={sessionLocations[session.session_id] || ''}
                              onChange={(e) => setSessionLocations({...sessionLocations, [session.session_id]: e.target.value})}
                              onBlur={() => {
                                handleLocationUpdate(session.session_id, sessionLocations[session.session_id] || '')
                                setEditingLocation(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleLocationUpdate(session.session_id, sessionLocations[session.session_id] || '')
                                  setEditingLocation(null)
                                }
                              }}
                              placeholder="회의실"
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div
                              onClick={() => setEditingLocation(session.session_id)}
                              className="text-sm text-gray-600 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded min-h-[24px] flex items-center w-24 truncate"
                              title={sessionLocations[session.session_id] || '장소 입력'}
                            >
                              {sessionLocations[session.session_id] || '장소 입력'}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            배정 완료 ({session.candidates.length}명)
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleBulkEmailPreview(session.session_id, session.candidates.map((c: any) => c.candidate_id))}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              세션 메일 발송
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>

            {/* Bulk Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  총 {scheduledInterviews.length}명의 지원자, {Object.keys(scheduledInterviews.reduce((groups: any, interview: any) => {
                    groups[interview.session_id] = true
                    return groups
                  }, {})).length}개 세션
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (!event) return

                      // 모든 세션의 수신자 정보 준비
                      const allRecipients = scheduledInterviews.map((interview: any) => ({
                        name: interview.candidates?.name || '지원자',
                        email: interview.candidates?.email || ''
                      })).filter(r => r.email)

                      if (allRecipients.length === 0) {
                        toast.error('이메일을 보낼 수 있는 지원자가 없습니다.')
                        return
                      }

                      // 첫 번째 인터뷰 정보로 미리보기 설정
                      const firstInterview = scheduledInterviews[0]
                      const scheduledDate = new Date(firstInterview.scheduled_date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                        timeZone: 'Asia/Seoul'
                      })
                      
                      const scheduledTime = `${firstInterview.scheduled_start_time.substring(0, 5)} - ${firstInterview.scheduled_end_time.substring(0, 5)}`
                      
                      setConfirmationData({
                        title: event.eventName,
                        organizerName: event.organizerName,
                        organizerEmail: event.organizerEmail,
                        scheduledDate,
                        scheduledTime,
                        meetingLocation: sessionLocations[firstInterview.session_id] || undefined,
                        meetingLink: firstInterview.meeting_link || undefined,
                        isBulkSend: true
                      })
                      
                      setConfirmationRecipients(allRecipients)
                      setShowConfirmationPreview(true)
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">확정 메일 발송</span>
                    <span className="sm:hidden">전체 메일</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Candidates List */}
          <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">지원자 목록</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    지원자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    응답 상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    선택한 시간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {event.candidates.map((candidate) => (
                  <tr key={candidate.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{candidate.name}</div>
                        <div className="text-sm text-gray-600">{candidate.email}</div>
                        <div className="text-xs text-gray-500">{candidate.phone}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {candidate.hasResponded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          응답 완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          미응답
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {candidate.selectedTimes.length > 0 ? (
                        <div className="text-xs text-gray-600">
                          {formatTimeRanges(candidate.selectedTimes)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">선택한 시간 없음</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleSendReminder(candidate.id)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        리마인드
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

        {/* Edit Modal */}
        {event && (
          <EditEventModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            onSuccess={loadEventData}
            event={{
              id: event.id,
              eventName: event.eventName,
              interviewLength: event.interviewLength,
              simultaneousCount: event.simultaneousCount,
              deadline: event.deadline
            }}
          />
        )}

        {/* Close Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showCloseDialog}
          onClose={() => setShowCloseDialog(false)}
          onConfirm={handleCloseEvent}
          title="이벤트 마감"
          message="이벤트를 마감하시겠습니까? 마감 후에는 새로운 응답을 받을 수 없습니다."
          confirmText="마감하기"
          cancelText="취소"
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteEvent}
          title="이벤트 삭제"
          message="이벤트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
          confirmText="삭제하기"
          cancelText="취소"
          destructive
        />

        {/* Reminder Email Preview Modal */}
        {event && (
          <EmailPreviewModal
            isOpen={showReminderPreview}
            onClose={() => setShowReminderPreview(false)}
            onSave={handleReminderSend}
            interviewData={{
              eventName: event.eventName,
              organizerName: event.organizerName,
              organizerEmail: event.organizerEmail,
              deadlineDate: event.deadline,
              eventId: event.id
            }}
            candidateName={reminderRecipients[0]?.name || "지원자"}
            fromName={event.organizerName}
            fromEmail={event.organizerEmail}
            isReminder={true}
            recipients={reminderRecipients}
          />
        )}

        {/* Confirmation Email Preview Modal */}
        {event && confirmationData && (
          <EmailPreviewModal
            isOpen={showConfirmationPreview}
            onClose={() => setShowConfirmationPreview(false)}
            onSave={handleConfirmationSend}
            confirmationData={confirmationData}
            candidateName={confirmationRecipients[0]?.name || "지원자"}
            fromName={event.organizerName}
            fromEmail={event.organizerEmail}
            isConfirmation={true}
            recipients={confirmationRecipients}
          />
        )}
        
        {/* Delete Button - Fixed Bottom Right */}
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="fixed bottom-6 right-6 inline-flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-full shadow-lg hover:bg-red-700 transition-all hover:shadow-xl z-50"
        >
          <Trash2 className="w-5 h-5" />
          <span className="hidden sm:inline font-medium">삭제</span>
        </button>
      </div>
    </div>
    </ProtectedRoute>
  )
}
