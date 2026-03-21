import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

// Secret to prevent unauthorized cache busting
const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'istanbul-revalidate-2024';

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-revalidate-secret');
    if (secret !== REVALIDATE_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({ tag: 'menu' }));
    const tag = String(body?.tag ?? 'menu');

    // Bust the Next.js cache for this tag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (revalidateTag as any)(tag);

    return NextResponse.json({ revalidated: true, tag });
}
