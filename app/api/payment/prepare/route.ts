import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { createPayment } from '../../../../lib/database'
import { generateOrderId, NICEPAY_CONFIG } from '../../../../lib/nicepay'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { planType, buyerName, buyerEmail, buyerTel } = body

    if (!planType || !buyerName || !buyerEmail) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    if (planType !== 'pro') {
      return NextResponse.json(
        { error: '지원하지 않는 플랜입니다.' },
        { status: 400 }
      )
    }

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

    // 이미 Pro 플랜을 사용 중인지 확인 (admin client 사용)
    const { supabaseAdmin } = await import('../../../../lib/supabase')
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      )
    }

    const { data: existingPayments } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .ilike('goods_name', '%Pro%')
      .limit(1)

    if (existingPayments && existingPayments.length > 0) {
      return NextResponse.json(
        { error: '이미 Pro 플랜을 사용 중입니다.' },
        { status: 400 }
      )
    }

    // 주문번호 생성
    const orderId = generateOrderId(user.id)
    const amount = NICEPAY_CONFIG.proPrice
    const goodsName = '한시에 Pro 플랜'

    // 결제 정보 데이터베이스에 저장
    const paymentResult = await createPayment({
      userId: user.id,
      orderId,
      amount,
      goodsName,
      buyerName,
      buyerEmail,
      buyerTel,
      mallReserved: JSON.stringify({
        planType,
        userId: user.id,
        userEmail: user.email
      })
    })

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error },
        { status: 500 }
      )
    }

    // 결제창 호출을 위한 정보 반환
    return NextResponse.json({
      success: true,
      paymentData: {
        clientId: NICEPAY_CONFIG.clientId,
        orderId,
        amount,
        goodsName,
        buyerName,
        buyerEmail,
        buyerTel,
        returnUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/payment/callback`,
        mallReserved: paymentResult.payment.mall_reserved
      }
    })

  } catch (error) {
    console.error('Payment preparation error:', error)
    return NextResponse.json(
      { error: '결제 준비 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}