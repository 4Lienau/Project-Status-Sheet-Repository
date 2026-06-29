/**
 * Generates Supabase TypeScript types from the live schema.
 * Reads SUPABASE_PROJECT_ID from .env — works cross-platform
 * without needing the env var pre-set in the shell.
 *
 * Usage: node scripts/gen-supabase-types.js
 * Or via npm: npm run types:supabase
 */

import dotenv from 'dotenv';
import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

dotenv.config({ path: join(root, '.env') });

const projectId = process.env.SUPABASE_PROJECT_ID;

if (!projectId) {
  console.error('Error: SUPABASE_PROJECT_ID is not set in your .env file.');
  console.error('Add it like: SUPABASE_PROJECT_ID=abcdefghijklmnopqrst');
  console.error('Find it at: Supabase Dashboard → Project Settings → General → Reference ID');
  process.exit(1);
}

// Validate format: Supabase project refs are 20 lowercase alphanumeric characters
if (!/^[a-z0-9]{20}$/.test(projectId)) {
  console.error(`Error: SUPABASE_PROJECT_ID "${projectId}" does not look like a valid project ref.`);
  console.error('Expected 20 lowercase alphanumeric characters (e.g. abcdefghijklmnopqrst).');
  process.exit(1);
}

console.log(`Generating types for project: ${projectId.substring(0, 8)}...`);

// Pass as a single command string with shell: true — required on Windows because npx
// is a .cmd file. Passing a string (not an array) avoids Node's DEP0190 warning.
// projectId is pre-validated to [a-z0-9]{20} so there is no injection risk.
const cmd = `npx supabase gen types typescript --project-id ${projectId}`;
const result = spawnSync(cmd, { cwd: root, stdio: ['inherit', 'pipe', 'pipe'], shell: true });

// Show any stderr output so errors are visible
if (result.stderr?.length) {
  process.stderr.write(result.stderr);
}

if (result.error) {
  console.error('Spawn error:', result.error.message);
  process.exit(1);
}

const rawOutput = result.stdout?.toString() ?? '';

// The CLI may append a telemetry error line (PostHog shutdown timeout) to stdout
// AFTER the generated types. The generated module always ends with `} as const`,
// so truncate anything past it to keep the emitted .ts file valid.
const marker = '} as const';
const markerIdx = rawOutput.lastIndexOf(marker);
const output = markerIdx === -1 ? rawOutput : rawOutput.slice(0, markerIdx + marker.length) + '\n';

// Trust the OUTPUT, not the exit code. The Supabase CLI sometimes exits non-zero
// purely because its telemetry (PostHog) flush times out on shutdown — AFTER the
// types have already been printed to stdout. Only treat the run as failed when the
// output isn't valid TypeScript (a real auth/network error produces no types).
const looksLikeTypes =
  !!output.trim() && !output.trim().startsWith('{') && output.includes('export type Database');

if (!looksLikeTypes) {
  console.error(`Type generation failed (exit code ${result.status}).`);
  if (output.length) {
    console.error('stdout:', output.substring(0, 500));
  }
  process.exit(result.status || 1);
}

if (result.status !== 0) {
  console.warn(
    `Note: supabase CLI exited ${result.status} (likely a telemetry-flush timeout), ` +
      `but valid types were generated — writing them anyway.`,
  );
}

writeFileSync(join(root, 'src', 'types', 'supabase.ts'), output);
console.log('Done. src/types/supabase.ts updated.');
