// ==========================================================================
// Supabase Client Initialization
// ==========================================================================

// ⚠️ REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT URL AND ANON KEY
const SUPABASE_URL = 'https://ickkizfshwjbknlujati.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlja2tpemZzaHdqYmtubHVqYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxMjgzNTIsImV4cCI6MjA5ODcwNDM1Mn0.cnrBjjMM8tq7CNsvEzBqjcuxW5P-DLzfL0MsNrfNFZA';

// Initialize the Supabase client
// We use window.supabase because we imported the script via CDN in HTML
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export the client so other modules can use it
export { supabase };