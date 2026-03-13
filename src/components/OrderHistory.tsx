"use client";
import { useState } from "react";

const STATUS_TEXT: Record<string, string> = {
    PENDING: "Eingegangen",
    ACCEPTED: "In Zubereitung",
    READY: "Abholbereit",
    COMPLETED: "Abgeschlossen",
    CANCELLED: "Storniert",
    NO_SHOW: "Nicht abgeholt"
};

const STATUS_COLOR: Record<string, string> = {
    COMPLETED: "#065f46",
    CANCELLED: "#991b1b",
    NO_SHOW: "#991b1b",
    READY: "#1e40af",
    ACCEPTED: "#1e40af",
    PENDING: "#92400e"
};

export default function OrderHistory() {
    const [phone, setPhone] = useState("");
    const [orders, setOrders] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [show, setShow] = useState(false);

    const lookup = async () => {
        if (!phone || phone.length < 6) return;
        setLoading(true);
        try {
            const res = await fetch("/api/orders/history?phone=" + encodeURIComponent(phone));
            const data = await res.json();
            setOrders(data.orders || []);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    if (!show) {
        return (
            <div className="text-center mt-6">
                <button
                    onClick={() => setShow(true)}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "#5c4a32" }}
                >
                    📋 Meine früheren Bestellungen anzeigen
                </button>
            </div>
        );
    }

    return (
        <div className="mt-6 p-4 rounded-2xl border" style={{ background: "#fffdf9", borderColor: "#ddd0b8" }}>
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm" style={{ color: "#1a1008" }}>Frühere Bestellungen</h3>
                <button onClick={() => setShow(false)} className="text-sm opacity-50 hover:opacity-100">✕</button>
            </div>

            <div className="flex gap-2 mb-4">
                <input
                    type="tel"
                    placeholder="Deine Handynummer"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && lookup()}
                    className="flex-1 p-2 border rounded-md text-sm"
                    style={{ borderColor: "#ddd0b8" }}
                />
                <button
                    onClick={lookup}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-bold text-white rounded-md disabled:opacity-50"
                    style={{ background: "#8b1a1a" }}
                >
                    {loading ? "..." : "Suchen"}
                </button>
            </div>

            {orders !== null && (
                orders.length === 0 ? (
                    <p className="text-sm text-center py-4 opacity-60">Keine früheren Bestellungen gefunden.</p>
                ) : (
                    <ul className="space-y-3">
                        {orders.map((o, idx) => (
                            <li key={idx} className="p-3 rounded-xl border" style={{ borderColor: "#f5f0e8" }}>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm" style={{ color: "#1a1008" }}>Bon {o.short_id}</span>
                                    <span className="text-xs font-bold" style={{ color: STATUS_COLOR[o.status] || "#374151" }}>
                                        {STATUS_TEXT[o.status] || o.status}
                                    </span>
                                </div>
                                <p className="text-xs mt-1 opacity-60">
                                    {new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(o.created_at))} · {o.total_price.toFixed(2)} €
                                </p>
                                <p className="text-xs mt-1" style={{ color: "#5c4a32" }}>
                                    {o.items.map((i: any) => `${i.quantity}x ${i.name}`).join(", ")}
                                </p>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
}
