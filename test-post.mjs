import fetch from 'node-fetch';

async function testPost() {
    const url = 'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io/functions/v1/server';
    console.log(`Testing POST to ${url}`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
        });
        console.log('Status:', res.status);
        const body = await res.text();
        console.log('Body:', body);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testPost();
