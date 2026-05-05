-- ============================================================
-- 0005_marketing_opt_in.sql
-- ------------------------------------------------------------
-- 정보통신망법 50조 — 마케팅 정보 수신거부 권리 보장.
-- profiles 테이블에 email_marketing_opt_in 컬럼 추가.
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_marketing_opt_in boolean NOT NULL DEFAULT false;

-- birth_year 컬럼 — 만 14세 미만 식별용 (PIPA 22조)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_year smallint;

-- email 컬럼 — auth.users.email 미러링 (조회 편의 + RLS)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 이메일 자동 동기화 — auth.users insert 시 profiles에 미러링
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 신규 가입 시 profiles row가 이미 있으면 email만 update
  -- 없으면 INSERT (트리거가 새 가입을 받았을 때 profile 미생성된 경우)
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_email ON auth.users;
CREATE TRIGGER trg_sync_profile_email
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();

-- 기존 데이터 백필
UPDATE profiles p SET email = u.email
FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;

COMMENT ON COLUMN profiles.email_marketing_opt_in IS
  '마케팅 정보 수신 동의. 정보통신망법 50조에 따라 동의 없이는 false 유지.';
COMMENT ON COLUMN profiles.birth_year IS
  '출생연도. 만 14세 미만 보호자 동의 (PIPA 22조) 식별용.';
COMMENT ON COLUMN profiles.email IS
  'auth.users.email 미러링. 트리거로 자동 동기화.';
