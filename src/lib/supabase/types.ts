export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'teacher' | 'school_admin' | 'super_admin';
export type UserStatus = 'pending' | 'approved' | 'suspended';
export type ApiType = 'gemini' | 'elevenlabs' | 'tripo' | 'google_tts';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          school_name: string | null;
          school_id: string | null;
          class_level: string | null;
          subjects: string[] | null;
          role: UserRole;
          status: UserStatus;
          visible_characters: string[] | null;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          school_name?: string | null;
          school_id?: string | null;
          class_level?: string | null;
          subjects?: string[] | null;
          role?: UserRole;
          status?: UserStatus;
          visible_characters?: string[] | null;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          school_name?: string | null;
          school_id?: string | null;
          class_level?: string | null;
          subjects?: string[] | null;
          role?: UserRole;
          status?: UserStatus;
          visible_characters?: string[] | null;
          onboarding_complete?: boolean;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          character_id: string;
          language: string;
          started_at: string;
          ended_at: string | null;
          message_count: number;
          school_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_id: string;
          language?: string;
          started_at?: string;
          ended_at?: string | null;
          message_count?: number;
          school_id?: string | null;
        };
        Update: {
          ended_at?: string | null;
          message_count?: number;
        };
      };
      generated_assets: {
        Row: {
          id: string;
          user_id: string;
          character_name: string | null;
          glb_path: string | null;
          voice_id: string | null;
          thumbnail_url: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_name?: string | null;
          glb_path?: string | null;
          voice_id?: string | null;
          thumbnail_url?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          character_name?: string | null;
          glb_path?: string | null;
          voice_id?: string | null;
          thumbnail_url?: string | null;
          is_public?: boolean;
        };
      };
      teacher_templates: {
        Row: {
          id: string;
          user_id: string;
          character_id: string | null;
          title: string | null;
          script: Json | null;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_id?: string | null;
          title?: string | null;
          script?: Json | null;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          character_id?: string | null;
          title?: string | null;
          script?: Json | null;
          is_shared?: boolean;
          updated_at?: string;
        };
      };
      usage_logs: {
        Row: {
          id: string;
          user_id: string;
          api_type: ApiType;
          tokens_used: number | null;
          characters_used: number | null;
          model_generated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          api_type: ApiType;
          tokens_used?: number | null;
          characters_used?: number | null;
          model_generated?: boolean;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
}
