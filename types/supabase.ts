export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string | null
          created_at: string
          updated_at: string
          has_completed_goal: boolean
          has_completed_habits: boolean
        }
        Insert: {
          id: string
          name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          has_completed_goal?: boolean
          has_completed_habits?: boolean
        }
        Update: {
          id?: string
          name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          has_completed_goal?: boolean
          has_completed_habits?: boolean
        }
      }
    }
  }
}