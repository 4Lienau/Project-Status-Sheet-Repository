# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Vite dev server at http://localhost:5173
npm run build            # TypeScript check + production build (dist/)
npm run build-no-errors  # Build without halting on TS errors
npm run lint             # ESLint on all .ts and .tsx files
npm run preview          # Preview production build locally
npm run types:supabase   # Regenerate src/types/supabase.ts from live schema
```

No test suite exists — verify features by running the dev server.

After database schema changes, run `npm run types:supabase` (requires `SUPABASE_PROJECT_ID` env var).

## Architecture

**Stack**: React 18 + TypeScript + Vite frontend, Supabase (PostgreSQL + Auth + Realtime) backend, Netlify hosting with serverless functions for OpenAI calls.

**Key patterns**:

- **Service layer** in `src/lib/services/` centralizes all Supabase queries and external API calls. Components never call Supabase directly — they go through services or custom hooks.
- **Custom hooks** in `src/lib/hooks/` wrap services with React state/lifecycle. This is where real-time subscriptions are set up.
- **Shadcn/ui** components live in `src/components/ui/` and are generated via CLI — don't hand-edit them.
- **Path alias**: `@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`).
- TypeScript is configured with `strict: false`.

**Auth flow**: Supabase Auth → `profiles` table record → admin approval required before access is granted. Azure AD OAuth is integrated for enterprise users via `src/components/auth/`.

**Row-level security**: Users see only projects belonging to their department. This is enforced at the database level, not in application code.

**AI features**: OpenAI calls go through `netlify/functions/generate-content.ts` (server-side, key stays private). The client-side `src/lib/services/aiService.ts` calls that Netlify function.

**Exports**: Excel (ExcelJS), PowerPoint (PptxGenJS), and image capture (HTML2Canvas) are all handled in `src/lib/services/`.

**Milestone completion**: Uses weighted calculation — each milestone has a weight (1–5). Project health = `sum(completion × weight) / sum(weights)`.

## Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENAI_API_KEY`
- `SUPABASE_PROJECT_ID` (for type generation only)
