Deno.serve(async (req) => {
    return new Response(JSON.stringify({ message: "Hello from Reset Server" }), {
        headers: { "Content-Type": "application/json" }
    });
});
