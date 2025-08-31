"use client"

import { useState, useEffect } from 'react'
import { Check, Crown, Star, Mail, MessageSquare, Users, Calendar, ArrowRight, CreditCard, AlertCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '../../components/auth/ProtectedRoute'
import AppHeader from '../../components/ui/app-header'
import { useAuth } from '../../contexts/AuthContext'
import { getUserPlan, upgradePlan, resetPlanToFree, getUserEmailSettings, saveUserEmailSettings } from '../../utils/plan'
import { getPlanFeatures, PLAN_INFO, PlanType, EmailSettings } from '../../types/plan'
import PaymentModal from '../../components/payment/PaymentModal'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AccountPage() {
  const { user } = useAuth()
  // const router = useRouter()
  // const searchParams = useSearchParams()
  const [userPlan, setUserPlan] = useState(() => getUserPlan())
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [emailSettings, setEmailSettings] = useState(() => getUserEmailSettings())
  const [realPlanStatus, setRealPlanStatus] = useState({ hasProPlan: false, loading: true })
  const currentPlan = userPlan.type
  const planFeatures = getPlanFeatures()

  const displayName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]
  const avatarUrl = user?.user_metadata?.avatar_url

  // 실제 결제 상태 확인
  useEffect(() => {
    const checkRealPlanStatus = async () => {
      try {
        // Supabase 세션에서 토큰 가져오기
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setRealPlanStatus({ hasProPlan: false, loading: false })
          return
        }

        const response = await fetch('/api/payment/status', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setRealPlanStatus({
            hasProPlan: data.hasProPlan,
            loading: false
          })
          
          // 실제 결제 상태와 로컬 스토리지 동기화
          if (data.hasProPlan && currentPlan !== 'Pro') {
            upgradePlan('Pro')
            setUserPlan(getUserPlan())
          }
        } else {
          setRealPlanStatus({ hasProPlan: false, loading: false })
        }
      } catch (error) {
        console.error('Failed to check plan status:', error)
        setRealPlanStatus({ hasProPlan: false, loading: false })
      }
    }

    if (user) {
      checkRealPlanStatus()
    }
  }, [user])

  // URL 파라미터에서 결제 결과 확인
  // useEffect(() => {
  //   const paymentStatus = searchParams.get('payment')
  //   const error = searchParams.get('error')
  //
  //   if (paymentStatus === 'success') {
  //     toast.success('Pro 플랜 결제가 완료되었습니다! 잠시 후 플랜이 업데이트됩니다.')
  //     // 3초 후 결제 상태 다시 확인
  //     setTimeout(() => {
  //       window.location.reload()
  //     }, 3000)
  //   } else if (paymentStatus === 'failed') {
  //     const errorMsg = error ? decodeURIComponent(error) : '알 수 없는 오류가 발생했습니다.'
  //     toast.error(`결제가 실패했습니다: ${errorMsg}`)
  //   }
  //
  //   // URL 파라미터 정리
  //   if (paymentStatus) {
  //     router.replace('/account', { scroll: false })
  //   }
  // }, [searchParams, router])
  //
  // const handleUpgrade = (plan: string) => {
  //   if (plan === 'Pro') {
  //     // Pro 플랜은 실제 결제 모달 열기
  //     setShowPaymentModal(true)
  //     return
  //   }
  //
  //   try {
  //     if (plan === 'Enterprise') {
  //       // Enterprise는 상담 시뮬레이션
  //       toast.success(`Enterprise 플랜 상담 요청이 접수되었습니다. 곧 연락드리겠습니다.`)
  //       upgradePlan('Enterprise')
  //     } else {
  //       upgradePlan(plan as PlanType)
  //       toast.success(`${plan} 플랜으로 업그레이드되었습니다!`)
  //     }
  //
  //     // 상태 업데이트
  //     setUserPlan(getUserPlan())
  //     setShowUpgrade(false)
  //   } catch (error) {
  //     toast.error('업그레이드 중 오류가 발생했습니다.')
  //   }
  // }
  //
  // const handlePaymentSuccess = () => {
  //   setShowPaymentModal(false)
  //   toast.success('결제 요청이 전송되었습니다. 결제창에서 진행해주세요.')
  // }

  const handleResetPlan = () => {
    resetPlanToFree()
    setUserPlan(getUserPlan())
    toast.success('플랜이 Free로 초기화되었습니다.')
  }

  const handleEmailSettingsChange = (field: keyof EmailSettings, value: string) => {
    const newSettings = { ...emailSettings, [field]: value }
    setEmailSettings(newSettings)
    saveUserEmailSettings(newSettings)
    toast.success('이메일 설정이 저장되었습니다.')
  }

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'string') {
      return <span className="text-gray-900 font-medium">{value}</span>
    }
    return (
      <div className="flex justify-center">
        {value ? (
          <Check className="w-5 h-5 text-green-600" />
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <AppHeader>
          <div className="flex items-center justify-between w-full">
            <h1 className="text-xl font-semibold text-gray-900">계정 관리</h1>
          </div>
        </AppHeader>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 계정 정보 카드 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">계정 정보</h2>
              <button
                onClick={handleResetPlan}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                테스트: Free 플랜으로 리셋
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={displayName} 
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-semibold">
                      {displayName?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{displayName}</h3>
                  <p className="text-gray-600">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      (realPlanStatus.hasProPlan || currentPlan === 'Pro') ? 'bg-blue-100 text-blue-800' :
                      currentPlan === 'Enterprise' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(realPlanStatus.hasProPlan || currentPlan === 'Pro') && <Crown className="w-4 h-4" />}
                      {currentPlan === 'Enterprise' && <Star className="w-4 h-4" />}
                      {realPlanStatus.hasProPlan ? 'Pro' : currentPlan} 플랜
                    </span>
                    {realPlanStatus.hasProPlan && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CreditCard className="w-3 h-3" />
                        결제 완료
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* 플랜 업그레이드 버튼 주석처리 */}
              {/*<div className="flex gap-2">
                {currentPlan !== 'Enterprise' && (
                  <button
                    onClick={() => setShowUpgrade(!showUpgrade)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    플랜 업그레이드
                  </button>
                )}
                {currentPlan === 'Enterprise' && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">최고 플랜을 이용 중입니다</p>
                    <p className="text-xs text-purple-600 font-medium">모든 기능 이용 가능</p>
                  </div>
                )}
              </div>*/}
            </div>
          </div>

          {/* 이메일 설정 카드 - FREE 사용자도 접근 가능 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">이메일 발송 설정</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    발신자 이름
                  </label>
                  <input
                    type="text"
                    value={emailSettings.fromName}
                    onChange={(e) => handleEmailSettingsChange('fromName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="예: 홍길동, ABC회사 인사팀"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    지원자에게 보여질 발신자 이름입니다.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    발신 이메일 주소
                  </label>
                  {currentPlan === 'Enterprise' ? (
                    <div className="space-y-2">
                      <select
                        value={emailSettings.fromEmail.includes('@') ? 'custom' : emailSettings.fromEmail}
                        onChange={(e) => {
                          if (e.target.value === 'custom') {
                            handleEmailSettingsChange('fromEmail', 'your-email@yourdomain.com')
                          } else {
                            handleEmailSettingsChange('fromEmail', e.target.value)
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="noreply@resend.dev">noreply@resend.dev (기본)</option>
                        <option value="onboarding@resend.dev">onboarding@resend.dev (전문적)</option>
                        <option value="custom">커스텀 도메인 사용</option>
                      </select>
                      {emailSettings.fromEmail.includes('@') && emailSettings.fromEmail !== 'noreply@resend.dev' && emailSettings.fromEmail !== 'onboarding@resend.dev' && (
                        <div>
                          <input
                            type="email"
                            value={emailSettings.fromEmail}
                            onChange={(e) => handleEmailSettingsChange('fromEmail', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="your-email@yourdomain.com"
                          />
                          <p className="text-xs text-orange-600 mt-1">
                            ⚠️ 커스텀 도메인은 Resend에서 별도 인증이 필요합니다.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <select
                      value={emailSettings.fromEmail}
                      onChange={(e) => handleEmailSettingsChange('fromEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="noreply@resend.dev">noreply@resend.dev (기본)</option>
                      <option value="onboarding@resend.dev">onboarding@resend.dev (전문적)</option>
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {currentPlan === 'Enterprise' 
                      ? '커스텀 도메인을 사용하려면 Resend에서 도메인 인증이 필요합니다.'
                      : 'Enterprise 플랜에서는 커스텀 도메인을 사용할 수 있습니다.'
                    }
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">미리보기</h4>
                  <div className="text-sm text-blue-800">
                    <strong>발신자:</strong> {emailSettings.fromName} &lt;{emailSettings.fromEmail}&gt;
                  </div>
                  <div className="text-sm text-blue-800">
                    <strong>제목:</strong> [면접제목] - 면접 일정 선택 요청
                  </div>
                </div>
              </div>
            </div>

          {/* 플랜 업그레이드 섹션 - 주석처리 */}
          {/*showUpgrade && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">플랜 비교</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">기능</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">
                        <div className="flex flex-col items-center">
                          <span>{PLAN_INFO.Free.name}</span>
                          <span className="text-sm font-normal text-gray-600">{PLAN_INFO.Free.price}</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-blue-600">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <span>{PLAN_INFO.Pro.name}</span>
                          </div>
                          <span className="text-sm font-normal text-gray-600">{PLAN_INFO.Pro.price}</span>
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium text-purple-600">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <span>{PLAN_INFO.Enterprise.name}</span>
                          </div>
                          <span className="text-sm font-normal text-gray-600">{PLAN_INFO.Enterprise.price}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {planFeatures.map((feature, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4 text-gray-900">{feature.name}</td>
                        <td className="py-3 px-4 text-center">
                          {renderFeatureValue(feature.free)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {renderFeatureValue(feature.pro)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {renderFeatureValue(feature.enterprise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-4 mt-6">
                {currentPlan === 'Free' && (
                  <>
                    <button
                      onClick={() => handleUpgrade('Pro')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      Pro 플랜으로 업그레이드
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUpgrade('Enterprise')}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      Enterprise 상담
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                {currentPlan === 'Pro' && (
                  <button
                    onClick={() => handleUpgrade('Enterprise')}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Star className="w-5 h-5" />
                    Enterprise 상담
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )*/}
        </div>

        {/* 결제 모달 */}
        {/*<PaymentModal*/}
        {/*  isOpen={showPaymentModal}*/}
        {/*  onClose={() => setShowPaymentModal(false)}*/}
        {/*  onSuccess={handlePaymentSuccess}*/}
        {/*/>*/}
      </div>
    </ProtectedRoute>
  )
}