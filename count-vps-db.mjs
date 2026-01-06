import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split('\n');
const config = {};
lines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        config[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const vpsClient = createClient(
    'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io',
    config.VITE_SUPABASE_ANON_KEY
);

async function check() {
    const { count, error } = await vpsClient
        .from('kv_store_3cb71dae')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('VPS DB Error:', error.message);
    } else {
        console.log('VPS DB Rows:', count);
    }
}

check();
