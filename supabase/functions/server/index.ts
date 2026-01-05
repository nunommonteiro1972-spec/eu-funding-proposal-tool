// Main server with full AI proposal generation
// Uses Deno.serve pattern (proven to work with Supabase Edge Functions)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'npm:@google/generative-ai';
import { GoogleAIFileManager } from 'npm:@google/generative-ai/server';
import { Buffer } from 'node:buffer';
import * as KV from './kv_store.ts';
import * as PromptBuilder from './prompt_builder.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const getSupabaseClient = () => {
    // Current code expects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
    // User has set SERVICE_URL_SUPABASEKONG and SERVICE_SUPABASESERVICE_KEY
    const url = Deno.env.get('SUPABASE_URL') || Deno.env.get('SERVICE_URL_SUPABASEKONG');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_SUPABASESERVICE_KEY');

    if (!url || !key) {
        console.error('MISSING ENV VARS:', {
            url: !!url,
            key: !!key,
            available: Object.keys(Deno.env.toObject()).filter(k => k.includes('SUPABASE') || k.includes('SERVICE'))
        });
        // In self-hosted, we might need to fallback to localhost/internal if not set
        // but it's better to require them.
    }

    return createClient(url || '', key || '');
};

const getAI = () => {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    return new GoogleGenerativeAI(apiKey);
};

const getFileManager = () => {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    return new GoogleAIFileManager(apiKey);
};

