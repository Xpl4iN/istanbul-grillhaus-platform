import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { orderId, reason } = await req.json();

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { customer: true }
        });

        if (!order) throw new Error("Order not found");

        await prisma.$transaction([
            prisma.blacklist.create({
                data: {
                    phone_normalized: order.customer.phone_normalized,
                    ip_address: order.ip_address,
                    reason: reason
                }
            }),
            prisma.order.update({
                where: { id: orderId },
                data: { status: 'NO_SHOW' }
            })
        ]);

        return NextResponse.json({ success: true, message: 'Troll erfolgreich eliminiert.' });
    } catch (e: any) {
        console.error("Blacklist Error", e);
        return NextResponse.json({ error: 'Blacklisting fehlgeschlagen.' }, { status: 500 });
    }
}
