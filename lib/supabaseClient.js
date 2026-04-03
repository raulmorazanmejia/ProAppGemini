import { createClient } from '@supabase/supabase-js'

// We are hardcoding the URL here to stop Vercel from messing it up.
const supabaseUrl = 'https://twtlrehxjmduihfgmvul.supabase.co'

// We still pull the Key from Vercel for security.
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
