import fetch from 'node-fetch';

const BASE_URL = 'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io/functions/v1/server';
const PING_URL = 'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io/functions/v1/ping';

// Mock keys not needed for public/anon access if RLS allows, but functions usually need anon key at least.
// The headers in the function check for nothing specific, but the gateway might.
// Assuming the user's setup allows pass-through or has an anon key embedded in the request logic of the frontend.
// For now, I'll try without keys first, then with the one I found if needed.

async function check(name, url, method = 'GET', body = null) {
    console.log(`\nTesting ${name} [${method} ${url}]...`);
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        console.log(`Status: ${res.status} ${res.statusText}`);

        const text = await res.text();
        try {
            const json = JSON.parse(text);
            console.log('Response (JSON):', JSON.stringify(json, null, 2).substring(0, 500) + (text.length > 500 ? '...' : ''));
        } catch (e) {
            console.log('Response (Text):', text.substring(0, 500));
        }
        return res.status;
    } catch (e) {
        console.error('FAILED:', e.message);
        return 0;
    }
}

async function run() {
    await check('Ping Function', PING_URL);
    await check('Server Health', BASE_URL);
    await check('Server Proposals', `${BASE_URL}/proposals`);
}

run();
