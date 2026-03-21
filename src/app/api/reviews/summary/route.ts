export const dynamic = "force-dynamic";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const org = url.searchParams.get("org")?.trim();

        if (!org) {
            return NextResponse.json({ error: "Parameter 'org' ist erforderlich." }, { status: 400 });
        }

        const organization = await prisma.organization.findFirst({
            where: { id: org }
        });

        if (!organization) {
            return NextResponse.json({ error: "Organisation nicht gefunden." }, { status: 404 });
        }

        const reviews = await prisma.review.findMany({
            where: { organizationId: org },
            select: { score: true }
        });

        const count = reviews.length;
        const average = count > 0 ? reviews.reduce((sum, r) => sum + r.score, 0) / count : null;

        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const r of reviews) {
            distribution[r.score]++;
        }

        return NextResponse.json({
            organizationId: org,
            count,
            average: average !== null ? Math.round(average * 100) / 100 : null,
            distribution
        });
    } catch (e: any) {
        console.error("Reviews summary GET error:", e);
        return NextResponse.json({ error: "Fehler beim Laden der Bewertungsübersicht." }, { status: 500 });
    }
}
