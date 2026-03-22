import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Returns the Supabase client, creating it on first call.
 * Deferring construction to first use means this module can be imported
 * server-side (e.g. during SSR prerendering) without throwing when the
 * NEXT_PUBLIC_* env vars are absent at module evaluation time.
 */
export function getSupabaseClient(): SupabaseClient {
    if (!_client) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
        if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
        _client = createClient(url, key)
    }
    return _client
}
