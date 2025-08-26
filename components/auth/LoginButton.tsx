"use client"

import { LogIn } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginButton() {
  const { signInWithGoogle, loading } = useAuth()

  return (
    <button
      onClick={signInWithGoogle}
      disabled={loading}
      data-login-button
      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      <LogIn className="w-4 h-4" />
      Google로 로그인
    </button>
  )
}