import fetch from 'node-fetch';

async function test(name) {
    const url = `http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io/functions/v1/${name}`;
    console.log(`Testing ${name}: ${url}`);
    try {
        const res = await fetch(url);
        console.log('Status:', res.status);
        const body = await res.text();
        console.log('Body:', body);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

const names = ['test-hello', 'hello', 'ping', 'server'];
for (const name of names) {
    await test(name);
}
