import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const { rating, comment } = await req.json();
        
        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: "Bitte gib eine gültige Bewertung ab (1-5 Sterne)." }, { status: 400 });
        }

        const cookieStore = await cookies();
        const orderId = cookieStore.get("order_session")?.value;

        if (!orderId) {
            return NextResponse.json({ error: "Bewertung nur nach einer Bestellung möglich." }, { status: 401 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { customer: true }
        });

        if (!order) {
            return NextResponse.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
        }

        const review = await prisma.review.create({
            data: {
                organizationId: order.organizationId,
                order_id: order.id,
                customer_id: order.customer_id,
                rating,
                comment: comment || null,
                customer_name: order.customer.name,
                customer_phone: order.customer.phone_normalized,
                is_guest: false, // We have a customer record
            }
        });

        return NextResponse.json({ success: true, review });
    } catch (e: any) {
        console.error("Review API Error:", e);
        return NextResponse.json({ error: "Interner Fehler. Bitte versuche es später erneut.", details: e.message }, { status: 500 });
    }
}
