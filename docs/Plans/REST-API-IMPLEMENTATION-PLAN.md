# REST API Implementation Plan — Status Sheet Generator

> **Document Version**: 1.1  
> **Created**: 2025-06-10  
> **Updated**: 2025-06-11  
> **Based On**: Comprehensive API Architecture Analysis  
> **Project**: Status Sheet Generator (Supabase + React SPA)

---

## Reference Documents

| Document | Location | Purpose |
|----------|----------|---------|
| **API Reference (Current)** | [`docs/API-REFERENCE.md`](../API-REFERENCE.md) | Documents the **existing** API surface — all current Supabase direct calls, database functions, real-time subscriptions, authentication flows, service layer interfaces, error handling patterns, and best practices. **This is the baseline** that this plan improves upon. |
| **User Guide** | [`docs/USER-GUIDE.md`](../USER-GUIDE.md) | End-user documentation for the application |
| **Auto-Copy Accomplishments Guide** | [`docs/AUTO-COPY-ACCOMPLISHMENTS-GUIDE.md`](../AUTO-COPY-ACCOMPLISHMENTS-GUIDE.md) | Feature-specific documentation |
| **Change Control** | [`docs/CHANGE-CONTROL-CHG0012345.md`](../CHANGE-CONTROL-CHG0012345.md) | Change management documentation |

