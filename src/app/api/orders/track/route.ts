export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { pushCancelEvent } from "@/app/api/admin/stream/route";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const orderId = cookieStore.get("order_session")?.value;

        if (!orderId) {
            return NextResponse.json({ order: null });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: true,
                        modifiers: { include: { modifier: true } }
                    }
                }
            }
        });

        if (!order) {
            return NextResponse.json({ order: null });
        }

        return NextResponse.json({ order });
    } catch (e) {
        console.error("Tracking API error:", e);
        return NextResponse.json({ error: "Fehler beim Laden der Bestellung." }, { status: 500 });
    }
}

export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete("order_session");
    return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const orderId = cookieStore.get("order_session")?.value;

        if (!orderId) {
            return NextResponse.json({ error: "Keine aktive Bestellung." }, { status: 404 });
        }

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            return NextResponse.json({ error: "Bestellung nicht gefunden." }, { status: 404 });
        }
        if (order.status !== "PENDING") {
            return NextResponse.json({ error: "Bestellung kann nicht mehr storniert werden – sie wird bereits zubereitet." }, { status: 400 });
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status: "CANCELLED", updated_at: new Date() }
        });

        try { pushCancelEvent(orderId); } catch(e) { console.error(e); }

        return NextResponse.json({ success: true, message: "Bestellung storniert." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
