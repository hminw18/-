export interface Experience {
  title: string
  description?: string
  interviewLength?: number
  availableTimeSlots?: any[]
  dates: { id: string; label: string; date: string; dateRange: string }[]
  status?: string
  deadline?: string
  organizerEmail?: string
  timeRange?: { startTime: string; endTime: string }
}

export interface TimeSlot {
  id: string
  time: string
  startTime?: string
  endTime?: string
}

export interface FormData {
  name: string
  email: string
}

export interface IdentityData {
  name: string
  phone: string
  candidateId?: string
}

export type ComponentState =
  | "date-selection"
  | "identity-verification"
  | "time-selection"
  | "form-input"
  | "loading"
  | "error"
  | "success"

export interface ExperienceDate {
  id: string
  label: string
  date: string
  dateRange: string
}
