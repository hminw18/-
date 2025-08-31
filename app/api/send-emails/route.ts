import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getInterviewInviteEmailTemplate, getReminderEmailTemplate, getConfirmationEmailTemplate } from '../../../lib/email-templates'
import { supabase } from '../../../lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      type, // 'invite' | 'reminder' | 'confirmation'
      recipients, // { name: string, email: string }[]
      interviewData, // { title, organizerName, organizerEmail, deadlineDate, eventId }
      confirmationData, // { title, organizerName, organizerEmail, scheduledDate, scheduledTime, meetingLocation?, meetingLink? }
    } = body

    // 입력 유효성 검사
    if (!type || !recipients || (!interviewData && !confirmationData)) {
      return NextResponse.json(
        { error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
      return NextResponse.json(
        { error: 'Resend API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    const authToken = request.headers.get('Authorization')?.split('Bearer ')[1]
    if (!authToken) {
      return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken)

    if (userError || !user) {
      return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('sender_name, sender_email_prefix')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      // 프로필이 없어도 기본값으로 계속 진행
    }

    const fromName = userProfile?.sender_name || '한시에'
    const fromAddress = `${userProfile?.sender_email_prefix || 'noreply'}@hansee.app`

    const results = []
    const errors = []

    // 각 수신자에게 개별 메일 발송
    console.log('📧 API 받은 recipients:', recipients)
    for (const recipient of recipients) {
      console.log('📧 현재 수신자:', recipient)
      try {
        let html: string, text: string, subject: string

        if (type === 'confirmation') {
          // 확정 메일 처리
          const templateResult = getConfirmationEmailTemplate({
            candidateName: recipient.name,
            interviewTitle: confirmationData.title,
            organizerName: confirmationData.organizerName,
            organizerEmail: confirmationData.organizerEmail,
            scheduledDate: confirmationData.scheduledDate,
            scheduledTime: confirmationData.scheduledTime,
            meetingLocation: confirmationData.meetingLocation,
            meetingLink: confirmationData.meetingLink,
          })
          
          html = templateResult.html
          text = templateResult.text
          subject = `면접 일정 확정 안내 - ${confirmationData.title}`
        } else {
          // 응답 URL 생성 (초대/리마인더 메일용)
          const responseUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://hansee.app'}/respond/${interviewData.shareToken || interviewData.eventId}`
          
          // 기존 초대/리마인더 메일 처리
          // 커스텀 템플릿이 있으면 사용, 없으면 기본 템플릿 사용
          if (interviewData.customTemplate && (type === 'invite' || type === 'reminder')) {
            // 커스텀 템플릿의 변수 치환
            console.log(`Using customTemplate for ${type}:`, interviewData.customTemplate.subject)
            const replaceVariables = (content: string) => {
              return content
                .replace(/\$\{candidateName\}/g, recipient.name)
                .replace(/\$\{interviewTitle\}/g, interviewData.title)
                .replace(/\$\{organizerName\}/g, interviewData.organizerName)
                .replace(/\$\{deadlineDate\}/g, formatDeadlineDate(interviewData.deadlineDate))
                .replace(/\$\{responseUrl\}/g, responseUrl)
            }
            
            html = replaceVariables(interviewData.customTemplate.htmlContent)
            text = replaceVariables(interviewData.customTemplate.textContent)
            subject = replaceVariables(interviewData.customTemplate.subject)
          } else {
            // 기본 템플릿 사용
            const template = type === 'reminder' 
              ? getReminderEmailTemplate
              : getInterviewInviteEmailTemplate

            const templateResult = template({
              candidateName: recipient.name,
              interviewTitle: interviewData.title,
              organizerName: interviewData.organizerName,
              organizerEmail: interviewData.organizerEmail,
              deadlineDate: formatDeadlineDate(interviewData.deadlineDate),
              responseUrl,
            })
            
            html = templateResult.html
            text = templateResult.text
            subject = type === 'reminder' 
              ? `[리마인더] ${interviewData.title} - 면접 일정 선택 요청`
              : `${interviewData.title} - 면접 일정 선택 요청`
          }
        }

        // 메일 발송
        const data = type === 'confirmation' ? confirmationData : interviewData

        console.log(`Sending email to ${recipient.email}:`, {
          from: `${fromName} <${fromAddress}>`,
          to: recipient.email,
          subject: subject,
          hasHtml: !!html,
          hasText: !!text
        })
        
        const emailResponse = await resend.emails.send({
          from: `${fromName} <${fromAddress}>`,
          to: recipient.email,
          subject: subject,
          html,
          text,
          replyTo: data.organizerEmail,
        })
        
        console.log('Email response:', emailResponse)

        results.push({
          email: recipient.email,
          success: true,
          messageId: emailResponse.data?.id,
        })

      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error)
        errors.push({
          email: recipient.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // 응답 반환
    const response = {
      success: errors.length === 0,
      sent: results.length,
      failed: errors.length,
      results,
      errors,
    }

    if (errors.length > 0) {
      return NextResponse.json(response, { status: 207 }) // Multi-Status
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Send emails API error:', error)
    return NextResponse.json(
      { 
        error: '메일 발송 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function formatDeadlineDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
    })
  } catch (error) {
    return dateString
  }
}

// 테스트용 GET 엔드포인트
export async function GET() {
  return NextResponse.json({
    message: 'Email API is working',
    hasApiKey: !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key_here',
  })
}