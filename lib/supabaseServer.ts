// lib/supabaseServer.ts
// Server-side Supabase client (use in API routes, server components, getServerSideProps, etc.)
// Uses SUPABASE_SERVICE_ROLE_KEY for full DB access. NEVER import in client/browser code!

import { createClient } from '@supabase/supabase-js';


// Debug: Confirm the service role key is loaded (do NOT log the key value itself)
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('[supabaseServer] Service role key loaded for server-side Supabase client.')
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase URL or Service Role Key');
}

export function getSupabaseServer() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
