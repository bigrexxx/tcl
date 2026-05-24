#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=').trim().replace(/^"|"$/g, '');
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

(async () => {
  try {
    loadDotEnv();
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
      process.exitCode = 2;
      return;
    }
    const supabase = createClient(url, key);
    // try a simple select on site_team or fallback if the table does not exist
    const { data, error } = await supabase.from('site_team').select('id').limit(1);
    if (error) {
      const message = error.message || String(error);
      if (message.toLowerCase().includes('could not find the table') || message.toLowerCase().includes('relation "site_team" does not exist')) {
        console.log('Supabase reachable, but the `site_team` table is not present yet. Run migrations to create it.');
        process.exitCode = 0;
        return;
      }
      console.error('Supabase query error:', message);
      process.exitCode = 3;
      return;
    }
    console.log('Supabase reachable. site_team rows:', data && data.length ? data.length : 0);
  } catch (err) {
    console.error('Unexpected error:', err.message || err);
    process.exitCode = 4;
  }
})();