> **⚠️ Important**: The existing [`docs/API-REFERENCE.md`](../API-REFERENCE.md) documents the **current state** of the API architecture — direct Supabase client calls with no server-side validation, no ownership-based authorization, and open RLS policies. This implementation plan describes the **target state** that replaces and improves upon those patterns. As each stage is completed, the API Reference document should be updated to reflect the new endpoints, deprecating the old direct-call patterns.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Stage 1 — Foundation: Security & Data Model Fixes](#2-stage-1--foundation-security--data-model-fixes)
3. [Stage 2 — Authorization Framework](#3-stage-2--authorization-framework)
4. [Stage 3 — Read API (Views & RPCs)](#4-stage-3--read-api-views--rpcs)
5. [Stage 4 — Write API (Edge Functions)](#5-stage-4--write-api-edge-functions)
6. [Stage 5 — Granular Update Endpoints](#6-stage-5--granular-update-endpoints)
7. [Stage 6 — Audit, Logging & Observability](#7-stage-6--audit-logging--observability)
8. [Stage 7 — Hardening & Production Readiness](#8-stage-7--hardening--production-readiness)
9. [Stage 8 — Client Migration & Integration](#9-stage-8--client-migration--integration)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### Current State
The application uses **direct Supabase client calls** from the frontend with the anon key. There is no REST API layer, limited RLS enforcement, no project ownership tracking, and a destructive update pattern (delete-all + re-insert).

### Target State
A **layered API architecture** with:
- Tight RLS policies enforcing ownership and role-based access
- Database views for stable read contracts
- Edge Functions for controlled write operations with server-side validation
- Audit logging and version history
- Granular update endpoints for collaborative editing

### Guiding Principles
1. **Fix security before adding features** — no new endpoints until authorization is solid
2. **Additive changes** — new patterns alongside existing ones, not replacing them
3. **Backward compatible** — existing frontend continues to work during migration
4. **Database-first** — leverage PostgreSQL + Supabase features (RLS, views, functions) instead of custom middleware

### Estimated Timeline
| Stage | Duration | Priority |
|-------|----------|----------|
| Stage 1: Foundation | 1-2 weeks | 🔴 Critical |
| Stage 2: Authorization | 1 week | 🔴 Critical |
| Stage 3: Read API | 1-2 weeks | 🟡 High |
| Stage 4: Write API | 2-3 weeks | 🟡 High |
| Stage 5: Granular Updates | 2 weeks | 🟢 Medium |
| Stage 6: Audit & Logging | 1 week | 🟢 Medium |
| Stage 7: Hardening | 1-2 weeks | 🟡 High |
| Stage 8: Client Migration | 2-3 weeks | 🟢 Medium |
| **Total** | **~11-16 weeks** | |

---

## 2. Stage 1 — Foundation: Security & Data Model Fixes

> **Priority**: 🔴 CRITICAL — Must complete before any API work  
> **Estimated Duration**: 1-2 weeks  
> **Dependencies**: None

### 1.1 Add Ownership Column to Projects

**Migration**: `20250611000001_add_created_by_to_projects.sql`

```sql
-- Add created_by column
ALTER TABLE projects 
  ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Add updated_by column  
ALTER TABLE projects 
  ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Backfill created_by from project_versions (earliest version creator)
UPDATE projects p
SET created_by = (
  SELECT pv.created_by 
  FROM project_versions pv 
  WHERE pv.project_id = p.id 
  ORDER BY pv.version_number ASC 
  LIMIT 1
)
WHERE p.created_by IS NULL;

-- For any remaining projects without versions, set to a default admin
-- (Identify the correct admin UUID first)
-- UPDATE projects SET created_by = '<admin-uuid>' WHERE created_by IS NULL;

-- Make NOT NULL after backfill
-- ALTER TABLE projects ALTER COLUMN created_by SET NOT NULL;
```

**Acceptance Criteria**:
- [ ] `created_by` column exists on `projects`
- [ ] All existing projects have a `created_by` value
- [ ] `updated_by` column exists on `projects`
- [ ] Frontend `createProject` sets `created_by` to current user
- [ ] Frontend `updateProject` sets `updated_by` to current user

### 1.2 Add Soft Delete Support

**Migration**: `20250611000002_add_soft_delete_to_projects.sql`

```sql
ALTER TABLE projects 
  ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN archived_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Create index for filtering active projects
CREATE INDEX idx_projects_archived_at ON projects (archived_at) WHERE archived_at IS NULL;
```

**Acceptance Criteria**:
- [ ] `archived_at` and `archived_by` columns exist
- [ ] Index created for active project queries
- [ ] Existing `deleteProject` still works (but will be replaced later)

### 1.3 Add Role Support to Profiles

**Migration**: `20250611000003_add_roles_to_profiles.sql`

```sql
-- Create role enum
CREATE TYPE user_role AS ENUM ('viewer', 'editor', 'admin');

-- Add role column with default
ALTER TABLE profiles 
  ADD COLUMN role user_role DEFAULT 'editor';

-- Backfill: Set known admins
UPDATE profiles 
SET role = 'admin' 
WHERE email IN ('4lienau@gmail.com', 'chrisl@re-wa.org');

-- Set all other approved users as editors
UPDATE profiles 
SET role = 'editor' 
WHERE role IS NULL AND is_approved = true;

-- Set unapproved users as viewers
UPDATE profiles 
SET role = 'viewer' 
WHERE role IS NULL AND is_approved = false;

-- Helper function for role checks
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Helper function for admin check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```

**Acceptance Criteria**:
- [ ] `role` column exists on `profiles` with enum type
- [ ] Known admin users have `admin` role
- [ ] `get_user_role()` function works
- [ ] `is_admin()` function works
- [ ] Existing `pending_users` RLS policies updated to use `is_admin()` instead of hardcoded emails

### 1.4 Audit Existing RLS Policies

**Task**: Create a comprehensive document of all current RLS policies across every table.

**Deliverable**: `docs/Plans/RLS-AUDIT-REPORT.md`

**Steps**:
1. Query `pg_policies` for all tables
2. Document which tables have RLS enabled vs disabled
3. Identify overly permissive policies (`USING (true)`)
4. Flag tables with no RLS at all
5. Create a target policy matrix

**Tables to audit**:
- `projects` ⚠️
- `milestones` ⚠️
- `tasks` ⚠️
- `accomplishments` ⚠️
- `next_period_activities` ⚠️
- `risks` ✓ (has policies, but `USING (true)`)
- `considerations` ✓ (has policies, but `USING (true)`)
- `changes` ✓ (has policies, but `USING (true)`)
- `project_versions` ⚠️
- `project_summaries` ⚠️
- `profiles` ⚠️
- `pending_users` ✓
- `chat_conversations` / `chat_messages` ⚠️
- `pm_knowledge` ⚠️
- All analytics/tracking tables

---

## 3. Stage 2 — Authorization Framework

> **Priority**: 🔴 CRITICAL  
> **Estimated Duration**: 1 week  
> **Dependencies**: Stage 1 complete

### 2.1 Define Authorization Model

**Access Levels**:

| Role | Projects (Own) | Projects (Others) | Admin Functions |
|------|---------------|-------------------|-----------------|
| `admin` | Full CRUD | Full CRUD | ✅ Full access |
| `editor` | Full CRUD | Read + Edit (if assigned) | ❌ |
| `viewer` | Read only | Read only | ❌ |

**Project Access Rules**:
- `created_by = auth.uid()` → Full access (owner)
- User appears in `project_manager`, `sponsors`, or `business_leads` → Edit access
- All authenticated + approved users → Read access (current behavior preserved)
- `admin` role → Full access to everything

### 2.2 Implement Core RLS Policies

**Migration**: `20250612000001_implement_project_rls.sql`

```sql
-- Enable RLS on projects (if not already)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Read: All authenticated approved users can read active projects
CREATE POLICY "projects_select_policy" ON projects
  FOR SELECT TO authenticated
  USING (
    archived_at IS NULL 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_approved = true
    )
  );

-- Insert: Editors and admins can create
CREATE POLICY "projects_insert_policy" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.get_user_role() IN ('editor', 'admin')
  );

-- Update: Owner, assigned team, or admin
CREATE POLICY "projects_update_policy" ON projects
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin()
  );

-- Delete: Owner or admin only (will be soft delete via archived_at)
CREATE POLICY "projects_delete_policy" ON projects
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin()
  );

-- Admin can see archived projects too
CREATE POLICY "projects_admin_select_archived" ON projects
  FOR SELECT TO authenticated
  USING (
    archived_at IS NOT NULL 
    AND public.is_admin()
  );
```

### 2.3 Implement Related Table RLS

**Migration**: `20250612000002_implement_related_tables_rls.sql`

Apply consistent policies to all project-related tables:
- `milestones`
- `tasks`
- `accomplishments`
- `next_period_activities`
- `risks`
- `considerations`
- `changes`
- `project_versions`
- `project_summaries`

**Pattern** (for each related table):
```sql
-- SELECT: Anyone who can see the project can see related data
CREATE POLICY "{table}_select" ON {table}
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = {table}.project_id 
      AND p.archived_at IS NULL
      AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_approved = true
      )
    )
  );

-- INSERT/UPDATE/DELETE: Project owner or admin
CREATE POLICY "{table}_modify" ON {table}
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = {table}.project_id 
      AND (p.created_by = auth.uid() OR public.is_admin())
    )
  );
```

### 2.4 Update Pending Users RLS

**Migration**: `20250612000003_update_pending_users_rls.sql`

Replace hardcoded email checks with role-based checks:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "admin_manage_pending_users" ON pending_users;

-- New admin policy using role
CREATE POLICY "admin_manage_pending_users" ON pending_users
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### 2.5 Acceptance Criteria for Stage 2

- [ ] All project tables have RLS enabled
- [ ] Read access scoped to approved users on active projects
- [ ] Write access scoped to project owners and admins
- [ ] No remaining `USING (true)` policies on project data tables
- [ ] Hardcoded admin emails removed from all RLS policies
- [ ] All existing frontend operations still work (backward compatible)
- [ ] Test: Non-owner cannot update/delete a project
- [ ] Test: Viewer role cannot create projects
- [ ] Test: Admin can access everything

---

## 4. Stage 3 — Read API (Views & RPCs)

> **Priority**: 🟡 HIGH  
> **Estimated Duration**: 1-2 weeks  
> **Dependencies**: Stage 2 complete

### 3.1 Create Project Summary View

**Migration**: `20250613000001_create_project_views.sql`

```sql
CREATE OR REPLACE VIEW vw_project_summary AS
SELECT 
  p.id,
  p.title,
  p.description,
  p.status,
  p.department,
  p.project_manager,
  p.sponsors,
  p.business_leads,
  p.budget_total,
  p.budget_actuals,
  p.budget_forecast,
  p.computed_status_color,
  p.manual_status_color,
  COALESCE(p.manual_status_color, p.computed_status_color) AS effective_status_color,
  p.start_date,
  p.end_date,
  p.created_by,
  p.created_at,
  p.updated_at,
  -- Milestone aggregates
  COUNT(DISTINCT m.id) AS milestone_count,
  COUNT(DISTINCT m.id) FILTER (WHERE m.completion = 100) AS completed_milestones,
  AVG(m.completion)::INTEGER AS avg_milestone_completion,
  -- Risk count
  COUNT(DISTINCT r.id) AS risk_count,
  -- Active tasks
  COUNT(DISTINCT t.id) AS task_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.completion = 100) AS completed_tasks
FROM projects p
LEFT JOIN milestones m ON m.project_id = p.id
LEFT JOIN risks r ON r.project_id = p.id
LEFT JOIN tasks t ON t.milestone_id IN (SELECT id FROM milestones WHERE project_id = p.id)
WHERE p.archived_at IS NULL
GROUP BY p.id;
```

### 3.2 Create Project Detail RPC

**Migration**: `20250613000002_create_project_detail_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION get_project_with_relations(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check user is approved
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_approved = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'project', row_to_json(p),
    'milestones', COALESCE((
      SELECT jsonb_agg(row_to_json(m) ORDER BY m.date)
      FROM milestones m WHERE m.project_id = p.id
    ), '[]'::jsonb),
    'tasks', COALESCE((
      SELECT jsonb_agg(row_to_json(t) ORDER BY t.date)
      FROM tasks t 
      JOIN milestones m ON t.milestone_id = m.id
      WHERE m.project_id = p.id
    ), '[]'::jsonb),
    'accomplishments', COALESCE((
      SELECT jsonb_agg(row_to_json(a) ORDER BY a.created_at)
      FROM accomplishments a WHERE a.project_id = p.id
    ), '[]'::jsonb),
    'next_period_activities', COALESCE((
      SELECT jsonb_agg(row_to_json(n) ORDER BY n.date)
      FROM next_period_activities n WHERE n.project_id = p.id
    ), '[]'::jsonb),
    'risks', COALESCE((
      SELECT jsonb_agg(row_to_json(r))
      FROM risks r WHERE r.project_id = p.id
    ), '[]'::jsonb),
    'considerations', COALESCE((
      SELECT jsonb_agg(row_to_json(c))
      FROM considerations c WHERE c.project_id = p.id
    ), '[]'::jsonb),
    'changes', COALESCE((
      SELECT jsonb_agg(row_to_json(ch))
      FROM changes ch WHERE ch.project_id = p.id
    ), '[]'::jsonb)
  ) INTO result
  FROM projects p
  WHERE p.id = p_project_id AND p.archived_at IS NULL;

  RETURN result;
END;
$$;
```

### 3.3 Create Dashboard KPI View

**Migration**: `20250613000003_create_dashboard_kpi_view.sql`

```sql
CREATE OR REPLACE VIEW vw_dashboard_kpis AS
SELECT
  COUNT(*) AS total_projects,
  COUNT(*) FILTER (WHERE status = 'active') AS active_projects,
  COUNT(*) FILTER (WHERE status = 'on_hold') AS on_hold_projects,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_projects,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_projects,
  SUM(budget_total) AS total_budget,
  SUM(budget_actuals) AS total_actuals,
  SUM(budget_forecast) AS total_forecast,
  COUNT(*) FILTER (WHERE COALESCE(manual_status_color, computed_status_color) = 'red') AS red_projects,
  COUNT(*) FILTER (WHERE COALESCE(manual_status_color, computed_status_color) = 'yellow') AS yellow_projects,
  COUNT(*) FILTER (WHERE COALESCE(manual_status_color, computed_status_color) = 'green') AS green_projects
FROM projects
WHERE archived_at IS NULL;
```

### 3.4 Create Department Summary View

```sql
CREATE OR REPLACE VIEW vw_department_summary AS
SELECT
  department,
  COUNT(*) AS project_count,
  COUNT(*) FILTER (WHERE status = 'active') AS active_count,
  SUM(budget_total) AS department_budget,
  SUM(budget_actuals) AS department_actuals
FROM projects
WHERE archived_at IS NULL AND department IS NOT NULL
GROUP BY department;
```

### 3.5 Acceptance Criteria for Stage 3

- [ ] `vw_project_summary` view created and queryable
- [ ] `get_project_with_relations()` RPC returns full project data
- [ ] `vw_dashboard_kpis` view returns aggregate metrics
- [ ] `vw_department_summary` view returns department breakdowns
- [ ] All views respect RLS (use `security_invoker = true` or are called through RPC)
- [ ] Performance: Project list view returns in < 200ms for 100 projects
- [ ] Documentation updated with view schemas

---

## 5. Stage 4 — Write API (Edge Functions)

> **Priority**: 🟡 HIGH  
> **Estimated Duration**: 2-3 weeks  
> **Dependencies**: Stage 2 complete (Stage 3 recommended but not required)

### 4.1 Edge Function: Project Create

**File**: `supabase/functions/project-create/index.ts`

**Endpoint**: `POST /functions/v1/project-create`

**Request Body**:
```typescript
{
  title: string;            // required, max 200 chars
  description?: string;     // optional, max 5000 chars
  status?: ProjectStatus;   // default: 'draft'
  department?: string;
  budget_total?: number;
  project_manager?: string;
  sponsors?: string;
  business_leads?: string;
  milestones?: MilestoneInput[];
  accomplishments?: AccomplishmentInput[];
  next_period_activities?: ActivityInput[];
  risks?: RiskInput[];
  considerations?: ConsiderationInput[];
}
```

**Logic**:
1. Validate JWT token (extract user from `Authorization` header)
2. Validate user is approved and has `editor` or `admin` role
3. Validate all input fields (types, lengths, required fields)
4. Begin transaction:
   a. Insert project with `created_by = auth.uid()`
   b. Insert related records (milestones, accomplishments, etc.)
   c. Create initial version snapshot
   d. Log activity
5. Return created project with relations

**Response**: `201 Created` with full project object

### 4.2 Edge Function: Project Update

**File**: `supabase/functions/project-update/index.ts`

**Endpoint**: `PUT /functions/v1/project-update`

**Request Body**:
```typescript
{
  id: string;               // required, UUID
  // All project fields (partial update supported)
  title?: string;
  description?: string;
  status?: ProjectStatus;
  // ... all other project fields
  milestones?: MilestoneInput[];
  accomplishments?: AccomplishmentInput[];
  next_period_activities?: ActivityInput[];
  risks?: RiskInput[];
  considerations?: ConsiderationInput[];
  changes?: ChangeInput[];
}
```

**Logic**:
1. Validate JWT token
2. Validate user is owner OR admin
3. Validate all input fields
4. Begin transaction:
   a. Update project fields, set `updated_by = auth.uid()`, `updated_at = now()`
   b. Delete and re-insert related records (maintaining current pattern)
   c. Create version snapshot
   d. Log activity with change diff
5. Return updated project

**Response**: `200 OK` with full project object

### 4.3 Edge Function: Project Archive (Soft Delete)

**File**: `supabase/functions/project-archive/index.ts`

**Endpoint**: `POST /functions/v1/project-archive`

**Request Body**:
```typescript
{
  id: string;               // required, UUID
  reason?: string;          // optional archive reason
}
```

**Logic**:
1. Validate JWT token
2. Validate user is owner OR admin
3. Set `archived_at = now()`, `archived_by = auth.uid()`
4. Log activity
5. Return confirmation

**Response**: `200 OK`

### 4.4 Edge Function: Project Restore (Admin Only)

**File**: `supabase/functions/project-restore/index.ts`

**Endpoint**: `POST /functions/v1/project-restore`

**Logic**:
1. Validate JWT token
2. Validate user is admin
3. Set `archived_at = NULL`, `archived_by = NULL`
4. Log activity
5. Return restored project

### 4.5 Edge Function: Project Hard Delete (Admin Only)

**File**: `supabase/functions/project-hard-delete/index.ts`

**Endpoint**: `DELETE /functions/v1/project-hard-delete`

**Logic**:
1. Validate JWT token
2. Validate user is admin
3. Verify project is already archived (cannot hard-delete active projects)
4. Delete all related records and the project
5. Log activity

### 4.6 Shared Utilities Module

**File**: `supabase/functions/_shared/`

```
supabase/functions/_shared/
├── auth.ts           # JWT validation, role checking
├── cors.ts           # CORS configuration (restrict origins)
├── validation.ts     # Input validation helpers
├── types.ts          # Shared TypeScript types
├── response.ts       # Standardized response helpers
└── errors.ts         # Error types and handlers
```

**`auth.ts`**:
```typescript
export async function validateAuth(req: Request, supabase: SupabaseClient) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new AuthError('Missing authorization header');
  
  const { data: { user }, error } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (error || !user) throw new AuthError('Invalid token');
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_approved')
    .eq('id', user.id)
    .single();
    
  if (!profile?.is_approved) throw new AuthError('User not approved');
  
  return { user, role: profile.role };
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) {
    throw new AuthError(`Role '${role}' not authorized for this operation`);
  }
}
```

**`cors.ts`**:
```typescript
const ALLOWED_ORIGINS = [
  'https://projects.re-wa.net',
  'https://2e19f6eb-69d8-4928-ba50-fe83b05f7b15.canvases.tempo.build',
];

export function corsHeaders(origin?: string): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
  };
}
```

**`validation.ts`**:
```typescript
export function validateProjectInput(data: unknown): ValidationResult {
  const errors: string[] = [];
  
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Invalid request body'] };
  }

  const d = data as Record<string, unknown>;

  // Required fields
  if (!d.title || typeof d.title !== 'string') {
    errors.push('title is required and must be a string');
  } else if (d.title.length > 200) {
    errors.push('title must be 200 characters or less');
  }

  // Status validation
  const validStatuses = ['active', 'on_hold', 'completed', 'cancelled', 'draft'];
  if (d.status && !validStatuses.includes(d.status as string)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }

  // Budget validation
  ['budget_total', 'budget_actuals', 'budget_forecast'].forEach(field => {
    if (d[field] !== undefined && (typeof d[field] !== 'number' || d[field] < 0)) {
      errors.push(`${field} must be a non-negative number`);
    }
  });

  return { valid: errors.length === 0, errors };
}
```

### 4.7 Acceptance Criteria for Stage 4

- [ ] `project-create` edge function deployed and working
- [ ] `project-update` edge function deployed and working
- [ ] `project-archive` edge function deployed and working
- [ ] `project-restore` edge function deployed and working (admin only)
- [ ] `project-hard-delete` edge function deployed and working (admin only)
- [ ] Shared utilities module created (`_shared/`)
- [ ] Server-side input validation on all write endpoints
- [ ] Authorization checks on all write endpoints
- [ ] Version snapshots created automatically on create/update
- [ ] Activity logging on all write operations
- [ ] CORS restricted to allowed origins
- [ ] Error responses follow consistent format
- [ ] All endpoints return appropriate HTTP status codes

---

## 6. Stage 5 — Granular Update Endpoints

> **Priority**: 🟢 MEDIUM  
> **Estimated Duration**: 2 weeks  
> **Dependencies**: Stage 4 complete

### 5.1 Milestone Management Endpoints

**File**: `supabase/functions/milestone-update/index.ts`

| Operation | Method | Body |
|-----------|--------|------|
| Add milestone | POST | `{ project_id, milestone, date, end_date?, owner?, status? }` |
| Update milestone | PUT | `{ id, ...fields }` |
| Delete milestone | DELETE | `{ id }` |
| Reorder milestones | PUT | `{ project_id, milestone_ids: string[] }` |
| Update completion | PATCH | `{ id, completion: number }` |

### 5.2 Status Update Endpoints

**File**: `supabase/functions/project-status-update/index.ts`

Batch update endpoint for status sheet items:

```typescript
{
  project_id: string;
  accomplishments?: { action: 'add' | 'update' | 'delete', data: {...} }[];
  next_period_activities?: { action: 'add' | 'update' | 'delete', data: {...} }[];
  risks?: { action: 'add' | 'update' | 'delete', data: {...} }[];
  considerations?: { action: 'add' | 'update' | 'delete', data: {...} }[];
  changes?: { action: 'add' | 'update' | 'delete', data: {...} }[];
}
```

**Benefits**:
- Single API call for all status updates (vs. current 5+ separate operations)
- Atomic — all changes succeed or fail together
- Supports granular add/update/delete without replacing entire lists

### 5.3 Budget Update Endpoint

**File**: `supabase/functions/budget-update/index.ts`

```typescript
{
  project_id: string;
  budget_total?: number;
  budget_actuals?: number;
  budget_forecast?: number;
}
```

### 5.4 Team Assignment Endpoint

**File**: `supabase/functions/team-update/index.ts`

```typescript
{
  project_id: string;
  project_manager?: string;
  sponsors?: string;
  business_leads?: string;
}
```

### 5.5 Acceptance Criteria for Stage 5

- [ ] Individual milestone CRUD without full project save
- [ ] Batch status update endpoint working
- [ ] Budget-only updates without touching other data
- [ ] Team assignment updates without full project save
- [ ] All endpoints validate ownership/authorization
- [ ] All endpoints create version snapshots
- [ ] No data loss — granular updates preserve existing records

---

## 7. Stage 6 — Audit, Logging & Observability

> **Priority**: 🟢 MEDIUM  
> **Estimated Duration**: 1 week  
> **Dependencies**: Stage 4 complete

### 6.1 Enhanced Audit Log Table

**Migration**: `20250615000001_create_audit_log.sql`

```sql
CREATE TABLE audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'create', 'update', 'archive', 'restore', 'delete'
  entity_type TEXT NOT NULL, -- 'project', 'milestone', 'accomplishment', etc.
  entity_id UUID,
  project_id UUID, -- For quick project-scoped queries
  changes JSONB, -- { field: { old: value, new: value } }
  metadata JSONB, -- Additional context (IP, user agent, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_log_user ON audit_log (user_id);
CREATE INDEX idx_audit_log_project ON audit_log (project_id);
CREATE INDEX idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_admin()
  );

CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Edge functions insert via service role
```

### 6.2 Change Diff Function

```sql
CREATE OR REPLACE FUNCTION compute_change_diff(
  old_data JSONB, 
  new_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  key TEXT;
BEGIN
  FOR key IN SELECT jsonb_object_keys(new_data)
  LOOP
    IF old_data->key IS DISTINCT FROM new_data->key THEN
      result := result || jsonb_build_object(
        key, jsonb_build_object(
          'old', old_data->key,
          'new', new_data->key
        )
      );
    END IF;
  END LOOP;
  RETURN result;
END;
$$;
```

### 6.3 Audit Log Cleanup

```sql
-- Auto-cleanup old audit logs (keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM audit_log 
  WHERE created_at < now() - interval '1 year';
$$;
```

### 6.4 Acceptance Criteria for Stage 6

- [ ] `audit_log` table created with proper indexes
- [ ] All write edge functions log to `audit_log`
- [ ] Change diffs captured for update operations
- [ ] Admin can view all audit logs
- [ ] Users can view their own audit logs
- [ ] Cleanup function exists for old entries

---

## 8. Stage 7 — Hardening & Production Readiness

> **Priority**: 🟡 HIGH  
> **Estimated Duration**: 1-2 weeks  
> **Dependencies**: Stages 4-6 complete

### 7.1 Rate Limiting

**Database-backed rate limiting**:

```sql
CREATE TABLE rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER DEFAULT 1
);

CREATE INDEX idx_rate_limits_lookup 
  ON rate_limits (user_id, endpoint, window_start);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Clean old entries
  DELETE FROM rate_limits 
  WHERE window_start < now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM rate_limits
  WHERE user_id = p_user_id 
    AND endpoint = p_endpoint
    AND window_start > now() - (p_window_minutes || ' minutes')::interval;
  
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Record this request
  INSERT INTO rate_limits (user_id, endpoint)
  VALUES (p_user_id, p_endpoint);
  
  RETURN TRUE;
END;
$$;
```

**Rate Limits per Endpoint**:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `project-create` | 10 | 1 minute |
| `project-update` | 30 | 1 minute |
| `project-archive` | 5 | 1 minute |
| `project-hard-delete` | 3 | 1 minute |
| `milestone-update` | 60 | 1 minute |
| `project-status-update` | 30 | 1 minute |

### 7.2 Input Sanitization

Add to `_shared/validation.ts`:
- HTML entity encoding for text fields
- SQL injection prevention (handled by Supabase parameterized queries, but validate patterns)
- XSS prevention for stored text
- UUID format validation
- Number range validation (budgets, completion percentages)

### 7.3 Error Handling Standards

**Standard Error Response Format**:
```typescript
{
  error: {
    code: string;       // 'VALIDATION_ERROR', 'AUTH_ERROR', 'NOT_FOUND', 'RATE_LIMITED', 'INTERNAL_ERROR'
    message: string;    // Human-readable message
    details?: any;      // Additional context (validation errors, etc.)
  }
}
```

**HTTP Status Code Mapping**:

| Code | When |
|------|------|
| `200` | Successful update/delete |
| `201` | Successful create |
| `400` | Validation error |
| `401` | Missing/invalid auth |
| `403` | Insufficient permissions |
| `404` | Resource not found |
| `429` | Rate limited |
| `500` | Internal server error |

### 7.4 CORS Hardening

Update `_shared/cors.ts` to:
- Only allow specific production origins
- Add development origins conditionally
- Set appropriate `max-age` for preflight caching
- Include `Vary: Origin` header

### 7.5 API Documentation

**Deliverable**: `docs/API-REFERENCE-V2.md`

For each endpoint, document:
- URL and method
- Request headers
- Request body schema (with examples)
- Response body schema (with examples)
- Error responses
- Rate limits
- Required role/permissions

### 7.6 Acceptance Criteria for Stage 7

- [ ] Rate limiting implemented and tested
- [ ] Input sanitization applied to all text fields
- [ ] Consistent error response format across all endpoints
- [ ] CORS restricted to production origins
- [ ] API documentation complete
- [ ] Load testing: 100 concurrent requests handled gracefully
- [ ] Security review: No SQL injection, XSS, or IDOR vulnerabilities

---

## 9. Stage 8 — Client Migration & Integration

> **Priority**: 🟢 MEDIUM  
> **Estimated Duration**: 2-3 weeks  
> **Dependencies**: Stages 4-7 complete

### 8.1 Create API Client Service

**File**: `src/lib/services/apiClient.ts`

```typescript
import { supabase } from '@/lib/supabase';

class ApiClient {
  private async invoke<T>(functionName: string, body: unknown): Promise<T> {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });
    
    if (error) {
      throw new ApiError(error.message, error);
    }
    
    if (data?.error) {
      throw new ApiError(data.error.message, data.error);
    }
    
    return data as T;
  }

  // Projects
  async createProject(input: CreateProjectInput): Promise<ProjectWithRelations> {
    return this.invoke('project-create', input);
  }

  async updateProject(id: string, input: UpdateProjectInput): Promise<ProjectWithRelations> {
    return this.invoke('project-update', { id, ...input });
  }

  async archiveProject(id: string, reason?: string): Promise<void> {
    return this.invoke('project-archive', { id, reason });
  }

  // Milestones
  async updateMilestone(input: MilestoneUpdateInput): Promise<Milestone> {
    return this.invoke('milestone-update', input);
  }

  // Status Updates
  async batchUpdateStatus(input: StatusUpdateInput): Promise<void> {
    return this.invoke('project-status-update', input);
  }

  // Read (still using direct Supabase for reads)
  async getProjects(): Promise<ProjectSummary[]> {
    const { data, error } = await supabase
      .from('vw_project_summary')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw new ApiError(error.message, error);
    return data;
  }

  async getProject(id: string): Promise<ProjectWithRelations> {
    const { data, error } = await supabase
      .rpc('get_project_with_relations', { p_project_id: id });
    
    if (error) throw new ApiError(error.message, error);
    return data;
  }
}

export const apiClient = new ApiClient();
```

### 8.2 Migration Strategy

**Phase A**: Add `apiClient` alongside existing `projectService` (dual-write period)
- New code uses `apiClient`
- Existing code continues to use `projectService`
- Both work simultaneously

**Phase B**: Migrate each page/component one at a time
1. `ProjectForm.tsx` → use `apiClient.createProject()` / `apiClient.updateProject()`
2. `ProjectList.tsx` → use `apiClient.getProjects()` (view-backed)
3. `ProjectDashboard.tsx` → use `apiClient.getProject()` (RPC-backed)
4. `StatusSheet.tsx` → use `apiClient.batchUpdateStatus()`
5. Delete operations → use `apiClient.archiveProject()`

**Phase C**: Remove old `projectService` write methods
- Keep read methods that are still used
- Remove direct table mutations
- Update imports across codebase

### 8.3 Update Types

**File**: `src/types/api.ts`

```typescript
// API request types (what we send)
export interface CreateProjectInput {
  title: string;
  description?: string;
  status?: ProjectStatus;
  department?: string;
  budget_total?: number;
  budget_actuals?: number;
  budget_forecast?: number;
  project_manager?: string;
  sponsors?: string;
  business_leads?: string;
  milestones?: MilestoneInput[];
  accomplishments?: AccomplishmentInput[];
  risks?: RiskInput[];
  considerations?: ConsiderationInput[];
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  // All fields optional for partial updates
}

// API response types (what we receive)
export interface ProjectSummary {
  id: string;
  title: string;
  status: ProjectStatus;
  effective_status_color: string;
  milestone_count: number;
  completed_milestones: number;
  risk_count: number;
  // ... from vw_project_summary
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
```

### 8.4 Acceptance Criteria for Stage 8

- [ ] `apiClient` service created with full TypeScript types
- [ ] All write operations migrated to edge function calls
- [ ] All read operations migrated to views/RPCs where applicable
- [ ] Old direct-mutation code removed
- [ ] No regression in existing functionality
- [ ] Error handling gracefully surfaces API errors to users
- [ ] Loading states work correctly with new async patterns
- [ ] Real-time subscriptions still work (reads via Supabase client)

---

## 10. Appendices

### Appendix A: Migration File Naming Convention

```
YYYYMMDD000NNN_description.sql

Example:
20250611000001_add_created_by_to_projects.sql
20250611000002_add_soft_delete_to_projects.sql
20250612000001_implement_project_rls.sql
```

### Appendix B: Edge Function File Structure

```
supabase/functions/
├── _shared/                    # Shared utilities
│   ├── auth.ts
│   ├── cors.ts
│   ├── validation.ts
│   ├── types.ts
│   ├── response.ts
│   └── errors.ts
├── project-create/
│   └── index.ts
├── project-update/
│   └── index.ts
├── project-archive/
│   └── index.ts
├── project-restore/
│   └── index.ts
├── project-hard-delete/
│   └── index.ts
├── milestone-update/
│   └── index.ts
├── project-status-update/
│   └── index.ts
├── budget-update/
│   └── index.ts
├── team-update/
│   └── index.ts
├── generate-content/           # Existing
│   └── index.ts
├── project-chat/               # Existing
│   └── index.ts
├── send-reminder-emails/       # Existing
│   └── index.ts
├── azure-ad-sync/              # Existing
│   └── index.ts
└── ... (other existing functions)
```

### Appendix C: Testing Strategy

| Stage | Test Type | Tools |
|-------|-----------|-------|
| Stage 1-2 | Migration tests | SQL scripts, `psql` |
| Stage 2 | RLS policy tests | Supabase test client with different roles |
| Stage 3 | View/RPC tests | `supabase.rpc()` calls, query benchmarks |
| Stage 4-5 | Edge function tests | `curl`, Postman, automated test suite |
| Stage 7 | Security tests | OWASP checklist, rate limit tests |
| Stage 8 | Integration tests | Cypress/Playwright E2E tests |

### Appendix D: Rollback Strategy

Each stage should be independently rollable:

1. **Migrations**: Each migration has a corresponding "down" migration
2. **Edge Functions**: Old functions remain active until explicitly deprecated
3. **Client Code**: Feature flags can toggle between old and new API client
4. **RLS Policies**: Can be dropped and recreated with previous definitions

### Appendix E: Environment Variables Required

| Variable | Stage | Purpose |
|----------|-------|---------|
| `SUPABASE_URL` | All | Supabase project URL |
| `SUPABASE_ANON_KEY` | All | Client-side key |
| `SUPABASE_SERVICE_KEY` | Stage 4+ | Edge function elevated access |
| `VITE_SUPABASE_URL` | Stage 8 | Frontend env |
| `VITE_SUPABASE_ANON_KEY` | Stage 8 | Frontend env |
| `OPENAI_API_KEY` | Existing | AI features |
| `ALLOWED_ORIGINS` | Stage 7 | CORS whitelist (new) |

### Appendix F: Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (p95) | < 500ms | Edge function logs |
| Error rate | < 1% | Audit log analysis |
| Unauthorized access attempts blocked | 100% | RLS + edge function auth |
| Version snapshots created | 100% of writes | Audit log correlation |
| Zero data loss on writes | 100% | Diff comparison tests |
| Client migration coverage | 100% of write ops | Code review |

---

### Appendix G: Existing API Reference Mapping

> This appendix maps every endpoint documented in [`docs/API-REFERENCE.md`](../API-REFERENCE.md) to its planned replacement in this implementation plan. Use this as a migration checklist.

#### Database API (Direct Supabase Calls → New Pattern)

| Current Endpoint (API-REFERENCE.md) | Current Pattern | New Pattern | Plan Stage | Notes |
|--------------------------------------|-----------------|-------------|------------|-------|
| **Get All Projects** | `supabase.from('projects').select('*, milestones(*), ...')` | `supabase.from('vw_project_summary').select('*')` | Stage 3 (§3.1) | Replaced by database view with aggregated fields |
| **Get Project by ID** | `supabase.from('projects').select('*, ...').eq('id', id).single()` | `supabase.rpc('get_project_with_relations', { p_project_id })` | Stage 3 (§3.2) | Replaced by database RPC for atomic, consistent reads |
| **Create Project** | `supabase.from('projects').insert({...})` | `supabase.functions.invoke('project-create', { body })` | Stage 4 (§4.1) | Server-side validation, ownership tracking, auto-versioning |
| **Update Project** | `supabase.from('projects').update({...}).eq('id', id)` | `supabase.functions.invoke('project-update', { body })` | Stage 4 (§4.2) | Server-side validation, ownership check, audit logging |
| **Delete Project** | `supabase.from('projects').delete().eq('id', id)` | `supabase.functions.invoke('project-archive', { body })` | Stage 4 (§4.3) | **Soft delete replaces hard delete**; admin can hard-delete via §4.5 |

#### Milestones API

| Current Endpoint | New Pattern | Plan Stage | Notes |
|------------------|-------------|------------|-------|
| **Get Milestones** | Included in `get_project_with_relations()` RPC | Stage 3 (§3.2) | No separate call needed |
| **Create Milestone** | `supabase.functions.invoke('milestone-update', { body })` | Stage 5 (§5.1) | POST action |
| **Update Milestone** | `supabase.functions.invoke('milestone-update', { body })` | Stage 5 (§5.1) | PUT action with completion tracking |
| **Delete Milestone** | `supabase.functions.invoke('milestone-update', { body })` | Stage 5 (§5.1) | DELETE action |

#### Accomplishments, Activities, Risks, Considerations API

| Current Endpoint | New Pattern | Plan Stage | Notes |
|------------------|-------------|------------|-------|
| **All CRUD operations** on these tables | `supabase.functions.invoke('project-status-update', { body })` | Stage 5 (§5.2) | **Batch endpoint** — single call handles all status update items with add/update/delete actions |

#### Tasks API

| Current Endpoint | New Pattern | Plan Stage | Notes |
|------------------|-------------|------------|-------|
| **Get Tasks** | Included in `get_project_with_relations()` RPC | Stage 3 (§3.2) | Nested under milestones |
| **Create/Update Task** | Part of milestone management endpoint | Stage 5 (§5.1) | Tasks managed alongside their parent milestone |

#### Custom Database Functions (Existing → Retained/Enhanced)

| Current Function (API-REFERENCE.md) | Disposition | Plan Stage | Notes |
|--------------------------------------|-------------|------------|-------|
| `get_user_activity_summary()` | **Retain as-is** | — | Already works well for analytics |
| `get_ai_usage_analytics()` | **Retain as-is** | — | Already works well for analytics |
| `get_project_creation_stats()` | **Retain as-is** | — | Already works well for analytics |
| `get_active_users()` | **Retain as-is** | — | Already works well for analytics |
| `update_project_computed_status_color()` | **Retain + enhance** | Stage 4 | Call automatically in write edge functions |
| `recalculate_all_computed_status_colors()` | **Retain as-is** | — | Admin batch operation |
| `get_version_count()` | **Retain as-is** | — | Used by version history UI |
| `get_database_size()` | **Retain as-is** | — | Admin dashboard |
| `get_table_sizes()` | **Retain as-is** | — | Admin dashboard |

#### Real-time Subscriptions (Existing → Retained)

| Current Subscription | Disposition | Notes |
|---------------------|-------------|-------|
| **Project updates** channel | **Retain as-is** | Real-time still uses direct Supabase client |
| **Milestone updates** channel | **Retain as-is** | Real-time still uses direct Supabase client |
| **Chat messages** channel | **Retain as-is** | No changes needed |

> **Key Principle**: Real-time subscriptions continue to use the direct Supabase client. Only **write operations** move to Edge Functions. **Read operations** move to views/RPCs.

#### Authentication API (Existing → Retained with Enhancements)

| Current Pattern | Disposition | Plan Stage | Notes |
|----------------|-------------|------------|-------|
| `signUp()` | **Retain as-is** | — | Supabase Auth handles this |
| `signInWithPassword()` | **Retain as-is** | — | Supabase Auth handles this |
| `signInWithOAuth()` | **Retain as-is** | — | Supabase Auth handles this |
| `getUser()` | **Retain as-is** | — | Supabase Auth handles this |
| `signOut()` | **Retain as-is** | — | Supabase Auth handles this |
| Profile update | **Retain as-is** | — | Direct Supabase call, protected by RLS |

#### Service Layer (Existing → Migrated)

| Current Service | New Service | Plan Stage | Notes |
|----------------|-------------|------------|-------|
| `projectService.getAllProjects()` | `apiClient.getProjects()` | Stage 8 (§8.1) | Uses view instead of raw query |
| `projectService.getProject()` | `apiClient.getProject()` | Stage 8 (§8.1) | Uses RPC instead of raw query |
| `projectService.createProject()` | `apiClient.createProject()` | Stage 8 (§8.1) | Calls edge function |
| `projectService.updateProject()` | `apiClient.updateProject()` | Stage 8 (§8.1) | Calls edge function |
| `projectService.deleteProject()` | `apiClient.archiveProject()` | Stage 8 (§8.1) | Soft delete via edge function |
| `projectVersionsService.*` | **Retain** (auto-called by edge functions) | Stage 4 | Versioning moves server-side |
| `aiService.*` | **Retain as-is** | — | Already uses edge functions |
| `excelExport` / `pptExport` | **Retain as-is** | — | Client-side export, no API needed |
| `adminService.*` | **Retain as-is** | — | Uses existing RPCs |

#### Error Handling (Existing → Enhanced)

| Current Pattern (API-REFERENCE.md) | New Pattern | Plan Stage |
|-------------------------------------|-------------|------------|
| Ad-hoc `error.code` switch statements | Standardized `ApiError` class with codes: `VALIDATION_ERROR`, `AUTH_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR` | Stage 7 (§7.3) |
| Client-side rate limit detection | Server-side rate limiting with `429` responses | Stage 7 (§7.1) |
| No input validation | Server-side validation in edge functions | Stage 4 (§4.6) |

#### Best Practices (API-REFERENCE.md § Best Practices → Updated)

| Current Practice | Updated Practice | Notes |
|------------------|------------------|-------|
| Batch inserts via `supabase.from().insert([...])` | Batch operations via edge function (`project-status-update`) | Atomic, validated, audited |
| Optimistic updates in UI | **Still recommended** — but with edge function calls instead of direct mutations | Pattern stays the same, only the API call changes |
| Connection cleanup for subscriptions | **Unchanged** — `useEffect` cleanup pattern remains | Real-time subscriptions are unaffected |

---

### Appendix H: API Reference Update Checklist

As each stage is completed, the [`docs/API-REFERENCE.md`](../API-REFERENCE.md) should be updated:

- [ ] **After Stage 1**: Add `created_by`, `updated_by`, `archived_at` fields to Projects API section
- [ ] **After Stage 2**: Add "Authorization" section documenting role-based access and RLS policies
- [ ] **After Stage 3**: Add "Views" section for `vw_project_summary`, `vw_dashboard_kpis`, `vw_department_summary`; add `get_project_with_relations()` to Database Functions section
- [ ] **After Stage 4**: Add "Edge Functions (Write API)" section documenting `project-create`, `project-update`, `project-archive`, `project-restore`, `project-hard-delete`; mark direct write calls as **DEPRECATED**
- [ ] **After Stage 5**: Add granular endpoints to Edge Functions section: `milestone-update`, `project-status-update`, `budget-update`, `team-update`
- [ ] **After Stage 6**: Add "Audit Log" section documenting `audit_log` table and query patterns
- [ ] **After Stage 7**: Update "Error Handling" section with standardized error format; add "Rate Limiting" section
- [ ] **After Stage 8**: Remove deprecated direct-call patterns; add `apiClient` service documentation to Service Layer section; version the document as `API-REFERENCE-V2.md`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-06-10 | Tempo AI | Initial plan created from API architecture analysis |
| 1.1 | 2025-06-11 | Tempo AI | Added Reference Documents section, Appendix G (API Reference mapping), Appendix H (update checklist) |

---

> **Next Steps**: Begin with Stage 1.1 (Add `created_by` to projects). Create the migration file and test against development database before proceeding.
