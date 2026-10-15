# LEARNINGS.md — Project Status Sheet Repository

Non-obvious findings, workarounds, and solutions discovered during development.
Log new entries with `/learn`. Newest entries go at the top.

---

<!-- Entries below — newest first -->

## Displayed completion % must go through `getDisplayCompletion()` — screens drifted apart

**Date**: 2026-10-15

The "% complete" number was calculated separately on each screen, so screens disagreed about
Manual mode. Commit `109f6ae` made `ProjectForm`/`StatusSheet`/`ProjectList`/`reportModel` always
show weighted milestone %, while `HealthCalculationSection`, `ProjectKPIsPage` and `kpiService`
used `manual_health_percentage`. Result: the edit page showed two different percentages at once.

**Rule**: when `health_calculation_type === "manual"`, the manual % overrides the displayed
completion everywhere. Use `getDisplayCompletion(project)` in `src/lib/services/project.ts` —
don't call `calculateWeightedCompletion()` directly for a project's displayed completion
(it is still correct for raw milestone math).

**Side gotcha**: `createProject` saves `manual_health_percentage || null`, so a manual **0%**
is stored as `null` and falls back to milestone %. Use `??` there if 0% overrides are needed.


## `REVOKE EXECUTE … FROM anon/authenticated` is a no-op when the grant is held by `PUBLIC`

**Date**: 2026-07-01

Postgres `CREATE FUNCTION` grants `EXECUTE` to the pseudo-role `PUBLIC` by default,
and `anon` / `authenticated` / `service_role` all inherit from it. Supabase's advisor
(`*_security_definer_function_executable`) checks `has_function_privilege(role, fn, 'EXECUTE')`,
which returns true via that inherited `PUBLIC` grant — so `REVOKE EXECUTE … FROM anon`
(or `FROM authenticated`) changes nothing and the finding persists.

**Symptom seen**: a migration that revoked function EXECUTE `FROM anon`/`FROM authenticated`
cleared **zero** function findings (only the table-SELECT and search_path fixes landed).
Table SELECT is granted to `anon` **directly**, so revoking it works; function EXECUTE comes
via `PUBLIC`, so revoking from a specific role does not. The arithmetic gave it away — the
advisor count barely moved where it should have dropped ~30.

**Fix**: `REVOKE EXECUTE … FROM PUBLIC` (plus `anon`, `authenticated`), then allow-list
re-grant — `GRANT EXECUTE … TO service_role` (backend/edge/cron) and `TO authenticated` only
for functions the app actually calls. Build the allow-list from a **multi-line-aware** scan of
`supabase.rpc(` calls; a single-line grep misses calls where `.rpc(` and the function name are
on separate lines (this bit us — `test_project_creation_tracking`). See
`supabase/migrations/20260629000003_security_hardening_phase1b.sql`.


## A leftover permissive `USING(true)` RLS policy silently overrides a stricter one

**Date**: 2026-07-01

RLS **permissive** policies combine with **OR**. If a table has both an old
`"Enable all operations for all users"` policy (`FOR ALL USING(true)`) and a newer
`FOR UPDATE USING(can_edit_project(...))`, the effective rule is
`true OR can_edit_project(...)` = **always true**. The strict policy is dead weight and
writes stay wide open — even though the table *looks* locked down.

**Gotcha within the gotcha**: the migration that added the strict policies
(`20260627000008`) only dropped policies with `cmd IN ('UPDATE','DELETE')`, so the
`cmd = ALL` blanket policy survived and kept overriding them. Supabase's
`rls_policy_always_true` advisor was pointing at the live hole.

**Fix**: enumerate `pg_policies` and drop **every** permissive write/`ALL`-command `true`
policy, then install one canonical set. Remember to backfill `SELECT` and `INSERT` policies
you didn't previously have as standalone policies — the blanket `ALL` policy was silently
providing them, so dropping it breaks child-row reads and inserts otherwise. See
`supabase/migrations/20260701000001_security_hardening_phase2_write_rls.sql`.


