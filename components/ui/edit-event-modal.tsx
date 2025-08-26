"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { updateInterviewEvent } from "../../lib/database"
import toast from 'react-hot-toast'

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  event: {
    id: string
    eventName: string
    interviewLength: number
    simultaneousCount: number
    deadline: string
  }
}

export default function EditEventModal({ isOpen, onClose, onSuccess, event }: EditEventModalProps) {
  const [formData, setFormData] = useState({
    eventName: event.eventName,
    interviewLength: event.interviewLength,
    simultaneousCount: event.simultaneousCount,
    deadline: new Date(event.deadline).toISOString().slice(0, 16) // datetime-local format
  })
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await updateInterviewEvent(event.id, {
        event_name: formData.eventName,
        interview_length: formData.interviewLength,
        simultaneous_count: formData.simultaneousCount,
        deadline: new Date(formData.deadline).toISOString()
      })

      if (result.success) {
        toast.success("이벤트가 성공적으로 수정되었습니다!")
        onSuccess()
        onClose()
      } else {
        toast.error("이벤트 수정에 실패했습니다: " + result.error)
      }
    } catch (error) {
      console.error('Error updating event:', error)
      toast.error("이벤트 수정 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">이벤트 수정</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이벤트 이름
            </label>
            <input
              type="text"
              value={formData.eventName}
              onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                면접 길이 (분)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                step="15"
                value={formData.interviewLength}
                onChange={(e) => setFormData({ ...formData, interviewLength: parseInt(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                동시 면접 인원
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.simultaneousCount}
                onChange={(e) => setFormData({ ...formData, simultaneousCount: parseInt(e.target.value) })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              마감 일시
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {loading ? "수정 중..." : "수정하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}