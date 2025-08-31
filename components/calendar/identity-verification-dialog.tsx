"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, User, Phone } from "lucide-react"

interface IdentityVerificationDialogProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (data: { name: string; phone: string }) => void
}

export default function IdentityVerificationDialog({ isOpen, onClose, onVerify }: IdentityVerificationDialogProps) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const validateForm = () => {
    const newErrors: { name?: string; phone?: string } = {}

    if (!name.trim()) {
      newErrors.name = "이름을 입력해주세요"
    }

    if (!phone.trim()) {
      newErrors.phone = "전화번호를 입력해주세요"
    } else if (!/^[0-9-+\s()]+$/.test(phone)) {
      newErrors.phone = "올바른 전화번호 형식이 아닙니다"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validateForm()) {
      onVerify({ name: name.trim(), phone: phone.trim() })
      setName("")
      setPhone("")
      setErrors({})
    }
  }

  const handleClose = () => {
    setName("")
    setPhone("")
    setErrors({})
    onClose()
  }

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
          <h3 className="text-lg font-semibold text-gray-900">신원 확인</h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-4">면접 일정 선택을 위해 본인 확인이 필요합니다.</p>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              이름 *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="홍길동"
              />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              전화번호 *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="010-1234-5678"
              />
            </div>
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              확인
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
