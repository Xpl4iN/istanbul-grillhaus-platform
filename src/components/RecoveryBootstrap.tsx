'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

/**
 * Intercepts Supabase password-recovery hash tokens on client bootstrap.
 * When the URL contains #type=recovery (from a Supabase reset-password email),
 * this component sets the session, clears the hash, and routes to /reset-password
 * so the user can enter a new password instead of landing on the dashboard/login.
 */
export default function RecoveryBootstrap() {
    const router = useRouter()

    useEffect(() => {
        if (typeof window === 'undefined') return

        const hash = window.location.hash
        if (!hash) return

        const params = new URLSearchParams(hash.slice(1))
        if (params.get('type') !== 'recovery') return

        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (!accessToken || !refreshToken) return

        supabase.auth
            .setSession({ access_token: accessToken, refresh_token: refreshToken })
            .then(({ error }) => {
                if (error) {
                    console.error('[RecoveryBootstrap] Failed to set recovery session:', error.message)
                    return
                }
                // Remove recovery tokens from the URL to avoid re-processing
                window.history.replaceState(null, '', window.location.pathname + window.location.search)
                router.push('/reset-password')
            })
    }, [router])

    return null
}
