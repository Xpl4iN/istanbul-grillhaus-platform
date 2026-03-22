export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Simple in-memory rate limiter (per serverless instance)
const reviewRateLimitMap = new Map<string, number[]>();

export function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60_000; // 1 minute
    const maxRequests = 5;
    const timestamps = (reviewRateLimitMap.get(ip) ?? []).filter((t) => now - t < windowMs);
    if (timestamps.length >= maxRequests) return true;
    timestamps.push(now);
    reviewRateLimitMap.set(ip, timestamps);
    return false;
}

/** GET /api/reviews - returns whether a review already exists for the current order session */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const orderId = cookieStore.get("order_session")?.value;

        if (!orderId) {
            return NextResponse.json({ reviewed: false, hasOrder: false });
        }

        const existing = await prisma.review.findUnique({
            where: { order_id: orderId },
            select: { id: true, score: true }
        });

        return NextResponse.json({ reviewed: existing !== null, hasOrder: true, score: existing?.score ?? null });
    } catch (e) {
        console.error("Review GET error:", e);
        return NextResponse.json({ reviewed: false, hasOrder: false });
    }
}

export async function POST(req: Request) {
    try {
        const clientIp = (req.headers.get("x-forwarded-for") || "127.0.0.1").split(",")[0].trim();
        if (isRateLimited(clientIp)) {
            return NextResponse.json({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }, { status: 429 });
        }

        const cookieStore = await cookies();
        const orderId = cookieStore.get("order_session")?.value;

        if (!orderId) {
            return NextResponse.json({ error: "Keine aktive Bestellung gefunden. Bitte lade die Seite neu." }, { status: 401 });
        }

        let body: unknown;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
        }

        if (typeof body !== "object" || body === null) {
            return NextResponse.json({ error: "Ungültiger Anfrage-Inhalt." }, { status: 400 });
        }

        const { score, comment } = body as Record<string, unknown>;

        if (typeof score !== "number" || score < 1 || score > 5 || !Number.isInteger(score)) {
            return NextResponse.json({ error: "Ungültige Bewertung. Bitte wähle 1–5 Sterne." }, { status: 422 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, organizationId: true, customer_id: true, status: true }
        });

        if (!order) {
            return NextResponse.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
        }

        if (!["COMPLETED", "READY", "NO_SHOW"].includes(order.status)) {
            return NextResponse.json({ error: "Bewertungen können nur für abgeschlossene Bestellungen abgegeben werden." }, { status: 400 });
        }

        const review = await prisma.review.create({
            data: {
                organizationId: order.organizationId,
                order_id: order.id,
                customer_id: order.customer_id ?? null,
                score,
                comment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 500) : null
            }
        });

        return NextResponse.json({ success: true, reviewId: review.id });
    } catch (e: any) {
        if (e?.code === "P2002") {
            // Unique constraint violation – review already exists for this order
            return NextResponse.json({ error: "Für diese Bestellung wurde bereits eine Bewertung abgegeben." }, { status: 409 });
        }
        console.error("Review POST error:", e);
        return NextResponse.json({ error: "Interner Fehler. Bitte versuche es später erneut." }, { status: 500 });
    }
}