const ensureBucket = async (bucketName: string) => {
    const supabase = getSupabaseClient();

    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (!bucketExists) {
        console.log(`Creating bucket: ${bucketName}`);
        const { error } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
        });

        if (error) {
            console.error(`Failed to create bucket ${bucketName}:`, error);
        }
    }
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const path = url.pathname;

    try {
        // ===== HEALTH CHECK =====
        if (path === '/' || path === '' || path.endsWith('/server') || path.endsWith('/server/')) {
            const hasUrl = !!(Deno.env.get('SUPABASE_URL') || Deno.env.get('SERVICE_URL_SUPABASEKONG'));
            const hasKey = !!(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_SUPABASESERVICE_KEY'));
            const hasGemini = !!Deno.env.get('GEMINI_API_KEY');
            return new Response(
                JSON.stringify({
                    status: 'ok',
                    message: 'AI Proposal Generator API v2',
                    env: {
                        SUPABASE_URL: hasUrl,
                        SUPABASE_SERVICE_ROLE_KEY: hasKey,
                        GEMINI_API_KEY: hasGemini
                    }
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ===== PHASE 1: ANALYZE URL & GENERATE IDEAS =====
        if (path.includes('/analyze-url') && req.method === 'POST') {
            const { url: targetUrl, userPrompt } = await req.json();

            const isTextMode = targetUrl === 'https://text-mode-placeholder.com';
            let content = '';

            if (!isTextMode) {
                // Fetch URL content for URL mode
                try {
                    const res = await fetch(targetUrl);
                    if (res.ok) {
                        content = await res.text();
                        content = content.substring(0, 20000); // Limit to 20k chars
                    }
                } catch (e) {
                    console.log('Fetch failed, falling back to prompt only');
                }
            }

            const ai = getAI();

            // Phase 1: Extract summary and constraints
            const phase1Prompt = isTextMode
                ? `Analyze this funding call text or project description.

TEXT CONTENT:
${userPrompt}

TASK: Extract key information.
CRITICAL: If a budget limit is mentioned (e.g. "budget 250k", "max 250,000"), extract ONLY the numeric value (e.g. "250000").

Extract:
1. A summary of the opportunity
2. Partner requirements
3. Numeric budget limit (MANDATORY: Use ONLY the number if found)
4. Project duration

Return JSON:
{
  "summary": "Summary of the opportunity",
  "constraints": {
    "partners": "e.g., 3-5 partners required",
    "budget": "250000",
    "duration": "e.g., 24-36 months"
  }
}

Return ONLY valid JSON.`
                : `Analyze this funding call and extract key information.
            
URL: ${targetUrl}
URL CONTENT: ${content.substring(0, 5000)}
${userPrompt ? `USER SPECIFIC REQUIREMENTS: ${userPrompt}` : ''}

TASK: Parse the funding call AND the user requirements.
CRITICAL: User requirements take precedence. If the user specifies a budget limit in their requirements, use that exactly.

Extract:
1. A summary of the funding opportunity
2. Partner requirements
3. Numeric budget limit (MANDATORY: Extract ONLY the number if possible, e.g. "250000")
4. Project duration

Return JSON:
{
  "summary": "Summary of the opportunity",
  "constraints": {
    "partners": "e.g., 3-5 partners required",
    "budget": "250000",
    "duration": "e.g., 24-36 months"
  }
}

Return ONLY valid JSON.`;


            const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
            const phase1Result = await model.generateContent(phase1Prompt);
            const phase1Text = phase1Result.response.text();
            const phase1Data = JSON.parse(phase1Text.replace(/```json/g, '').replace(/```/g, '').trim());

            // Phase 2: Generate ideas
            const phase2Prompt = PromptBuilder.buildPhase2Prompt(
                phase1Data.summary,
                phase1Data.constraints,
                userPrompt
            );

            const phase2Result = await model.generateContent(phase2Prompt);
            const phase2Text = phase2Result.response.text();
            const phase2Data = JSON.parse(phase2Text.replace(/```json/g, '').replace(/```/g, '').trim());

            return new Response(
                JSON.stringify({
                    summary: phase1Data.summary,
                    constraints: phase1Data.constraints,
                    ideas: phase2Data.ideas
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ===== PHASE 2: ANALYZE RELEVANCE =====
        if (path.includes('/analyze-relevance') && req.method === 'POST') {
            const { url: targetUrl, constraints, ideas, userPrompt } = await req.json();

            // Re-fetch URL content for validation
            let content = '';
            try {
                const res = await fetch(targetUrl);
                content = await res.text();
            } catch (e) {
                content = '';
            }

            const ai = getAI();
            const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

            const prompt = PromptBuilder.buildRelevancePrompt(
                targetUrl,
                content,
                constraints,
                ideas,
                userPrompt
            );

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const data = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

            return new Response(
                JSON.stringify(data),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ===== PHASE 3: GENERATE PROPOSAL =====
        if (path.includes('/generate-proposal') && req.method === 'POST') {
            const { idea, summary, constraints, selectedPartners = [], userPrompt, fundingSchemeId } = await req.json();

            // Load partner details if provided
            const partners = [];
            for (const partnerId of selectedPartners) {
                const partner = await KV.get(`partner:${partnerId}`);
                if (partner) partners.push(partner);
            }

            // Load funding scheme if selected
            let fundingScheme = null;
            if (fundingSchemeId) {
                const supabase = getSupabaseClient();
                const { data } = await supabase
                    .from('funding_schemes')
                    .select('*')
                    .eq('id', fundingSchemeId)
                    .single();
                fundingScheme = data;
            }

            const ai = getAI();
            const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

            const prompt = PromptBuilder.buildProposalPrompt(
                idea,
                summary,
                constraints,
                partners,
                userPrompt,
                fundingScheme
            );

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            let proposal = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

            // Add metadata
            proposal.id = `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            proposal.selectedIdea = idea;
            proposal.generatedAt = new Date().toISOString();
            proposal.savedAt = new Date().toISOString();
            proposal.updatedAt = new Date().toISOString();

            // Add funding scheme metadata
            if (fundingSchemeId) {
                proposal.funding_scheme_id = fundingSchemeId;
            }
            if (proposal.dynamicSections) {
                proposal.dynamic_sections = proposal.dynamicSections; // Normalize key
                delete proposal.dynamicSections;
            }

            // Initialize settings with constraints
            const customParams = [];
            if (constraints.budget) customParams.push({ key: 'Max Budget', value: constraints.budget });
            if (constraints.duration) customParams.push({ key: 'Duration', value: constraints.duration });
            if (constraints.partners) customParams.push({ key: 'Partner Requirements', value: constraints.partners });

            proposal.settings = {
                currency: 'EUR',
                sourceUrl: '',
                customParams: customParams
            };

            // Auto-save
            await KV.set(proposal.id, proposal);

            // Also save to Supabase "proposals" table for backup/persistence if needed
            // (Optional improvement for later, keeping KV consistency for now)

            return new Response(
                JSON.stringify(proposal),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ===== PROPOSAL CRUD =====

        // GET /proposals - List all
        if (path.includes('/proposals') && req.method === 'GET' && !path.match(/\/proposals\/[^\/]+$/)) {
            try {
                const proposals = await KV.getByPrefix('proposal-');
                console.log(`Fetched ${proposals.length} proposals`);
                return new Response(
                    JSON.stringify({
                        proposals: proposals.sort((a: any, b: any) =>
                            new Date(b.savedAt || b.generatedAt).getTime() - new Date(a.savedAt || a.generatedAt).getTime()
                        )
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            } catch (kvError: any) {
                console.error('KV getByPrefix error:', kvError);
                throw kvError;
            }
        }

        // GET /proposals/:id - Get single
        if (path.match(/\/proposals\/[^\/]+$/) && req.method === 'GET') {
            const id = path.split('/').pop();
            const proposal = await KV.get(id!);

            if (!proposal) {
                return new Response(
                    JSON.stringify({ error: 'Proposal not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify(proposal),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // POST /proposals - Create/save
        if (path.includes('/proposals') && req.method === 'POST' && !path.includes('/ai-edit')) {
            const body = await req.json();
            const id = body.id || `proposal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const proposal = {
                ...body,
                id,
                savedAt: body.savedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await KV.set(id, proposal);

            return new Response(
                JSON.stringify(proposal),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // PUT /proposals/:id - Update
        if (path.match(/\/proposals\/[^\/]+$/) && req.method === 'PUT') {
            const id = path.split('/').pop();
            const existing = await KV.get(id!);

            if (!existing) {
                return new Response(
                    JSON.stringify({ error: 'Proposal not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const updates = await req.json();
            const updated = {
                ...existing,
                ...updates,
                updatedAt: new Date().toISOString(),
            };

            await KV.set(id!, updated);

            return new Response(
                JSON.stringify(updated),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // DELETE /proposals/:id
        if (path.match(/\/proposals\/[^\/]+$/) && req.method === 'DELETE') {
            const id = path.split('/').pop();
            await KV.del(id!);

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ===== PARTNER CRUD =====

        // GET /partners - List all
        if (path.includes('/partners') && req.method === 'GET' && !path.match(/\/partners\/[^\/]+$/)) {
            const partners = await KV.getByPrefix('partner:');
            return new Response(
                JSON.stringify({
                    partners: partners.sort((a: any, b: any) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // GET /partners/:id - Get single
        if (path.match(/\/partners\/[^\/]+$/) && req.method === 'GET') {
            const id = path.split('/').pop();
            const partner = await KV.get(`partner:${id}`);

            if (!partner) {
                return new Response(
                    JSON.stringify({ error: 'Partner not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify(partner),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // POST /partners - Create
        if (path.includes('/partners') && req.method === 'POST' && !path.includes('/upload')) {
            const body = await req.json();
            const id = body.id || `partner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const partner = {
                ...body,
                id,
                createdAt: body.createdAt || new Date().toISOString(),
            };

            await KV.set(`partner:${id}`, partner);

            return new Response(
                JSON.stringify(partner),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // PUT /partners/:id - Update
        if (path.match(/\/partners\/[^\/]+$/) && req.method === 'PUT') {
            const id = path.split('/').pop();
            const existing = await KV.get(`partner:${id}`);

            if (!existing) {
                return new Response(
                    JSON.stringify({ error: 'Partner not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const updates = await req.json();
            const updated = {
                ...existing,
                ...updates,
                id: existing.id, // Preserve ID
                createdAt: existing.createdAt, // Preserve creation date
            };

            await KV.set(`partner:${id}`, updated);

            return new Response(
                JSON.stringify(updated),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // DELETE /partners/:id
        if (path.match(/\/partners\/[^\/]+$/) && req.method === 'DELETE') {
            const id = path.split('/').pop();
            await KV.del(`partner:${id}`);

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // POST /partners/:id/upload-logo
        if (path.match(/\/partners\/[^\/]+\/upload-logo$/) && req.method === 'POST') {
            const id = path.split('/')[2];
            const formData = await req.formData();
            const file = formData.get('file');

            if (!file) {
                return new Response(
                    JSON.stringify({ error: 'No file uploaded' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const supabase = getSupabaseClient();
            await ensureBucket('partner-assets');

            const fileName = `${id}/logo-${Date.now()}`;
            const { data, error } = await supabase.storage
                .from('partner-assets')
                .upload(fileName, file, {
                    contentType: (file as File).type,
                    upsert: true
                });

            if (error) {
                throw new Error(`Upload error: ${error.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('partner-assets')
                .getPublicUrl(fileName);

            // Update partner record
            const partner = await KV.get(`partner:${id}`);
            if (partner) {
                partner.logoUrl = publicUrl;
                await KV.set(`partner:${id}`, partner);
            }

            return new Response(
                JSON.stringify({ url: publicUrl }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // POST /partners/:id/upload-pdf
        if (path.match(/\/partners\/[^\/]+\/upload-pdf$/) && req.method === 'POST') {
            const id = path.split('/')[2];
            const formData = await req.formData();
            const file = formData.get('file');

            if (!file) {
                return new Response(
                    JSON.stringify({ error: 'No file uploaded' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const supabase = getSupabaseClient();
            await ensureBucket('partner-assets');

            const fileName = `${id}/pdf-${Date.now()}`;
            const { data, error } = await supabase.storage
                .from('partner-assets')
                .upload(fileName, file, {
                    contentType: (file as File).type,
                    upsert: true
                });

            if (error) {
                throw new Error(`Upload error: ${error.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('partner-assets')
                .getPublicUrl(fileName);

            // Update partner record
            const partner = await KV.get(`partner:${id}`);
            if (partner) {
                partner.pdfUrl = publicUrl;
                await KV.set(`partner:${id}`, partner);
            }

            return new Response(
                JSON.stringify({ url: publicUrl }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // POST /import-partner-pdf
        if (path.includes('/import-partner-pdf') && req.method === 'POST') {
            console.log('=== PDF IMPORT ENDPOINT HIT ===');

            try {
                const formData = await req.formData();
                const file = formData.get('file');

                if (!file || !(file instanceof File)) {
                    return new Response(
                        JSON.stringify({ error: 'No PDF file uploaded' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                console.log('Processing file:', file.name, file.size);

                // Write to temp file for upload
                const tempFilePath = `/tmp/${file.name}`;
                const arrayBuffer = await file.arrayBuffer();
                await Deno.writeFile(tempFilePath, new Uint8Array(arrayBuffer));

                console.log('Uploading to Gemini File API...');
                const fileManager = getFileManager();
                const uploadResponse = await fileManager.uploadFile(tempFilePath, {
                    mimeType: 'application/pdf',
                    displayName: file.name,
                });

                console.log(`Uploaded file ${uploadResponse.file.displayName} as: ${uploadResponse.file.uri}`);

                // AI Parsing
                const ai = getAI();
                // Reverting to 2.0-flash-exp as requested
                const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

                const prompt = `Extract partner organization information from the attached PDF file.

Return ONLY a valid JSON object:
{
  "name": "organization name",
  "organisationId": "OID/PIC number if available",
  "description": "brief summary",
  "keywords": ["keyword1", "keyword2"],
  "experience": "relevant experience",
  "country": "country",
  "organizationType": "SME, University, NGO, etc",
  "website": "URL or null",
  "contactEmail": "email or null"
}`;

                let result;
                try {
                    result = await model.generateContent([
                        prompt,
                        {
                            fileData: {
                                mimeType: uploadResponse.file.mimeType,
                                fileUri: uploadResponse.file.uri
                            }
                        }
                    ]);
                } catch (aiError: any) {
                    console.error('Gemini multimodal error:', aiError);
                    throw new Error(`AI processing failed: ${aiError.message}`);
                } finally {
                    // Cleanup temp file
                    try {
                        await Deno.remove(tempFilePath);
                    } catch (e) {
                        console.error('Failed to cleanup temp file:', e);
                    }
                }
                let responseText = result.response.text().trim();

                // Remove markdown if present
                if (responseText.startsWith('```')) {
                    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                }

                // Extract just the JSON object - find first { and matching }
                const start = responseText.indexOf('{');
                if (start === -1) {
                    throw new Error('No JSON object found in response');
                }

                // Find the matching closing brace
                let braceCount = 0;
                let end = start;
                for (let i = start; i < responseText.length; i++) {
                    if (responseText[i] === '{') braceCount++;
                    if (responseText[i] === '}') braceCount--;
                    if (braceCount === 0) {
                        end = i;
                        break;
                    }
                }

                const jsonText = responseText.substring(start, end + 1);
                console.log('Extracted JSON length:', jsonText.length);

                const extractedData = JSON.parse(jsonText);
                console.log('Parsed partner:', extractedData.name);

                // Create Partner
                const id = `partner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const newPartner = { ...extractedData, id, createdAt: new Date().toISOString() };

                // Upload PDF
                const supabase = getSupabaseClient();
                await ensureBucket('partner-assets');

                const fileName = `${id}/profile-${Date.now()}.pdf`;
                const { error: uploadError } = await supabase.storage
                    .from('partner-assets')
                    .upload(fileName, file, { contentType: file.type, upsert: true });

                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('partner-assets')
                        .getPublicUrl(fileName);
                    newPartner.pdfUrl = publicUrl;
                }

                await KV.set(`partner:${id}`, newPartner);
                console.log('Partner created:', id);

                return new Response(
                    JSON.stringify({ partnerId: id, partner: newPartner }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            } catch (error: any) {
                console.error('Import error:', error);
                return new Response(
                    JSON.stringify({ error: error?.message || 'Import failed' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
        }

        // POST /proposals/:id/ai-edit - AI editing
        if (path.includes('/ai-edit') && req.method === 'POST') {
            const match = path.match(/\/proposals\/([^\/]+)\/ai-edit/);
            const id = match ? match[1] : null;
            if (!id) {
                return new Response(
                    JSON.stringify({ error: 'Invalid proposal ID in path' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            const { instruction } = await req.json();

            const proposal = await KV.get(id);
            if (!proposal) {
                return new Response(
                    JSON.stringify({ error: 'Proposal not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const ai = getAI();
            const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

            // Step 1: Determine which section to edit
            const baseSections = [
                'title', 'summary', 'relevance', 'methods', 'impact',
                'introduction', 'objectives', 'methodology', 'expectedResults',
                'innovation', 'sustainability', 'consortium', 'workPlan',
                'riskManagement', 'dissemination', 'budget'
            ];
            const dynamicSections = proposal.dynamic_sections ? Object.keys(proposal.dynamic_sections) : [];
            const allAvailableSections = [...new Set([...baseSections, ...dynamicSections])];

            const detectionPrompt = `Given this user instruction: "${instruction}"

Which ONE section of the proposal should be edited?

Available sections:
${allAvailableSections.map(s => `- ${s}`).join('\n')}

Return JSON: { "section": "sectionName" }

Return ONLY valid JSON, no other text.`;

            const detectResult = await model.generateContent(detectionPrompt);
            const detectText = detectResult.response.text();
            const { section } = JSON.parse(detectText.replace(/```json/g, '').replace(/```/g, '').trim());

            // Step 2: Regenerate that section
            const budgetLimit = proposal.settings?.constraints?.budget || proposal.settings?.customParams?.find((p: any) => p.key === 'Max Budget')?.value || 'Not specified';

            const currentContent = (proposal.dynamic_sections && proposal.dynamic_sections[section])
                ? proposal.dynamic_sections[section]
                : proposal[section];

            const editPrompt = `You are editing a specific section of a funding proposal.
            
PROPOSAL SUMMARY: ${proposal.summary}
MANDATORY CONSTRAINTS:
- Max Budget: ${budgetLimit}

SECTION TO EDIT: ${section}
CURRENT CONTENT: ${JSON.stringify(currentContent)}

USER INSTRUCTION: ${instruction}

TASK: Generate the NEW content for this section only. 
CRITICAL: 🚨 You MUST STRICTLY respect the mandatory constraints (especially the Max Budget) if the instruction relates to them. If you are editing the budget section, ensure the total sum remains within the limit.

Return JSON: { "content": ... }

Return ONLY valid JSON, no other text.`;

            const editResult = await model.generateContent(editPrompt);
            const editText = editResult.response.text();
            const { content } = JSON.parse(editText.replace(/```json/g, '').replace(/```/g, '').trim());

            // Update proposal
            if (proposal.dynamic_sections && proposal.dynamic_sections[section] !== undefined) {
                proposal.dynamic_sections[section] = content;
            } else {
                proposal[section] = content;
            }

            proposal.updatedAt = new Date().toISOString();
            await KV.set(id, proposal);

            return new Response(
                JSON.stringify({ proposal, editedSection: section }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }


        // POST /generate-section - Generate new proposal section with AI
        if (path.includes('/generate-section') && req.method === 'POST') {
            const { sectionTitle, proposalContext, existingSections } = await req.json();

            const ai = getAI();
            const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

            const prompt = `You are generating a new section for a research/project proposal.

SECTION TO CREATE: "${sectionTitle}"

PROPOSAL CONTEXT:
${proposalContext}

EXISTING SECTIONS:
${existingSections.join(', ')}

Generate comprehensive, professional content for the "${sectionTitle}" section.

Requirements:
- Write 3-5 well-structured paragraphs
- Use HTML formatting (<p>, <strong>, <ul>, <li> tags)
- Make it relevant to the proposal context
- Use professional, academic language
- Include specific details and examples where appropriate
- Ensure it complements existing sections without repeating content

Return JSON:
{
  "title": "${sectionTitle}",
  "content": "<p>HTML formatted content here...</p>"
}

Return ONLY valid JSON, no other text.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const data = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

            return new Response(
                JSON.stringify(data),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ===== SEED ENDPOINTS =====
        if (path.includes('/seed-sources-simple')) {
            return new Response(
                JSON.stringify({ message: 'Seeded' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (path.includes('/seed-partner-search-sources')) {
            return new Response(
                JSON.stringify({ message: 'Seeded' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Default 404
        return new Response(
            JSON.stringify({ error: 'Not found', path }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('Server error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, null, 2));

        // Special handling for API quota errors
        if (error.message && error.message.includes('429')) {
            return new Response(
                JSON.stringify({ error: '⏰ API Quota Limit Reached. Please try again later or use your own API key.' }),
                { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error', details: error.toString() }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});