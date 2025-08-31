"use client"

import { useState, useEffect } from 'react'
import { X, Mail, Edit3, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { getInterviewInviteEmailTemplate, getReminderEmailTemplate, getConfirmationEmailTemplate } from '../../lib/email-templates'

interface EmailPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (customTemplate: CustomEmailTemplate) => void
  interviewData?: {
    eventName: string
    organizerName: string
    organizerEmail: string
    deadlineDate: string
    eventId: string
  }
  confirmationData?: {
    title: string
    organizerName: string
    organizerEmail: string
    scheduledDate: string
    scheduledTime: string
    meetingLocation?: string
    meetingLink?: string
  }
  candidateName?: string
  fromName: string
  fromEmail: string
  isReminder?: boolean
  isConfirmation?: boolean
  recipients?: Array<{name: string, email: string}>
}

export interface CustomEmailTemplate {
  subject: string
  htmlContent: string
  textContent: string
}

export default function EmailPreviewModal({
  isOpen,
  onClose,
  onSave,
  interviewData,
  confirmationData,
  candidateName = "김지원",
  fromName,
  fromEmail,
  isReminder = false,
  isConfirmation = false,
  recipients = []
}: EmailPreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html')
  const [showAllRecipients, setShowAllRecipients] = useState(false)
  const [emailTemplate, setEmailTemplate] = useState<CustomEmailTemplate>({ subject: '', htmlContent: '', textContent: '' })

  useEffect(() => {
    // Props가 변경될 때마다 이메일 템플릿을 다시 생성합니다.
    const actualCandidateName = recipients.length > 0 ? recipients[0].name : candidateName

    const template = isConfirmation && confirmationData
      ? getConfirmationEmailTemplate({
          candidateName: actualCandidateName,
          interviewTitle: confirmationData.title,
          organizerName: confirmationData.organizerName,
          organizerEmail: confirmationData.organizerEmail,
          scheduledDate: confirmationData.scheduledDate,
          scheduledTime: confirmationData.scheduledTime,
          meetingLocation: confirmationData.meetingLocation,
          meetingLink: confirmationData.meetingLink
        })
      : isReminder && interviewData
      ? getReminderEmailTemplate({
          candidateName: actualCandidateName,
          interviewTitle: interviewData.eventName,
          organizerName: interviewData.organizerName,
          organizerEmail: interviewData.organizerEmail,
          deadlineDate: interviewData.deadlineDate,
          responseUrl: `${window.location.origin}/respond/${interviewData.shareToken || interviewData.eventId}`
        })
      : interviewData
      ? getInterviewInviteEmailTemplate({
          candidateName: actualCandidateName,
          interviewTitle: interviewData.eventName,
          organizerName: interviewData.organizerName,
          organizerEmail: interviewData.organizerEmail,
          deadlineDate: interviewData.deadlineDate,
          responseUrl: `${window.location.origin}/respond/${interviewData.shareToken || interviewData.eventId}`
        })
      : { html: '', text: '' }

    const subject = isConfirmation && confirmationData
      ? `${confirmationData.title} - 면접 일정 확정 안내`
      : isReminder && interviewData
      ? `[리마인더] ${interviewData.eventName} - 면접 일정 선택 요청`
      : interviewData
      ? `${interviewData.eventName} - 면접 일정 선택 요청`
      : '이메일 제목'

    setEmailTemplate({
      subject,
      htmlContent: template.html,
      textContent: template.text
    })

    console.log('🎭 EmailPreviewModal useEffect 디버깅:', {
      isReminder,
      isConfirmation,
      candidateName,
      recipientsCount: recipients.length,
      firstRecipient: recipients[0],
      actualCandidateName,
      templateSubject: subject
    })

  }, [isOpen, recipients, candidateName, interviewData, confirmationData, isReminder, isConfirmation])

  console.log('🎭 EmailPreviewModal 렌더링 디버깅:', {
    recipientsCount: recipients.length,
    firstRecipient: recipients[0],
    htmlContentExists: !!emailTemplate?.htmlContent
  })

  const handleSave = () => {
    // 미리보기에서 생성된 실제 템플릿 전달
    onSave(emailTemplate)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isConfirmation ? '확정 메일 미리보기 및 편집' : isReminder ? '리마인더 메일 미리보기 및 편집' : '이메일 미리보기 및 편집'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Email Info Only */}
          <div className="w-80 border-r border-gray-200 p-6 flex-shrink-0 overflow-y-auto">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">발송 정보</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">발신자:</span>
                  <div className="font-medium">{fromName}</div>
                  <div className="text-gray-500">{fromEmail}</div>
                </div>
                <div>
                  <span className="text-gray-600">수신자 ({recipients.length}명):</span>
                  {recipients.length <= 3 ? (
                    <div className="space-y-1 mt-1">
                      {recipients.map((recipient, index) => (
                        <div key={index} className="font-medium text-sm">
                          {recipient.name} ({recipient.email})
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <div className="space-y-1">
                        {recipients.slice(0, showAllRecipients ? recipients.length : 2).map((recipient, index) => (
                          <div key={index} className="font-medium text-sm">
                            {recipient.name} ({recipient.email})
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowAllRecipients(!showAllRecipients)}
                        className="flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-700 text-sm"
                      >
                        {showAllRecipients ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            접기
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            {recipients.length - 2}명 더 보기
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview/Edit */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Right Panel Header with Controls */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {previewMode === 'html' ? 'HTML 미리보기' : '텍스트 미리보기'}
                </h3>
                <div className="flex items-center gap-4">
                  {/* View Mode Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewMode('html')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        previewMode === 'html'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      HTML 보기
                    </button>
                    <button
                      onClick={() => setPreviewMode('text')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        previewMode === 'text'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      텍스트 보기
                    </button>
                  </div>
                  
                  {/* Edit Mode Toggle */}
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isEditing 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isEditing ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {isEditing ? '편집 중' : '미리보기'}
                  </button>
                </div>
              </div>
              
              {/* Subject Editor */}
              {isEditing && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이메일 제목
                  </label>
                  <input
                    type="text"
                    value={emailTemplate.subject}
                    onChange={(e) => setEmailTemplate(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-6 h-full">
                {isEditing ? (
                  <textarea
                    value={previewMode === 'html' ? emailTemplate.htmlContent : emailTemplate.textContent}
                    onChange={(e) => {
                      const field = previewMode === 'html' ? 'htmlContent' : 'textContent'
                      setEmailTemplate(prev => ({ ...prev, [field]: e.target.value }))
                    }}
                    className="w-full h-full min-h-[500px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
                    placeholder={`${previewMode === 'html' ? 'HTML' : '텍스트'} 내용을 입력하세요...`}
                  />
                ) : (
                  <div className="h-full">
                    {previewMode === 'html' ? (
                      <div className="border border-gray-200 rounded-lg h-full">
                        <iframe
                          srcDoc={emailTemplate.htmlContent}
                          className="w-full h-full border-0 rounded-lg"
                          title="이메일 미리보기"
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full overflow-auto">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                          {emailTemplate.textContent}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-sm text-gray-600">
            {isEditing ? '템플릿을 수정하신 후 저장해주세요' : '이메일이 이렇게 발송됩니다'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? '저장하고 닫기' : '확인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}