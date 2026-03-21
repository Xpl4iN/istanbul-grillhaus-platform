"use client";
import { useEffect, useState, useRef } from "react";

export default function AdminDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const cancelAudioRef = useRef<HTMLAudioElement | null>(null);
    const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
    const [blacklistModalOrder, setBlacklistModalOrder] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(true);
    const prevOrdersRef = useRef<any[]>([]);
    const isAudioEnabledRef = useRef(false);
    const pendingStatusRef = useRef<Record<string, string>>({});
    const updatingOrderIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const res = await fetch("/api/admin/orders?t=" + Date.now(), { cache: 'no-store' });
                const data = await res.json();
                const fetchedOrders = data.orders || [];

                if (prevOrdersRef.current.length > 0) {
                    const newOrders = fetchedOrders.filter((fo: any) => !prevOrdersRef.current.some((po: any) => po.id === fo.id) && fo.status === 'PENDING');
                    const cancelledOrders = fetchedOrders.filter((fo: any) => {
                        const old = prevOrdersRef.current.find((po: any) => po.id === fo.id);
                        return old && old.status !== 'CANCELLED' && fo.status === 'CANCELLED';
                    });

                    if (newOrders.length > 0 && isAudioEnabledRef.current) {
                        if (audioRef.current) {
                            audioRef.current.currentTime = 0;
                            audioRef.current.play().catch(() => { });
                        }
                    }
                    if (cancelledOrders.length > 0 && isAudioEnabledRef.current) {
                        if (cancelAudioRef.current) {
                            cancelAudioRef.current.currentTime = 0;
                            cancelAudioRef.current.play().catch(() => { });
                        }
                    }
                }

                const mergedOrders = fetchedOrders.map((order: any) => {
                    const pendingStatus = pendingStatusRef.current[order.id];
                    if (pendingStatus && order.status !== pendingStatus) {
                        return { ...order, status: pendingStatus };
                    }
                    if (pendingStatus && order.status === pendingStatus) {
                        delete pendingStatusRef.current[order.id];
                    }
                    return order;
                });

                prevOrdersRef.current = mergedOrders;
                setOrders(mergedOrders);
            } catch (e) { console.error("Poll Error:", e); }
        };
        fetchInitial();

        // Polling heavily fixes Vercel SSE isolation issues entirely.
        const pollInterval = setInterval(fetchInitial, 3000);

        // We technically still do SSE for instant fallback if running on long-lived server,
        // but it strictly updates state. Audio logic is safely handled by diff above.
        const eventSource = new EventSource('/api/admin/stream');

        eventSource.onopen = () => setIsConnected(true);
        eventSource.onerror = () => setIsConnected(false);

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_ORDER' || data.type === 'CANCEL_ORDER') {
                fetchInitial();
            }
        };

        return () => {
            clearInterval(pollInterval);
            eventSource.close();
        };
    }, []);

    const startShift = () => {
        setIsAudioEnabled(true);
        isAudioEnabledRef.current = true;

        const unlockAudio = (audioElementRef: React.MutableRefObject<HTMLAudioElement | null>) => {
            if (audioElementRef && audioElementRef.current) {
                audioElementRef.current.volume = 0;
                audioElementRef.current.play().then(() => {
                    if (audioElementRef.current) {
                        audioElementRef.current.pause();
                        audioElementRef.current.currentTime = 0;
                        audioElementRef.current.volume = 1;
                    }
                }).catch(() => { });
            }
        };

        unlockAudio(audioRef);
        unlockAudio(cancelAudioRef);
    };


    const deleteOrder = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setOrders(prev => prev.filter(o => o.id !== id));
            } else {
                alert("Fehler beim Löschen.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        if (updatingOrderIdsRef.current.has(id)) {
            return;
        }
        updatingOrderIdsRef.current.add(id);
        const previousStatus = prevOrdersRef.current.find((o: any) => o.id === id)?.status;
        const rollbackStatus = () => {
            delete pendingStatusRef.current[id];
            if (!previousStatus) return;
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: previousStatus } : o));
            prevOrdersRef.current = prevOrdersRef.current.map((o: any) => o.id === id ? { ...o, status: previousStatus } : o);
        };
        pendingStatusRef.current[id] = newStatus;
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        prevOrdersRef.current = prevOrdersRef.current.map((o: any) => o.id === id ? { ...o, status: newStatus } : o);
        let hasError = false;
        try {
            const res = await fetch(`/api/admin/orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) {
                rollbackStatus();
                hasError = true;
            }
        } catch {
            rollbackStatus();
            hasError = true;
        } finally {
            updatingOrderIdsRef.current.delete(id);
            if (hasError) {
                alert(`Fehler beim Status-Update für Bestellung ${id}. Bitte erneut versuchen.`);
            }
        }
    };

    const handleBlacklist = async (order: any) => {


        try {
            const response = await fetch('/api/admin/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    reason: 'No-Show (Manuell über Dashboard blockiert)'
                })
            });

            if (response.ok) {
                updateStatus(order.id, 'NO_SHOW');
            } else {
                alert('Fehler beim Blockieren. Bitte Chef rufen.');
            }
        } catch (error) {
            console.error('API Error:', error);
        }
    };

    return (
        <>
            <audio ref={audioRef} src="/audio/New_Order_Sound.mp3" preload="auto" />
            <audio ref={cancelAudioRef} src="/audio/Order_Cancelled_Sound.mp3" preload="auto" />

            {!isAudioEnabled ? (
                <div className="h-screen flex items-center justify-center bg-gray-900">
                    <button
                        onClick={startShift}
                        className="bg-green-500 hover:bg-green-400 text-white text-4xl font-bold py-12 px-24 rounded-3xl shadow-2xl animate-pulse transition"
                    >
                        👆 Schicht starten & Bestell-Alarm aktivieren
                    </button>
                </div>
            ) : (
                <div className="p-8 bg-gray-100 min-h-screen">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-4xl font-black text-gray-900">Aktuelle Bestellungen</h1>
                        <div className={`px-6 py-3 rounded-full font-bold flex items-center gap-3 shadow-sm transition-all ${isConnected
                                ? 'bg-green-100/50 border border-green-200 text-green-800'
                                : 'bg-red-100/50 border border-red-200 text-red-800'
                            }`}>
                            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-ping'}`}>
                            </span>
                            SSE Live Stream {isConnected ? 'aktiv' : 'getrennt'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {orders.filter(o => !['COMPLETED', 'NO_SHOW', 'DELETED'].includes(o.status)).map(order => (
                            <div key={order.id} className={`rounded-xl shadow-lg border-l-8 p-4 flex flex-col gap-2 relative overflow-hidden ${order.status === "CANCELLED" ? "bg-red-50 border-red-600 opacity-90" : "bg-white border-yellow-400"}`}>

                                {order.status === 'READY' && <div className="absolute top-0 right-0 bg-green-500 text-white font-bold px-4 py-1 rounded-bl-xl text-sm shadow-sm z-10">ABHOLBEREIT</div>}
                                {order.status === 'ACCEPTED' && <div className="absolute top-0 right-0 bg-blue-500 text-white font-bold px-4 py-1 rounded-bl-xl text-sm shadow-sm z-10">IN ZUBEREITUNG</div>}
                                {order.status === 'PENDING' && <div className="absolute top-0 right-0 bg-yellow-500 text-white font-bold px-4 py-1 rounded-bl-xl text-sm shadow-sm z-10">NEU</div>}

                                <div className="flex justify-between items-start pt-2">
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 leading-none">#{order.short_id}</h2>
                                        <p className="text-sm text-gray-600 font-medium mt-1 leading-tight">
                                            {order.customerName} • {order.phone}
                                        </p>
                                        <p className="text-red-700 font-bold text-sm mt-1 bg-red-50/80 inline-block px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap">
                                            ZAHLT VOR ORT: {Number(order.total_price).toFixed(2)} €
                                        </p>
                                        {order.dining_option && (
                                            <div className="mt-1.5">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black border ${order.dining_option === 'dine-in'
                                                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                                                    : 'bg-green-50 border-green-200 text-green-800'
                                                    }`}>
                                                    {order.dining_option === 'dine-in' ? '🍽️ Vor Ort' : '🏠 Mitnehmen'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500 uppercase tracking-wide font-bold">Abholung</span>
                                        <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{order.pickup_time}</p>
                                    </div>
                                </div>

                                <hr className="my-2 border-gray-100" />

                                <div className="text-lg font-medium leading-snug flex-1">
                                    <ul className="list-disc pl-5 marker:text-gray-300">
                                        {order.items.map((item: any, idx: number) => (
                                            <li key={idx} className="mb-1">
                                                <span className="font-extrabold text-gray-900">{item.quantity}x {item.productName}</span>
                                                {item.modifiers?.length > 0 && (
                                                    <span className="block text-sm text-red-600 ml-2 font-bold bg-red-50 px-2 py-0.5 rounded-md mt-0.5 border border-red-100 leading-tight inline-block">
                                                        ➢ {item.modifiers.map((m: any) => m.name).join(', ')}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                                    {order.status === 'PENDING' && (
                                        <button onClick={() => updateStatus(order.id, 'ACCEPTED')} className="flex-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 active:scale-95 text-white text-lg font-bold py-3 rounded-lg transition-all shadow-sm">
                                            Zubereiten
                                        </button>
                                    )}
                                    {order.status === 'ACCEPTED' && (
                                        <button onClick={() => updateStatus(order.id, 'READY')} className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white text-lg font-bold py-3 rounded-lg transition-all shadow-sm">
                                            ✅ Essen ist fertig
                                        </button>
                                    )}
                                    {order.status === 'READY' && (
                                        <button onClick={() => updateStatus(order.id, 'COMPLETED')} className="flex-1 bg-gray-800 hover:bg-gray-900 active:bg-black active:scale-95 text-white text-lg font-bold py-3 rounded-lg transition-all shadow-sm">
                                            Abgegeben (Erledigt)
                                        </button>
                                    )}
                                    {order.status === 'CANCELLED' && (
                                        <button onClick={() => setDeleteModalId(order.id)} className="flex-1 bg-red-800 hover:bg-red-900 active:bg-black active:scale-95 text-white text-lg font-bold py-3 rounded-lg transition-all shadow-sm">
                                            🗑️ Löschen (Erledigt)
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setBlacklistModalOrder(order)}
                                        className="bg-gray-100 hover:bg-red-50 active:bg-red-600 active:scale-95 text-gray-400 hover:text-red-600 hover:border-red-200 border border-transparent text-base font-bold py-3 px-2 rounded-lg transition-all w-[60px] flex items-center justify-center text-center leading-tight hover:shadow-inner"
                                    >
                                        🚨
                                    </button>
                                </div>
                            </div>
                        ))}

                        {orders.length === 0 && (
                            <div className="col-span-full h-[40vh] flex flex-col items-center justify-center text-gray-400 border-4 border-dashed border-gray-200 rounded-3xl">
                                <span className="text-6xl mb-4 opacity-50">🍽️</span>
                                <p className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-400 to-gray-300">Warten auf hungrige Kunden...</p>
                            </div>
                        )}
                    </div>

                    {deleteModalId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-red-100">
                                <div className="text-center">
                                    <span className="text-5xl mb-4 block">🗑️</span>
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Bon löschen?</h3>
                                    <p className="text-gray-600 mb-8 font-medium">Bist du sicher, dass du diesen stornierten Bon endgültig aus der Kasse entfernen willst?</p>
                                    <div className="flex gap-4">
                                        <button onClick={() => setDeleteModalId(null)} className="flex-1 py-4 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">Abbrechen</button>
                                        <button onClick={() => { deleteOrder(deleteModalId); setDeleteModalId(null); }} className="flex-1 py-4 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-lg shadow-red-200">Endgültig löschen</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {blacklistModalOrder && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-gray-900">
                                <div className="text-center">
                                    <span className="text-5xl mb-4 block">🚨</span>
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Kunde blockieren?</h3>
                                    <p className="text-gray-600 mb-2 font-medium">Willst du <strong>{blacklistModalOrder.customerName}</strong> ({blacklistModalOrder.phone}) wirklich dauerhaft blockieren?</p>
                                    <p className="text-sm text-red-500 mb-8 font-bold bg-red-50 py-2 rounded-lg">Achtung: Er kann dann nicht mehr bestellen!</p>
                                    <div className="flex gap-4">
                                        <button onClick={() => setBlacklistModalOrder(null)} className="flex-1 py-4 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">Abbrechen</button>
                                        <button onClick={() => { handleBlacklist(blacklistModalOrder); setBlacklistModalOrder(null); }} className="flex-1 py-4 font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition-all shadow-lg shadow-gray-400">Ja, blockieren!</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}
