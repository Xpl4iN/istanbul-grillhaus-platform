import prisma from "@/lib/db";
import { NextResponse } from "next/server";

// Simple in-memory rate limiter (per serverless instance)
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxRequests = 5;

    const timestamps = (rateLimitMap.get(ip) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= maxRequests) return true;

    timestamps.push(now);
    rateLimitMap.set(ip, timestamps);
    return false;
}
import { parsePhoneNumberWithError } from "libphonenumber-js";
import crypto from "crypto";
import { pushOrderEvent } from "../admin/stream/route";

const ISTANBUL_ORG_ID = "cmmb6n8xu0001o7fwaw73p1lr";

const generateShortId = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    const randomNumber = Math.floor(10 + Math.random() * 90);
    return `${randomLetter}-${randomNumber}`;
};

export async function POST(req: Request) {
    try {
        const { customer, items, pickup_time, total_price, tip_amount, dining_option, turnstile_token } = await req.json();
        const clientIp = (req.headers.get('x-forwarded-for') || "127.0.0.1").split(",")[0].trim();

        // Validate Turnstile token
        if (process.env.NODE_ENV === 'production' && turnstile_token !== 'mock-token-for-dev') {
            const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: turnstile_token })
            });
            const verifyData = await verifyRes.json();
            if (!verifyData.success) {
                return NextResponse.json({ error: "Bot-Überprüfung fehlgeschlagen." }, { status: 403 });
            }
        }

        if (isRateLimited(clientIp)) {
            return NextResponse.json({ error: "Zu viele Bestellungen. Bitte warte etwas und versuche es erneut." }, { status: 429 });
        }

        let phoneNormalized;
        try {
            const phoneNumber = parsePhoneNumberWithError(customer.phone, "DE");
            if (!phoneNumber.isValid()) throw new Error("Invalid Phone");
            phoneNormalized = phoneNumber.number;
        } catch (e) {
            return NextResponse.json({ error: "Bitte gib eine gültige Handynummer ein." }, { status: 400 });
        }

        const isBlacklisted = await prisma.blacklist.findFirst({
            where: {
                OR: [
                    { phone_normalized: phoneNormalized },
                    { ip_address: clientIp }
                ]
            }
        });

        if (isBlacklisted) {
            return NextResponse.json({ error: "Bestellung online nicht möglich. Bitte rufe direkt im Laden an." }, { status: 403 });
        }

        const dbCustomer = await prisma.customer.upsert({
            where: { organizationId_phone_normalized: { organizationId: ISTANBUL_ORG_ID, phone_normalized: phoneNormalized } },
            update: { name: customer.name },
            create: { name: customer.name, phone_normalized: phoneNormalized, organizationId: ISTANBUL_ORG_ID }
        });

        const shortId = generateShortId();

        const order = await prisma.order.create({
            data: {
                organizationId: ISTANBUL_ORG_ID,
                short_id: shortId,
                customer_id: dbCustomer.id,
                total_price,
                pickup_time: new Date(pickup_time),
                ip_address: clientIp,
                dining_option: dining_option ?? null,
                items: {
                    create: items.map((item: any) => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_price: item.price,
                        modifiers: {
                            create: Object.values(item.modifiers).flat().map((modId: any) => ({
                                modifier_id: modId,
                                modifier_price: 0 // Simplification since price is calculated in total
                            }))
                        }
                    }))
                }
            },
            include: {
                customer: true,
                items: { include: { product: true, modifiers: { include: { modifier: true } } } }
            }
        });

        // Trigger SSE
        pushOrderEvent(order);

        const response = NextResponse.json({
            success: true,
            short_id: shortId,
            message: "Bestellung erfolgreich."
        }, { status: 201 });

        response.cookies.set("order_session", order.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 12 // 12 hours
        });

        return response;

    } catch (e: any) {
        console.error("Order error:", e);
        return NextResponse.json({ error: "Ein interner Fehler ist aufgetreten.", details: e.message }, { status: 500 });
    }
}