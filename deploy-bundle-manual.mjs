import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'http://supabasekong-gwcc8c4o4kg4gwwc88s8c0o4.72.62.28.231.sslip.io';
const SERVICE_ROLE_KEY = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NjI0NDQ4MCwiZXhwIjo0OTIxOTE4MDgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.KSt0HOSb6rDYohhzFNs7Z5DU3-bnzAJ5I0G3aVkEeSc';

async function deployBundle() {
    console.log('Deploying BUNDLED server function...');
    const bundlePath = join(process.cwd(), 'supabase', 'functions', 'server', 'bundle.ts');

    try {
        const content = readFileSync(bundlePath, 'utf8');
        console.log(`Read bundle, size: ${content.length} bytes`);

        const response = await fetch(`${SUPABASE_URL}/functions/v1/server`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/typescript',
                'x-upsert': 'true'
            },
            body: content
        });

        const responseText = await response.text();
        console.log(`Response: ${response.status} ${response.statusText}`);
        console.log(`Body: ${responseText}`);
    } catch (error) {
        console.error('❌ Failed to deploy bundle:', error.message);
    }
}

deployBundle();
