const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
    return new Response(JSON.stringify({ message: "HELLO WORLD - NO IMPORTS" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
});
