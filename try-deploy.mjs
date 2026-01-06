import { readFileSync } from 'fs';

const SUPABASE_URL = 'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io';
const SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjI0NDQ4MCwiZXhwIjo0OTIxOTE4MDgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.KSt0HOSb6rDYohhzFNs7Z5DU3-bnzAJ5I0G3aVkEeSc';

async function deployFunction(name, content) {
    console.log(`Deploying function: ${name}...`);
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/typescript',
                'x-upsert': 'true'
            },
            body: content
        });

        const responseText = await response.text();
        console.log(`Response: ${response.status} ${responseText}`);
    } catch (error) {
        console.error(`Error:`, error.message);
    }
}

const code = `Deno.serve((req) => new Response("DEPLOYED_PING_V1", { status: 200 }));`;
await deployFunction('ping', code);
