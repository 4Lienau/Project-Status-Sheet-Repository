# Security Advisor — Accepted Findings

**Last reviewed:** 2026-07-01
**Advisor state:** 44 warnings, 0 errors (down from 148 after Phases 1–3).

Supabase's Security Advisor has **no built-in "ignore"** for individual findings
(it re-evaluates live state each run; per-finding suppression is a still-open
Supabase feature request). This file is the canonical record of which remaining
`WARN`-level findings have been **reviewed and intentionally accepted**, and why —
so they are not re-investigated each time the advisor is opened.

All remaining findings are `WARN`, not `ERROR`: they block nothing. Anything that
appears **beyond** the lists below is new and should be triaged, not assumed accepted.

---

## 1. SECURITY DEFINER functions callable by `authenticated` (18)

**Lint:** `authenticated_security_definer_function_executable` (0029)

These are the RPCs the app legitimately calls as a signed-in user. `anon` EXECUTE
was revoked and the grant is limited to `authenticated` + `service_role`
(Phase 1b, `20260629000003`). They **must** stay callable, so the lint cannot clear.

`admin_set_user_role`, `can_edit_project` (also required for RLS evaluation),
`cleanup_inactive_sessions`, `cleanup_stale_sessions`, `end_user_sessions`,
`get_ai_adoption_overview`, `get_ai_usage_analytics`, `get_ai_usage_trends`,
`get_auth_users_data`, `get_comprehensive_user_stats`, `get_database_size`,
`get_session_statistics`, `get_table_sizes`, `get_top_ai_users`,
`get_user_activity_summary`, `test_project_creation_tracking`,
`trigger_sync_if_due`, `update_daily_usage_metrics`.

## 2. Project / app-essential tables readable by `authenticated` (15)

**Lint:** `pg_graphql_authenticated_table_exposed` (0027)

The lint fires on the table-level `SELECT` grant (API discoverability), **not** on
row access. These tables are read by design: the product model is "all signed-in
users can see all projects," and the client reads the support tables directly.
Row-level **writes** are restricted to owner/editor/admin (Phase 2, `20260701000001`);
reads are intentionally open.

`projects`, `milestones`, `changes`, `risks`, `considerations`, `accomplishments`,
`next_period_activities`, `tasks`, `project_summaries`, `project_versions`,
`profiles`, `departments`, `directory_users`, `project_editors`,
`pending_project_editors`.

## 3. Operational tables readable by `authenticated` (10)

**Lint:** `pg_graphql_authenticated_table_exposed` (0027)

The **admin dashboard reads these directly as the `authenticated` role**
(`adminService.ts`, `SupabaseMetrics.tsx`), so revoking the grant would break it.
Decision: **accept** rather than add admin-only RLS. Rationale — internal,
Azure-AD, admin-approved user base; other vetted employees seeing usage/session
analytics is low risk. (Revisit with admin-only SELECT RLS if the user base ever
broadens beyond internal staff; that protects the rows but the lint would still
fire on the grant.)

`usage_metrics`, `user_sessions`, `ai_usage_tracking`, `azure_sync_logs`,
`user_activity_logs`, `reminder_emails`, `scheduler_logs`, `sync_configurations`,
`ad_department_mappings`, `pm_knowledge`.

## 4. `http` extension in the `public` schema (1)

**Lint:** `extension_in_public` (0014)

Used by a single function on the AD-sync path (`20250207000001`, `FROM http(...)`).
Moving it out of `public` is a coordinated change (relocate the extension **and**
update the call to `extensions.http(...)`, since Phase 1 pinned that function to
`search_path=public`) with real breakage risk on a recently-stabilized path, for
low security benefit. Accepted.

---

## What was fixed (not accepted) — Phases 1–3

| Migration | Change |
|---|---|
| `20260629000002` | Dropped `execute_sql` backdoor + orphan/test funcs; pinned `search_path`; revoked all `anon` table SELECT |
| `20260629000003` | Revoked SECURITY DEFINER function EXECUTE `FROM PUBLIC`; re-granted `service_role` (all) + `authenticated` (allow-list only) |
| `20260701000001` | Replaced blanket `USING(true)` write policies with owner/editor (`can_edit_project`) on all project-data tables |
| `20260701000002` | Revoked `authenticated` SELECT on 3 internal tables; removed `true` write policies on `usage_metrics`/`scheduler_logs` |

Net: **148 → 44**, zero features broken.
