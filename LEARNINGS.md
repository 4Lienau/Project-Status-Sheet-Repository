# LEARNINGS.md — Project Status Sheet Repository

Non-obvious findings, workarounds, and solutions discovered during development.
Log new entries with `/learn`. Newest entries go at the top.

---

<!-- Entries below — newest first -->

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
