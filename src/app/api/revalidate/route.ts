import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const secret = req.headers.get("x-revalidate-secret");
    const EXPECTED = process.env.REVALIDATE_SECRET || "istanbul-revalidate-2024";

    if (secret !== EXPECTED) {
        return NextResponse.json({ message: "Invalid revalidate secret" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const tag = body.tag;

        if (tag) {
            revalidateTag(tag, "default");
            return NextResponse.json({ revalidated: true, now: Date.now() });
        }

        return NextResponse.json({ message: "Missing tag to revalidate" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ message: "Error revalidating", error: err.message }, { status: 500 });
    }
}
