# Plan 002: Remove destructive session signout from the login page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f93b72c..HEAD -- src/components/auth/AuthForm.tsx`
> If that file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `f93b72c`, 2026-06-17

## Why this matters

`AuthForm.tsx` contains a `clearExistingSession` effect that fires on every
mount of the login page and unconditionally signs out any active session with
`scope: "global"` (which invalidates the session on ALL devices, not just the
current browser). The intent was to prevent users from being stuck on the login
page if they already had a session. However, because `ProtectedRoute` can
redirect to `/login` during transient loading states, this function can fire
immediately after a successful OAuth login and destroy the just-established
session — forcing the user to log in again. This was observed causing a login
failure loop in production during the OAuth flow fix on 2026-06-17.

The correct behavior: if the user has a valid session and somehow lands on
`/login`, redirect them to `/` rather than signing them out.

## Current state

Relevant file:
- `src/components/auth/AuthForm.tsx` — the login form component; the bug is in the first `useEffect` (lines 32–54).

Current code at `src/components/auth/AuthForm.tsx:32–54`:
```typescript
useEffect(() => {
  const clearExistingSession = async () => {
    // Check if we're on the login page directly (not from a sign-out)
    if (
      window.location.pathname === "/login" &&
      !window.location.search.includes("signout=true")
    ) {
      console.log("Login page loaded, checking for existing session");
      const { data } = await supabase.auth.getSession();

      // If there's an existing session but we're on the login page, sign out
      if (data.session) {
        console.log("Found existing session on login page, signing out");
        await supabase.auth.signOut({ scope: "global" });
        // Clear any local storage items
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("supabase.auth.refreshToken");
      }
    }
  };

  clearExistingSession();
}, []);
```

Related context:
- `src/lib/hooks/AuthContext.tsx` — the `AuthProvider`; when a valid session
  exists, `user` is non-null. `AuthContext` already handles redirecting
  authenticated users away from `/login` via its `onAuthStateChange` handler.
- `src/App.tsx:93–124` — `ProtectedRoute` redirects to `/login` if `user` is
  null, which can fire during transient loading (before the session propagates
  to React state).

The `useNavigate` hook is already imported in `AuthForm.tsx` (line 24) and
used in later effects.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exits 0, no errors |
| Lint | `npm run lint` | exits 0 |
| Dev server | `npm run dev` | app starts at localhost:5173 |

## Scope

**In scope** (the only file you should modify):
- `src/components/auth/AuthForm.tsx`

**Out of scope** (do NOT touch):
- `src/lib/hooks/AuthContext.tsx` — session management lives here; no changes needed
- `src/pages/AuthCallback.tsx` — OAuth callback handler; no changes needed
- `src/App.tsx` — routing; no changes needed

## Git workflow

- Branch: `advisor/002-clear-existing-session-bug`
- Commit message style (match repo): `Fix: Remove destructive global signout from login page`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Replace the clearExistingSession effect with a redirect-if-authenticated effect

The new behavior: if a session exists when the login page loads, navigate to
`/` instead of signing out. This is safe because `AuthContext` will have set
the user before `ProtectedRoute` renders on the home route.

Replace the entire first `useEffect` block (lines 32–54) with:

```typescript
// If the user already has a valid session and lands on /login, redirect home.
// Do NOT sign them out — that destroys sessions established by the OAuth
// callback when a transient ProtectedRoute redirect races against auth state.
useEffect(() => {
  const redirectIfAuthenticated = async () => {
    if (window.location.pathname !== "/login") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      navigate("/");
    }
  };
  redirectIfAuthenticated();
}, [navigate]);
```

`navigate` is already available from `const navigate = useNavigate()` at
line 29 of the current file.

**Verify**: Read the modified file and confirm:
- `supabase.auth.signOut` does NOT appear inside this effect.
- `localStorage.removeItem` does NOT appear inside this effect.
- `navigate("/")` IS called when `data.session` is truthy.

```
grep -n "signOut\|clearExistingSession\|Found existing session" src/components/auth/AuthForm.tsx
```
Expected: zero matches (these strings are gone from this file).

### Step 2: Confirm the "sign out" flow on the login page still works

The legitimate sign-out path (user clicks the sign-out button in the navbar)
sets `?signout=true` in the URL — but our new effect doesn't need that check
because it redirects rather than signs out. The sign-out itself happens in
`src/components/layout/Navbar.tsx:115` which calls `supabase.auth.signOut`
directly before navigating to `/login`. After sign-out the session is already
gone, so `data.session` will be null and the redirect will not fire.

No code changes are needed for this step — just verify the logic holds:
```
grep -n "signOut\|navigate.*login" src/components/layout/Navbar.tsx | head -10
```
Expected: a `signOut` call exists in `Navbar.tsx` (the user-initiated path),
confirming sign-out is not broken by removing it from `AuthForm`.

### Step 3: Run typecheck and lint

```
npx tsc --noEmit
```
Expected: exits 0 with no errors.

```
npm run lint
```
Expected: exits 0 (or same warnings as before — do not introduce new ones).

## Test plan

No automated test infrastructure exists in this repo. Manual verification:

1. Start the dev server: `npm run dev`
2. Sign in via Azure AD. Confirm you reach the home page.
3. Manually navigate to `http://localhost:5173/login` while logged in. Confirm
   you are immediately redirected back to `/` (not signed out).
4. Click sign out from the navbar. Confirm you reach `/login` and are NOT
   immediately redirected back (session was cleared by the navbar sign-out).
5. Sign in again to confirm the full flow still works.

## Done criteria

- [ ] `grep -n "signOut\|clearExistingSession\|Found existing session" src/components/auth/AuthForm.tsx` returns zero matches
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0 (no new errors)
- [ ] Manual test: navigating to `/login` while logged in redirects to `/` without signing out
- [ ] Manual test: signing out from navbar and then landing on `/login` works normally
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back if:
- The code at `src/components/auth/AuthForm.tsx:32–54` doesn't match the excerpt above.
- There is a second `signOut` call elsewhere in `AuthForm.tsx` that is not related to this effect — do not remove it without understanding its purpose.
- The `navigate` import is missing or unavailable in the component.

## Maintenance notes

- If a "force logout on page load" feature is ever needed again, implement it
  via a dedicated URL flag (e.g. `?force-logout=true`) rather than inspecting
  session state on the login page.
- The Navbar sign-out (`src/components/layout/Navbar.tsx:115`) is the correct
  location for user-initiated sign-out logic; keep it there.
- This change means users who somehow have a valid session and navigate to
  `/login` will be bounced to `/`. That is the correct UX.
