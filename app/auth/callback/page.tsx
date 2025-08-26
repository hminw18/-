"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL에서 인증 정보 처리
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          // 부모 창에 오류 전송
          if (window.opener) {
            window.opener.postMessage(
              { type: 'GOOGLE_AUTH_ERROR', error: error.message },
              window.location.origin
            )
          }
          window.close()
          return
        }

        if (data.session) {
          console.log('Authentication successful:', data.session.user)
          // 부모 창에 성공 메시지 전송
          if (window.opener) {
            window.opener.postMessage(
              { type: 'GOOGLE_AUTH_SUCCESS', user: data.session.user },
              window.location.origin
            )
          }
          // 팝업인 경우 창 닫기, 아니면 events로 리다이렉트
          if (window.opener) {
            window.close()
          } else {
            router.push('/events')
          }
        } else {
          console.log('No session found, redirecting to home')
          if (window.opener) {
            window.close()
          } else {
            router.push('/')
          }
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        if (window.opener) {
          window.opener.postMessage(
            { type: 'GOOGLE_AUTH_ERROR', error: 'Unexpected error occurred' },
            window.location.origin
          )
          window.close()
        } else {
          router.push('/')
        }
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">인증 처리 중...</p>
      </div>
    </div>
  )
}