Deno.serve(async (req) => {
    return new Response(JSON.stringify({ message: "DEPLOY_TEST_" + Date.now() }), {
        headers: { "Content-Type": "application/json" }
    });
});
