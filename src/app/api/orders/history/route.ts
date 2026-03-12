import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const phone = url.searchParams.get("phone")?.trim();

    if (!phone || phone.length < 6) {
        return NextResponse.json({ error: "Handynummer erforderlich." }, { status: 400 });
    }

    try {
        const customer = await prisma.customer.findFirst({
            where: { phone_normalized: { contains: phone.replace(/\D/g, '').slice(-8) } }
        });

        if (!customer) {
            return NextResponse.json({ orders: [] });
        }

        const orders = await prisma.order.findMany({
            where: { customer_id: customer.id },
            orderBy: { created_at: "desc" },
            take: 5,
            include: {
                items: {
                    include: {
                        product: { select: { name: true } }
                    }
                }
            }
        });

        return NextResponse.json({ orders: orders.map(o => ({
            short_id: o.short_id,
            status: o.status,
            total_price: o.total_price,
            pickup_time: o.pickup_time,
            created_at: o.created_at,
            items: o.items.map(i => ({ quantity: i.quantity, name: i.product.name }))
        })) });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
