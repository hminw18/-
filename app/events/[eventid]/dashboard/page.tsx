"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Mail, Edit, Trash2, CheckCircle, XCircle, ArrowLeft, Send, Settings } from "lucide-react"
import Link from "next/link"

interface Candidate {
  id: string
  name: string
  phone: string
  email: string
  hasResponded: boolean
  selectedTimes: string[]
}

interface InterviewEvent {
  id: string
  eventName: string
  createdAt: Date
  status: "collecting" | "closed" | "completed" | "scheduled" | "schedule failed"
  interviewLength: number
  simultaneousCount: number
  organizerEmail: string
  deadline: string
  candidates: Candidate[]
  scheduledSlots?: { candidateId: string; time: string; date: string }[]
}

// Mock data
const mockEventData: Record<string, InterviewEvent> = {
  "event-001": {
    id: "event-001",
    eventName: "프론트엔드 개발자 면접",
    createdAt: new Date("2024-01-15T10:30:00"),
    status: "collecting",
    interviewLength: 60,
    simultaneousCount: 1,
    organizerEmail: "hr@company.com",
    deadline: "2024-01-25T18:00:00",
    candidates: [
      {
        id: "c1",
        name: "김철수",
        phone: "010-1234-5678",
        email: "kim@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-26 09:00-10:00", "2024-01-26 14:00-15:00", "2024-01-27 10:00-11:00"],
      },
      {
        id: "c2",
        name: "이영희",
        phone: "010-2345-6789",
        email: "lee@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-26 10:00-11:00", "2024-01-27 09:00-10:00"],
      },
      {
        id: "c3",
        name: "박민수",
        phone: "010-3456-7890",
        email: "park@example.com",
        hasResponded: false,
        selectedTimes: [],
      },
      {
        id: "c4",
        name: "정수진",
        phone: "010-4567-8901",
        email: "jung@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-26 15:00-16:00", "2024-01-27 14:00-15:00"],
      },
      {
        id: "c5",
        name: "최동욱",
        phone: "010-5678-9012",
        email: "choi@example.com",
        hasResponded: false,
        selectedTimes: [],
      },
      {
        id: "c6",
        name: "한지민",
        phone: "010-6789-0123",
        email: "han@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-26 11:00-12:00", "2024-01-27 15:00-16:00"],
      },
      {
        id: "c7",
        name: "윤서준",
        phone: "010-7890-1234",
        email: "yoon@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-26 13:00-14:00"],
      },
      {
        id: "c8",
        name: "강민지",
        phone: "010-8901-2345",
        email: "kang@example.com",
        hasResponded: false,
        selectedTimes: [],
      },
      {
        id: "c9",
        name: "임태현",
        phone: "010-9012-3456",
        email: "lim@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-27 11:00-12:00", "2024-01-27 16:00-17:00"],
      },
      {
        id: "c10",
        name: "송하은",
        phone: "010-0123-4567",
        email: "song@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-26 16:00-17:00", "2024-01-27 13:00-14:00"],
      },
    ],
  },
  "event-002": {
    id: "event-002",
    eventName: "백엔드 개발자 면접",
    createdAt: new Date("2024-01-10T14:20:00"),
    status: "scheduled",
    interviewLength: 45,
    simultaneousCount: 2,
    organizerEmail: "tech@company.com",
    deadline: "2024-01-20T18:00:00",
    candidates: [
      {
        id: "c11",
        name: "김개발",
        phone: "010-1111-1111",
        email: "dev1@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-22 09:00-09:45", "2024-01-22 14:00-14:45"],
      },
      {
        id: "c12",
        name: "이코딩",
        phone: "010-2222-2222",
        email: "dev2@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-22 10:00-10:45", "2024-01-23 09:00-09:45"],
      },
      {
        id: "c13",
        name: "박프로그래밍",
        phone: "010-3333-3333",
        email: "dev3@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-22 11:00-11:45"],
      },
      {
        id: "c14",
        name: "정알고리즘",
        phone: "010-4444-4444",
        email: "dev4@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-22 15:00-15:45", "2024-01-23 10:00-10:45"],
      },
      {
        id: "c15",
        name: "최데이터베이스",
        phone: "010-5555-5555",
        email: "dev5@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-22 16:00-16:45", "2024-01-23 11:00-11:45"],
      },
      {
        id: "c16",
        name: "한서버",
        phone: "010-6666-6666",
        email: "dev6@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-23 14:00-14:45"],
      },
      {
        id: "c17",
        name: "윤클라우드",
        phone: "010-7777-7777",
        email: "dev7@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-23 15:00-15:45", "2024-01-23 16:00-16:45"],
      },
      {
        id: "c18",
        name: "강마이크로서비스",
        phone: "010-8888-8888",
        email: "dev8@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-22 13:00-13:45"],
      },
      {
        id: "c19",
        name: "임도커",
        phone: "010-9999-9999",
        email: "dev9@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-23 12:00-12:45", "2024-01-23 13:00-13:45"],
      },
      {
        id: "c20",
        name: "송쿠버네티스",
        phone: "010-0000-0000",
        email: "dev10@example.com",
        hasResponded: true,
        selectedTimes: ["2024-01-22 12:00-12:45"],
      },
    ],
    scheduledSlots: [
      { candidateId: "c11", time: "09:00-09:45", date: "2024-01-22" },
      { candidateId: "c12", time: "10:00-10:45", date: "2024-01-22" },
      { candidateId: "c13", time: "11:00-11:45", date: "2024-01-22" },
      { candidateId: "c18", time: "13:00-13:45", date: "2024-01-22" },
      { candidateId: "c20", time: "12:00-12:45", date: "2024-01-22" },
      { candidateId: "c14", time: "15:00-15:45", date: "2024-01-22" },
      { candidateId: "c15", time: "16:00-16:45", date: "2024-01-22" },
      { candidateId: "c16", time: "14:00-14:45", date: "2024-01-23" },
      { candidateId: "c17", time: "15:00-15:45", date: "2024-01-23" },
      { candidateId: "c19", time: "12:00-12:45", date: "2024-01-23" },
    ],
  },
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

