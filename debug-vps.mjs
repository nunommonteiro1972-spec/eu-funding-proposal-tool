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

const serverUrl = 'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io/functions/v1/server';
const anonKey = config.VITE_SUPABASE_ANON_KEY;

async function test() {
    console.log('--- Testing VPS Health Check ---');
    try {
        const response = await fetch(`${serverUrl}/`, {
            headers: {
                'Authorization': `Bearer ${anonKey}`,
            },
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Raw Body:', text);
        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Body is not JSON');
        }
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

test();
