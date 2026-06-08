import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(join(root, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });

(async () => {
  await client.connect();
  const tables = await client.query(`select count(*)::int n from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`);
  const rls = await client.query(`select count(*)::int n from pg_tables where schemaname='public' and rowsecurity=true`);
  const idx = await client.query(`select 1 from pg_indexes where indexname='ux_ledger_stripe_object_entry'`);
  const key = await client.query(`select table_name from information_schema.tables where table_schema='public' and table_name in ('accounts','expert_profiles','business_profiles','engagements','milestones','ledger_entries','messages','disputes','reviews','employer_partners') order by table_name`);
  console.log('public tables:', tables.rows[0].n);
  console.log('tables with RLS enabled:', rls.rows[0].n);
  console.log('0028 idempotency index present:', idx.rowCount === 1);
  console.log('core tables found:', key.rows.map(r => r.table_name).join(', '));
  await client.end();
})();