export default function EventDashboardPage() {
  const params = useParams()
  const eventId = params.eventid as string
  const [event, setEvent] = useState<InterviewEvent | null>(mockEventData[eventId] || null)

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

  const handleAutoSchedule = () => {
    if (event.status !== "closed") {
      alert("마감된 이벤트만 일정 배정이 가능합니다.")
      return
    }
    // Mock auto scheduling
    alert("일정 자동 배정이 완료되었습니다! (Mock)")
    setEvent((prev) => (prev ? { ...prev, status: "scheduled" } : null))
  }

  const handleSendReminder = (type: "all" | "unresponded" | string) => {
    if (type === "all") {
      alert(`모든 지원자 ${event.candidates.length}명에게 리마인드를 발송했습니다! (Mock)`)
    } else if (type === "unresponded") {
      alert(`미응답 지원자 ${unrespondedCandidates.length}명에게 리마인드를 발송했습니다! (Mock)`)
    } else {
      const candidate = event.candidates.find((c) => c.id === type)
      alert(`${candidate?.name}님에게 리마인드를 발송했습니다! (Mock)`)
    }
  }

  const handleCloseEvent = () => {
    if (confirm("이벤트를 마감하시겠습니까? 마감 후에는 지원자가 응답할 수 없습니다.")) {
      setEvent((prev) => (prev ? { ...prev, status: "closed" } : null))
      alert("이벤트가 마감되었습니다.")
    }
  }

  const handleDeleteEvent = () => {
    if (confirm("이벤트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      alert("이벤트가 삭제되었습니다! (Mock)")
      // In real app, redirect to events list
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
                onClick={() => alert("이벤트 수정 기능 (Mock)")}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                수정
              </button>
              {event.status === "collecting" && (
                <button
                  onClick={handleCloseEvent}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  마감
                </button>
              )}
              <button
                onClick={handleDeleteEvent}
                className="inline-flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-900 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  일정 자동 배정
                </button>
              )}
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
        {event.scheduledSlots && event.scheduledSlots.length > 0 && (
          <div className="mt-8 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">배정된 일정</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
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
                  {event.scheduledSlots.map((slot, index) => {
                    const candidate = event.candidates.find((c) => c.id === slot.candidateId)
                    return (
                      <tr key={index}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{candidate?.name}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(slot.date).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{slot.time}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div>{candidate?.email}</div>
                          <div className="text-xs text-gray-500">{candidate?.phone}</div>
                        </td>
                      </tr>
                    )
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
                              {time}
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
      </div>
    </div>
  )
}
