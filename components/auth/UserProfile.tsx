"use client"

import { useState } from 'react'
import { ChevronDown, LogOut, User, Settings, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'

export default function UserProfile() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const displayName = user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0]
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={displayName} 
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/events')
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                대시보드
              </button>
              <button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/account')
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Settings className="w-4 h-4" />
                계정
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={signOut}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}