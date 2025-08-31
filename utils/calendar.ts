export const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

export const isToday = (date: Date): boolean => {
  // 클라이언트 사이드에서만 실행 (hydration 오류 방지)
  if (typeof window === 'undefined') return false
  
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export const isSameDay = (date1: Date, date2: Date | null): boolean => {
  if (!date2) return false
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  )
}

export const isPastDate = (date: Date): boolean => {
  // 클라이언트 사이드에서만 실행 (hydration 오류 방지)
  if (typeof window === 'undefined') return false
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

export const formatDate = (date: Date): string => {
  // 클라이언트 사이드에서만 실행하여 hydration 오류 방지
  if (typeof window === 'undefined') {
    return date.toLocaleDateString()
  }
  
  return date.toLocaleDateString("ko-KR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export const formatShortDate = (date: Date): string => {
  // 클라이언트 사이드에서만 실행하여 hydration 오류 방지
  if (typeof window === 'undefined') {
    return date.toLocaleDateString()
  }
  
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// 타임존 문제 없이 날짜를 YYYY-MM-DD 형식으로 변환
export const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// YYYY-MM-DD 형식의 문자열을 로컬 타임존의 Date 객체로 안전하게 변환
export const parseDateFromDB = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day) // month는 0-based
}