## `@react-pdf/renderer` is incompatible with this app's CSP — use browser print-to-PDF

**Date**: 2026-06-28

Client-side PDF generation with `@react-pdf/renderer` **cannot work** in this app. Its
runtime needs three things the hardened CSP in `netlify.toml` forbids:
1. a `data:` WebAssembly module (yoga layout engine) — blocked by `connect-src`
2. a `blob:` web worker — blocked by `worker-src`/`script-src`
3. the Node `Buffer` global (used by its image pipeline) — absent in browsers

Symptoms seen, in order, as each layer was worked around: PDF export **hangs forever**
(swallowed error in the async image loader leaves `toBlob()` pending), then
`Buffer is not defined`, then `fs.readFileSync is not a function` (the `{ data, format }`
image source is a **Node-only** path), then the CSP console errors that revealed the
real cause. This applies in **production too** — the CSP is the same in `netlify dev`
and on the deployed site, so "try it on the live server" does not help.

**Critical debugging gotcha**: do NOT validate react-pdf in Node. `@react-pdf/renderer`'s
Node renderer (`renderToBuffer`) has `Buffer`/`fs` and no CSP, so a Node repro **passes
while the browser fails**. Verify browser-only rendering in an actual browser (e.g. a
throwaway `vite` page driven by the Playwright MCP, or `page.pdf()`).

**What to do instead** — generate the PDF from the existing branded HTML preview via the
browser's native print engine: render the preview into a body-level portal, isolate it
with `@media print` (`visibility` toggling + `print-color-adjust: exact` so brand
bands/table headers actually print), and call `window.print()`. The user picks
"Save as PDF". This is CSP-safe (no WASM/worker/Buffer), needs no deps, produces
selectable/paginated output, and looks **exactly** like the on-screen preview because it
*is* the preview. See `src/components/report/ProjectReportDialog.tsx` (`PRINT_CSS`).


## `npm run build` is not a reliable pass/fail gate — use `npx vite build` + scoped `tsc`

**Date**: 2026-06-28

When you need to verify a change "builds", do NOT rely on `npm run build` as a green/red signal.

**Why**: The `build` script is `tsc ; vite build`. Two traps:
1. The `;` (not `&&`) is intentional — it lets `vite build` produce the bundle even when `tsc` reports errors. So the project ships via `vite build` (esbuild, which transpiles **without** type-checking), and the `tsc` step is advisory noise the team tolerates.
2. The repo currently has ~94 pre-existing `tsc` errors across ~18 unrelated files (App.tsx, home.tsx, project.ts, StatusSheet.tsx, etc.). A clean `tsc --noEmit` is therefore not achievable, and in some shells `tsc ; vite build` even mis-parses the `;` as a filename argument.

**What to do instead** — a meaningful per-change gate is:
```bash
npx vite build            # exits 0 = bundle builds (catches syntax/import/bundler breakage)
npx tsc --noEmit 2>&1 | grep -E "<paths/of/files/you/changed>"   # no output = your code added no type errors
```
Ignore tsc errors in files you didn't touch — they are pre-existing. Net: "the bundle builds AND my new code is type-clean," not "tsc is globally clean."


**Date**: 2026-06-18

Use `netlify dev` to start the development server, not `npm run dev`.

**Why**: This project uses Netlify serverless functions (e.g. `netlify/functions/generate-content.ts` for OpenAI calls). `npm run dev` starts Vite only — the serverless functions are never loaded, so any feature that calls a Netlify function (AI content generation, etc.) will fail with a network error. `netlify dev` starts both the Vite dev server AND a local Netlify Functions runtime, wiring them together so function calls work exactly as they do in production.

**How to start**:
```bash
netlify dev
```
The app is served at `http://localhost:8888` (Netlify's proxy port) rather than Vite's default `http://localhost:5173`.
