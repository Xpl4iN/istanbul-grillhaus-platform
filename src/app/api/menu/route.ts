import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            where: { is_available: true },
            include: {
                category: true,
                modifier_groups: {
                    include: {
                        modifiers: true
                    }
                }
            }
        });

        const settings = await prisma.shopSettings.findFirst();

        let isOpen = false;

        if (settings?.is_open_right_now && settings?.opening_hours_json) {
            const hours = JSON.parse(settings.opening_hours_json);
            const now = new Date();
            const options: Intl.DateTimeFormatOptions = { timeZone: 'Europe/Berlin', weekday: 'long' };
            const formatterDay = new Intl.DateTimeFormat('en-US', options);
            const dayName = formatterDay.format(now).toLowerCase();

            const formatterTime = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' });
            const currentTimeStr = formatterTime.format(now);

            const todaySchedule = hours[dayName];

            if (todaySchedule && todaySchedule.open && todaySchedule.close) {
                if (currentTimeStr >= todaySchedule.open && currentTimeStr <= todaySchedule.close) {
                    isOpen = true;
                }
            }
        }


        return NextResponse.json(
            {
                products: products.sort((a: any, b: any) => (a.category?.sort_order || 0) - (b.category?.sort_order || 0)),
                shopSettings: settings,
                isOpen
            },
            {
                headers: {
                    // Cache at Vercel CDN for 60s, serve stale for 5 min while revalidating
                    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
                }
            }
        );
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
