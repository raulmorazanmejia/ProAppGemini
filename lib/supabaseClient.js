import { createClient } from '@supabase/supabase-js'

// NUCLEAR OPTION: No variables. No settings. Just the direct address.
const supabaseUrl = 'https://twtlrehxjmduihfgmvul.supabase.co'

// We keep the key as a variable for safety, but the URL is now fixed.
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
