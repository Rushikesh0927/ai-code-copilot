import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Fallback to service role / secret key if needed on the server, but for simplicity we rely on ENV
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Ensure these are present
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase Environment Variables not set! Falling back to uninitialized state.");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
