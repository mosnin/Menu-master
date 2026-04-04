import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed script for the Real Estate Deal Desk database.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed.ts
 *
 * The script reads supabase/seed.sql and attempts to execute it via the
 * Supabase `rpc` interface.  If the helper RPC function is not available it
 * falls back to printing instructions for running the SQL manually.
 */
async function seed(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Error: Missing required environment variables.\n' +
        'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.',
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const seedPath = path.resolve(__dirname, '..', 'supabase', 'seed.sql');

  if (!fs.existsSync(seedPath)) {
    console.error(`Seed file not found at ${seedPath}`);
    process.exit(1);
  }

  const seedSql = fs.readFileSync(seedPath, 'utf-8');

  console.log(`Loaded seed SQL (${seedSql.length} bytes) from ${seedPath}`);

  // Attempt to execute via an RPC wrapper (if the DB has one installed).
  // CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$
  //   BEGIN EXECUTE query; END;
  // $$ LANGUAGE plpgsql SECURITY DEFINER;
  const { error } = await supabase.rpc('exec_sql', { query: seedSql });

  if (error) {
    if (error.message?.includes('function') || error.code === '42883') {
      console.warn(
        '\nThe exec_sql RPC function is not available in your Supabase project.',
      );
      console.log(
        'To seed the database, run the SQL file directly using one of these methods:\n',
      );
      console.log('  1. Supabase Dashboard  -> SQL Editor -> paste contents of supabase/seed.sql');
      console.log('  2. psql               -> psql $DATABASE_URL -f supabase/seed.sql');
      console.log('  3. Supabase CLI       -> supabase db reset  (applies migrations + seed)\n');
      console.log(
        'Alternatively, create the exec_sql helper function in your database:\n\n' +
          "  CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$\n" +
          "    BEGIN EXECUTE query; END;\n" +
          "  $$ LANGUAGE plpgsql SECURITY DEFINER;\n",
      );
    } else {
      console.error('Failed to execute seed SQL:', error.message);
    }
    process.exit(1);
  }

  console.log('Seed data inserted successfully.');
}

seed();
