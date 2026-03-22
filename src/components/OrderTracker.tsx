"use client";
import { useState, useEffect } from "react";

export default function OrderTracker() {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);


    const cancelOrder = async () => {
        setCancelling(true);
        setShowCancelModal(false);
        try {
            const res = await fetch("/api/orders/track", { method: "PATCH", cache: "no-store" });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Stornierung fehlgeschlagen.");
            } else {
                fetchOrder();
            }
        } catch {
            alert("Fehler bei der Stornierung.");
        } finally {
            setCancelling(false);
        }
    };

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/orders/track?t=${Date.now()}`, { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                setOrder(data.order);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 10000);
        const handlePlaced = () => { setLoading(true); fetchOrder(); };
        window.addEventListener("orderPlaced", handlePlaced);
        return () => {
            clearInterval(interval);
            window.removeEventListener("orderPlaced", handlePlaced);
        };
    }, []);

    if (loading) return null;
    if (!order) return null;

    const getStatusText = (status: string) => {
        switch (status) {
            case "PENDING": return "Eingegangen – Wartet auf Bestätigung";
            case "ACCEPTED": return "In Zubereitung";
            case "READY": return "Abholbereit! Komm vorbei";
            case "COMPLETED": return "Abgeschlossen";
            case "CANCELLED": return "Storniert";
            case "NO_SHOW": return "Nicht abgeholt";
            default: return status;
        }
    };

    const getStatusColorWrapper = (status: string) => {
        switch (status) {
            case "PENDING": return { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" };
            case "ACCEPTED": return { bg: "#dbeafe", border: "#bfdbfe", text: "#1e40af" };
            case "READY": return { bg: "#d1fae5", border: "#a7f3d0", text: "#065f46", animate: "animate-pulse" };
            case "COMPLETED": return { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" };
            case "CANCELLED":
            case "NO_SHOW": return { bg: "#fee2e2", border: "#fecaca", text: "#991b1b" };
            default: return { bg: "#f3f4f6", border: "#e5e7eb", text: "#374151" };
        }
    };

    const isDone = ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(order.status);

    if (isDone) {
        const isCancelled = order.status === "CANCELLED";
        const [rating, setRating] = useState(0);
        const [comment, setComment] = useState("");
        const [reviewed, setReviewed] = useState(false);
        const [submittingReview, setSubmittingReview] = useState(false);

        const submitReview = async () => {
            if (rating === 0) return;
            setSubmittingReview(true);
            try {
                const res = await fetch("/api/reviews", {
                    method: "POST",
                    body: JSON.stringify({ rating, comment })
                });
                if (res.ok) setReviewed(true);
            } catch (e) { console.error(e); }
            finally { setSubmittingReview(false); }
        };

        return (
            <div className="p-6 rounded-2xl shadow-sm border-2 mb-8 max-w-3xl mx-auto mt-4"
                style={{
                    background: isCancelled ? "#fdf0f0" : "#fffdf9",
                    borderColor: isCancelled ? "#e8b4b4" : "#ddd0b8"
                }}>
                <div className="text-center">
                    <div className="text-4xl mb-3">{isCancelled ? "❌" : "✅"}</div>
                    <h2 className="text-2xl font-bold mb-2" style={{ color: isCancelled ? "#991b1b" : "#1a1008" }}>
                        {isCancelled ? `Deine Bestellung ${order.short_id} wurde erfolgreich storniert.` : `Bestellung ${order.short_id} ist ${getStatusText(order.status)}`}
                    </h2>
                    
                    {!isCancelled && order.status === "COMPLETED" && !reviewed && (
                        <div className="my-6 p-4 rounded-xl border border-[#ddd0b8] bg-white/50">
                            <p className="font-bold text-sm mb-3" style={{ color: "#5c4a32" }}>Wie hat es geschmeckt?</p>
                            <div className="flex justify-center gap-2 mb-4">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => setRating(s)} className="text-3xl transition-transform active:scale-90">
                                        {s <= rating ? "⭐" : "☆"}
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <>
                                    <textarea 
                                        placeholder="Feedback (optional)..."
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        className="w-full p-3 text-sm border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/20"
                                        style={{ borderColor: "#ddd0b8" }}
                                        rows={2}
                                    />
                                    <button 
                                        disabled={submittingReview}
                                        onClick={submitReview}
                                        className="w-full py-2 bg-[#8b1a1a] text-white rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
                                    >
                                        {submittingReview ? "..." : "Senden"}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {!isCancelled && reviewed && (
                        <p className="text-[#1a7a3a] font-bold text-sm my-6">Danke für deine Bewertung! ❤️</p>
                    )}

                    {!isCancelled && !reviewed && order.status !== "COMPLETED" && (
                        <p className="text-sm mb-6" style={{ color: "#5c4a32" }}>
                            Vielen Dank für deinen Einkauf!
                        </p>
                    )}

                    <button onClick={async () => {
                        await fetch("/api/orders/track", { method: "DELETE" });
                        setOrder(null);
                    }} className="font-bold px-6 py-3 rounded-lg transition-transform active:scale-95"
                        style={{ background: isCancelled ? "#ba2c2c" : "#8b1a1a", color: "white" }}>
                        {isCancelled ? "Ausblenden & neue Bestellung aufgeben" : "Meldung schließen"}
                    </button>
                </div>
            </div>
        );
    }

    const timeString = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date(order.pickup_time));
    const statusStyle = getStatusColorWrapper(order.status);

    return (
        <div className="bg-[#fffdf9] p-6 rounded-2xl shadow-lg border-2 mb-8 max-w-3xl mx-auto mt-4 transition-all" style={{ borderColor: "#8b1a1a" }}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: "#1a1008" }}>Deine Bestellung</h2>
                    <p className="text-sm font-medium mt-1" style={{ color: "#5c4a32" }}>Bon: <span className="font-bold text-lg" style={{ color: "#8b1a1a" }}>{order.short_id}</span></p>
                    {order.dining_option && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-bold border"
                            style={{
                                background: order.dining_option === "dine-in" ? "#eff6ff" : "#f0fdf4",
                                borderColor: order.dining_option === "dine-in" ? "#bfdbfe" : "#bbf7d0",
                                color: order.dining_option === "dine-in" ? "#1e40af" : "#166534"
                            }}
                        >
                            {order.dining_option === "dine-in" ? "🍽️ Vor Ort essen" : "🏠 Zum Mitnehmen"}
                        </span>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#5c4a32" }}>Abholzeit</p>
                    <p className="text-3xl font-bold" style={{ color: "#8b1a1a" }}>{timeString}</p>
                </div>
            </div>

            <div className={`p-4 rounded-xl border-2 ${statusStyle.animate || ""} mb-6 flex justify-between items-center`}
                style={{ background: statusStyle.bg, border: "2px solid", borderColor: statusStyle.border, color: statusStyle.text }}>
                <span className="font-bold text-lg">{getStatusText(order.status)}</span>
                {order.status === "READY" && <span className="text-2xl">🏃‍♂️💨</span>}
                {order.status === "PENDING" && <span className="text-2xl">⏳</span>}
                {order.status === "ACCEPTED" && <span className="text-2xl">👨‍🍳</span>}
            </div>

            <div className="space-y-3">
                <h3 className="font-bold uppercase text-xs p-2 rounded-lg" style={{ background: "#f5f0e8", color: "#5c4a32" }}>Bestelldetails</h3>
                <ul className="pl-2">
                    {order.items.map((item: any) => {
                        const modifierNames = item.modifiers?.map((m: any) => m.modifier?.name).filter(Boolean) ?? [];
                        return (
                            <li key={item.id} className="py-2 border-b" style={{ borderColor: "#f5f0e8", color: "#1a1008" }}>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-bold text-base shrink-0">{item.quantity}x</span>
                                    <span className="text-sm font-medium">{item.product.name}</span>
                                </div>
                                {modifierNames.length > 0 && (
                                    <p className="text-xs mt-0.5 ml-6" style={{ color: "#8b6a3e" }}>
                                        {modifierNames.join(", ")}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>

            {order.status === "PENDING" && (
                <div className="mt-4">
                    <button
                        onClick={() => setShowCancelModal(true)}
                        disabled={cancelling}
                        className="w-full py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50"
                        style={{ borderColor: "#e8b4b4", color: "#7a1a1a", background: "#fdf0f0" }}
                    >
                        {cancelling ? "Wird storniert..." : "Bestellung stornieren"}
                    </button>
                </div>
            )}

            <div className="mt-4 pt-4 border-t" style={{ borderColor: "#ddd0b8" }}>
                <p className="text-right font-medium text-sm" style={{ color: "#5c4a32" }}>Summe: <span className="text-xl font-bold ml-2" style={{ color: "#8b1a1a" }}>{order.total_price.toFixed(2)} €</span></p>
                <p className="text-right text-[10px] mt-1" style={{ color: "#5c4a32" }}>Zahlung vor Ort (Bar / Karte)</p>
            </div>

            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full" style={{ border: "4px solid #fecaca" }}>
                        <div className="text-center">
                            <span className="text-5xl mb-4 block">🗑️</span>
                            <h3 className="text-2xl font-black mb-2" style={{ color: "#1a1008" }}>Bestellung stornieren?</h3>
                            <p className="mb-8 font-medium" style={{ color: "#5c4a32" }}>
                                Möchtest du deine Bestellung wirklich stornieren? Dieser Vorgang kann nicht rükgängig gemacht werden.
                            </p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    className="flex-1 py-4 font-bold rounded-xl transition-all" style={{ backgroundColor: "#f3f4f6", color: "#374151" }}
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={cancelOrder}
                                    className="flex-1 py-4 font-bold text-white rounded-xl transition-all shadow-lg"
                                    style={{ background: "#8b1a1a", boxShadow: "0 10px 15px -3px rgba(139, 26, 26, 0.3)" }}
                                >
                                    Ja, stornieren
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
