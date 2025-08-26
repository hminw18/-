"use client"

import type React from "react"
import { motion } from "framer-motion"
import { X, Clock, Calendar } from "lucide-react"

interface ExistingResponseDialogProps {
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onKeep: () => void
  responses: Array<{
    date: Date
    time: string
    startTime: string
    endTime: string
  }>
}

export default function ExistingResponseDialog({ 
  isOpen, 
  onClose, 
  onEdit, 
  onKeep, 
  responses 
}: ExistingResponseDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">기존 응답 확인</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              이미 응답하신 기록이 있습니다. 기존 응답을 유지하거나 수정할 수 있습니다.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">기존 선택 시간</span>
              </div>
              <div className="space-y-2">
                {responses.map((response, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Calendar className="w-3 h-3" />
                      <span>{response.date.toLocaleDateString('ko-KR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-700">
                      <Clock className="w-3 h-3" />
                      <span>{response.startTime} - {response.endTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onKeep}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              기존 응답 유지
            </button>
            <button
              onClick={onEdit}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              응답 수정하기
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}