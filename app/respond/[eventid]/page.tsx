"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import VerticalMeetingCalendar from "../../../vertical-meeting-calendar"
import { getInterviewEventByShareToken } from "../../../lib/database"
import { parseDateFromDB } from "../../../utils/calendar"

export default function RespondPage() {
  const params = useParams()
  const shareToken = params.eventid as string // 실제로는 shareToken입니다
  const [eventData, setEventData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadEventData() {
      console.log('Loading event data for shareToken:', shareToken)
      try {
        const result = await getInterviewEventByShareToken(shareToken)
        console.log('DB result:', result)
        if (result.success && result.event) {
          console.log('Event loaded successfully:', result.event)
          setEventData(result.event)
        } else {
          console.log('Event not found or error:', result.error)
          setError(result.error || '이벤트를 찾을 수 없습니다.')
        }
      } catch (err) {
        console.error('Error loading event:', err)
        setError('이벤트 로딩 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (shareToken) {
      loadEventData()
    }
  }, [shareToken])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">이벤트 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">오류 발생</h1>
          <p className="text-gray-600 mb-6">{error || '이벤트를 찾을 수 없습니다.'}</p>
        </div>
      </div>
    )
  }

  const experience = {
    title: eventData?.event_name || '',
    interviewLength: eventData?.interview_length || 60,
    availableTimeSlots: eventData?.available_time_slots || [],
    status: eventData?.status || 'collecting',
    deadline: eventData?.deadline || '',
    organizerEmail: eventData?.organizer_email || '',
    dates: eventData?.available_time_slots ? 
      eventData.available_time_slots.map((slot: any, index: number) => ({
        id: slot.id || index.toString(),
        label: parseDateFromDB(slot.date).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        date: slot.date,
        dateRange: `${slot.start_time} - ${slot.end_time}`,
      })).sort((a, b) => {
        // 먼저 날짜로 정렬
        const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        if (dateComparison !== 0) return dateComparison
        
        // 같은 날짜라면 시작 시간으로 정렬 (dateRange에서 시작 시간 추출)
        const aStartTime = a.dateRange.split(' - ')[0]
        const bStartTime = b.dateRange.split(' - ')[0]
        return aStartTime.localeCompare(bStartTime)
      }) : []
  }


  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="w-full px-8">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full">
          <VerticalMeetingCalendar experience={experience} eventValid={true} />
        </div>
      </div>
    </div>
  )
}
