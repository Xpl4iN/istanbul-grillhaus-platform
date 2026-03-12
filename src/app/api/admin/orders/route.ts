export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                status: { not: "DELETED" }
            },
            include: {
                customer: true,
                items: {
                    include: {
                        product: true,
                        modifiers: {
                            include: { modifier: true }
                        }
                    }
                }
            },
            orderBy: [{ pickup_time: 'asc' }, { created_at: 'asc' }]
        });

        // Map to client expected format
        const mappedOrders = orders.map((o: any) => ({
            id: o.id,
            short_id: o.short_id,
            customerName: o.customer.name,
            phone: o.customer.phone_normalized,
            total_price: o.total_price,
            pickup_time: new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' }).format(new Date(o.pickup_time)),
            status: o.status,
            dining_option: o.dining_option ?? null,
            items: o.items.map((i: any) => ({
                quantity: i.quantity,
                productName: i.product.name,
                modifiers: i.modifiers.map((m: any) => ({ name: m.modifier.name }))
            }))
        }));

        return NextResponse.json({ orders: mappedOrders });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
