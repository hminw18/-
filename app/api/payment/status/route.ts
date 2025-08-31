import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { getUserPlanStatus } from '../../../../lib/database'

export async function GET(request: NextRequest) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다.' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json(
        { error: '유효하지 않은 인증입니다.' },
        { status: 401 }
      )
    }

    // 사용자 플랜 상태 확인
    const planStatus = await getUserPlanStatus(user.id)
    
    if (!planStatus.success) {
      return NextResponse.json(
        { error: planStatus.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      hasProPlan: planStatus.hasProPlan,
      planInfo: planStatus.latestPayment ? {
        orderId: planStatus.latestPayment.order_id,
        amount: planStatus.latestPayment.amount,
        authDate: planStatus.latestPayment.auth_date,
        cardName: planStatus.latestPayment.card_name,
        status: planStatus.latestPayment.status
      } : null
    })

  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: '플랜 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}