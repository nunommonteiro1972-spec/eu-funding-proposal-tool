Deno.serve(async (req) => {
    return new Response(JSON.stringify({ message: "Hello from Brand New Function" }), {
        headers: { "Content-Type": "application/json" }
    });
});
