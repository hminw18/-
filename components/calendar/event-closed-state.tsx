"use client"

import { Lock, Calendar, Clock, Users } from "lucide-react"

interface EventClosedStateProps {
  eventName: string
  deadline: string
  interviewLength: number
  organizerEmail: string
}

export default function EventClosedState({
  eventName,
  deadline,
  interviewLength,
  organizerEmail
}: EventClosedStateProps) {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          {/* Icon and Title */}
          <div className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-gray-600" />
            </div>
            
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">응답 마감</h1>
              <p className="text-gray-600">더 이상 응답할 수 없습니다</p>
            </div>
          </div>

          {/* Event Info */}
          <div className="space-y-4 text-left">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{eventName}</h2>
              <p className="text-sm text-gray-600">면접 일정 조율</p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <span className="text-gray-600">마감 일시:</span>
                  <div className="text-gray-900 font-medium">
                    {new Date(deadline).toLocaleString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-600">면접 길이: </span>
                  <span className="text-gray-900 font-medium">{interviewLength}분</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-gray-600">담당자: </span>
                  <span className="text-gray-900 font-medium">{organizerEmail}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-2 pt-4 border-t border-gray-100">
            <p className="text-gray-700">
              응답 마감으로 인해 더 이상 일정을 선택할 수 없습니다.
            </p>
            <p className="text-sm text-gray-500">
              문의사항이 있으시면 담당자에게 직접 연락해 주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}