import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/db';
import { pushOrderEvent } from '../../admin/stream/route';

// Next.js handles raw body parsing automatically with req.text() or req.arrayBuffer()
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (endpointSecret && sig) {
        try {
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        } catch (err: any) {
            console.error('⚠️ Webhook signature verification failed:', err.message);
            return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
        }
    } else {
        // No secret configured – parse as JSON (for local testing without CLI)
        try {
            event = JSON.parse(body);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }
    }

    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object;
            const orderId = session.metadata?.order_id;

            if (!orderId) {
                console.error('No order_id in session metadata');
                break;
            }

            // Mark order as paid and push SSE event
            try {
                const updatedOrder = await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        payment_status: 'paid',
                        stripe_session_id: session.id,
                        stripe_payment_intent: session.payment_intent,
                    },
                    include: {
                        customer: true,
                        items: { include: { product: true, modifiers: { include: { modifier: true } } } },
                    },
                });
                pushOrderEvent(updatedOrder);
                console.log(`✅ Order ${orderId} marked as paid (Stripe session ${session.id})`);
            } catch (err) {
                console.error('Failed to update order payment status:', err);
            }
            break;
        }

        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            const orderId = paymentIntent.metadata?.order_id;
            if (orderId) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: { payment_status: 'failed' },
                });
                console.log(`❌ Payment failed for order ${orderId}`);
            }
            break;
        }

        default:
            console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
