import { PlanType, PLAN_LIMITS, UserPlan, EmailSettings } from '../types/plan'

export function canCreateInterview(userPlan: UserPlan): boolean {
  const limits = PLAN_LIMITS[userPlan.type]
  
  if (limits.monthlyInterviews === null) {
    return true // unlimited
  }
  
  return userPlan.monthlyInterviewsUsed < limits.monthlyInterviews
}

export function canAddCandidates(userPlan: UserPlan, currentCandidateCount: number, newCandidatesCount: number = 1): boolean {
  const limits = PLAN_LIMITS[userPlan.type]
  
  if (limits.maxCandidatesPerInterview === null) {
    return true // unlimited
  }
  
  return currentCandidateCount + newCandidatesCount <= limits.maxCandidatesPerInterview
}

export function canSendEmail(userPlan: UserPlan): boolean {
  const limits = PLAN_LIMITS[userPlan.type]
  return limits.emailSending
}

export function canSendSMS(userPlan: UserPlan): boolean {
  const limits = PLAN_LIMITS[userPlan.type]
  return limits.smsSending
}

export function canSendKakao(userPlan: UserPlan): boolean {
  const limits = PLAN_LIMITS[userPlan.type]
  return limits.kakaoSending
}

export function canUseBrandedPages(userPlan: UserPlan): boolean {
  const limits = PLAN_LIMITS[userPlan.type]
  return limits.brandedPages
}

export function getRemainingInterviews(userPlan: UserPlan): number | null {
  const limits = PLAN_LIMITS[userPlan.type]
  
  if (limits.monthlyInterviews === null) {
    return null // unlimited
  }
  
  return Math.max(0, limits.monthlyInterviews - userPlan.monthlyInterviewsUsed)
}

export function getMaxCandidates(userPlan: UserPlan): number | null {
  const limits = PLAN_LIMITS[userPlan.type]
  return limits.maxCandidatesPerInterview
}

export function getPlanLimitMessage(userPlan: UserPlan, feature: 'interviews' | 'candidates' | 'email' | 'sms' | 'kakao'): string {
  const planName = userPlan.type
  const limits = PLAN_LIMITS[planName]
  
  switch (feature) {
    case 'interviews':
      if (limits.monthlyInterviews !== null) {
        return `${planName} 플랜은 월 ${limits.monthlyInterviews}개까지만 면접을 생성할 수 있습니다. Pro 플랜으로 업그레이드하세요.`
      }
      return ''
    
    case 'candidates':
      if (limits.maxCandidatesPerInterview !== null) {
        return `${planName} 플랜은 면접당 최대 ${limits.maxCandidatesPerInterview}명까지만 지원자를 추가할 수 있습니다.`
      }
      return ''
    
    case 'email':
      if (!limits.emailSending) {
        return `이메일 발송 기능은 Pro 플랜 이상에서 사용할 수 있습니다.`
      }
      return ''
    
    case 'sms':
      if (!limits.smsSending) {
        return `SMS 발송 기능은 Enterprise 플랜에서만 사용할 수 있습니다.`
      }
      return ''
    
    case 'kakao':
      if (!limits.kakaoSending) {
        return `카카오톡 발송 기능은 Enterprise 플랜에서만 사용할 수 있습니다.`
      }
      return ''
    
    default:
      return ''
  }
}

// Mock 플랜 업그레이드 함수들
export function upgradePlan(newPlanType: PlanType): void {
  const currentPlan = getUserPlan()
  const upgradedPlan: UserPlan = {
    ...currentPlan,
    type: newPlanType,
    planStartDate: new Date(), // 업그레이드 날짜로 갱신
  }
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('userPlan', JSON.stringify(upgradedPlan))
  }
}

export function resetPlanToFree(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('userPlan')
  }
}

// Mock 사용자 데이터 - localStorage에서 가져오거나 기본값 반환
export function getUserPlan(): UserPlan {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('userPlan')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        return {
          ...parsed,
          planStartDate: new Date(parsed.planStartDate)
        }
      } catch (e) {
        console.warn('Invalid stored plan data, using default')
      }
    }
  }
  
  return {
    type: 'Free',
    monthlyInterviewsUsed: 1,
    planStartDate: new Date(),
  }
}

// 사용자 이메일 설정 관리
export function getUserEmailSettings(): EmailSettings {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('userEmailSettings')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.warn('Invalid stored email settings, using default')
      }
    }
  }
  
  return {
    fromName: '면접담당자',
    fromEmail: 'noreply@resend.dev', // 기본값
    domainVerified: false
  }
}

export function saveUserEmailSettings(settings: EmailSettings): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userEmailSettings', JSON.stringify(settings))
  }
}

export function getAvailableEmailDomains(userPlan: UserPlan): string[] {
  // 플랜별로 사용 가능한 도메인 반환
  switch (userPlan.type) {
    case 'Free':
      return ['resend.dev'] // 기본 도메인만
    case 'Pro':
      return ['resend.dev', 'onboarding@resend.dev'] // 좀 더 전문적인 주소
    case 'Enterprise':
      return ['resend.dev', 'onboarding@resend.dev', 'custom'] // 커스텀 도메인 허용
    default:
      return ['resend.dev']
  }
}