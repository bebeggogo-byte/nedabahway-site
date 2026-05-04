-- ============================================================
-- 0003_calculate_refund_security_definer.sql
-- ------------------------------------------------------------
-- Bug fix: calculate_refund() returned 'not_eligible' for valid
-- payments because RLS context was not properly propagated when
-- called via supabase.rpc() from server components.
--
-- Fix: SECURITY DEFINER + manual auth check inside the function.
-- This is the standard Supabase pattern for RLS-aware RPC functions.
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_refund(p_payment_id uuid)
RETURNS TABLE (rate numeric(4, 3), amount_krw int, reason_code refund_reason_code_t)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role user_role_t;
  v_payment payments%ROWTYPE;
  v_hours numeric;
  v_first_closed boolean;
  v_second_started boolean;
BEGIN
  -- Read caller role (NULL if no profile)
  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;

  -- Find payment
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;

  -- Manual authorization (since SECURITY DEFINER bypasses RLS):
  -- Allow if: own payment OR caller is coach/system_admin
  IF NOT FOUND OR (
    v_payment.user_id != v_caller_id
    AND v_caller_role NOT IN ('coach', 'system_admin')
  ) THEN
    RETURN QUERY SELECT 0::numeric(4, 3), 0, 'not_eligible'::refund_reason_code_t;
    RETURN;
  END IF;

  IF v_payment.status != 'paid' AND v_payment.status != 'partial_refunded' THEN
    RETURN QUERY SELECT 0::numeric(4, 3), 0, 'not_eligible'::refund_reason_code_t;
    RETURN;
  END IF;

  v_hours := EXTRACT(EPOCH FROM (now() - v_payment.paid_at)) / 3600.0;

  v_first_closed := EXISTS (
    SELECT 1 FROM session_progress sp
    JOIN session_templates st ON st.id = sp.session_template_id
    WHERE sp.enrollment_id = v_payment.enrollment_id
      AND st.seq = 1
      AND sp.status IN ('closed', 'reviewed')
  );

  v_second_started := EXISTS (
    SELECT 1 FROM session_progress sp
    JOIN session_templates st ON st.id = sp.session_template_id
    WHERE sp.enrollment_id = v_payment.enrollment_id
      AND st.seq = 2
      AND sp.status IN ('open', 'submitted', 'reviewed', 'closed')
  );

  IF v_hours <= 24 THEN
    RETURN QUERY SELECT 1.000::numeric(4, 3), v_payment.amount_krw, 'within_24h'::refund_reason_code_t;
  ELSIF NOT v_first_closed THEN
    RETURN QUERY SELECT 0.500::numeric(4, 3), FLOOR(v_payment.amount_krw * 0.5)::int, 'before_first_session'::refund_reason_code_t;
  ELSIF v_first_closed AND NOT v_second_started THEN
    RETURN QUERY SELECT 0.300::numeric(4, 3), FLOOR(v_payment.amount_krw * 0.3)::int, 'after_first_session'::refund_reason_code_t;
  ELSE
    RETURN QUERY SELECT 0.000::numeric(4, 3), 0, 'not_eligible'::refund_reason_code_t;
  END IF;
END;
$$;

-- Grant execute to authenticated users (not anon)
REVOKE EXECUTE ON FUNCTION calculate_refund(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION calculate_refund(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION calculate_refund(uuid) IS
  'Calculates refund rate/amount for a payment with manual auth check. SECURITY DEFINER.';
