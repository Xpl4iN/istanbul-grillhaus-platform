/**
 * Unit tests for review API logic
 *
 * Tests cover:
 * 1. isRateLimited - rate-limiter utility exported from the route
 * 2. POST /api/reviews - success path and validation failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isRateLimited } from "@/app/api/reviews/route";

// ---------------------------------------------------------------------------
// isRateLimited tests
// ---------------------------------------------------------------------------

describe("isRateLimited", () => {
    const ip = "192.168.1.100";

    // The rate-limiter module state persists across calls because the Map is
    // module-level. We re-import a fresh module for each test group so that
    // previous calls do not pollute the window.
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("allows the first request for a new IP", () => {
        const result = isRateLimited("10.0.0.1");
        expect(result).toBe(false);
    });

    it("allows up to 5 requests within one minute", () => {
        const testIp = "10.0.0.2";
        // First 5 should pass
        for (let i = 0; i < 5; i++) {
            expect(isRateLimited(testIp)).toBe(false);
        }
    });

    it("blocks the 6th request within one minute", () => {
        const testIp = "10.0.0.3";
        for (let i = 0; i < 5; i++) {
            isRateLimited(testIp);
        }
        expect(isRateLimited(testIp)).toBe(true);
    });

    it("resets after the rate-limit window expires", () => {
        const testIp = "10.0.0.4";
        for (let i = 0; i < 5; i++) {
            isRateLimited(testIp);
        }
        expect(isRateLimited(testIp)).toBe(true);

        // Advance time by 61 seconds to expire the window
        vi.advanceTimersByTime(61_000);

        expect(isRateLimited(testIp)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// POST handler integration-style tests
// ---------------------------------------------------------------------------

// We mock the two side-effectful modules before importing the handler so that
// Prisma and Next.js cookies never touch the real database or cookie store.

vi.mock("@/lib/db", () => ({
    default: {
        order: {
            findUnique: vi.fn(),
        },
        review: {
            create: vi.fn(),
            findUnique: vi.fn(),
        },
    },
}));

vi.mock("next/headers", () => ({
    cookies: vi.fn(),
}));

// Import after mocks are registered
import { POST, GET } from "@/app/api/reviews/route";
import prisma from "@/lib/db";
import { cookies } from "next/headers";

const mockCookieStore = (orderId: string | undefined) => {
    (cookies as ReturnType<typeof vi.fn>).mockResolvedValue({
        get: (name: string) =>
            name === "order_session" && orderId ? { value: orderId } : undefined,
    });
};

let testIpCounter = 100;
const makeRequest = (body: unknown, headers: Record<string, string> = {}) => {
    const ip = `203.0.113.${testIpCounter++}`;
    return new Request("http://localhost/api/reviews", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip,
            ...headers,
        },
        body: JSON.stringify(body),
    });
};

describe("POST /api/reviews", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 401 when order_session cookie is missing", async () => {
        mockCookieStore(undefined);
        const res = await POST(makeRequest({ score: 4 }));
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBeTruthy();
    });

    it("returns 422 when score is out of range", async () => {
        mockCookieStore("order-123");
        const res = await POST(makeRequest({ score: 6 }));
        expect(res.status).toBe(422);
        const body = await res.json();
        expect(body.error).toMatch(/Stern/i);
    });

    it("returns 422 when score is not an integer", async () => {
        mockCookieStore("order-123");
        const res = await POST(makeRequest({ score: 3.5 }));
        expect(res.status).toBe(422);
    });

    it("returns 400 when order status is not eligible for review", async () => {
        mockCookieStore("order-123");
        (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "order-123",
            organizationId: "org-1",
            customer_id: "cust-1",
            status: "PENDING",
        });

        const res = await POST(makeRequest({ score: 4 }));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBeTruthy();
    });

    it("saves a review successfully and returns 200", async () => {
        mockCookieStore("order-456");
        (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "order-456",
            organizationId: "org-1",
            customer_id: "cust-1",
            status: "COMPLETED",
        });
        (prisma.review.create as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "review-789",
        });

        const res = await POST(makeRequest({ score: 5, comment: "Sehr lecker!" }));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.reviewId).toBe("review-789");

        expect(prisma.review.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    score: 5,
                    comment: "Sehr lecker!",
                    order_id: "order-456",
                }),
            })
        );
    });

    it("returns 409 when a duplicate review is submitted", async () => {
        mockCookieStore("order-456");
        (prisma.order.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
            id: "order-456",
            organizationId: "org-1",
            customer_id: "cust-1",
            status: "COMPLETED",
        });
        const prismaUniqueError = Object.assign(new Error("Unique constraint"), { code: "P2002" });
        (prisma.review.create as ReturnType<typeof vi.fn>).mockRejectedValue(prismaUniqueError);

        const res = await POST(makeRequest({ score: 3 }));
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.error).toBeTruthy();
    });
});

describe("GET /api/reviews", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns reviewed: false when no order session cookie exists", async () => {
        mockCookieStore(undefined);
        const res = await GET();
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.reviewed).toBe(false);
        expect(body.hasOrder).toBe(false);
    });

    it("returns reviewed: false when no review exists for the order", async () => {
        mockCookieStore("order-123");
        (prisma.review.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        const res = await GET();
        const body = await res.json();
        expect(body.reviewed).toBe(false);
        expect(body.hasOrder).toBe(true);
    });

    it("returns reviewed: true when a review already exists", async () => {
        mockCookieStore("order-123");
        (prisma.review.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "rev-1", score: 4 });
        const res = await GET();
        const body = await res.json();
        expect(body.reviewed).toBe(true);
        expect(body.score).toBe(4);
    });
});
