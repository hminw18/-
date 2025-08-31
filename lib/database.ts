import { supabase, supabaseAdmin } from './supabase'
import type { Database } from './supabase'
import { formatDateForDB } from '../utils/calendar'
import { optimizeInterviewSchedule } from '../utils/schedule-optimizer'
import type { Candidate as ScheduleCandidate, TimeSlot, OptimizationResult } from '../utils/schedule-optimizer'

type InterviewEvent = Database['public']['Tables']['interview_events']['Insert']
type AvailableTimeSlot = Database['public']['Tables']['available_time_slots']['Insert']
type DbCandidate = Database['public']['Tables']['candidates']['Insert']

// 면접 이벤트 생성
export async function createInterviewEvent(eventData: {
  eventName: string
  description?: string
  organizerName: string
  organizerEmail: string
  interviewLength: number
  bufferTime: number
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
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    // 1. 면접 이벤트 생성
    const { data: event, error: eventError } = await supabase
      .from('interview_events')
      .insert({
        event_name: eventData.eventName,
        description: eventData.description,
        organizer_name: eventData.organizerName,
        organizer_email: eventData.organizerEmail,
        interview_length: eventData.interviewLength,
        buffer_time: eventData.bufferTime,
        simultaneous_count: eventData.simultaneousCount,
        deadline: eventData.deadline.toISOString(),
        reminder_settings: eventData.reminderSettings,
        send_options: eventData.sendOptions,
        time_range: eventData.timeRange,
        share_token: eventData.sendOptions.generateLink ? generateShareToken() : null,
        user_id: user.id
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
          date: formatDateForDB(availableTime.date),
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
        candidates (
          *,
          candidate_time_selections (*)
        )
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
  console.log('=== DATABASE DEBUG START ===')
  console.log('getInterviewEventByShareToken called with:', shareToken)
  console.log('ShareToken type:', typeof shareToken)
  console.log('ShareToken length:', shareToken?.length)
  console.log('Supabase client status:', supabase ? 'initialized' : 'not initialized')
  
  try {
    console.log('Making Supabase query...')
    const { data: event, error: eventError } = await supabase
      .from('interview_events')
      .select(`
        *,
        available_time_slots (*),
        candidates (
          *,
          candidate_time_selections (*)
        )
      `)
      .eq('share_token', shareToken)
      .single()
    
    console.log('Supabase query result:')
    console.log('- Event data:', event)
    console.log('- Event error:', eventError)
    console.log('- Error code:', eventError?.code)
    console.log('- Error message:', eventError?.message)

    if (eventError) {
      // PGRST116은 "No rows returned" 에러 코드
      if (eventError.code === 'PGRST116') {
        return {
          success: false,
          error: '이벤트를 찾을 수 없습니다.'
        }
      }
      throw eventError
    }

    if (!event) {
      console.log('Event is null or undefined')
      console.log('=== DATABASE DEBUG END ===')
      return {
        success: false,
        error: '이벤트를 찾을 수 없습니다.'
      }
    }

    console.log('Success! Returning event:', event.event_name)
    console.log('=== DATABASE DEBUG END ===')
    return {
      success: true,
      event
    }
  } catch (error) {
    console.error('Error fetching interview event by share token:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    console.log('=== DATABASE DEBUG END ===')
    return {
      success: false,
      error: error?.message || '이벤트를 불러오는 중 오류가 발생했습니다.'
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

    if (candidateError) {
      // PGRST116은 "No rows returned" 에러 코드
      if (candidateError.code === 'PGRST116') {
        return {
          success: false,
          error: '지원자를 찾을 수 없습니다.'
        }
      }
      throw candidateError
    }

    if (!candidate) {
      return {
        success: false,
        error: '지원자를 찾을 수 없습니다.'
      }
    }

    return {
      success: true,
      candidate,
      event: candidate.interview_events
    }
  } catch (error) {
    console.error('Error fetching interview event by response token:', error)
    return {
      success: false,
      error: error?.message || '지원자 정보를 불러오는 중 오류가 발생했습니다.'
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
    const timeSelections = selections.map((selection, index) => ({
      candidate_id: candidateId,
      selected_date: selection.date,
      selected_start_time: selection.startTime,
      selected_end_time: selection.endTime,
      preference_order: index + 1 // DB에 순서는 저장하지만 UI에서는 사용하지 않음
    }))

    console.log('Saving time selections to database:', timeSelections)

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

// 암호학적으로 안전한 토큰 생성 함수들
function generateShareToken(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // 브라우저 환경에서 crypto.getRandomValues 사용
    const array = new Uint8Array(24)
    window.crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/[+/]/g, '')
      .substring(0, 32)
  } else {
    // Node.js 환경 또는 crypto 미지원 시 fallback (개발용만)
    console.warn('Using fallback token generation - not cryptographically secure')
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
  }
}

function generateResponseToken(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // 브라우저 환경에서 crypto.getRandomValues 사용
    const array = new Uint8Array(24)
    window.crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/[+/]/g, '')
      .substring(0, 32)
  } else {
    // Node.js 환경 또는 crypto 미지원 시 fallback (개발용만)
    console.warn('Using fallback token generation - not cryptographically secure')
    return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
  }
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

// 이벤트 마감
export async function closeInterviewEvent(eventId: string) {
  try {
    const { error } = await supabase
      .from('interview_events')
      .update({ 
        status: 'closed'
      })
      .eq('id', eventId)

    if (error) throw error

    return {
      success: true
    }
  } catch (error) {
    console.error('Error closing interview event:', error)
    return {
      success: false,
      error: error?.message || '알 수 없는 오류가 발생했습니다.'
    }
  }
}

// 이벤트 수정
export async function updateInterviewEvent(eventId: string, updates: {
  event_name?: string
  interview_length?: number
  simultaneous_count?: number
  deadline?: string
  reminder_settings?: any
  time_range?: any
}) {
  try {
    const { error } = await supabase
      .from('interview_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)

    if (error) throw error

    return {
      success: true
    }
  } catch (error) {
    console.error('Error updating interview event:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 이벤트 삭제
export async function deleteInterviewEvent(eventId: string) {
  try {
    const { error } = await supabase
      .from('interview_events')
      .delete()
      .eq('id', eventId)

    if (error) throw error

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting interview event:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 면접 일정 자동 생성
export async function generateInterviewSchedule(eventId: string) {
  try {
    // 1. 이벤트 정보 가져오기
    const { data: event, error: eventError } = await supabase
      .from('interview_events')
      .select(`
        *,
        available_time_slots (*),
        candidates!inner (
          *,
          candidate_time_selections (*)
        )
      `)
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError
    if (!event) throw new Error('이벤트를 찾을 수 없습니다.')

    // 2. 응답한 지원자만 필터링
    const respondedCandidates = event.candidates.filter(c => c.has_responded)
    if (respondedCandidates.length === 0) {
      throw new Error('응답한 지원자가 없습니다.')
    }

    // 3. 스케줄러에 맞는 데이터 형식으로 변환
    const candidates: ScheduleCandidate[] = respondedCandidates.map(candidate => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      availableSlots: candidate.candidate_time_selections.map(selection => 
        `${selection.selected_date}T${selection.selected_start_time}`
      )
    }))

    const availableSlots: TimeSlot[] = event.available_time_slots.map(slot => ({
      id: slot.id,
      datetime: `${slot.date}T${slot.start_time}`,
      date: slot.date,
      startTime: slot.start_time,
      endTime: slot.end_time
    }))

    // 4. 스케줄 최적화 실행
    const optimizationResult = optimizeInterviewSchedule(
      candidates,
      availableSlots,
      event.interview_length,
      event.buffer_time,
      event.simultaneous_count
    )

    // 5. 스케줄 결과를 데이터베이스에 저장
    const scheduledInterviews = optimizationResult.assignments.map(assignment => {
      // 면접 길이에 따른 실제 종료 시간 계산
      const startTime = assignment.slot.startTime
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(startHour, startMinute, 0, 0)
      
      const endDate = new Date(startDate.getTime() + event.interview_length * 60000)
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`
      
      return {
        event_id: eventId,
        candidate_id: assignment.candidate.id,
        scheduled_date: assignment.slot.date,
        scheduled_start_time: startTime,
        scheduled_end_time: endTime,
        session_id: assignment.sessionId,
        status: 'scheduled' as const
      }
    })

    // 기존 스케줄 삭제
    const { error: deleteError } = await supabase
      .from('scheduled_interviews')
      .delete()
      .eq('event_id', eventId)

    if (deleteError) throw deleteError

    // 새로운 스케줄 삽입
    if (scheduledInterviews.length > 0) {
      const { error: insertError } = await supabase
        .from('scheduled_interviews')
        .insert(scheduledInterviews)

      if (insertError) throw insertError
    }

    // 6. 이벤트 상태를 'scheduled'로 변경
    const { error: updateError } = await supabase
      .from('interview_events')
      .update({ 
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)

    if (updateError) throw updateError

    return {
      success: true,
      result: {
        totalCandidates: respondedCandidates.length,
        scheduledCandidates: optimizationResult.assignments.length,
        unscheduledCandidates: optimizationResult.unscheduledCandidates.length,
        utilizationRate: optimizationResult.utilizationRate,
        totalSessions: optimizationResult.totalSessions,
        score: optimizationResult.score
      }
    }
  } catch (error) {
    console.error('Error generating interview schedule:', error)
    return {
      success: false,
      error: error?.message || '면접 일정 생성 중 오류가 발생했습니다.'
    }
  }
}

// 생성된 스케줄 조회
export async function getScheduledInterviews(eventId: string) {
  try {
    const { data, error } = await supabase
      .from('scheduled_interviews')
      .select(`
        *,
        candidates (
          name,
          email,
          phone
        )
      `)
      .eq('event_id', eventId)
      .order('scheduled_date')
      .order('scheduled_start_time')

    if (error) throw error

    return {
      success: true,
      data: data || []
    }
  } catch (error) {
    console.error('Error fetching scheduled interviews:', error)
    return {
      success: false,
      error: error?.message || '스케줄 조회 중 오류가 발생했습니다.',
      data: []
    }
  }
}

// ===== 결제 관련 함수들 =====

// 결제 정보 생성
export async function createPayment(paymentData: {
  userId: string
  orderId: string
  amount: number
  goodsName: string
  buyerName: string
  buyerEmail: string
  buyerTel?: string
  mallReserved?: string
}) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert([{
        user_id: paymentData.userId,
        order_id: paymentData.orderId,
        amount: paymentData.amount,
        goods_name: paymentData.goodsName,
        buyer_name: paymentData.buyerName,
        buyer_email: paymentData.buyerEmail,
        buyer_tel: paymentData.buyerTel,
        mall_reserved: paymentData.mallReserved,
        status: 'pending'
      }])
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      payment: data
    }
  } catch (error) {
    console.error('Error creating payment:', error)
    return {
      success: false,
      error: error?.message || '결제 정보 생성 중 오류가 발생했습니다.'
    }
  }
}

// 결제 정보 업데이트 (승인 완료시)
export async function updatePaymentStatus(
  orderId: string, 
  updateData: {
    tid?: string
    status: 'approved' | 'failed' | 'cancelled'
    authDate?: string
    authTime?: string
    cardCode?: string
    cardName?: string
    resultCode?: string
    resultMsg?: string
    signature?: string
    rawResponse?: any
  }
) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .update({
        tid: updateData.tid,
        status: updateData.status,
        auth_date: updateData.authDate ? new Date(updateData.authDate) : null,
        auth_time: updateData.authTime,
        card_code: updateData.cardCode,
        card_name: updateData.cardName,
        result_code: updateData.resultCode,
        result_msg: updateData.resultMsg,
        signature: updateData.signature,
        raw_response: updateData.rawResponse,
        updated_at: new Date()
      })
      .eq('order_id', orderId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      payment: data
    }
  } catch (error) {
    console.error('Error updating payment:', error)
    return {
      success: false,
      error: error?.message || '결제 정보 업데이트 중 오류가 발생했습니다.'
    }
  }
}

// 결제 정보 조회 (주문번호로)
export async function getPaymentByOrderId(orderId: string) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single()

    if (error) throw error

    return {
      success: true,
      payment: data
    }
  } catch (error) {
    console.error('Error fetching payment:', error)
    return {
      success: false,
      error: error?.message || '결제 정보 조회 중 오류가 발생했습니다.',
      payment: null
    }
  }
}

// 사용자 결제 내역 조회
export async function getUserPayments(userId: string) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      payments: data || []
    }
  } catch (error) {
    console.error('Error fetching user payments:', error)
    return {
      success: false,
      error: error?.message || '결제 내역 조회 중 오류가 발생했습니다.',
      payments: []
    }
  }
}

// 사용자 플랜 상태 확인 (결제 승인된 Pro 플랜이 있는지)
export async function getUserPlanStatus(userId: string) {
  try {
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured')
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .ilike('goods_name', '%Pro%')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    const hasProPlan = data && data.length > 0
    
    return {
      success: true,
      hasProPlan,
      latestPayment: data?.[0] || null
    }
  } catch (error) {
    console.error('Error checking user plan status:', error)
    return {
      success: false,
      error: error?.message || '플랜 상태 확인 중 오류가 발생했습니다.',
      hasProPlan: false,
      latestPayment: null
    }
  }
}

// 세션 장소 정보 업데이트
export async function updateSessionLocation(sessionId: string, location: string) {
  try {
    const { data, error } = await supabase
      .from('scheduled_interviews')
      .update({ meeting_room: location })
      .eq('session_id', sessionId)
      .select()

    if (error) throw error

    return {
      success: true,
      message: '장소 정보가 성공적으로 업데이트되었습니다.',
      data
    }
  } catch (error) {
    console.error('Error updating session location:', error)
    return {
      success: false,
      error: error?.message || '장소 정보 업데이트 중 오류가 발생했습니다.'
    }
  }
}