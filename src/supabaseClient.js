import { createClient } from '@supabase/supabase-js';

// Clean static URL without trailing slashes or quotes
const supabaseUrl = 'https://qzyvoiugvmytiozxntft.supabase.co';

// Read from env or use empty string to prevent constructor crashing
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseAnonKey = envKey && envKey.trim() !== '' ? envKey : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
