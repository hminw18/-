import { supabase } from './supabase'
import type { Database } from './supabase'

type InterviewEvent = Database['public']['Tables']['interview_events']['Insert']
type AvailableTimeSlot = Database['public']['Tables']['available_time_slots']['Insert']
type Candidate = Database['public']['Tables']['candidates']['Insert']

// 면접 이벤트 생성
export async function createInterviewEvent(eventData: {
  eventName: string
  organizerEmail: string
  interviewLength: number
  simultaneousCount: number
  deadline: Date
  reminderSettings: {
    oneDayBefore: boolean
    threeHoursBefore: boolean
    oneHourBefore: boolean
  }
  sendOptions: {
    sendEmail: boolean
    generateLink: boolean
  }
  timeRange: {
    startTime: string
    endTime: string
  }
  availableTimes: Array<{
    date: Date
    slots: Array<{
      start: string
      end: string
    }>
  }>
  candidates: Array<{
    name: string
    phone: string
    email: string
  }>
}) {
  try {
    // 1. 면접 이벤트 생성
    const { data: event, error: eventError } = await supabase
      .from('interview_events')
      .insert({
        event_name: eventData.eventName,
        organizer_email: eventData.organizerEmail,
        interview_length: eventData.interviewLength,
        simultaneous_count: eventData.simultaneousCount,
        deadline: eventData.deadline.toISOString(),
        reminder_settings: eventData.reminderSettings,
        send_options: eventData.sendOptions,
        time_range: eventData.timeRange,
        share_token: eventData.sendOptions.generateLink ? generateShareToken() : null
      })
      .select()
      .single()

    if (eventError) throw eventError

    const eventId = event.id

    // 2. 가용 시간 슬롯 생성
    const timeSlots: AvailableTimeSlot[] = []
    eventData.availableTimes.forEach(availableTime => {
      availableTime.slots.forEach(slot => {
        timeSlots.push({
          event_id: eventId,
          date: availableTime.date.toISOString().split('T')[0],
          start_time: slot.start,
          end_time: slot.end
        })
      })
    })

    const { error: slotsError } = await supabase
      .from('available_time_slots')
      .insert(timeSlots)

    if (slotsError) throw slotsError

    // 3. 지원자 생성 (응답 토큰 포함)
    const candidates: Candidate[] = eventData.candidates.map(candidate => ({
      event_id: eventId,
      name: candidate.name,
      phone: candidate.phone,
      email: candidate.email,
      response_token: generateResponseToken(),
      has_responded: false
    }))

    const { error: candidatesError } = await supabase
      .from('candidates')
      .insert(candidates)

    if (candidatesError) throw candidatesError

    return {
      success: true,
      event,
      shareToken: event.share_token
    }
  } catch (error) {
    console.error('Error creating interview event:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 면접 이벤트 조회 (대시보드용)
export async function getInterviewEvent(eventId: string) {
  try {
    const { data: event, error: eventError } = await supabase
      .from('interview_events')
      .select(`
        *,
        available_time_slots (*),
        candidates (*)
      `)
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError

    return {
      success: true,
      event
    }
  } catch (error) {
    console.error('Error fetching interview event:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 지원자 응답 페이지용 이벤트 조회 (공개 토큰 기반)
export async function getInterviewEventByShareToken(shareToken: string) {
  try {
    const { data: event, error: eventError } = await supabase
      .from('interview_events')
      .select(`
        *,
        available_time_slots (*)
      `)
      .eq('share_token', shareToken)
      .single()

    if (eventError) throw eventError

    return {
      success: true,
      event
    }
  } catch (error) {
    console.error('Error fetching interview event by share token:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 지원자 응답 페이지용 이벤트 조회 (응답 토큰 기반)
export async function getInterviewEventByResponseToken(responseToken: string) {
  try {
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select(`
        *,
        interview_events!inner (
          *,
          available_time_slots (*)
        )
      `)
      .eq('response_token', responseToken)
      .single()

    if (candidateError) throw candidateError

    return {
      success: true,
      candidate,
      event: candidate.interview_events
    }
  } catch (error) {
    console.error('Error fetching interview event by response token:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 지원자 시간 선택 저장
export async function saveCandidateTimeSelection(
  candidateId: string,
  selections: Array<{
    date: string
    startTime: string
    endTime: string
    preferenceOrder: number
  }>
) {
  try {
    // 기존 선택 삭제
    const { error: deleteError } = await supabase
      .from('candidate_time_selections')
      .delete()
      .eq('candidate_id', candidateId)

    if (deleteError) throw deleteError

    // 새로운 선택 저장
    const timeSelections = selections.map(selection => ({
      candidate_id: candidateId,
      selected_date: selection.date,
      selected_start_time: selection.startTime,
      selected_end_time: selection.endTime,
      preference_order: selection.preferenceOrder
    }))

    const { error: insertError } = await supabase
      .from('candidate_time_selections')
      .insert(timeSelections)

    if (insertError) throw insertError

    // 지원자 응답 상태 업데이트
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        has_responded: true,
        responded_at: new Date().toISOString()
      })
      .eq('id', candidateId)

    if (updateError) throw updateError

    return {
      success: true
    }
  } catch (error) {
    console.error('Error saving candidate time selection:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 유틸리티 함수들
function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateResponseToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// 관리자용 - 면접 일정 최종 배정
export async function scheduleInterviews(eventId: string, schedules: Array<{
  candidateId: string
  date: string
  startTime: string
  endTime: string
  meetingLink?: string
  meetingRoom?: string
}>) {
  try {
    const scheduledInterviews = schedules.map(schedule => ({
      event_id: eventId,
      candidate_id: schedule.candidateId,
      scheduled_date: schedule.date,
      scheduled_start_time: schedule.startTime,
      scheduled_end_time: schedule.endTime,
      meeting_link: schedule.meetingLink || null,
      meeting_room: schedule.meetingRoom || null,
      status: 'scheduled' as const
    }))

    const { error: scheduleError } = await supabase
      .from('scheduled_interviews')
      .insert(scheduledInterviews)

    if (scheduleError) throw scheduleError

    // 면접 이벤트 상태를 'scheduled'로 업데이트
    const { error: updateError } = await supabase
      .from('interview_events')
      .update({ status: 'scheduled' })
      .eq('id', eventId)

    if (updateError) throw updateError

    return {
      success: true
    }
  } catch (error) {
    console.error('Error scheduling interviews:', error)
    return {
      success: false,
      error: error.message
    }
  }
}