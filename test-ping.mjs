import fetch from 'node-fetch';

async function testPing() {
    const url = 'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io/functions/v1/ping';
    console.log(`Testing Ping: ${url}`);
    try {
        const res = await fetch(url);
        console.log('Status:', res.status);
        const body = await res.text();
        console.log('Body:', body);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testPing();
