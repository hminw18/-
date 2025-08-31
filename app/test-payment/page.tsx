"use client"

import { useState } from 'react'
import { CreditCard, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AppHeader from '../../components/ui/app-header'
import PaymentModal from '../../components/payment/PaymentModal'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function TestPaymentPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false)
    setPaymentStatus('success')
    toast.success('결제 테스트가 시작되었습니다!')
  }

  const testPaymentStatus = async () => {
    try {
      // Supabase 세션에서 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('로그인이 필요합니다.')
        return
      }

      const response = await fetch('/api/payment/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setPaymentStatus(data.hasProPlan ? 'has-pro' : 'no-pro')
        toast.success(`플랜 상태: ${data.hasProPlan ? 'Pro 플랜 보유' : '무료 플랜'}`)
      } else {
        setPaymentStatus('error')
        toast.error('상태 확인 실패')
      }
    } catch (error) {
      setPaymentStatus('error')
      toast.error('API 오류가 발생했습니다.')
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AppHeader>
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-semibold text-gray-900">결제 시스템 테스트</h1>
          </div>
        </AppHeader>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 테스트 안내 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-semibold text-yellow-900">개발 테스트 모드</h2>
            </div>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 현재 NicePay 샌드박스 환경으로 테스트됩니다</li>
              <li>• <strong>⚠️ 실제 카드번호를 입력하면 오류가 발생합니다!</strong></li>
              <li>• <strong>✅ 테스트 카드번호만 사용하세요:</strong></li>
              <li className="ml-4">- 카드번호: <code className="bg-yellow-200 px-1">4000-0000-0000-0004</code></li>
              <li className="ml-4">- 또는: <code className="bg-yellow-200 px-1">5555-5555-5555-4444</code></li>
              <li>• 유효기간: 임의 설정 (예: 12/25, 01/27 등)</li>
              <li>• CVC: 임의 3자리 (예: 123, 456 등)</li>
              <li>• 카드비밀번호: 앞 2자리 (예: 00, 12 등)</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 결제 테스트 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 테스트</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Pro 플랜</h4>
                  <p className="text-sm text-blue-800 mb-3">월 ₩7,900</p>
                  <ul className="text-xs text-blue-700 space-y-1 mb-4">
                    <li>• 무제한 면접 이벤트</li>
                    <li>• 무제한 지원자 초대</li>
                    <li>• 이메일 자동 발송</li>
                    <li>• 고급 일정 최적화</li>
                  </ul>
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    테스트 결제하기
                  </button>
                </div>
              </div>
            </div>

            {/* 상태 확인 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 상태 확인</h3>
              <div className="space-y-4">
                <button
                  onClick={testPaymentStatus}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  현재 플랜 상태 확인
                </button>
                
                {paymentStatus && (
                  <div className={`p-4 rounded-lg border ${
                    paymentStatus === 'has-pro' ? 'bg-green-50 border-green-200' :
                    paymentStatus === 'no-pro' ? 'bg-gray-50 border-gray-200' :
                    paymentStatus === 'success' ? 'bg-blue-50 border-blue-200' :
                    'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {paymentStatus === 'has-pro' && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {paymentStatus === 'no-pro' && <XCircle className="w-5 h-5 text-gray-600" />}
                      {paymentStatus === 'success' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                      {paymentStatus === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                      
                      <span className={`font-medium ${
                        paymentStatus === 'has-pro' ? 'text-green-900' :
                        paymentStatus === 'no-pro' ? 'text-gray-900' :
                        paymentStatus === 'success' ? 'text-blue-900' :
                        'text-red-900'
                      }`}>
                        {paymentStatus === 'has-pro' ? 'Pro 플랜 이용 중' :
                         paymentStatus === 'no-pro' ? '무료 플랜 이용 중' :
                         paymentStatus === 'success' ? '결제 진행 중...' :
                         'API 오류 발생'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 개발 가이드 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">개발 참고사항</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">API 엔드포인트</h4>
                <ul className="space-y-1">
                  <li><code className="bg-gray-100 px-2 py-1 rounded">/api/payment/prepare</code> - 결제 준비</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">/api/payment/callback</code> - 결제 콜백</li>
                  <li><code className="bg-gray-100 px-2 py-1 rounded">/api/payment/status</code> - 상태 확인</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">결제 흐름</h4>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>결제 정보 준비 (prepare)</li>
                  <li>NicePay 결제창 호출</li>
                  <li>사용자 카드 결제</li>
                  <li>콜백으로 승인 처리</li>
                  <li>DB 상태 업데이트</li>
                </ol>
              </div>
            </div>
          </div>

          {/* 결제 모달 */}
          <PaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={handlePaymentSuccess}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}