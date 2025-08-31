"use client"

import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const sendTestEmail = async () => {
    if (!email.trim()) {
      toast.error('이메일 주소를 입력해주세요')
      return
    }

    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('로그인이 필요합니다.')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'invite',
          recipients: [{
            name: '테스트 사용자',
            email: email.trim()
          }],
          interviewData: {
            title: '테스트 면접',
            organizerName: '테스트 담당자',
            organizerEmail: 'test@example.com',
            deadlineDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            eventId: 'test-event-id',
          }
        }),
      })

      const result = await response.json()
      console.log('Test email result:', result)

      if (result.success) {
        toast.success(`테스트 이메일이 ${email}로 발송되었습니다!`)
      } else {
        toast.error(`이메일 발송 실패: ${result.errors?.[0]?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Test email error:', error)
      toast.error('이메일 발송 중 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900">이메일 발송 테스트</h1>
          <p className="text-gray-600">Resend API 테스트용 페이지입니다</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              테스트 이메일 주소
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={sendTestEmail}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                발송 중...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                테스트 이메일 발송
              </>
            )}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-2">디버깅 정보</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <div>API Key: {process.env.NEXT_PUBLIC_RESEND_TEST ? 'OK' : 'Check console'}</div>
            <div>From: 면접시간 &lt;onboarding@resend.dev&gt;</div>
            <div>Subject: 테스트 면접 - 면접 일정 선택 요청</div>
          </div>
        </div>
      </div>
    </div>
  )
}