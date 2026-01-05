// Minimal test function
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    return new Response(
        JSON.stringify({
            status: "ok",
            message: "MINIMAL DEPRECATED SERVER RUNNING",
            path: new URL(req.url).pathname
        }),
        {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
    );
});