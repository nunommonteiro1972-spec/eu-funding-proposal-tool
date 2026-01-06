import * as KV from './kv_store.ts';

export async function seedDefaultSources(supabase: any) {
    const defaults = [
        { id: 'ukri', name: 'UKRI', url: 'https://www.ukri.org/opportunity/', enabled: true, createdAt: new Date().toISOString() },
        { id: 'horizon', name: 'Horizon Europe', url: 'https://ec.europa.eu/info/funding-tenders/', enabled: true, createdAt: new Date().toISOString() }
    ];
    for (const d of defaults) {
        await KV.set(supabase, `funding_source:${d.id}`, d);
    }
}

export async function searchFundingOpportunities(supabase: any, ai: any, options: any) {
    // Mock search for demo purposes
    // In real app: fetch sources from KV, scrape URLs, use Gemini to extract

    const opportunities = [
        {
            id: 'opp-1',
            title: 'AI for Green Manufacturing',
            deadline: '2025-12-31',
            fundingAmount: '€2,000,000',
            description: 'Grants for SMEs developing AI to reduce industrial waste.',
            matchScore: 9,
            matchReasoning: 'Directly fits your AI sustainability profile.',
            status: 'open',
            url: 'https://example.com/grant1'
        },
        {
            id: 'opp-2',
            title: 'Digital Health Innovation',
            deadline: '2024-10-15',
            fundingAmount: '€500,000',
            description: 'Improving patient outcomes via digital tools.',
            matchScore: 4,
            matchReasoning: 'Low relevance to manufacturing.',
            status: 'closing-soon',
            url: 'https://example.com/grant2'
        }
    ];

    return { opportunities };
}