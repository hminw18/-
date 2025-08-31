// NicePay 결제 통합 유틸리티

export interface PaymentRequest {
  orderId: string
  amount: number
  goodsName: string
  buyerName: string
  buyerEmail: string
  buyerTel?: string
  returnUrl: string
  mallReserved?: string
}

export interface PaymentResponse {
  authResultCode: string
  authResultMsg: string
  tid: string
  clientId: string
  orderId: string
  amount: string
  mallReserved: string
  authToken: string
  signature: string
}

export interface ApprovalRequest {
  tid: string
  amount: number
}

export interface ApprovalResponse {
  resultCode: string
  resultMsg: string
  tid: string
  orderId: string
  amount: number
  goodsName: string
  cardCode?: string
  cardName?: string
  authDate: string
  authTime: string
  signature: string
}

// NicePay 설정
export const NICEPAY_CONFIG = {
  clientId: process.env.NICEPAY_CLIENT_ID || '',
  secretKey: process.env.NICEPAY_SECRET_KEY || '',
  apiUrl: process.env.NICEPAY_API_URL || 'https://sandbox-api.nicepay.co.kr',
  jsUrl: process.env.NICEPAY_JS_URL || 'https://pay.nicepay.co.kr/v1/js/',
  proPrice: Number(process.env.PRO_PLAN_PRICE) || 29000,
}

// Basic Auth 헤더 생성
export function createBasicAuthHeader(): string {
  const credentials = `${NICEPAY_CONFIG.clientId}:${NICEPAY_CONFIG.secretKey}`
  return Buffer.from(credentials).toString('base64')
}

// 주문번호 생성
export function generateOrderId(userId: string): string {
  const timestamp = new Date().getTime()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `PRO_${userId}_${timestamp}_${random}`
}

// 결제 요청 데이터 검증
export function validatePaymentResponse(data: any): data is PaymentResponse {
  return (
    typeof data.authResultCode === 'string' &&
    typeof data.authResultMsg === 'string' &&
    typeof data.tid === 'string' &&
    typeof data.clientId === 'string' &&
    typeof data.orderId === 'string' &&
    typeof data.amount === 'string' &&
    typeof data.authToken === 'string' &&
    typeof data.signature === 'string'
  )
}

// 결제 승인 API 호출
export async function approvePayment(tid: string, amount: number): Promise<ApprovalResponse> {
  try {
    const response = await fetch(`${NICEPAY_CONFIG.apiUrl}/v1/payments/${tid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${createBasicAuthHeader()}`,
      },
      body: JSON.stringify({ amount }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`결제 승인 실패: ${response.status} ${errorData.resultMsg || response.statusText}`)
    }

    const result = await response.json()
    
    if (result.resultCode !== '0000') {
      throw new Error(`결제 승인 실패: ${result.resultMsg}`)
    }

    return result
  } catch (error) {
    console.error('Payment approval error:', error)
    throw error
  }
}

// 결제 취소 API 호출
export async function cancelPayment(tid: string, amount: number, reason: string = '사용자 요청'): Promise<any> {
  try {
    const response = await fetch(`${NICEPAY_CONFIG.apiUrl}/v1/payments/${tid}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${createBasicAuthHeader()}`,
      },
      body: JSON.stringify({
        amount,
        reason,
        orderId: `CANCEL_${Date.now()}`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`결제 취소 실패: ${response.status} ${errorData.resultMsg || response.statusText}`)
    }

    const result = await response.json()
    
    if (result.resultCode !== '0000') {
      throw new Error(`결제 취소 실패: ${result.resultMsg}`)
    }

    return result
  } catch (error) {
    console.error('Payment cancellation error:', error)
    throw error
  }
}