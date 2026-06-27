# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
netlify dev              # Start local dev server at http://localhost:8888 (USE THIS, not npm run dev)
npm run build            # TypeScript check + production build (dist/)
npm run build-no-errors  # Build without halting on TS errors
npm run lint             # ESLint on all .ts and .tsx files
npm run preview          # Preview production build locally
npm run types:supabase   # Regenerate src/types/supabase.ts from live schema
```

**Always use `netlify dev`** to start the server, not `npm run dev`. `netlify dev` runs both Vite and the local Netlify Functions runtime together — required for AI features and any other serverless function calls to work. `npm run dev` starts Vite only and will cause function calls to fail.

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

**Row-level security**: Users see all projects for any user and any department.

**AI features**: OpenAI calls go through `netlify/functions/generate-content.ts` (server-side, key stays private). The client-side `src/lib/services/aiService.ts` calls that Netlify function.

**Exports**: Excel (ExcelJS), PowerPoint (PptxGenJS), and image capture (HTML2Canvas) are all handled in `src/lib/services/`.

**Milestone completion**: Uses weighted calculation — each milestone has a weight (1–5). Project health = `sum(completion × weight) / sum(weights)`.

## Environment Variables

Required in `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENAI_API_KEY`
- `SUPABASE_PROJECT_ID` (for type generation only)

## Known Workarounds & Learnings
@LEARNINGS.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
