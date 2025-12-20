/**
 * SUPABASE CONFIGURATION
 * 
 * This file handles the connection to your Supabase instance.
 * For VPS migration:
 * 1. Update your .env.local with your VPS URL and Anon Key.
 * 2. The serverUrl and functionsUrl will automatically update.
 */

// Use environment variables with fallbacks
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "http://localhost:54321";
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Extract project ID from URL if possible (for cloud) or use a placeholder
export const projectId = supabaseUrl.includes('supabase.co')
    ? supabaseUrl.split('//')[1].split('.')[0]
    : "local-vps";

// Backend URLs
// In self-hosted/VPS, functions are usually at :8000/functions/v1 or similar
// This logic handles both Cloud and Self-Hosted structures
export const functionsUrl = supabaseUrl.includes('supabase.co')
    ? `https://${projectId}.supabase.co/functions/v1`
    : `${supabaseUrl}/functions/v1`;

export const serverUrl = `${functionsUrl}/server`;

console.log(`[Supabase Config] Connecting to: ${supabaseUrl}`);