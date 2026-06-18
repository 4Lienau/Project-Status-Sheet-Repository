# LEARNINGS.md — Project Status Sheet Repository

Non-obvious findings, workarounds, and solutions discovered during development.
Log new entries with `/learn`. Newest entries go at the top.

---

<!-- Entries below — newest first -->

## Use `netlify dev` instead of `npm run dev` to start the local server

**Date**: 2026-06-18

Use `netlify dev` to start the development server, not `npm run dev`.

**Why**: This project uses Netlify serverless functions (e.g. `netlify/functions/generate-content.ts` for OpenAI calls). `npm run dev` starts Vite only — the serverless functions are never loaded, so any feature that calls a Netlify function (AI content generation, etc.) will fail with a network error. `netlify dev` starts both the Vite dev server AND a local Netlify Functions runtime, wiring them together so function calls work exactly as they do in production.

**How to start**:
```bash
netlify dev
```
The app is served at `http://localhost:8888` (Netlify's proxy port) rather than Vite's default `http://localhost:5173`.
