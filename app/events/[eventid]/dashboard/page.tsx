"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Mail, Edit, Trash2, CheckCircle, XCircle, ArrowLeft, Send, Settings, RefreshCw, Copy, Link as LinkIcon } from "lucide-react"
import Link from "next/link"
import toast from 'react-hot-toast'
import { getInterviewEvent, closeInterviewEvent, deleteInterviewEvent, generateInterviewSchedule, getScheduledInterviews } from "../../../../lib/database"
import ProtectedRoute from "../../../../components/auth/ProtectedRoute"
import { useAuth } from "../../../../contexts/AuthContext"
import { parseDateFromDB } from "../../../../utils/calendar"
import EditEventModal from "../../../../components/ui/edit-event-modal"
import ConfirmationDialog from "../../../../components/ui/confirmation-dialog"
import AppHeader from "../../../../components/ui/app-header"

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
    if (type === "all") {
      toast.success(`모든 지원자 ${event.candidates.length}명에게 리마인드를 발송했습니다! (Mock)`)
    } else if (type === "unresponded") {
      toast.success(`미응답 지원자 ${unrespondedCandidates.length}명에게 리마인드를 발송했습니다! (Mock)`)
    } else {
      const candidate = event.candidates.find((c) => c.id === type)
      toast.success(`${candidate?.name}님에게 리마인드를 발송했습니다! (Mock)`)
    }
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader>
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                이벤트 목록
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-semibold text-gray-900">{event.eventName}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
              >
                {getStatusText(event.status)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                수정
              </button>
              {event.status === "collecting" && (
                <button
                  onClick={() => setShowCloseDialog(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  마감
                </button>
              )}
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="inline-flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </div>
        </div>
      </AppHeader>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Basic Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">생성일</p>
                <p className="font-medium text-gray-900">
                  {event.createdAt.toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
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
                <p className="font-medium text-gray-900">{new Date(event.deadline).toLocaleString("ko-KR")}</p>
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
                      <CheckCircle className="w-4 h-4" />
                      일정 자동 배정
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleCopyShareLink}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                링크 복사
              </button>
              <button
                onClick={() => handleSendReminder("unresponded")}
                disabled={unrespondedCandidates.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                미응답자 리마인드 ({unrespondedCandidates.length}명)
              </button>
              <button
                onClick={() => handleSendReminder("all")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                전체 리마인드
              </button>
            </div>
          </div>
        </div>

        {/* Scheduled Results */}
        {event.status === 'scheduled' && scheduledInterviews.length > 0 && (
          <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">배정된 일정</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      세션 ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      지원자
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      날짜
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      시간
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      연락처
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scheduledInterviews.map((interview, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {interview.session_id}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{interview.candidates?.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(interview.scheduled_date).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {interview.scheduled_start_time} - {interview.scheduled_end_time}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div>{interview.candidates?.email}</div>
                        <div className="text-xs text-gray-500">{interview.candidates?.phone}</div>
                      </td>
                    </tr>
                  ))
                  })}
                </tbody>
              </table>
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
                        <div className="space-y-1">
                          {candidate.selectedTimes.map((time, index) => (
                            <div key={index} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {time.date} {time.startTime}-{time.endTime}
                            </div>
                          ))}
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
      </div>
    </div>
    </ProtectedRoute>
  )
}
