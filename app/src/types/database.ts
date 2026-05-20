/**
 * Supabase 자동 생성 타입의 placeholder.
 * 마이그레이션 적용 후 `supabase gen types typescript --local > src/types/database.ts` 로 교체.
 *
 * 임시 타입은 any 대신 명시적 unknown 사용으로 strict 통과.
 *
 * 0007_walls.sql 적용분: walls / cards 테이블은 명시 타입으로 선언.
 * 그 외 테이블은 기존 인덱스 시그니처 fallback 유지.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** 카드 종류 */
export type CardKind = "text" | "image" | "file" | "link";

/** walls 테이블 Row */
export interface WallRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  owner_id: string;
  layout: string;
  cover_color: string | null;
  contributions_locked: boolean;
  created_at: string;
  updated_at: string;
}

/** walls 테이블 Insert */
export interface WallInsert {
  id?: string;
  slug: string;
  title: string;
  description?: string | null;
  owner_id: string;
  layout?: string;
  cover_color?: string | null;
  contributions_locked?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** walls 테이블 Update */
export interface WallUpdate {
  id?: string;
  slug?: string;
  title?: string;
  description?: string | null;
  owner_id?: string;
  layout?: string;
  cover_color?: string | null;
  contributions_locked?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** cards 테이블 Row */
export interface CardRow {
  id: string;
  wall_id: string;
  kind: CardKind;
  title: string | null;
  body: string | null;
  author_name: string | null;
  color: string | null;
  media_url: string | null;
  media_name: string | null;
  media_size: number | null;
  link_url: string | null;
  link_meta: Json | null;
  sort_order: number;
  created_at: string;
}

/** cards 테이블 Insert */
export interface CardInsert {
  id?: string;
  wall_id: string;
  kind: CardKind;
  title?: string | null;
  body?: string | null;
  author_name?: string | null;
  color?: string | null;
  media_url?: string | null;
  media_name?: string | null;
  media_size?: number | null;
  link_url?: string | null;
  link_meta?: Json | null;
  sort_order?: number;
  created_at?: string;
}

/** cards 테이블 Update */
export interface CardUpdate {
  id?: string;
  wall_id?: string;
  kind?: CardKind;
  title?: string | null;
  body?: string | null;
  author_name?: string | null;
  color?: string | null;
  media_url?: string | null;
  media_name?: string | null;
  media_size?: number | null;
  link_url?: string | null;
  link_meta?: Json | null;
  sort_order?: number;
  created_at?: string;
}

/**
 * Database 타입.
 *
 * walls / cards 는 0007 마이그레이션 적용분 — 명시 Row/Insert/Update 로 선언한다.
 * 이렇게 해야 Supabase 클라이언트 제네릭(`SupabaseClient<Database>`)이
 * `.from("walls")` / `.from("cards")` 의 insert/update/select 결과를 정확히 추론한다.
 *
 * 주의(설계 결정):
 *   기존 placeholder 는 `Tables: { [key: string]: GenericTable }` 형태였으나,
 *   인덱스 시그니처가 있으면 Supabase 의 결과 타입 추론이 `never` 로 무너진다.
 *   walls/cards 를 정확히 타이핑하려면 인덱스 시그니처를 제거하고
 *   알려진 테이블만 선언해야 한다 (이것이 `supabase gen types` 가 생성하는 형태).
 *   0001~0006 의 다른 테이블들은 별도 마이그레이션 적용 후
 *   `supabase gen types typescript --local > src/types/database.ts` 로 교체할 때 채워진다.
 *
 *   각 테이블의 `Relationships: []` 는 supabase-js 의 `GenericSchema` 제약을 만족시키기
 *   위한 필수 필드다 (`supabase gen types` 출력과 동일한 형태).
 */
export interface Database {
  public: {
    Tables: {
      walls: {
        Row: WallRow;
        Insert: WallInsert;
        Update: WallUpdate;
        Relationships: [];
      };
      cards: {
        Row: CardRow;
        Insert: CardInsert;
        Update: CardUpdate;
        Relationships: [
          {
            foreignKeyName: "cards_wall_id_fkey";
            columns: ["wall_id"];
            isOneToOne: false;
            referencedRelation: "walls";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
