import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io';
const SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjI0NDQ4MCwiZXhwIjo0OTIxOTE4MDgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.KSt0HOSb6rDYohhzFNs7Z5DU3-bnzAJ5I0G3aVkEeSc';

// const functions = ['server', 'proposal-copilot', 'search-funding'];
const functions = ['server']; // DEBUG: Target real server

async function deployFunction(name) {
    console.log(`Deploying function: ${name}...`);
    const functionDir = join(process.cwd(), 'supabase', 'functions', name);
    const indexPath = join(functionDir, 'index.ts');

    try {
        const content = readFileSync(indexPath, 'utf8');
        console.log('Sending Code Preview:', content.substring(0, 50));

        // Try Admin API path
        const response = await fetch(`${SUPABASE_URL}/admin/functions/v1/${name}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/typescript',
                'x-upsert': 'true'
            },
            body: content
        });

        const responseText = await response.text();
        console.log(`Response for ${name}: ${response.status} ${response.statusText}`);
        console.log(`Body: ${responseText}`);
    } catch (error) {
        console.error(`❌ Failed to deploy ${name}:`, error.message);
    }
}


for (const f of functions) {
    await deployFunction(f);
}
