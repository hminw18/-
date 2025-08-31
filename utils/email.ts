import { supabase } from '../lib/supabase'

interface EmailRecipient {
  name: string
  email: string
}

interface InterviewEmailData {
  title: string
  organizerName: string
  organizerEmail: string
  deadlineDate: string
  eventId: string
  fromName?: string
  fromEmail?: string
  customTemplate?: {
    subject: string
    htmlContent: string
    textContent: string
  }
}

interface EmailResponse {
  success: boolean
  sent: number
  failed: number
  results: Array<{
    email: string
    success: boolean
    messageId?: string
  }>
  errors: Array<{
    email: string
    error: string
  }>
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('User not authenticated')
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  }
}

export async function sendInterviewInviteEmails(
  recipients: EmailRecipient[],
  interviewData: InterviewEmailData
): Promise<EmailResponse> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/send-emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'invite',
        recipients,
        interviewData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error sending invite emails:', error)
    throw new Error('메일 발송에 실패했습니다.')
  }
}

export async function sendReminderEmails(
  recipients: EmailRecipient[],
  interviewData: InterviewEmailData
): Promise<EmailResponse> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/send-emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'reminder',
        recipients,
        interviewData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error sending reminder emails:', error)
    throw new Error('리마인더 메일 발송에 실패했습니다.')
  }
}

interface ConfirmationEmailData {
  title: string
  organizerName: string
  organizerEmail: string
  scheduledDate: string
  scheduledTime: string
  meetingLocation?: string
  meetingLink?: string
}

export async function sendConfirmationEmails(
  recipients: EmailRecipient[],
  confirmationData: ConfirmationEmailData
): Promise<EmailResponse> {
  try {
    const headers = await getAuthHeaders()
    const response = await fetch('/api/send-emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'confirmation',
        recipients,
        confirmationData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error sending confirmation emails:', error)
    throw new Error('확정 메일 발송에 실패했습니다.')
  }
}

export function validateEmailList(candidates: EmailRecipient[]): {
  valid: EmailRecipient[]
  invalid: Array<{ name: string; email: string; error: string }>
} {
  const valid: EmailRecipient[] = []
  const invalid: Array<{ name: string; email: string; error: string }> = []

  candidates.forEach(candidate => {
    if (!candidate.name || !candidate.name.trim()) {
      invalid.push({ ...candidate, error: '이름이 비어있습니다' })
      return
    }

    if (!candidate.email || !candidate.email.trim()) {
      invalid.push({ ...candidate, error: '이메일이 비어있습니다' })
      return
    }

    // 간단한 이메일 유효성 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(candidate.email)) {
      invalid.push({ ...candidate, error: '유효하지 않은 이메일 형식입니다' })
      return
    }

    valid.push(candidate)
  })

  return { valid, invalid }
}

// 이메일 발송 상태를 localStorage에 저장 (개발/테스트용)
export function saveEmailSendStatus(eventId: string, status: EmailResponse) {
  if (typeof window !== 'undefined') {
    const key = `email_status_${eventId}`
    const data = {
      ...status,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(data))
  }
}

export function getEmailSendStatus(eventId: string): (EmailResponse & { timestamp: string }) | null {
  if (typeof window !== 'undefined') {
    const key = `email_status_${eventId}`
    const data = localStorage.getItem(key)
    if (data) {
      try {
        return JSON.parse(data)
      } catch (error) {
        console.warn('Failed to parse email status:', error)
      }
    }
  }
  return null
}