import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Only warn in development, don't block the app
const isPlaceholder = supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')
if (isPlaceholder && import.meta.env.DEV) {
    console.info(
        'Running without Supabase - auth features are disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env for full functionality.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const isSupabaseConfigured = !isPlaceholder
