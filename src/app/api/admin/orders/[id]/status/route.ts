import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const { status } = await req.json();
        const { id } = await props.params;

        await prisma.order.update({
            where: { id: id },
            data: { status: status, updated_at: new Date() }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}