"use client";
import { useEffect, useState, useRef, useMemo } from "react";

const OrderCard = ({ 
    order, 
    updateStatus, 
    deleteOrder, 
    setBlacklistModalOrder 
}: { 
    order: any, 
    updateStatus: (id: string, s: string) => void,
    deleteOrder: (id: string) => void,
    setBlacklistModalOrder: (o: any) => void
}) => (
    <div key={order.id} className={`rounded-xl shadow-lg border-l-8 p-3 flex flex-col gap-1 relative ${order.status === "CANCELLED" ? "bg-red-50 border-red-600" : "bg-white border-yellow-400"}`}>
        {order.status === 'CANCELLED' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden rounded-xl">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 border-red-600/40 px-6 py-2 rounded-xl">
                    <span className="text-4xl font-black text-red-600/30 uppercase tracking-[0.2em]">Storniert</span>
                </div>
            </div>
        )}

        <div className="flex gap-2 mb-2">
            {order.status === 'PENDING' && (
                <button onClick={() => updateStatus(order.id, 'ACCEPTED')} className="flex-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 active:scale-95 text-white text-lg font-bold py-3 rounded-lg transition-all shadow-sm">
                    Zubereiten
                </button>
            )}
            {order.status === 'ACCEPTED' && (
                <button onClick={() => updateStatus(order.id, 'READY')} className="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 active:scale-95 text-white text-lg font-bold py-3 rounded-lg transition-all shadow-sm">
                    ✅ Essen fertig
                </button>
            )}
            {order.status === 'READY' && (
                <button onClick={() => updateStatus(order.id, 'COMPLETED')} className="flex-1 bg-gray-800 hover:bg-gray-900 active:bg-black active:scale-95 text-white text-lg font-bold py-3 rounded-lg transition-all shadow-sm">
                    Abgegeben
                </button>
            )}
            {order.status === 'CANCELLED' && (
                <button onClick={() => deleteOrder(order.id)} className="flex-1 bg-red-800 hover:bg-red-900 active:bg-black active:scale-95 text-white text-lg font-bold py-3 rounded-lg transition-all shadow-sm">
                    🗑️ Löschen
                </button>
            )}
            <button
                onClick={() => setBlacklistModalOrder(order)}
                className="bg-gray-100 hover:bg-red-50 text-xl font-bold p-3 rounded-lg transition-all shadow-sm w-14 flex items-center justify-center border border-gray-200"
                title="Kunde blockieren"
            >
                🚨
            </button>
        </div>

        <div className="flex justify-between items-start pt-2 gap-2 border-t border-gray-100">
            <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-black text-gray-900 leading-none">#{order.short_id}</h2>
                <p className="text-[10px] text-gray-600 font-medium mt-0.5 leading-tight truncate">
                    {order.customerName} • {order.phone}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                    <span className="text-red-700 font-bold text-[9px] bg-red-50/80 px-1 py-0.5 rounded border border-red-100 whitespace-nowrap">
                        {order.payment_method === 'online' ? 'PAID' : 'CASH'}
                    </span>
                    {order.dining_option && (
                        <span className={`inline-flex items-center gap-1 px-1 py-0.5 rounded-full text-[9px] font-black border ${order.dining_option === 'dine-in' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
                            {order.dining_option === 'dine-in' ? '🍽️' : '🏠'}
                        </span>
                    )}
                </div>
            </div>
            <div className="text-right shrink-0">
                <span className="text-[9px] text-gray-400 uppercase tracking-wide font-bold">Ziel</span>
                <p className="text-xl font-black text-red-600 tracking-tighter leading-none">{order.pickup_time}</p>
            </div>
        </div>

        <hr className="my-1 border-gray-100" />

        <div className="text-base font-medium leading-tight flex-1 py-0.5 overflow-hidden">
            <ul className="list-disc pl-4 marker:text-gray-300">
                {order.items.map((item: any, idx: number) => (
                    <li key={idx} className="mb-0.5">
                        <span className="font-bold text-gray-900 text-sm">{item.quantity}x {item.productName}</span>
                        {item.modifiers?.length > 0 && (
                            <span className="block text-[11px] text-red-600 ml-1 font-bold bg-red-50 px-1 py-0.5 rounded mt-0.5 border border-red-100 leading-tight inline-block italic">
                                {item.modifiers.map((m: any) => m.name).join(', ')}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

export default function AdminDashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isAudioEnabled, setIsAudioEnabled] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const cancelAudioRef = useRef<HTMLAudioElement | null>(null);
    const [blacklistModalOrder, setBlacklistModalOrder] = useState<any>(null);
    const [isConnected, setIsConnected] = useState(true);
    const prevOrdersRef = useRef<any[]>([]);
    const isAudioEnabledRef = useRef(false);
    const pendingStatusRef = useRef<Record<string, string>>({});
    const updatingOrderIdsRef = useRef<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'grid' | 'columns'>('grid');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

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

    const sortedVisibleOrders = useMemo(() => {
        return orders
            .filter(o => !['COMPLETED', 'NO_SHOW', 'DELETED'].includes(o.status))
            .sort((a, b) => {
                const timeA = a.pickup_time || "00:00";
                const timeB = b.pickup_time || "00:00";
                if (timeA === "ASAP" && timeB === "ASAP") return 0;
                if (timeA === "ASAP") return -1;
                if (timeB === "ASAP") return 1;
                return timeA.localeCompare(timeB);
            });
    }, [orders]);

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
                <div className="h-screen w-full bg-gray-100 flex flex-col overflow-hidden">
                    {/* Compact Header */}
                    <header className="relative bg-white border-b border-gray-200 px-4 py-1.5 flex items-center justify-between shrink-0 shadow-sm z-10">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">ISTANBUL GRILLHAUS</h1>
                            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-1 rounded-md text-[11px] font-black transition-all ${viewMode === 'grid' ? 'bg-yellow-400 text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    LISTE
                                </button>
                                <button
                                    onClick={() => setViewMode('columns')}
                                    className={`px-3 py-1 rounded-md text-[11px] font-black transition-all ${viewMode === 'columns' ? 'bg-yellow-400 text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    SPALTEN
                                </button>
                            </div>
                        </div>

                        {/* Digital Clock centered */}
                        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                            <span className="text-2xl font-black text-gray-900 tabular-nums tracking-tighter leading-none">
                                {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                {currentTime.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </span>
                        </div>

                        <div className={`px-3 py-1.5 rounded-full font-bold flex items-center gap-2 text-[10px] uppercase tracking-wider ${isConnected
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-ping'}`}></span>
                            {isConnected ? 'LIVE' : 'OFFLINE'}
                        </div>
                    </header>

                    <main className="flex-1 overflow-hidden p-2 sm:p-3">
                        {viewMode === 'grid' ? (
                            <div className="h-full overflow-y-auto no-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 items-start">
                                    {sortedVisibleOrders.map(order => (
                                        <OrderCard key={order.id} order={order} updateStatus={updateStatus} deleteOrder={deleteOrder} setBlacklistModalOrder={setBlacklistModalOrder} />
                                    ))}
                                    {sortedVisibleOrders.length === 0 && (
                                        <div className="col-span-full h-[60vh] flex items-center justify-center text-gray-300 font-bold border-2 border-dashed border-gray-200 rounded-2xl">
                                            Warten auf Bestellungen...
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex h-full gap-3 overflow-hidden">
                                {/* Column 1: NEU */}
                                <div className="flex-1 flex flex-col min-w-[280px] bg-gray-200/50 rounded-xl overflow-hidden border border-gray-200">
                                    <div className="bg-yellow-400 px-3 py-2 flex justify-between items-center shadow-sm">
                                        <h3 className="font-black text-black text-xs uppercase tracking-widest">Neu / Storniert</h3>
                                        <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {sortedVisibleOrders.filter(o => o.status === 'PENDING' || o.status === 'CANCELLED').length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-3 no-scrollbar pb-20">
                                        {sortedVisibleOrders.filter(o => o.status === 'PENDING' || o.status === 'CANCELLED').map(order => (
                                            <OrderCard key={order.id} order={order} updateStatus={updateStatus} deleteOrder={deleteOrder} setBlacklistModalOrder={setBlacklistModalOrder} />
                                        ))}
                                    </div>
                                </div>

                                {/* Column 2: IN ARBEIT */}
                                <div className="flex-1 flex flex-col min-w-[280px] bg-gray-200/50 rounded-xl overflow-hidden border border-gray-200">
                                    <div className="bg-blue-500 px-3 py-2 flex justify-between items-center shadow-sm text-white">
                                        <h3 className="font-black text-xs uppercase tracking-widest">In Arbeit</h3>
                                        <span className="bg-white text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {sortedVisibleOrders.filter(o => o.status === 'ACCEPTED').length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-3 no-scrollbar pb-20">
                                        {sortedVisibleOrders.filter(o => o.status === 'ACCEPTED').map(order => (
                                            <OrderCard key={order.id} order={order} updateStatus={updateStatus} deleteOrder={deleteOrder} setBlacklistModalOrder={setBlacklistModalOrder} />
                                        ))}
                                    </div>
                                </div>

                                {/* Column 3: BEREIT */}
                                <div className="flex-1 flex flex-col min-w-[280px] bg-gray-200/50 rounded-xl overflow-hidden border border-gray-200">
                                    <div className="bg-green-500 px-3 py-2 flex justify-between items-center shadow-sm text-white">
                                        <h3 className="font-black text-xs uppercase tracking-widest">Bereit</h3>
                                        <span className="bg-white text-green-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {sortedVisibleOrders.filter(o => o.status === 'READY').length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 space-y-3 no-scrollbar pb-20">
                                        {sortedVisibleOrders.filter(o => o.status === 'READY').map(order => (
                                            <OrderCard key={order.id} order={order} updateStatus={updateStatus} deleteOrder={deleteOrder} setBlacklistModalOrder={setBlacklistModalOrder} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>


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
