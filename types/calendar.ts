export interface Experience {
  title: string
  dates: { id: string; label: string; date: string; dateRange: string }[]
}

export interface TimeSlot {
  id: string
  time: string
}

export interface FormData {
  name: string
  email: string
}

export interface IdentityData {
  name: string
  phone: string
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
