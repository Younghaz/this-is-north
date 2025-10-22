// lib/supabaseClient.ts
// Client/browser Supabase client (use in React client components, hooks, etc.)
// Uses NEXT_PUBLIC_SUPABASE_ANON_KEY (RLS-protected, safe for browser)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
