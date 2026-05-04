/**
 * Supabase 자동 생성 타입의 placeholder.
 * 마이그레이션 적용 후 `supabase gen types typescript --local > src/types/database.ts` 로 교체.
 *
 * 임시 타입은 any 대신 명시적 unknown 사용으로 strict 통과.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      [key: string]: string;
    };
  };
}
