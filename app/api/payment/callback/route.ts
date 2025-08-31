import { NextRequest, NextResponse } from 'next/server'
import { validatePaymentResponse, approvePayment } from '../../../../lib/nicepay'
import { updatePaymentStatus, getPaymentByOrderId } from '../../../../lib/database'

export async function POST(request: NextRequest) {
  try {
    // NicePay에서 전송하는 form data를 파싱
    const formData = await request.formData()
    const paymentData = {
      authResultCode: formData.get('authResultCode')?.toString() || '',
      authResultMsg: formData.get('authResultMsg')?.toString() || '',
      tid: formData.get('tid')?.toString() || '',
      clientId: formData.get('clientId')?.toString() || '',
      orderId: formData.get('orderId')?.toString() || '',
      amount: formData.get('amount')?.toString() || '',
      mallReserved: formData.get('mallReserved')?.toString() || '',
      authToken: formData.get('authToken')?.toString() || '',
      signature: formData.get('signature')?.toString() || ''
    }

    console.log('Payment callback received:', paymentData)

    // 결제 응답 데이터 검증
    if (!validatePaymentResponse(paymentData)) {
      console.error('Invalid payment response data:', paymentData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account?payment=failed&error=invalid_data`
      )
    }

    // 데이터베이스에서 주문 정보 확인
    const orderResult = await getPaymentByOrderId(paymentData.orderId)
    if (!orderResult.success || !orderResult.payment) {
      console.error('Order not found:', paymentData.orderId)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account?payment=failed&error=order_not_found`
      )
    }

    // 인증 실패시 처리
    if (paymentData.authResultCode !== '0000') {
      console.log('Payment authentication failed:', paymentData.authResultMsg)
      
      await updatePaymentStatus(paymentData.orderId, {
        status: 'failed',
        resultCode: paymentData.authResultCode,
        resultMsg: paymentData.authResultMsg,
        rawResponse: paymentData
      })

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account?payment=failed&error=${encodeURIComponent(paymentData.authResultMsg)}`
      )
    }

    try {
      // 결제 승인 API 호출
      const approvalResult = await approvePayment(paymentData.tid, parseInt(paymentData.amount))
      
      console.log('Payment approval result:', approvalResult)

      if (approvalResult.resultCode === '0000') {
        // 승인 성공 - 데이터베이스 업데이트
        await updatePaymentStatus(paymentData.orderId, {
          tid: paymentData.tid,
          status: 'approved',
          authDate: approvalResult.authDate,
          authTime: approvalResult.authTime,
          cardCode: approvalResult.cardCode,
          cardName: approvalResult.cardName,
          resultCode: approvalResult.resultCode,
          resultMsg: approvalResult.resultMsg,
          signature: paymentData.signature,
          rawResponse: {
            payment: paymentData,
            approval: approvalResult
          }
        })

        console.log('Payment approved successfully:', paymentData.orderId)

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account?payment=success`
        )
      } else {
        // 승인 실패
        console.error('Payment approval failed:', approvalResult.resultMsg)
        
        await updatePaymentStatus(paymentData.orderId, {
          tid: paymentData.tid,
          status: 'failed',
          resultCode: approvalResult.resultCode,
          resultMsg: approvalResult.resultMsg,
          signature: paymentData.signature,
          rawResponse: {
            payment: paymentData,
            approval: approvalResult
          }
        })

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account?payment=failed&error=${encodeURIComponent(approvalResult.resultMsg)}`
        )
      }

    } catch (approvalError) {
      console.error('Payment approval API error:', approvalError)
      
      await updatePaymentStatus(paymentData.orderId, {
        tid: paymentData.tid,
        status: 'failed',
        resultCode: '9999',
        resultMsg: '결제 승인 중 오류가 발생했습니다.',
        signature: paymentData.signature,
        rawResponse: {
          payment: paymentData,
          error: approvalError?.message
        }
      })

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account?payment=failed&error=approval_error`
      )
    }

  } catch (error) {
    console.error('Payment callback processing error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account?payment=failed&error=processing_error`
    )
  }
}