import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qzyvoiugvmytiozxntft.supabase.co'
const supabaseAnonKey = 'sb_publishable_7Mbn7QdW0dSb6gpEOM9Eww_L2si0vGS'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
