interface InterviewInviteEmailProps {
  candidateName: string
  interviewTitle: string
  organizerName: string
  organizerEmail: string
  deadlineDate: string
  responseUrl: string
}

export function getInterviewInviteEmailTemplate({
  candidateName,
  interviewTitle,
  organizerName,
  organizerEmail,
  deadlineDate,
  responseUrl
}: InterviewInviteEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com')
  
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>면접 일정 선택 요청</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #374151;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 12px;
      margin: 0 0 16px 0;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      display: block;
    }
    .logo-text {
      height: 24px;
      display: block;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 16px;
    }
    .content {
      margin-bottom: 32px;
    }
    .info-box {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .info-label {
      font-weight: 500;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }
    .deadline-notice {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .deadline-notice strong {
      color: #b45309;
    }
    .cta-button {
      background: #3b82f6;
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      display: inline-block;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .cta-button:hover {
      transform: translateY(-1px);
    }
    .footer {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .steps {
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .steps h4 {
      color: #0c4a6e;
      margin-top: 0;
    }
    .steps ol {
      margin: 0;
      padding-left: 20px;
    }
    .steps li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <img src="${baseUrl}/hanseeicon.png" alt="한시에" class="logo-icon" />
        <img src="${baseUrl}/hanseetextlogo.svg" alt="한시에" class="logo-text" />
      </div>
      <h1 class="title">면접 일정 선택 요청</h1>
      <p class="subtitle">한시에에서 발송된 메일입니다</p>
    </div>
    
    <div class="content">
      <p>안녕하세요, <strong>${candidateName}</strong>님!</p>
      
      <p>아래 면접에 대한 일정 선택 요청을 받으셨습니다.</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">면접 제목:</span>
          <span class="info-value">${interviewTitle}</span>
        </div>
        <div class="info-row">
          <span class="info-label">담당자:</span>
          <span class="info-value">${organizerName} (${organizerEmail})</span>
        </div>
        <div class="info-row">
          <span class="info-label">응답 마감:</span>
          <span class="info-value">${deadlineDate}</span>
        </div>
      </div>

      <div class="deadline-notice">
        <strong>${deadlineDate}까지</strong> 가능한 시간을 선택해주세요!
      </div>

      
      <div style="text-align: center;">
        <a href="${responseUrl}" class="cta-button">
          면접 일정 선택하기
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
        * 문제가 있으시거나 링크가 작동하지 않는 경우, 아래 주소를 직접 복사하여 브라우저에 입력해주세요:<br>
        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; word-break: break-all;">
          ${responseUrl}
        </code>
      </p>
    </div>
    
    <div class="footer">
      <p>이 메일은 <strong>한시에</strong>에서 자동으로 발송되었습니다.</p>
      <p>문의사항이 있으시면 면접 담당자(<strong>${organizerEmail}</strong>)에게 직접 연락해주세요.</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
면접 일정 선택 요청

안녕하세요, ${candidateName}님!

아래 면접에 대한 일정 선택 요청을 받으셨습니다.

면접 정보:
- 면접 제목: ${interviewTitle}
- 담당자: ${organizerName} (${organizerEmail})
- 응답 마감: ${deadlineDate}

${deadlineDate}까지 가능한 시간을 선택해주세요!

진행 방법:
1. 아래 링크를 클릭하여 일정 선택 페이지로 이동
2. 캘린더에서 면접 가능한 시간을 드래그하여 선택
3. 선택 완료 후 제출 버튼 클릭

면접 일정 선택하기: ${responseUrl}

이 메일은 한시에에서 자동으로 발송되었습니다.
문의사항이 있으시면 면접 담당자(${organizerEmail})에게 직접 연락해주세요.
  `

  return { html, text }
}

interface ReminderEmailProps {
  candidateName: string
  interviewTitle: string
  organizerName: string
  organizerEmail: string
  deadlineDate: string
  responseUrl: string
}

export function getReminderEmailTemplate({
  candidateName,
  interviewTitle,
  organizerName,
  organizerEmail,
  deadlineDate,
  responseUrl
}: ReminderEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com')
  
  // 원본 날짜를 한국 시간으로 포맷팅 (서버에서도 안전하게)
  let formattedDeadlineDate = deadlineDate
  try {
    const date = new Date(deadlineDate)
    if (!isNaN(date.getTime())) {
      formattedDeadlineDate = date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "long", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        weekday: "short",
        timeZone: "Asia/Seoul"
      })
    }
  } catch (error) {
    console.error('Date formatting error:', error)
    formattedDeadlineDate = deadlineDate
  }

  // 남은 시간 계산 (한국 시간 기준)
  const getTimeRemaining = (deadline: string) => {
    try {
      // 한국 시간으로 현재 시간 계산
      const now = new Date()
      const koreaNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}))
      
      const deadlineTime = new Date(deadline)
      const timeDiff = deadlineTime.getTime() - koreaNow.getTime()
      
      if (timeDiff <= 0) {
        return "마감되었습니다"
      }
      
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (days > 0) {
        return `약 ${days}일 ${hours}시간`
      } else if (hours > 0) {
        return `약 ${hours}시간 ${minutes}분`
      } else if (minutes > 0) {
        return `약 ${minutes}분`
      } else {
        return "곧 마감"
      }
    } catch (error) {
      console.error('Time remaining calculation error:', error)
      return "확인 필요"
    }
  }
  
  const timeRemaining = getTimeRemaining(deadlineDate)
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>면접 일정 선택 리마인더</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #374151;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 12px;
      margin: 0 0 16px 0;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      display: block;
    }
    .logo-text {
      height: 24px;
      display: block;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .urgent-notice {
      background: #fef2f2;
      border: 2px solid #f87171;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .urgent-notice h3 {
      color: #dc2626;
      margin-top: 0;
      font-size: 18px;
    }
    .cta-button {
      background: #f59e0b;
      color: white;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      display: inline-block;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <img src="${baseUrl}/hanseeicon.png" alt="한시에" class="logo-icon" />
        <img src="${baseUrl}/hanseetextlogo.svg" alt="한시에" class="logo-text" />
      </div>
      <h1 class="title">면접 일정 선택 리마인더</h1>
    </div>
    
    <div class="urgent-notice">
      <h3>아직 면접 일정을 선택하지 않으셨습니다</h3>
      <p><strong>${formattedDeadlineDate}</strong>까지 응답해주세요!</p>
      <p style="font-size: 18px; margin-top: 12px;"><strong style="color: #dc2626;">${timeRemaining}</strong> 남았습니다</p>
    </div>
    
    <p>안녕하세요, <strong>${candidateName}</strong>님!</p>
    
    <p><strong>${interviewTitle}</strong> 면접에 대한 일정 선택 요청을 이전에 보내드렸으나, 아직 응답을 받지 못했습니다.</p>
    
    <p>마감일이 얼마 남지 않았으니 빠른 시일 내에 가능한 면접 시간을 선택해주시기 바랍니다.</p>
    
    <div style="text-align: center;">
      <a href="${responseUrl}" class="cta-button">
        지금 면접 일정 선택하기
      </a>
    </div>
    
    <div class="footer" style="text-align: center; padding-top: 32px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
      <p>담당자: ${organizerName} (${organizerEmail})</p>
      <p>이 메일은 <strong>한시에</strong>에서 자동으로 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
면접 일정 선택 리마인더

안녕하세요, ${candidateName}님!

아직 면접 일정을 선택하지 않으셨습니다
${formattedDeadlineDate}까지 응답해주세요!
${timeRemaining} 남았습니다

${interviewTitle} 면접에 대한 일정 선택 요청을 이전에 보내드렸으나, 아직 응답을 받지 못했습니다.

마감일이 얼마 남지 않았으니 빠른 시일 내에 가능한 면접 시간을 선택해주시기 바랍니다.

면접 일정 선택하기: ${responseUrl}

담당자: ${organizerName} (${organizerEmail})
이 메일은 한시에에서 자동으로 발송되었습니다.
  `

  return { html, text }
}

interface ConfirmationEmailProps {
  candidateName: string
  interviewTitle: string
  organizerName: string
  organizerEmail: string
  scheduledDate: string
  scheduledTime: string
  meetingLocation?: string
  meetingLink?: string
}

export function getConfirmationEmailTemplate({
  candidateName,
  interviewTitle,
  organizerName,
  organizerEmail,
  scheduledDate,
  scheduledTime,
  meetingLocation,
  meetingLink
}: ConfirmationEmailProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com')
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>면접 일정 확정 안내</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      line-height: 1.6;
      color: #374151;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-container {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 12px;
      margin: 0 0 16px 0;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      display: block;
    }
    .logo-text {
      height: 24px;
      display: block;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 16px;
    }
    .content {
      margin-bottom: 32px;
    }
    .schedule-box {
      background: #f0f9ff;
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      padding: 24px;
      margin: 20px 0;
      text-align: center;
    }
    .schedule-box h3 {
      color: #0c4a6e;
      margin-top: 0;
      font-size: 18px;
    }
    .schedule-details {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: 500;
      color: #374151;
    }
    .detail-value {
      color: #6b7280;
    }
    .meeting-link {
      background: #ecfdf5;
      border: 1px solid #10b981;
      border-radius: 8px;
      padding: 16px;
      margin: 20px 0;
      text-align: center;
    }
    .meeting-link a {
      color: #059669;
      text-decoration: none;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      padding-top: 32px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-container">
        <img src="${baseUrl}/hanseeicon.png" alt="한시에" class="logo-icon" />
        <img src="${baseUrl}/hanseetextlogo.svg" alt="한시에" class="logo-text" />
      </div>
      <h1 class="title">면접 일정 확정 안내</h1>
      <p class="subtitle">한시에에서 발송된 메일입니다</p>
    </div>
    
    <div class="content">
      <p>안녕하세요, <strong>${candidateName}</strong>님!</p>
      
      <p>면접 일정이 최종 확정되어 안내드립니다.</p>
      
      <div class="schedule-box">
        <h3>면접 일정이 확정되었습니다!</h3>
        <p><strong>${scheduledDate} ${scheduledTime}</strong></p>
      </div>
      
      <div class="schedule-details">
        <div class="detail-row">
          <span class="detail-label">면접 제목:</span>
          <span class="detail-value">${interviewTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">담당자:</span>
          <span class="detail-value">${organizerName} (${organizerEmail})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">일시:</span>
          <span class="detail-value">${scheduledDate} ${scheduledTime}</span>
        </div>
        ${meetingLocation ? `
        <div class="detail-row">
          <span class="detail-label">장소:</span>
          <span class="detail-value">${meetingLocation}</span>
        </div>
        ` : ''}
      </div>
      
      ${meetingLink ? `
      <div class="meeting-link">
        <p><strong>화상면접 링크</strong></p>
        <a href="${meetingLink}" target="_blank">${meetingLink}</a>
      </div>
      ` : ''}
      
      <p>면접 시간 <strong>10-15분 전</strong>에 미리 도착해주시기 바랍니다.</p>
      
      <p>궁금한 점이 있으시면 담당자에게 직접 연락해주세요.</p>
    </div>
    
    <div class="footer">
      <p>이 메일은 <strong>한시에</strong>에서 자동으로 발송되었습니다.</p>
      <p>면접에 관한 문의는 담당자(<strong>${organizerEmail}</strong>)에게 직접 연락해주세요.</p>
    </div>
  </div>
</body>
</html>
  `

  const text = `
면접 일정 확정 안내

안녕하세요, ${candidateName}님!

면접 일정이 최종 확정되어 안내드립니다.

면접 일정이 확정되었습니다!
${scheduledDate} ${scheduledTime}

면접 정보:
- 면접 제목: ${interviewTitle}
- 담당자: ${organizerName} (${organizerEmail})
- 일시: ${scheduledDate} ${scheduledTime}
${meetingLocation ? `- 장소: ${meetingLocation}` : ''}
${meetingLink ? `- 화상면접 링크: ${meetingLink}` : ''}

면접 시간 10-15분 전에 미리 도착해주시기 바랍니다.

궁금한 점이 있으시면 담당자에게 직접 연락해주세요.

이 메일은 한시에에서 자동으로 발송되었습니다.
면접에 관한 문의는 담당자(${organizerEmail})에게 직접 연락해주세요.
  `

  return { html, text }
}