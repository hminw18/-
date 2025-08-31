export type PlanType = 'Free' | 'Pro' | 'Enterprise'

export interface PlanLimits {
  monthlyInterviews: number | null // null = unlimited
  maxCandidatesPerInterview: number | null // null = unlimited
  emailSending: boolean
  smsSending: boolean
  kakaoSending: boolean
  advancedAnalytics: boolean
  prioritySupport: boolean
  dedicatedAccountManager: boolean
  brandedPages: boolean // 회사명, 로고가 포함된 전용 페이지
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  Free: {
    monthlyInterviews: 3,
    maxCandidatesPerInterview: 50,
    emailSending: false,
    smsSending: false,
    kakaoSending: false,
    advancedAnalytics: false,
    prioritySupport: false,
    dedicatedAccountManager: false,
    brandedPages: false
  },
  Pro: {
    monthlyInterviews: null,
    maxCandidatesPerInterview: 500,
    emailSending: true,
    smsSending: false,
    kakaoSending: false,
    advancedAnalytics: true,
    prioritySupport: true,
    dedicatedAccountManager: false,
    brandedPages: false
  },
  Enterprise: {
    monthlyInterviews: null,
    maxCandidatesPerInterview: null,
    emailSending: true,
    smsSending: true,
    kakaoSending: true,
    advancedAnalytics: true,
    prioritySupport: true,
    dedicatedAccountManager: true,
    brandedPages: true
  }
}

export interface UserPlan {
  type: PlanType
  monthlyInterviewsUsed: number
  planStartDate: Date
  planEndDate?: Date
}

export interface EmailSettings {
  fromName: string
  fromEmail: string
  domainVerified?: boolean
  customDomain?: string
}

export interface PlanFeature {
  name: string
  free: boolean | string
  pro: boolean | string
  enterprise: boolean | string
}

export interface PlanInfo {
  name: string
  price: string
  color: string
  icon?: string
}

export const PLAN_INFO: Record<PlanType, PlanInfo> = {
  Free: {
    name: 'Free',
    price: '₩0/월',
    color: 'gray'
  },
  Pro: {
    name: 'Pro', 
    price: '₩7,900/월',
    color: 'blue'
  },
  Enterprise: {
    name: 'Enterprise',
    price: '협의',
    color: 'purple'
  }
}

export function getPlanFeatures(): PlanFeature[] {
  return [
    {
      name: '월간 면접 생성 수',
      free: PLAN_LIMITS.Free.monthlyInterviews === null ? '무제한' : `${PLAN_LIMITS.Free.monthlyInterviews}개`,
      pro: PLAN_LIMITS.Pro.monthlyInterviews === null ? '무제한' : `${PLAN_LIMITS.Pro.monthlyInterviews}개`,
      enterprise: PLAN_LIMITS.Enterprise.monthlyInterviews === null ? '무제한' : `${PLAN_LIMITS.Enterprise.monthlyInterviews}개`
    },
    {
      name: '면접당 최대 지원자 수',
      free: PLAN_LIMITS.Free.maxCandidatesPerInterview === null ? '무제한' : `${PLAN_LIMITS.Free.maxCandidatesPerInterview}명`,
      pro: PLAN_LIMITS.Pro.maxCandidatesPerInterview === null ? '무제한' : `${PLAN_LIMITS.Pro.maxCandidatesPerInterview}명`,
      enterprise: PLAN_LIMITS.Enterprise.maxCandidatesPerInterview === null ? '무제한' : `${PLAN_LIMITS.Enterprise.maxCandidatesPerInterview}명`
    },
    {
      name: '이메일 발송',
      free: PLAN_LIMITS.Free.emailSending,
      pro: PLAN_LIMITS.Pro.emailSending,
      enterprise: PLAN_LIMITS.Enterprise.emailSending
    },
    {
      name: 'SMS 발송',
      free: PLAN_LIMITS.Free.smsSending,
      pro: PLAN_LIMITS.Pro.smsSending,
      enterprise: PLAN_LIMITS.Enterprise.smsSending
    },
    {
      name: '카카오톡 발송',
      free: PLAN_LIMITS.Free.kakaoSending,
      pro: PLAN_LIMITS.Pro.kakaoSending,
      enterprise: PLAN_LIMITS.Enterprise.kakaoSending
    },
    {
      name: '고급 분석 리포트',
      free: PLAN_LIMITS.Free.advancedAnalytics,
      pro: PLAN_LIMITS.Pro.advancedAnalytics,
      enterprise: PLAN_LIMITS.Enterprise.advancedAnalytics
    },
    {
      name: '우선 기술 지원',
      free: PLAN_LIMITS.Free.prioritySupport,
      pro: PLAN_LIMITS.Pro.prioritySupport,
      enterprise: PLAN_LIMITS.Enterprise.prioritySupport
    },
    {
      name: '전담 계정 매니저',
      free: PLAN_LIMITS.Free.dedicatedAccountManager,
      pro: PLAN_LIMITS.Pro.dedicatedAccountManager,
      enterprise: PLAN_LIMITS.Enterprise.dedicatedAccountManager
    },
    {
      name: '브랜드 전용 페이지 (회사명, 로고)',
      free: PLAN_LIMITS.Free.brandedPages,
      pro: PLAN_LIMITS.Pro.brandedPages,
      enterprise: PLAN_LIMITS.Enterprise.brandedPages
    }
  ]
}