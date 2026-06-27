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

if (result.status !== 0) {
  console.error(`Command failed with exit code ${result.status}`);
  if (result.stdout?.length) {
    console.error('stdout:', result.stdout.toString().substring(0, 500));
  }
  process.exit(result.status ?? 1);
}

const output = result.stdout?.toString() ?? '';
if (!output.trim() || output.trim().startsWith('{')) {
  console.error('Unexpected output — expected TypeScript types, got:');
  console.error(output.substring(0, 500));
  process.exit(1);
}

writeFileSync(join(root, 'src', 'types', 'supabase.ts'), output);
console.log('Done. src/types/supabase.ts updated.');
