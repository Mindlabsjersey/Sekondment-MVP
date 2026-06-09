// Applies supabase/migrations/*.sql in order against SUPABASE_DB_URL.
// Each file runs as its own statement batch (auto-committed before the next),
// which respects Postgres' rule that a newly added enum value can't be used
// in the same transaction it was added.
//
// Usage: node scripts/apply-migrations.mjs
// Requires SUPABASE_DB_URL in the environment (loaded from .env.local below).

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Minimal .env.local loader (no extra deps).
function loadEnv() {
  try {
    const raw = readFileSync(join(root, '.env.local'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* ignore */ }
}
loadEnv();

const conn = process.env.SUPABASE_DB_URL;
if (!conn) {
  console.error('ERROR: SUPABASE_DB_URL is not set in .env.local');
  process.exit(1);
}

const migrationsDir = join(root, 'supabase', 'migrations');
// Optional CLI args: filename prefixes to apply ONLY those migrations, e.g.
//   node scripts/apply-migrations.mjs 0030 0031 0032
// No args = apply all (original behaviour, for a fresh database).
const only = process.argv.slice(2);
let files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
if (only.length) files = files.filter((f) => only.some((p) => f.startsWith(p)));

const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  console.log(`Connected. Applying ${files.length} migrations...\n`);
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    process.stdout.write(`-> ${file} ... `);
    try {
      await client.query(sql);
      console.log('OK');
    } catch (err) {
      console.log('FAILED');
      console.error(`\nMigration ${file} failed:\n${err.message}\n`);
      await client.end();
      process.exit(1);
    }
  }
  await client.end();
  console.log('\nAll migrations applied successfully.');
})();
