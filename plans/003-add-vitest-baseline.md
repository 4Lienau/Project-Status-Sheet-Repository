# Plan 003: Establish a Vitest test baseline with coverage of critical paths

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f93b72c..HEAD -- package.json vite.config.ts src/lib/services/project.ts src/lib/services/aiService.ts`
> If any of those files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (but should be done before plans 005 and 006 which touch dependencies)
- **Category**: tests
- **Planned at**: commit `f93b72c`, 2026-06-17

## Why this matters

This codebase has **zero application tests** — no test files exist anywhere
under `src/`, and there is no test runner configured. The critical paths
(project save/load, auth flow, AI content generation, milestone calculations)
have no automated safety net. This plan installs Vitest with React Testing
Library and writes a small but meaningful characterization suite covering the
two most calculation-heavy service modules: `project.ts` (weighted completion,
duration math) and `aiService.ts` (milestone parsing/processing). These are the
modules most likely to regress silently as the codebase evolves.

This plan intentionally scopes to pure logic and service-layer functions only —
no component rendering, no Supabase mocking, no auth flow tests. Those layers
can be addressed in a follow-up once the baseline is green.

## Current state

Relevant files:
- `src/lib/services/project.ts` — contains `calculateWeightedCompletion` (lines 78–97) and `calculateProjectDuration` (lines 99–220). Pure-ish functions with no Supabase calls — good unit test candidates.
- `src/lib/services/aiService.ts` — contains `processMilestones` (line 192), `validateMilestoneQuality` (line 320), and `ensureMandatoryMilestones` (line 364). All three are standalone methods on the `aiService` object that can be called without a network connection.
- `package.json` — no `test` script; `"type": "module"`; uses `vite` for build.
- `vite.config.ts` — Vite config; needs a `test` section added.

Key excerpt from `src/lib/services/project.ts:78–97`:
```typescript
export const calculateWeightedCompletion = (milestones: Milestone[]) => {
  if (!milestones.length) return 0;
  const weightedSum = milestones.reduce((sum, m) => {
    const weight = m.weight || 3;
    return sum + m.completion * weight;
  }, 0);
  const totalPossibleWeighted = milestones.reduce(
    (sum, m) => sum + (m.weight || 3) * 100,
    0,
  );
  return Math.round((weightedSum / totalPossibleWeighted) * 100);
};
```

Key excerpt from `aiService.ts:364–395` (the `ensureMandatoryMilestones` method):
```typescript
ensureMandatoryMilestones(milestones: any[]) {
  const hasKickoff = milestones.some(
    (m) => m.milestone && m.milestone.toLowerCase().includes("kickoff"),
  );
  // ...adds "Project Kickoff" at start and "Project Closeout" at end if missing
```

The `Milestone` type from `src/lib/services/project.ts:8–11` is:
```typescript
export type Milestone = Database["public"]["Tables"]["milestones"]["Row"] & {
  weight?: number;
};
```
The `Database` type comes from `src/types/supabase.ts` — a large generated
file. For tests, create a minimal inline type alias rather than importing the
full generated types.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install deps | `npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom` | exits 0 |
| Run tests | `npm test` | all tests pass |
| Typecheck | `npx tsc --noEmit` | exits 0 |
| Lint | `npm run lint` | exits 0 |

## Scope

**In scope** (the only files you should create or modify):
- `vite.config.ts` — add `test` configuration block
- `package.json` — add `"test"` and `"test:coverage"` scripts
- `src/lib/services/project.test.ts` — create (new file)
- `src/lib/services/aiService.test.ts` — create (new file)
- `src/test-setup.ts` — create (global test setup for jest-dom matchers)

**Out of scope** (do NOT touch):
- `src/lib/services/project.ts` — being tested, not changed
- `src/lib/services/aiService.ts` — being tested, not changed
- Any component files — component tests are deferred
- Any Supabase configuration

## Git workflow

- Branch: `advisor/003-vitest-baseline`
- Commit message style: `Add Vitest baseline with service-layer tests`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Install test dependencies

```
npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom
```

Expected: exits 0. `package.json` devDependencies now includes `vitest`.

### Step 2: Add test config to `vite.config.ts`

Open `vite.config.ts`. Add a `test` block to the `defineConfig` call. The file
currently looks like:
```typescript
export default defineConfig({
  plugins: [...],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { allowedHosts: true },
});
```

Add the `test` section:
```typescript
export default defineConfig({
  plugins: [...],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { allowedHosts: true },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/services/**"],
    },
  },
});
```

**Verify**: `npx tsc --noEmit` — exits 0 (the `test` key is accepted by Vite's
types when `vitest` is installed).

### Step 3: Create the global test setup file

Create `src/test-setup.ts`:
```typescript
import "@testing-library/jest-dom";
```

### Step 4: Add npm test scripts to `package.json`

In `package.json`, add to the `"scripts"` object:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

**Verify**: `npm test -- --reporter=verbose 2>&1 | head -5`
Expected: Vitest starts and reports "No test files found" (tests don't exist yet).

### Step 5: Write tests for `project.ts`

Create `src/lib/services/project.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculateWeightedCompletion, calculateProjectDuration } from "./project";

// Minimal milestone shape for tests — avoids importing the full generated DB types
type TestMilestone = {
  date: string;
  end_date?: string | null;
  completion: number;
  weight?: number;
};

describe("calculateWeightedCompletion", () => {
  it("returns 0 for empty milestone list", () => {
    expect(calculateWeightedCompletion([])).toBe(0);
  });

  it("returns 100 when all milestones are 100% complete", () => {
    const milestones = [
      { completion: 100, weight: 3 },
      { completion: 100, weight: 3 },
    ] as TestMilestone[];
    expect(calculateWeightedCompletion(milestones as any)).toBe(100);
  });

  it("returns 0 when no milestones are complete", () => {
    const milestones = [
      { completion: 0, weight: 3 },
      { completion: 0, weight: 5 },
    ] as TestMilestone[];
    expect(calculateWeightedCompletion(milestones as any)).toBe(0);
  });

  it("applies weight correctly — higher-weight milestone has more influence", () => {
    const milestones = [
      { completion: 100, weight: 1 }, // 100 * 1 = 100
      { completion: 0,   weight: 3 }, // 0   * 3 = 0
    ] as TestMilestone[];
    // weighted: 100/400 = 25%
    expect(calculateWeightedCompletion(milestones as any)).toBe(25);
  });

  it("uses default weight of 3 when weight is not set", () => {
    const milestones = [
      { completion: 50 }, // weight defaults to 3 → 50*3=150 / (3*100)=300 = 50%
    ] as TestMilestone[];
    expect(calculateWeightedCompletion(milestones as any)).toBe(50);
  });
});

describe("calculateProjectDuration", () => {
  it("returns all-null for empty milestone list", () => {
    const result = calculateProjectDuration([]);
    expect(result.startDate).toBeNull();
    expect(result.endDate).toBeNull();
    expect(result.totalDays).toBeNull();
  });

  it("calculates correct total days between start and end milestone", () => {
    const milestones = [
      { date: "2025-01-01", end_date: "2025-01-01", completion: 0 },
      { date: "2025-01-11", end_date: "2025-01-11", completion: 0 },
    ] as TestMilestone[];
    const result = calculateProjectDuration(milestones as any);
    expect(result.totalDays).toBe(10);
  });

  it("uses end_date for span calculation when available", () => {
    const milestones = [
      { date: "2025-01-01", end_date: "2025-02-01", completion: 0 },
    ] as TestMilestone[];
    const result = calculateProjectDuration(milestones as any);
    // startDate should be the date, endDate should be end_date
    expect(result.startDate).toBeDefined();
    expect(result.endDate).toBeDefined();
  });
});
```

**Verify**: `npm test -- project.test` → all tests pass.

### Step 6: Write tests for `aiService.ts`

Create `src/lib/services/aiService.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { aiService } from "./aiService";

describe("aiService.ensureMandatoryMilestones", () => {
  it("adds Project Kickoff at start when missing", () => {
    const milestones = [{ milestone: "Design Phase", owner: "Designer", completion: 0, status: "green" }];
    const result = aiService.ensureMandatoryMilestones(milestones);
    expect(result[0].milestone).toBe("Project Kickoff");
  });

  it("adds Project Closeout at end when missing", () => {
    const milestones = [{ milestone: "Design Phase", owner: "Designer", completion: 0, status: "green" }];
    const result = aiService.ensureMandatoryMilestones(milestones);
    expect(result[result.length - 1].milestone).toBe("Project Closeout");
  });

  it("does not duplicate Kickoff when already present", () => {
    const milestones = [
      { milestone: "Project Kickoff", owner: "PM", completion: 0, status: "green" },
      { milestone: "Design Phase", owner: "Designer", completion: 0, status: "green" },
      { milestone: "Project Closeout", owner: "PM", completion: 0, status: "green" },
    ];
    const result = aiService.ensureMandatoryMilestones(milestones);
    const kickoffs = result.filter(m => m.milestone.toLowerCase().includes("kickoff"));
    expect(kickoffs).toHaveLength(1);
  });

  it("moves existing Kickoff to first position", () => {
    const milestones = [
      { milestone: "Design Phase", owner: "Designer", completion: 0, status: "green" },
      { milestone: "Project Kickoff", owner: "PM", completion: 0, status: "green" },
    ];
    const result = aiService.ensureMandatoryMilestones(milestones);
    expect(result[0].milestone).toBe("Project Kickoff");
  });
});

describe("aiService.validateMilestoneQuality", () => {
  it("returns isValid:true for well-formed milestones", () => {
    const milestones = [
      { milestone: "Project Kickoff", owner: "Project Manager", completion: 0, status: "green" },
    ];
    const result = aiService.validateMilestoneQuality(milestones);
    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("flags milestone with name shorter than 5 characters", () => {
    const milestones = [{ milestone: "Hi", owner: "PM", completion: 0, status: "green" }];
    const result = aiService.validateMilestoneQuality(milestones);
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("flags milestone with missing owner", () => {
    const milestones = [{ milestone: "Design Phase Complete", owner: "", completion: 0, status: "green" }];
    const result = aiService.validateMilestoneQuality(milestones);
    expect(result.isValid).toBe(false);
  });
});
```

**Verify**: `npm test -- aiService.test` → all tests pass.

### Step 7: Run the full suite

```
npm test
```

Expected: all tests pass, no failures.

```
npx tsc --noEmit
```

Expected: exits 0.

## Test plan

The tests in Steps 5 and 6 are the test plan. They cover:
- `calculateWeightedCompletion`: empty list, all-complete, none-complete, weight influence, default weight
- `calculateProjectDuration`: empty list, basic duration, end_date usage
- `ensureMandatoryMilestones`: adds missing kickoff/closeout, doesn't duplicate, moves misplaced kickoff
- `validateMilestoneQuality`: valid input, short name, missing owner

Future additions to consider (not in this plan):
- Component tests for `AuthCallback.tsx` and `AuthForm.tsx`
- Integration tests for the Supabase service calls (requires mocking `supabase` client)

## Done criteria

- [ ] `npm test` exits 0 with at least 12 passing tests
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0
- [ ] Files `src/lib/services/project.test.ts` and `src/lib/services/aiService.test.ts` exist
- [ ] `vitest` appears in `package.json` devDependencies
- [ ] `package.json` has a `"test"` script that runs `vitest run`
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

Stop and report back if:
- `npx tsc --noEmit` fails with errors that are not caused by files you created.
- `calculateWeightedCompletion` or `calculateProjectDuration` are not exported from `project.ts` (the function signatures may have changed).
- Importing `aiService` causes an error due to Supabase client initialization at module load time (the `supabase` import in `aiService.ts` line 24 might call `createClient` which could fail in a test environment). If this happens, STOP — the fix requires mocking the Supabase client, which is out of scope for this plan.

## Maintenance notes

- When adding new service functions to `project.ts` or `aiService.ts`, add
  corresponding tests in the `.test.ts` files created here.
- If Supabase client mocking is needed in the future, use `vi.mock('../supabase')` at the top of the test file.
- The `test:coverage` script will show which lines in `src/lib/services/` are untested.
