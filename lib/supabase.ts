import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 서비스 역할 키를 사용하는 관리자 클라이언트 (서버 사이드 전용)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Database types (will be updated when schema is created)
export type Database = {
  public: {
    Tables: {
      interview_events: {
        Row: {
          id: string
          event_name: string
          organizer_email: string
          interview_length: number
          buffer_time: number
          simultaneous_count: number
          deadline: string
          reminder_settings: Record<string, any>
          send_options: Record<string, any>
          time_range: Record<string, any>
          status: 'collecting' | 'closed' | 'scheduled' | 'completed' | 'failed'
          share_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_name: string
          organizer_email: string
          interview_length: number
          buffer_time?: number
          simultaneous_count?: number
          deadline: string
          reminder_settings?: Record<string, any>
          send_options?: Record<string, any>
          time_range?: Record<string, any>
          status?: 'collecting' | 'closed' | 'scheduled' | 'completed' | 'failed'
          share_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_name?: string
          organizer_email?: string
          interview_length?: number
          buffer_time?: number
          simultaneous_count?: number
          deadline?: string
          reminder_settings?: Record<string, any>
          send_options?: Record<string, any>
          time_range?: Record<string, any>
          status?: 'collecting' | 'closed' | 'scheduled' | 'completed' | 'failed'
          share_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      available_time_slots: {
        Row: {
          id: string
          event_id: string
          date: string
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          date: string
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          date?: string
          start_time?: string
          end_time?: string
          created_at?: string
        }
      }
      candidates: {
        Row: {
          id: string
          event_id: string
          name: string
          phone: string
          email: string
          has_responded: boolean
          response_token: string
          responded_at: string | null
          additional_info: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          phone: string
          email: string
          has_responded?: boolean
          response_token: string
          responded_at?: string | null
          additional_info?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          phone?: string
          email?: string
          has_responded?: boolean
          response_token?: string
          responded_at?: string | null
          additional_info?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      candidate_time_selections: {
        Row: {
          id: string
          candidate_id: string
          selected_date: string
          selected_start_time: string
          selected_end_time: string
          preference_order: number
          created_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          selected_date: string
          selected_start_time: string
          selected_end_time: string
          preference_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          selected_date?: string
          selected_start_time?: string
          selected_end_time?: string
          preference_order?: number
          created_at?: string
        }
      }
      scheduled_interviews: {
        Row: {
          id: string
          event_id: string
          candidate_id: string
          scheduled_date: string
          scheduled_start_time: string
          scheduled_end_time: string
          session_id: string
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          meeting_link: string | null
          meeting_room: string | null
          interviewer_notes: string | null
          confirmation_sent_at: string | null
          reminder_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          candidate_id: string
          scheduled_date: string
          scheduled_start_time: string
          scheduled_end_time: string
          session_id: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          meeting_link?: string | null
          meeting_room?: string | null
          interviewer_notes?: string | null
          confirmation_sent_at?: string | null
          reminder_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          candidate_id?: string
          scheduled_date?: string
          scheduled_start_time?: string
          scheduled_end_time?: string
          session_id?: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          meeting_link?: string | null
          meeting_room?: string | null
          interviewer_notes?: string | null
          confirmation_sent_at?: string | null
          reminder_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}