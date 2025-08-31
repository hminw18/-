import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get('Authorization')?.split('Bearer ')[1]
    if (!authToken) {
      return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken)
    if (userError || !user) {
      return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 401 })
    }

    const { fromName, fromEmailPrefix } = await request.json()

    if (typeof fromName !== 'string' || typeof fromEmailPrefix !== 'string') {
      return NextResponse.json({ error: '잘못된 입력입니다.' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        sender_name: fromName,
        sender_email_prefix: fromEmailPrefix,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json({ error: '프로필 업데이트에 실패했습니다.', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '설정이 성공적으로 저장되었습니다.' })

  } catch (error) {
    console.error('Update settings API error:', error)
    return NextResponse.json(
      { 
        error: '설정 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authToken = request.headers.get('Authorization')?.split('Bearer ')[1]
    if (!authToken) {
      return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 })
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken)
    if (userError || !user) {
      return NextResponse.json({ error: '인증에 실패했습니다.' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('sender_name, sender_email_prefix')
      .eq('id', user.id)
      .single()

    if (profileError) {
      // It's possible the profile doesn't exist yet, which is not a server error.
      if (profileError.code === 'PGRST116') { 
        return NextResponse.json({ sender_name: '', sender_email_prefix: '' });
      }
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: '프로필 정보를 가져오는 데 실패했습니다.', details: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      sender_name: userProfile?.sender_name || '',
      sender_email_prefix: userProfile?.sender_email_prefix || ''
    })

  } catch (error) {
    console.error('Get settings API error:', error)
    return NextResponse.json(
      { 
        error: '설정 정보를 가져오는 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
