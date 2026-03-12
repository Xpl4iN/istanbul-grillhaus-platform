import { NextResponse } from "next/server";

const clients = new Set<ReadableStreamDefaultController>();

export function GET(req: Request) {
    const stream = new ReadableStream({
        start(controller) {
            clients.add(controller);

            const interval = setInterval(() => {
                controller.enqueue('data: {"type": "ping"}\n\n');
            }, 20000);

            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                clients.delete(controller);
            });
        }
    });

    return new NextResponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    });
}

export function pushOrderEvent(order: any) {
    const data = `data: ${JSON.stringify({ type: 'NEW_ORDER', order })}\n\n`;
    for (const client of clients) {
        client.enqueue(data);
    }
}
export function pushCancelEvent(orderId: string) {
    const data = `data: ${JSON.stringify({ type: 'CANCEL_ORDER', orderId })}\n\n`;
    for (const client of clients) {
        try { client.enqueue(data); } catch(e) {}
    }
}
