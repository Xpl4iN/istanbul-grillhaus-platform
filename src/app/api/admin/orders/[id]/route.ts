import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params;
        // We do a soft delete so the database retains history, but UI ignores it
        await prisma.order.update({
            where: { id: id },
            data: { status: "DELETED" }
        });
        return NextResponse.json({ success: true });
    } catch(e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
