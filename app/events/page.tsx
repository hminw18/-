"use client"

import { useState, useEffect } from "react"
import { Calendar, Clock, Users, ChevronRight, Plus, RefreshCw, Trash2 } from "lucide-react"
import toast from 'react-hot-toast'
import Link from "next/link"
import { supabase } from "../../lib/supabase"
import ProtectedRoute from "../../components/auth/ProtectedRoute"
import { useAuth } from "../../contexts/AuthContext"
import AppHeader from "../../components/ui/app-header"
import ConfirmationDialog from "../../components/ui/confirmation-dialog"

interface InterviewEvent {
  id: string
  eventName: string
  createdAt: Date
  status: "collecting" | "closed" | "completed" | "scheduled" | "failed"
  totalCandidates: number
  respondedCandidates: number
  interviewLength: number
  simultaneousCount: number
  organizerEmail: string
  deadline: string
}

// 실제 데이터베이스에서 이벤트 목록 가져오기
// 현재 사용자의 이벤트만 가져오기
async function fetchUserEvents(userId: string): Promise<InterviewEvent[]> {
  try {
    const { data: events, error: eventsError } = await supabase
      .from('interview_events')
      .select(`
        id,
        event_name,
        organizer_email,
        interview_length,
        simultaneous_count,
        deadline,
        status,
        created_at,
        candidates!inner(
          id,
          has_responded
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (eventsError) throw eventsError

    // 이벤트별 지원자 통계 계산
    const processedEvents: InterviewEvent[] = events.map(event => {
      const totalCandidates = event.candidates.length
      const respondedCandidates = event.candidates.filter(candidate => candidate.has_responded).length

      return {
        id: event.id,
        eventName: event.event_name,
        createdAt: new Date(event.created_at),
        status: event.status as InterviewEvent['status'],
        totalCandidates,
        respondedCandidates,
        interviewLength: event.interview_length,
        simultaneousCount: event.simultaneous_count,
        organizerEmail: event.organizer_email,
        deadline: event.deadline
      }
    })

    return processedEvents
  } catch (error) {
    console.error('Error fetching events:', error)
    return []
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

export default function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<InterviewEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<string | null>(null)

  const loadEvents = async () => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    try {
      const eventData = await fetchUserEvents(user.id)
      setEvents(eventData)
    } catch (err) {
      setError('이벤트 목록을 불러오는데 실패했습니다.')
      console.error('Error loading events:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [user])

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return

    setDeletingEventId(eventToDelete)
    try {
      const { error } = await supabase
        .from('interview_events')
        .delete()
        .eq('id', eventToDelete)
        .eq('user_id', user?.id)

      if (error) throw error

      toast.success('이벤트가 삭제되었습니다.')
      setEvents(prev => prev.filter(event => event.id !== eventToDelete))
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('이벤트 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingEventId(null)
      setShowDeleteDialog(false)
      setEventToDelete(null)
    }
  }

  const openDeleteDialog = (eventId: string) => {
    setEventToDelete(eventId)
    setShowDeleteDialog(true)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader>
        <div className="flex items-center w-full">
          <h1 className="text-xl font-semibold text-gray-900">면접 이벤트 관리</h1>
        </div>
      </AppHeader>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">전체 이벤트</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={loadEvents}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">새로고침</span>
              </button>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">새 이벤트 생성</span>
                <span className="sm:hidden">생성</span>
              </Link>
            </div>
          </div>
          <p className="text-gray-600">생성된 모든 면접 이벤트를 관리하세요.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadEvents}
              className="mt-2 text-red-600 hover:text-red-700 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">이벤트 목록을 불러오는 중...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">생성된 이벤트가 없습니다</h3>
            <p className="text-gray-600 mb-6">첫 번째 면접 이벤트를 생성해보세요.</p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />새 이벤트 생성
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow group relative"
              >
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openDeleteDialog(event.id)
                  }}
                  disabled={deletingEventId === event.id}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 z-10"
                  title="이벤트 삭제"
                >
                  {deletingEventId === event.id ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>

                {/* Card Content - Clickable */}
                <Link href={`/events/${event.id}/dashboard`} className="block pr-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {event.eventName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {event.createdAt.toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}
                      >
                        {getStatusText(event.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>
                          {event.respondedCandidates}/{event.totalCandidates}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{event.interviewLength}분</span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${(event.respondedCandidates / event.totalCandidates) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      응답률: {Math.round((event.respondedCandidates / event.totalCandidates) * 100)}%
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false)
            setEventToDelete(null)
          }}
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
