"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, Shield, Check, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import Script from 'next/script'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

declare global {
  interface Window {
    AUTHNICE: {
      requestPay: (options: {
        clientId: string
        method: string
        orderId: string
        amount: number
        goodsName: string
        returnUrl: string
        buyerName?: string
        buyerEmail?: string
        buyerTel?: string
        mallReserved?: string
        fnError: (result: { errorMsg: string }) => void
      }) => void
    }
  }
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [buyerInfo, setBuyerInfo] = useState({
    name: '',
    email: user?.email || '',
    tel: ''
  })

  useEffect(() => {
    if (user) {
      setBuyerInfo(prev => ({
        ...prev,
        name: user.user_metadata?.name || user.user_metadata?.full_name || '',
        email: user.email || ''
      }))
    }
  }, [user])

  const handleScriptLoad = () => {
    setIsScriptLoaded(true)
  }

  // 스크립트가 이미 로드되어 있는지 확인
  useEffect(() => {
    if (isOpen) {
      // NicePay 스크립트가 이미 로드되어 있는지 확인
      if (typeof window !== 'undefined' && window.AUTHNICE) {
        setIsScriptLoaded(true)
      } else {
        // 스크립트 로드 체크를 위한 인터벌
        const checkScript = setInterval(() => {
          if (window.AUTHNICE) {
            setIsScriptLoaded(true)
            clearInterval(checkScript)
          }
        }, 100)

        // 10초 후 타임아웃
        const timeout = setTimeout(() => {
          clearInterval(checkScript)
          if (!isScriptLoaded) {
            console.warn('NicePay script loading timeout')
          }
        }, 10000)

        return () => {
          clearInterval(checkScript)
          clearTimeout(timeout)
        }
      }
    }
  }, [isOpen, isScriptLoaded])

  const handlePayment = async () => {
    if (!window.AUTHNICE) {
      toast.error('결제 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    if (!buyerInfo.name.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }

    if (!buyerInfo.email.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }

    setIsLoading(true)

    try {
      // Supabase 세션에서 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('인증이 필요합니다. 다시 로그인해주세요.')
      }

      // 결제 준비 API 호출
      const prepareResponse = await fetch('/api/payment/prepare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          planType: 'pro',
          buyerName: buyerInfo.name.trim(),
          buyerEmail: buyerInfo.email.trim(),
          buyerTel: buyerInfo.tel.trim() || undefined
        }),
      })

      const prepareResult = await prepareResponse.json()

      if (!prepareResponse.ok || !prepareResult.success) {
        throw new Error(prepareResult.error || '결제 준비 중 오류가 발생했습니다.')
      }

      const { paymentData } = prepareResult

      // NicePay 결제창 호출
      window.AUTHNICE.requestPay({
        clientId: paymentData.clientId,
        method: 'card',
        orderId: paymentData.orderId,
        amount: paymentData.amount,
        goodsName: paymentData.goodsName,
        returnUrl: paymentData.returnUrl,
        buyerName: paymentData.buyerName,
        buyerEmail: paymentData.buyerEmail,
        buyerTel: paymentData.buyerTel,
        mallReserved: paymentData.mallReserved,
        fnError: (result) => {
          console.error('Payment error:', result)
          toast.error(`결제 오류: ${result.errorMsg}`)
          setIsLoading(false)
        }
      })

      // 결제창이 열리면 모달 닫기
      onClose()

    } catch (error) {
      console.error('Payment preparation error:', error)
      toast.error(error?.message || '결제 준비 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* NicePay Script - 항상 로드 */}
      <Script
        src="https://pay.nicepay.co.kr/v1/js/"
        onLoad={handleScriptLoad}
        strategy="afterInteractive"
      />
      
      {isOpen && (
      <AnimatePresence>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Pro 플랜 업그레이드</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Plan Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">한시에 Pro</h3>
                </div>
                
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>무제한 면접 이벤트 생성</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>무제한 지원자 초대</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>이메일 자동 발송 기능</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>고급 일정 최적화</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span>우선 고객 지원</span>
                  </li>
                </ul>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">₩7,900</span>
                    <span className="text-sm text-gray-600">/ 월</span>
                  </div>
                </div>
              </div>

              {/* Buyer Info Form */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">결제자 정보</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 *
                  </label>
                  <input
                    type="text"
                    value={buyerInfo.name}
                    onChange={(e) => setBuyerInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="결제자 이름"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일 *
                  </label>
                  <input
                    type="email"
                    value={buyerInfo.email}
                    onChange={(e) => setBuyerInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="이메일 주소"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전화번호 (선택)
                  </label>
                  <input
                    type="tel"
                    value={buyerInfo.tel}
                    onChange={(e) => setBuyerInfo(prev => ({ ...prev, tel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>

              {/* Test Card Notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">💳 샌드박스 테스트 안내</h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <p><strong>✅ 실제 카드번호를 입력하세요</strong> (본인 카드 권장)</p>
                  <p><strong>🔒 실제 결제는 발생하지 않습니다</strong> (샌드박스 환경)</p>
                  <p>• 유효기간, CVC: 실제 정보 입력</p>
                  <p>• 카드 비밀번호: 앞 2자리 입력</p>
                  <p className="text-blue-700 font-medium">* NicePay 샌드박스는 실제 카드로만 테스트 가능</p>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-700">
                  나이스페이 안전결제 시스템으로 보호됩니다
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isLoading || !isScriptLoaded}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      결제 진행 중...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      결제하기
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
      )}
    </>
  )
}