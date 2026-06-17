# Plan 005: Resolve high-severity npm vulnerabilities

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f93b72c..HEAD -- package.json package-lock.json`
> If `package.json` changed since this plan was written, re-run `npm audit`
> to confirm the current vulnerability set before proceeding.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: MED (dependency upgrades may introduce breaking changes)
- **Depends on**: 003 (having tests makes it safer to verify nothing regressed)
- **Category**: security
- **Planned at**: commit `f93b72c`, 2026-06-17

## Why this matters

`npm audit` reports 8 high-severity vulnerabilities in the dependency tree.
The high-severity ones are:

| Package | CVE / Advisory | Notes |
|---------|---------------|-------|
| `vite` | Path traversal in dev-server `.map` handling; NTLMv2 hash disclosure via `launch-editor` | Affects dev server — not production build output |
| `ws` | Uninitialized memory disclosure; memory exhaustion DoS from tiny fragments | Used by Vite dev server WebSocket |
| `lodash` / `lodash-es` | Code injection via `_.template`; prototype pollution | Already overridden in `package.json` to `^4.17.23` — may be inherited transient |
| `tar` | Hardlink / symlink path traversal | Build-time tool, not runtime |
| `tmp` | Path traversal via unsanitized prefix/postfix | Build-time tool |
| `form-data` | CRLF injection in multipart field names | Used by HTTP client in dep tree |
| `picomatch` | Method injection in POSIX character classes | Used by glob matchers |

Most of these are in build/dev tooling, not runtime production code. However
the `vite` and `ws` vulnerabilities affect the dev server, and `form-data`
could be reachable via the OpenAI SDK at runtime.

## Current state

Relevant file:
- `package.json` — has an `"overrides"` section (lines 104–115) already patching some transient deps:
  ```json
  "overrides": {
    "glob": "^10.5.0",
    "@remix-run/router": "^1.23.2",
    "minimatch": "^10.2.4",
    "qs": "^6.15.0",
    "tar": "^7.5.9",
    "rollup": "^4.59.0",
    "lodash": "^4.17.23",
    "lodash-es": "^4.17.23",
    "markdown-it": "^14.1.1",
    "tmp": "^0.2.5"
  }
  ```
  Note: `tar` and `tmp` are already overridden — their audit findings may be
  from packages that pin a specific older version. `vite`, `ws`, `form-data`,
  and `picomatch` are NOT in the overrides.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Audit | `npm audit --audit-level=high 2>&1 \| tail -5` | Shows current high count |
| Safe auto-fix | `npm audit fix` | Fixes non-breaking upgrades |
| Typecheck | `npx tsc --noEmit` | exits 0 |
| Build | `npm run build 2>&1 \| tail -5` | builds successfully |
| Tests (if plan 003 done) | `npm test` | all pass |

## Scope

**In scope**:
- `package.json` — version bumps and/or new overrides
- `package-lock.json` — updated automatically by npm

**Out of scope** (do NOT touch):
- Any `src/` file
- `vite.config.ts` (unless a Vite major-version upgrade requires config changes — see STOP conditions)
- `supabase/` or `netlify/` directories

## Git workflow

- Branch: `advisor/005-npm-audit-fix`
- Commit: `Fix: Resolve high-severity npm audit vulnerabilities`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Run the safe auto-fix first

```
npm audit fix
```

This upgrades packages within semver-compatible ranges. It will not make
breaking changes. Expected output: "X vulnerabilities removed" or similar.

**Verify**:
```
npm audit --audit-level=high 2>&1 | tail -5
```
Note the new high-severity count. If it reaches 0, skip to Step 4.

### Step 2: Add overrides for remaining high-severity packages

For any high-severity packages that `npm audit fix` could not resolve (typically
because fixing requires a major version bump that a parent dependency hasn't
updated to), add entries to the `"overrides"` section in `package.json`.

Run `npm audit --json 2>/dev/null | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const j=JSON.parse(d); Object.entries(j.vulnerabilities).filter(([,v])=>v.severity==='high').forEach(([name])=>console.log(name))"` to list remaining high packages.

For each remaining high package, add the latest patched version to the
`"overrides"` section. For example, if `picomatch` is still vulnerable:
```json
"overrides": {
  ...existing entries...,
  "picomatch": "^4.0.2"
}
```

After editing `package.json`, run:
```
npm install
```
Expected: exits 0 and regenerates `package-lock.json`.

**Verify**:
```
npm audit --audit-level=high 2>&1 | tail -5
```
Expected: 0 high-severity vulnerabilities, or a documented justification for
any that remain (e.g. locked by a pinned parent version you cannot control).

### Step 3: Handle `vite` if it needs a major upgrade

If `vite` itself (not a transient dep) is listed as high-severity after Steps
1–2, check its current version:
```
npm list vite --depth=0
```

`package.json` currently has `"vite": "^5.4.21"`. If the fix requires Vite 6+,
this is a major version bump — STOP and report back (see STOP conditions).
If the fix is within `^5.x`, proceed:
```
npm install vite@latest
```
Then re-run typecheck and build.

### Step 4: Verify nothing regressed

```
npx tsc --noEmit
```
Expected: exits 0. If there are new type errors from upgraded packages, note
them — do not attempt to fix type errors in `src/` files (that is out of scope).
Report them as a STOP condition.

```
npm run build 2>&1 | tail -10
```
Expected: build completes successfully.

```
npm test
```
Expected: all tests pass (requires plan 003 to be done; skip this check if
plan 003 is not yet complete).

## Test plan

No new tests are needed. This plan only changes dependency versions. The
verification is the build succeeding and (if available) the existing test suite
passing unchanged.

## Done criteria

- [ ] `npm audit --audit-level=high` reports 0 high-severity vulnerabilities (or fewer than at the start, with remaining ones documented in this file under a "Residual" section)
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` completes without errors
- [ ] No `src/` files were modified (`git diff --name-only HEAD | grep "^src/"` returns nothing)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- `npm audit fix` causes `npm run build` to fail — revert (`git checkout package.json package-lock.json`) and report which package caused the failure.
- Fixing `vite` requires a major version upgrade (v6+) — the config changes required are out of scope for this plan; report back.
- `npx tsc --noEmit` produces new type errors after the upgrades — do not fix them in `src/`; report the errors.
- A package upgrade breaks the `npm run build` output in a way that requires changing `vite.config.ts` — report back; config changes are out of scope.

## Maintenance notes

- Run `npm audit` after any future `npm install` or `npm update` to catch new vulnerabilities.
- The `"overrides"` section in `package.json` requires maintenance: when a parent
  dependency eventually updates to pull in the patched version itself, the
  override entry can be removed (it becomes redundant but harmless).
- The `vite` and `ws` vulnerabilities primarily affect the dev server — they do
  not affect the production build served by Netlify. They are still worth fixing
  to protect developer machines.
