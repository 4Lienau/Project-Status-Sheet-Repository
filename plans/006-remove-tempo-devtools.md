# Plan 006: Remove the dead tempo-devtools dependency

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f93b72c..HEAD -- package.json vite.config.ts src/main.tsx src/App.tsx`
> If any of those files changed, compare the "Current state" excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 003 (having a build + test baseline before removing a package reduces risk)
- **Category**: tech-debt
- **Planned at**: commit `f93b72c`, 2026-06-17

## Why this matters

Tempo Labs (the web IDE this app was originally developed in) has shut down.
The `tempo-devtools` package (`^2.0.109`) is still listed in production
`dependencies` (not devDependencies) and the `tempo()` Vite plugin is loaded
unconditionally on every build and dev-server start. The package runs
initialization code for a defunct service, adds weight to the production
bundle, and creates confusion about what the codebase depends on. Removing it
is low-risk because all Tempo-specific code is already guarded behind
`import.meta.env.VITE_TEMPO === "true"`, which is never set in production or
local development.

## Current state

Relevant files and their current content:

**`package.json:86`** (in `dependencies`, not devDependencies):
```json
"tempo-devtools": "^2.0.109",
```

**`vite.config.ts` (full current content)**:
```typescript
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tempo } from "tempo-devtools/dist/vite";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins:
          process.env.TEMPO === "true"
            ? ["tempo-devtools/dist/babel-plugin"]
            : [],
      },
    }),
    tempo(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
  },
});
```

**`src/main.tsx:11–18`**:
```typescript
// Initialize Tempo Devtools
if (import.meta.env.VITE_TEMPO === "true") {
  const initTempo = async () => {
    const { TempoDevtools } = await import("tempo-devtools");
    // /* TempoDevtools.init() [deprecated] */ is deprecated - no longer needed
    // The devtools attach automatically when VITE_TEMPO is true.
  };
  initTempo();
}
```

**`src/App.tsx:38`**:
```typescript
import routes from "tempo-routes";
```
Used at `src/App.tsx:146–157` inside `if (import.meta.env.VITE_TEMPO === "true")` guards. The `tempo-routes` module is bundled as part of `tempo-devtools`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `npx tsc --noEmit` | exits 0 |
| Build | `npm run build 2>&1 \| tail -10` | builds successfully |
| Tests (if 003 done) | `npm test` | all pass |
| Bundle size check | `npm run build 2>&1 \| grep -i "kB\|gzip"` | compare before/after |

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `vite.config.ts`
- `src/main.tsx`
- `src/App.tsx`

**Out of scope** (do NOT touch):
- Any file under `src/components/`, `src/pages/`, `src/lib/`
- `supabase/` or `netlify/` directories
- `.env` files

## Git workflow

- Branch: `advisor/006-remove-tempo-devtools`
- Commit: `Remove dead tempo-devtools dependency`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Clean up `vite.config.ts`

Replace the entire current content of `vite.config.ts` with the following
(removes the `tempo` import and plugin, keeps everything else):

```typescript
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
  },
});
```

Note: the babel plugin block (`process.env.TEMPO === "true" ? [...]  : []`) is
also removed — it only ever loaded `tempo-devtools/dist/babel-plugin` which is
gone.

**Verify**:
```
grep -n "tempo" vite.config.ts
```
Expected: zero matches.

### Step 2: Clean up `src/main.tsx`

Remove the Tempo initialization block (lines 11–18). The file should go from:
```typescript
const basename = import.meta.env.BASE_URL;

// Initialize Tempo Devtools
if (import.meta.env.VITE_TEMPO === "true") {
  const initTempo = async () => {
    const { TempoDevtools } = await import("tempo-devtools");
    // The devtools attach automatically when VITE_TEMPO is true.
  };
  initTempo();
}

// Render the app
```

To:
```typescript
const basename = import.meta.env.BASE_URL;

// Render the app
```

**Verify**:
```
grep -n "tempo\|Tempo" src/main.tsx
```
Expected: zero matches.

### Step 3: Clean up `src/App.tsx`

Remove the `tempo-routes` import and the two conditional blocks that reference it.

**3a.** Remove line 38:
```typescript
import routes from "tempo-routes";
```

**3b.** Remove the `tempoRoutes` variable (lines ~145–148):
```typescript
const tempoRoutes =
  import.meta.env.VITE_TEMPO === "true" && !isMainAppRoute
    ? useRoutes(routes)
    : null;
```

**3c.** Remove the early-return Tempo block (lines ~151–157):
```typescript
if (
  import.meta.env.VITE_TEMPO === "true" &&
  !isMainAppRoute &&
  tempoRoutes
) {
  return <Suspense fallback={<p>Loading...</p>}>{tempoRoutes}</Suspense>;
}
```

**3d.** Remove the Tempo route inside `<Routes>` (line ~178):
```typescript
{import.meta.env.VITE_TEMPO === "true" && <Route path="/tempobook/*" />}
```

**3e.** Remove the `useRoutes` import from `react-router-dom` if it is no
longer used elsewhere in the file. Check:
```
grep -n "useRoutes" src/App.tsx
```
If zero matches remain after your removal, remove `useRoutes` from the import
line at the top of the file.

**Verify**:
```
grep -n "tempo\|Tempo\|tempoRoutes\|VITE_TEMPO" src/App.tsx
```
Expected: zero matches.

**Note on `SessionTracker`**: `src/App.tsx` also has an `isMainAppRoute` variable
used by `SessionTracker`. Do NOT remove that variable — it is used independently
of the Tempo blocks. Only remove the Tempo-specific uses of `isMainAppRoute`
in the `tempoRoutes` and early-return blocks.

### Step 4: Uninstall the package

```
npm uninstall tempo-devtools
```

Expected: exits 0. `package.json` no longer lists `tempo-devtools`.

**Verify**:
```
grep "tempo-devtools\|tempo-routes" package.json
```
Expected: zero matches.

### Step 5: Typecheck and build

```
npx tsc --noEmit
```
Expected: exits 0 with no errors.

```
npm run build 2>&1 | tail -10
```
Expected: build completes successfully. No references to `tempo` in build output.

```
npm test
```
Expected: all tests pass (if plan 003 is complete; skip otherwise).

## Test plan

No new tests are needed. This plan removes dead code. Manual verification:

1. `npm run dev` — app starts at `http://localhost:5173`.
2. Log in. Confirm the app loads normally and the home/project pages work.
3. The `?VITE_TEMPO=true` scenario no longer needs to work — that env var is
   only ever set by the Tempo Labs platform, which is shut down.

## Done criteria

- [ ] `grep -rn "tempo-devtools\|tempo-routes\|VITE_TEMPO\|tempoRoutes" src/` returns zero matches
- [ ] `grep "tempo" vite.config.ts` returns zero matches
- [ ] `grep "tempo-devtools" package.json` returns zero matches
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` completes without errors
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- After removing the `useRoutes` import, `npx tsc --noEmit` reports that
  `useRoutes` is still used somewhere else in `App.tsx` — do not remove the
  import; report back.
- The `isMainAppRoute` variable is used in more places than documented above —
  inspect carefully before removing any use of it.
- `npm run build` fails with an error that references any file other than
  `vite.config.ts`, `src/main.tsx`, or `src/App.tsx` — report back.

## Maintenance notes

- The `VITE_TEMPO` environment variable can be removed from `.env.example` and
  any Netlify environment variable configuration if it was ever set there.
- If a new visual development tool (Storybook, etc.) is adopted in the future,
  its plugin should go in `devDependencies`, not `dependencies`.
