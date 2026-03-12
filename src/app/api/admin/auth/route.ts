import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const { pin } = await req.json();
        const correctPin = process.env.ADMIN_PIN || "123456";

        if (pin === correctPin) {
            const res = NextResponse.json({ success: true });
            res.cookies.set('admin_session', pin, { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === "production",
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 1 Woche
            });
            return res;
        }

        return NextResponse.json({ error: "Falscher PIN." }, { status: 401 });
    } catch(e: any) {
        return NextResponse.json({ error: "Invalid Request" }, { status: 400 });
    }
}
