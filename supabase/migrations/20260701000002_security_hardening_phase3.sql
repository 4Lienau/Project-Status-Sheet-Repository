-- Security hardening — Phase 3: safe count-reducers
-- ============================================================================
-- The remaining advisor findings are mostly accepted-by-design (SECURITY DEFINER
-- RPCs the app calls; project/operational tables the app reads directly — to be
-- marked "Ignore" in the advisor). This migration handles the few that can be
-- cleared with zero app impact.
--
-- Decisions taken for the rest (NOT in this migration):
--   • 10 operational tables (usage_metrics, user_sessions, ai_usage_tracking, …)
--     are read directly by the admin dashboard as `authenticated`; revoking the
--     grant would break it. Internal, admin-approved user base → accepted/ignored.
--   • `http` extension left in public (single use on the AD-sync path; moving it
--     is a coordinated, higher-risk change for low benefit) → ignored.
--
-- Idempotent (REVOKE + DROP POLICY IF EXISTS + CREATE with canonical names).
-- ============================================================================

-- ── A. Revoke authenticated SELECT on internal tables never read by the client ─
-- Verified: no .from()/realtime/RPC use in src/. The only reference is a
-- diagnostic "accessible table count" loop in SupabaseMetrics.tsx that tolerates
-- per-table errors — its counter simply drops by 2, which is now correct.
REVOKE SELECT ON public.chat_conversations FROM authenticated;
REVOKE SELECT ON public.chat_messages       FROM authenticated;
REVOKE SELECT ON public.migration_log       FROM authenticated;

-- ── B. Replace the "ALL/INSERT USING(true)" write policies on operational tables ─
-- Writes reach these only via SECURITY DEFINER functions (run as owner) or the
-- service_role scheduler — both bypass RLS — so no write policy is needed. A
-- SELECT USING(true) policy preserves the admin dashboard's direct reads (that
-- read exposure is accepted/ignored per the operational-tables decision).

-- usage_metrics: drop the two "ALL USING(true)" policies, keep reads open.
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can manage usage metrics" ON public.usage_metrics;
DROP POLICY IF EXISTS "System can manage usage metrics for functions" ON public.usage_metrics;
DROP POLICY IF EXISTS "read_all_usage_metrics" ON public.usage_metrics;
CREATE POLICY "read_all_usage_metrics" ON public.usage_metrics
  FOR SELECT TO authenticated USING (true);

-- scheduler_logs: drop the blanket INSERT-true policy, keep reads open.
ALTER TABLE public.scheduler_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can insert scheduler logs" ON public.scheduler_logs;
DROP POLICY IF EXISTS "read_all_scheduler_logs" ON public.scheduler_logs;
CREATE POLICY "read_all_scheduler_logs" ON public.scheduler_logs
  FOR SELECT TO authenticated USING (true);
