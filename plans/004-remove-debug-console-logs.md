# Plan 004: Remove debug console.log calls from production hot paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f93b72c..HEAD -- src/lib/services/project.ts src/lib/services/aiService.ts`
> If those files changed, compare the "Current state" excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `f93b72c`, 2026-06-17

## Why this matters

`src/lib/services/project.ts` logs detailed project data (start date, end date,
ratio calculations, a ">100%" warning) to the browser console on every project
load via `console.log` calls at lines 166–180. This leaks internal project data
to anyone who opens DevTools, adds noise that makes debugging other issues
harder, and has a minor performance cost on every render. Similarly,
`aiService.ts` has `console.log` calls with emoji (🚀, ✅, ❌) throughout its
generation flow that add noise in production.

The fix: gate debug logs behind `import.meta.env.DEV` so they only appear in
the Vite development server, not in production builds.

## Current state

Relevant files:
- `src/lib/services/project.ts` — `calculateProjectDuration` function; the debug block is at lines 166–180.
- `src/lib/services/aiService.ts` — `generateContent` method has `console.log` at lines 66, 94; `processMilestones` has logs at lines 213, 219–224; `validateMilestoneQuality` has a `console.warn` at line 352.

Current debug block in `src/lib/services/project.ts:166–180`:
```typescript
console.log(`[DURATION_CALC] Project duration calculation:`, {
  startDate: startDate.toDateString(),
  endDate: endDate.toDateString(),
  today: today.toDateString(),
  totalDays,
  totalDaysRemaining,
  ratio: totalDaysRemaining / totalDays,
  percentageIfUsedDirectly: Math.round(
    (totalDaysRemaining / totalDays) * 100,
  ),
  issue:
    totalDaysRemaining > totalDays
      ? "WILL CAUSE >100% if used directly"
      : "Normal",
});
```

Sample `console.log` from `src/lib/services/aiService.ts:66`:
```typescript
console.log(
  `🚀 Starting ${type} content generation via Supabase Edge Function`,
);
```

`import.meta.env.DEV` is a Vite built-in boolean — `true` when running
`vite dev`, `false` in production builds (`vite build`). It is safe to use in
any `.ts`/`.tsx` file in this project.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exits 0 |
| Lint | `npm run lint` | exits 0 |
| Build check | `npm run build 2>&1 \| tail -5` | "built in X.Xs" — no errors |

## Scope

**In scope** (the only files you should modify):
- `src/lib/services/project.ts`
- `src/lib/services/aiService.ts`

**Out of scope** (do NOT touch):
- Any component files
- `src/lib/supabase.ts` — the `console.error` suppression there is intentional (see its comment)
- `netlify/functions/generate-content.ts` — server-side Node.js, different runtime
- `supabase/functions/` — Deno runtime, separate concern

## Git workflow

- Branch: `advisor/004-remove-debug-logs`
- Commit message: `Remove debug console.log calls from production hot paths`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Gate the duration calculation debug block in `project.ts`

In `src/lib/services/project.ts`, wrap the entire `console.log` block at
lines 166–180 with a dev-only guard:

```typescript
if (import.meta.env.DEV) {
  console.log(`[DURATION_CALC] Project duration calculation:`, {
    startDate: startDate.toDateString(),
    endDate: endDate.toDateString(),
    today: today.toDateString(),
    totalDays,
    totalDaysRemaining,
    ratio: totalDaysRemaining / totalDays,
    percentageIfUsedDirectly: Math.round(
      (totalDaysRemaining / totalDays) * 100,
    ),
    issue:
      totalDaysRemaining > totalDays
        ? "WILL CAUSE >100% if used directly"
        : "Normal",
  });
}
```

**Verify**:
```
grep -n "DURATION_CALC" src/lib/services/project.ts
```
Expected: the line still exists (not deleted), but is now inside an `if (import.meta.env.DEV)` block.

### Step 2: Gate the AI service logs in `aiService.ts`

In `src/lib/services/aiService.ts`, wrap each of the following `console.log`
and `console.warn` calls (or groups of them) with `if (import.meta.env.DEV)`:

- Line 66–69: the "🚀 Starting..." log
- Line 94: the "✅ Successfully generated..." log
- Lines 213, 219–224: the `console.log("📊 Milestone quality...")` and `console.log("🎯 Final processed milestones...")`
- Line 352: the `console.warn("🚨 Milestone quality issues...")`

Keep the `console.error` calls on lines 85 and 118 — those are legitimate
error reporting, not debug noise.

**Verify**:
```
grep -n "console\.log\|console\.warn" src/lib/services/aiService.ts
```
Expected: every remaining `console.log` and `console.warn` line is preceded
(within 2 lines) by `if (import.meta.env.DEV)`.

### Step 3: Typecheck and build

```
npx tsc --noEmit
```
Expected: exits 0.

```
npm run build 2>&1 | tail -10
```
Expected: build completes with no errors. The production bundle should not
contain the `[DURATION_CALC]` string (Vite eliminates dead branches in prod).

Verify the string is absent from the build output:
```
grep -r "DURATION_CALC" dist/ 2>/dev/null | head -5
```
Expected: no matches (Vite tree-shook the dev-only branch).

## Test plan

No new tests are needed for this change — it only adds conditional guards
around `console.log` calls without changing any logic. The existing `npm test`
suite (once plan 003 is done) should continue to pass unchanged.

If plan 003 is already complete: `npm test` → all tests pass.

## Done criteria

- [ ] `grep -n "DURATION_CALC" src/lib/services/project.ts` shows the string inside an `if (import.meta.env.DEV)` block
- [ ] `grep -n "console\.log\|console\.warn" src/lib/services/aiService.ts` — every match is guarded by `import.meta.env.DEV`
- [ ] `console.error` calls in `aiService.ts` are NOT guarded (they're legitimate errors)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` completes without errors
- [ ] `grep -r "DURATION_CALC" dist/` returns no matches
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- The code at `project.ts:166–180` doesn't match the excerpt above.
- `import.meta.env` is not available in these files (it always should be in a Vite project — if missing, STOP).
- Any `console.error` call is accidentally wrapped in the dev guard — it should not be.

## Maintenance notes

- When adding new debug logging to these files in the future, always wrap with
  `if (import.meta.env.DEV)` from the start.
- `console.error` calls for real errors should remain ungated — they're
  important for production debugging.
- Vite's production build (`vite build`) statically eliminates `if (import.meta.env.DEV)`
  blocks, so there is no runtime cost to the guard.
