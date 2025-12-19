import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { proposalId, message, history } = await req.json();

        if (!proposalId || !message) {
            throw new Error('Missing proposalId or message');
        }

        // 1. Initialize Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Fetch Full Proposal Context
        const { data: proposal, error: proposalError } = await supabase
            .from('proposals')
            .select(`
        *,
        funding_scheme:funding_schemes(*),
        partners:proposal_partners(*)
      `)
            .eq('id', proposalId)
            .single();

        if (proposalError || !proposal) {
            throw new Error('Proposal not found');
        }

        // 3. Build Context String
        const context = buildProposalContext(proposal);

        // 4. Initialize Gemini
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        // 5. Construct Chat History
        // We start with a strong system instruction
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{
                        text: `SYSTEM INSTRUCTION: You are an expert EU Funding Consultant and Proposal Copilot. 
Your goal is to help the user refine, edit, and improve their funding proposal.
You have access to the full proposal content and the funding scheme rules.

CURRENT PROPOSAL CONTEXT:
${JSON.stringify(context, null, 2)}

RULES:
1. Be concise and professional.
2. If the user asks to change something, confirm you understand the context first.
3. For now, you are in "ReadOnly" mode. You can suggest changes but cannot execute them yet.
4. Always refer to specific sections or partners by name.
` }],
                },
                {
                    role: "model",
                    parts: [{ text: "Understood. I am ready to assist with the proposal. I have analyzed the current context, including the budget, partners, and narrative sections. How can I help you improve this proposal today?" }],
                },
                // ... append previous chat history if needed
                ...(history || []).map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }))
            ],
        });

        // 6. Send Message
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return new Response(
            JSON.stringify({
                response: text,
                // In Phase 2, we will return 'actions' here
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

// Helper to sanitize and structure context
function buildProposalContext(proposal: any) {
    return {
        title: proposal.title,
        funding_scheme: proposal.funding_scheme?.name || 'Unknown',
        budget_total: proposal.budget?.reduce((sum: number, item: any) => sum + (item.cost || 0), 0) || 0,
        currency: proposal.settings?.currency || 'EUR',
        sections: {
            summary: proposal.summary,
            objectives: proposal.objectives,
            impact: proposal.impact,
            work_plan: proposal.workPlan,
            // Add dynamic sections if they exist
            ...proposal.dynamic_sections
        },
        partners: proposal.partners?.map((p: any) => ({
            name: p.name,
            role: p.role,
            country: p.country
        })) || [],
        constraints: proposal.settings?.customParams || []
    };
}
