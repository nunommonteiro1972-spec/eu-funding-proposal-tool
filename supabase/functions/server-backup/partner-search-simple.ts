import * as KV from './kv_store.ts';

export async function seedDefaultSources(supabase: any) {
    const defaults = [
        { id: 'cordis', name: 'CORDIS', url: 'https://cordis.europa.eu/projects/en', enabled: true, createdAt: new Date().toISOString() }
    ];
    for (const d of defaults) {
        await KV.set(supabase, `partner_search_source:${d.id}`, d);
    }
}