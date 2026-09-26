import { createClient } from '@supabase/supabase-js';

// Raw values from env or fallback strings
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qzyvoiugvmytiozxntft.supabase.co';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_anon_placeholder_key';

// Ensure URL starts with https://
const supabaseUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
  ? rawUrl
  : `https://${rawUrl}`;

export const supabase = createClient(supabaseUrl, rawKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
