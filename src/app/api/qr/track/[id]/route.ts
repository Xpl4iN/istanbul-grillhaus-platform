import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return new Response('Missing customer ID', { status: 400 });
    }

    // Get Supabase credentials from environment (TEA credentials)
    const supabaseUrl = process.env.TEA_SUPABASE_URL;
    const supabaseKey = process.env.TEA_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Istanbul tracking error: Missing TEA_SUPABASE env vars');
        return new Response('Server configuration error', { status: 500 });
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Get the customer's website URL from TEA Supabase
        const { data: customer, error: fetchError } = await supabase
            .from('customers')
            .select('website_url, qr_scan_count')
            .eq('ticktick_id', id)
            .single();

        if (fetchError || !customer) {
            console.error('Istanbul tracking: Customer not found in TEA:', id);
            return new Response('Customer not found', { status: 404 });
        }

        const targetUrl = customer.website_url;
        if (!targetUrl) {
            return new Response('No website URL configured', { status: 400 });
        }

        // 2. Atomic increment via RPC in TEA Supabase
        const { error: rpcError } = await supabase.rpc('increment_qr_scan_count', {
            customer_ticktick_id: id
        });

        if (rpcError) {
            console.warn('Istanbul tracking: RPC failed, falling back:', rpcError);
            await supabase
                .from('customers')
                .update({ qr_scan_count: (customer.qr_scan_count || 0) + 1 })
                .eq('ticktick_id', id);
        }

        // 3. Log scan event in TEA (fire-and-forget)
        const userAgent = request.headers.get('user-agent') || null;
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

        void Promise.resolve(supabase.from('qr_scan_events').insert({
            customer_id: id,
            scanned_at: new Date().toISOString(),
            user_agent: userAgent,
            ip: ip,
        }));

        // 4. Redirect to the actual website
        let redirectUrl = targetUrl;
        try {
            const urlObj = new URL(targetUrl);
            urlObj.searchParams.set('src', 'qr');
            redirectUrl = urlObj.toString();
        } catch (e) {
            redirectUrl = targetUrl.includes('?') ? `${targetUrl}&src=qr` : `${targetUrl}?src=qr`;
        }

        return NextResponse.redirect(redirectUrl, 302);

    } catch (err: any) {
        console.error('Istanbul QR track error:', err.message);
        return new Response('Internal server error', { status: 500 });
    }
}
