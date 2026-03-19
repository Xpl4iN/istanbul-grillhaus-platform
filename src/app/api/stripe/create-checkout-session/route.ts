import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { parsePhoneNumberWithError } from 'libphonenumber-js';
import { pushOrderEvent } from '../../admin/stream/route';

const ISTANBUL_ORG_ID = 'cmmb6n8xu0001o7fwaw73p1lr';
const DOMAIN = process.env.DOMAIN || 'http://localhost:3000';

const generateShortId = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const randomNumber = Math.floor(10 + Math.random() * 90);
    return `${randomLetter}-${randomNumber}`;
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { customer, items, pickup_time, total_price, tip_amount, dining_option, turnstile_token } = body;

        // Validate Turnstile token in production
        if (process.env.NODE_ENV === 'production' && turnstile_token !== 'mock-token-for-dev') {
            const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: turnstile_token }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
                return NextResponse.json({ error: 'Bot-Überprüfung fehlgeschlagen.' }, { status: 403 });
            }
        }

        // Validate & normalize phone
        let phoneNormalized: string;
        try {
            const phoneNumber = parsePhoneNumberWithError(customer.phone, 'DE');
            if (!phoneNumber.isValid()) throw new Error('Invalid Phone');
            phoneNormalized = phoneNumber.number;
        } catch {
            return NextResponse.json({ error: 'Bitte gib eine gültige Handynummer ein.' }, { status: 400 });
        }

        // Check blacklist
        const clientIp = (req.headers.get('x-forwarded-for') || '127.0.0.1').split(',')[0].trim();
        const isBlacklisted = await prisma.blacklist.findFirst({
            where: { OR: [{ phone_normalized: phoneNormalized }, { ip_address: clientIp }] },
        });
        if (isBlacklisted) {
            return NextResponse.json({ error: 'Bestellung online nicht möglich.' }, { status: 403 });
        }

        // Upsert customer
        const dbCustomer = await prisma.customer.upsert({
            where: { organizationId_phone_normalized: { organizationId: ISTANBUL_ORG_ID, phone_normalized: phoneNormalized } },
            update: { name: customer.name },
            create: { name: customer.name, phone_normalized: phoneNormalized, organizationId: ISTANBUL_ORG_ID },
        });

        const shortId = generateShortId();

        // Create order with payment_status = PENDING
        const order = await prisma.order.create({
            data: {
                organizationId: ISTANBUL_ORG_ID,
                short_id: shortId,
                customer_id: dbCustomer.id,
                total_price,
                pickup_time: new Date(pickup_time),
                ip_address: clientIp,
                dining_option: dining_option ?? null,
                payment_method: 'stripe',
                payment_status: 'pending',
                items: {
                    create: items.map((item: any) => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_price: item.price,
                        modifiers: {
                            create: Object.values(item.modifiers).flat().map((modId: any) => ({
                                modifier_id: modId,
                                modifier_price: 0,
                            })),
                        },
                    })),
                },
            },
            include: {
                customer: true,
                items: { include: { product: true, modifiers: { include: { modifier: true } } } },
            },
        });

        // Build line items for Stripe
        const lineItems = items.map((item: any) => ({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: item.product?.name || item.name || 'Artikel',
                    description: item.product?.description || undefined,
                },
                unit_amount: Math.round(item.price * 100), // Stripe expects cents
            },
            quantity: item.quantity,
        }));

        // Add tip as a separate line item if present
        if (tip_amount && tip_amount > 0) {
            lineItems.push({
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Trinkgeld' },
                    unit_amount: Math.round(tip_amount * 100),
                },
                quantity: 1,
            });
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'paypal', 'klarna'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${DOMAIN}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}&short_id=${shortId}`,
            cancel_url: `${DOMAIN}/payment/cancel?order_id=${order.id}`,
            customer_email: undefined, // Could add email field later
            metadata: {
                order_id: order.id,
                short_id: shortId,
            },
            payment_intent_data: {
                metadata: {
                    order_id: order.id,
                    short_id: shortId,
                },
            },
            locale: 'de',
        });

        return NextResponse.json({ url: session.url, order_id: order.id, short_id: shortId });
    } catch (e: any) {
        console.error('Stripe checkout error:', e);
        return NextResponse.json({ error: 'Stripe Fehler: ' + e.message }, { status: 500 });
    }
}
