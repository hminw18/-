"use client"

import { useState } from "react"
import { Calendar, Clock, Users, ChevronRight, Plus } from "lucide-react"
import Link from "next/link"

interface InterviewEvent {
  id: string
  eventName: string
  createdAt: Date
  status: "collecting" | "closed" | "completed" | "scheduled" | "schedule failed"
  totalCandidates: number
  respondedCandidates: number
  interviewLength: number
  simultaneousCount: number
  organizerEmail: string
}

// Mock data
const mockEvents: InterviewEvent[] = [
  {
    id: "event-001",
    eventName: "프론트엔드 개발자 면접",
    createdAt: new Date("2024-01-15T10:30:00"),
    status: "collecting",
    totalCandidates: 10,
    respondedCandidates: 7,
    interviewLength: 60,
    simultaneousCount: 1,
    organizerEmail: "hr@company.com",
  },
  {
    id: "event-002",
    eventName: "백엔드 개발자 면접",
    createdAt: new Date("2024-01-10T14:20:00"),
    status: "scheduled",
    totalCandidates: 10,
    respondedCandidates: 10,
    interviewLength: 45,
    simultaneousCount: 2,
    organizerEmail: "tech@company.com",
  },
]

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
    case "schedule failed":
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
    case "schedule failed":
      return "일정 배정 실패"
    default:
      return status
  }
}

export default function EventsPage() {
  const [events] = useState<InterviewEvent[]>(mockEvents)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">면접 이벤트 관리</h1>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />새 이벤트 생성
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">전체 이벤트</h2>
          <p className="text-gray-600">생성된 모든 면접 이벤트를 관리하세요.</p>
        </div>

        {events.length === 0 ? (
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
              <Link
                key={event.id}
                href={`/events/${event.id}/dashboard`}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer group"
              >
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
