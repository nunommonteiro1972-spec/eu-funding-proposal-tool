/**
 * CONFIGURATION INSTRUCTIONS
 * 
 * 1. LOCAL DEVELOPMENT:
 *    If you are running locally, you must start the Supabase Edge Functions.
 *    Run this command in your terminal:
 *    > supabase functions serve
 * 
 * 2. PRODUCTION / HOSTED:
 *    Your project credentials are configured below.
 *    Ensure you have deployed the edge functions to Supabase:
 *    > supabase functions deploy make-server-3cb71dae
 */

export const projectId: string = import.meta.env.VITE_SUPABASE_PROJECT_ID || "swvvyxuozwqvyaberqvu";
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dnZ5eHVvendxdnlhYmVycXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MjIwMDgsImV4cCI6MjA3OTA5ODAwOH0.jcCynwcnnYSosAgf9QSdx_2FCl9FOx3lTXSiM3n27xQ";

// Determines the backend URL based on the projectId.
// If projectId is default "your-project-id", it assumes localhost.
// Otherwise it uses the production Supabase URL.
// Forcing production URL since local Docker is not running
export const serverUrl = `https://${projectId}.supabase.co/functions/v1/server`;
export const functionsUrl = `https://${projectId}.supabase.co/functions/v1`;
// export const serverUrl = import.meta.env.DEV || projectId === "your-project-id"
//   ? "http://localhost:54321/functions/v1/server"
//   : `https://${projectId}.supabase.co/functions/v1/server`;