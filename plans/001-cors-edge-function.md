# Plan 001: Restrict CORS on the AI Edge Function to known origins

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f93b72c..HEAD -- supabase/functions/generate-content/index.ts`
> If that file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `f93b72c`, 2026-06-17

## Why this matters

`supabase/functions/generate-content/index.ts` sets `Access-Control-Allow-Origin: *`,
meaning any website on the internet can trigger AI content generation calls that
are charged to your OpenAI account. A malicious site could drive up your bill or
exhaust rate limits. The Netlify function in the same repo correctly restricts
to an allowlist; the Edge Function should match that approach.

## Current state

Relevant files:
- `supabase/functions/generate-content/index.ts` — the Supabase Edge Function that calls OpenAI; this is what `src/lib/services/aiService.ts` actually invokes.

Current CORS header block (`supabase/functions/generate-content/index.ts:19–22`):
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

This same object is used for every response, including the OPTIONS preflight
at line 96–101 and every error/success response thereafter.

The known production origins (from `netlify.toml` redirects and the Netlify
function's allowedOrigins array in `netlify/functions/generate-content.ts:29–35`):
- `https://projects.re-wa.org`
- `https://rewapss.lienau.tech`
- `http://localhost:5173` (local dev)
- `http://localhost:8888` (netlify dev)

The Edge Function is called via Supabase's JS client
(`src/lib/services/aiService.ts:71`), which always runs from an authenticated
browser session — so the calling origin is always one of the above.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck frontend | `npm run build -- --mode development 2>&1 \| head -20` | No TS errors in src/ |
| Lint | `npm run lint` | exit 0 |
| Deploy edge function | `npx supabase functions deploy generate-content` | Deployed successfully |

Note: The Edge Function is Deno TypeScript — it is not checked by the frontend
`tsc`. There is no local Deno typecheck configured; verify logic by reading.

## Scope

**In scope** (the only file you should modify):
- `supabase/functions/generate-content/index.ts`

**Out of scope** (do NOT touch):
- `netlify/functions/generate-content.ts` — separate runtime, already has correct CORS
- `src/lib/services/aiService.ts` — caller, no changes needed
- Any other Supabase Edge Function

## Git workflow

- Branch: `advisor/001-cors-edge-function`
- Commit message style (match repo): `Fix CORS wildcard on AI edge function`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Replace the wildcard CORS header with a dynamic origin allowlist

In `supabase/functions/generate-content/index.ts`, replace the static
`corsHeaders` constant and add an origin-checking helper. The new structure:

```typescript
const ALLOWED_ORIGINS = [
  'https://projects.re-wa.org',
  'https://rewapss.lienau.tech',
  'http://localhost:5173',
  'http://localhost:8888',
];

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin =
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0]; // fallback to production origin
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
```

Then update the `serve` handler to extract the origin from the request and pass
it through:

```typescript
serve(async (req) => {
  const requestOrigin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }
  // ... rest of handler unchanged; corsHeaders is already in scope
```

The rest of the handler already uses the `corsHeaders` variable by reference —
no other changes are needed to propagate this.

**Verify**: Read the modified file and confirm:
- `Access-Control-Allow-Origin: '*'` no longer appears anywhere in the file.
- `getCorsHeaders` is called at the top of the handler with `req.headers.get('origin')`.

```
grep -n "Allow-Origin" supabase/functions/generate-content/index.ts
```
Expected: one line containing `getCorsHeaders` or `requestOrigin`, not `'*'`.

### Step 2: Deploy the updated Edge Function

```
npx supabase functions deploy generate-content --project-ref wxmsedqqbqhdpzpoaefm
```

Expected output: `Deployed Function generate-content`

If the Supabase CLI is not installed: `npm install -g supabase` then retry.

If you don't have the Supabase project credentials locally, note this as a
STOP condition and hand the file change to the human operator to deploy.

## Test plan

No automated tests exist for Edge Functions in this repo. Manual verification:
1. Deploy the function (Step 2).
2. In the running app at `http://localhost:5173`, open a project and click any
   "Generate with AI" button. Confirm it succeeds (returns content, no CORS
   error in the browser console).
3. (Optional) In browser DevTools → Network, inspect the AI request response
   headers and confirm `Access-Control-Allow-Origin` is `http://localhost:5173`,
   not `*`.

## Done criteria

- [ ] `grep -n "Allow-Origin.*\*" supabase/functions/generate-content/index.ts` returns no matches
- [ ] `ALLOWED_ORIGINS` array contains the four known origins
- [ ] Edge Function deployed successfully (Step 2 output confirmed)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back if:
- The code at `supabase/functions/generate-content/index.ts:19–22` doesn't match the excerpt above (drift).
- `npx supabase functions deploy` fails with an authentication or project error — hand the file change to the human operator.
- The handler structure has changed significantly (more than just the CORS block), making the scope of changes unclear.

## Maintenance notes

- If a new deployment environment is added (staging, preview URLs), add its
  origin to `ALLOWED_ORIGINS` in this file.
- The same allowlist pattern should be applied to any other Edge Functions added
  in `supabase/functions/` in the future.
- The Netlify function at `netlify/functions/generate-content.ts` has its own
  separate allowlist; keep them in sync or consolidate (see the direction finding
  in the audit about removing the duplicate Netlify function).
