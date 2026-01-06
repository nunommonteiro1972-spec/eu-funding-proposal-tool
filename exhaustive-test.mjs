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

async function test(path) {
    console.log(`--- Testing VPS ${path} ---`);
    try {
        const response = await fetch(`${serverUrl}${path}`, {
            headers: {
                'Authorization': `Bearer ${anonKey}`,
            },
        });

        console.log('Status:', response.status);
        console.log('Content-Type:', response.headers.get('content-type'));
        const text = await response.text();
        console.log('Body Preview:', text.substring(0, 500));
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

async function run() {
    await test('/');
    await test('/proposals');
}

run();
