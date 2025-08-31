"use client"

import UserProfile from "../auth/UserProfile"

interface AppHeaderProps {
  children: React.ReactNode
}

export default function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="flex items-center h-16 relative">
        {/* Center: Page Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {children}
        </div>
        
        {/* Right: User Profile - 오른쪽 끝 고정 */}
        <div className="absolute right-4 sm:right-6 lg:right-8 top-0 h-16 flex items-center">
          <UserProfile />
        </div>
      </div>
    </header>
  )
}