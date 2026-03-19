"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCartStore } from "@/store/cartStore";

const DiningTile = ({
    icon,
    label,
    sublabel,
    selected,
    onClick,
}: {
    icon: string;
    label: string;
    sublabel: string;
    selected: boolean;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={`
            relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2
            transition-all duration-200 cursor-pointer w-full text-center
            ${selected
                ? "border-[#8b1a1a] bg-[#8b1a1a] text-white shadow-lg scale-[1.03]"
                : "border-[#ddd0b8] bg-[#fffdf9] text-[#1a1008] hover:border-[#8b1a1a] hover:bg-[#fdf5ee]"
            }
        `}
    >
        {selected && (
            <span className="absolute top-2 right-2 text-xs bg-white/20 rounded-full px-1.5 py-0.5 font-bold">✓</span>
        )}
        <span className="text-3xl">{icon}</span>
        <span className="font-bold text-sm leading-tight">{label}</span>
        <span className={`text-xs leading-tight ${selected ? "text-white/80" : "text-[#5c4a32]"}`}>{sublabel}</span>
    </button>
);

export default function Checkout({ onComplete, features = {} }: { onComplete: () => void, features?: any }) {
    const { items, getTotal, clearCart, isTestMode, diningOption, setDiningOption } = useCartStore();
    const router = useRouter();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [time, setTime] = useState("");
    const [customTime, setCustomTime] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tip, setTip] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'stripe'>('cash');

    const allowPickup = features.allowPickup ?? true;
    const allowDineIn = features.allowDineIn ?? false;
    
    // Automatically select an option if only one is available and none provided yet
    useEffect(() => {
        if (!diningOption) {
            if (allowPickup && !allowDineIn) setDiningOption("takeaway");
            else if (allowDineIn && !allowPickup) setDiningOption("dine-in");
        }
    }, [diningOption, allowPickup, allowDineIn, setDiningOption]);

    const allowPickup = features.allowPickup ?? true;
    const allowDineIn = features.allowDineIn ?? false;
    
    // Automatically select an option if only one is available and none provided yet
    useEffect(() => {
        if (!diningOption) {
            if (allowPickup && !allowDineIn) setDiningOption("takeaway");
            else if (allowDineIn && !allowPickup) setDiningOption("dine-in");
        }
    }, [diningOption, allowPickup, allowDineIn, setDiningOption]);

    useEffect(() => {
        if (isTestMode) {
            setName("Testuser");
            setPhone("01701234567");
        } else {
            setName("");
            setPhone("");
        }
    }, [isTestMode]);

    const ENABLE_TIPS = false;

    const timeOptions = useMemo(() => {
        const options = [];
        const now = new Date();

        const firstPickupToday = new Date(now);
        firstPickupToday.setHours(10, 30, 0, 0);

        let startTime = new Date(now.getTime() + 20 * 60000);

        if (startTime < firstPickupToday && !isTestMode) {
            startTime = new Date(firstPickupToday);
        }

        const remainder = startTime.getMinutes() % 15;
        if (remainder !== 0) {
            startTime = new Date(startTime.getTime() + (15 - remainder) * 60000);
        }

        if (now.getTime() + 20 * 60000 >= firstPickupToday.getTime() || isTestMode) {
            options.push({ label: "Wird sofort abgeholt (ca. 15-20 Min)", value: "ASAP" });
        }

        const endTime = new Date(startTime.getTime() + 90 * 60000);
        let current = new Date(startTime);

        while (current <= endTime) {
            const h = current.getHours().toString().padStart(2, "0");
            const m = current.getMinutes().toString().padStart(2, "0");
            options.push({ label: `${h}:${m} Uhr`, value: current.toISOString() });
            current = new Date(current.getTime() + 15 * 60000);
        }
        options.push({ label: "Andere Zeit...", value: "CUSTOM" });
        return options;
    }, [isTestMode]);

    const nowCheck = new Date();
    const orderStartToday = new Date(nowCheck);
    orderStartToday.setHours(9, 0, 0, 0);
    const isOrderingAllowed = nowCheck >= orderStartToday || isTestMode;

    if (!isOrderingAllowed) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-xl space-y-4 text-center">
                <h2 className="text-xl font-bold">Kasse noch geschlossen</h2>
                <p className="text-sm">Wir nehmen Vorbestellungen für heute erst ab <strong>09:00 Uhr</strong> für Abholungen ab 10:30 Uhr entgegen.</p>
            </div>
        );
    }

    const handleOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!diningOption) {
            alert("Bitte wählen Sie, ob Sie Vor-Ort essen oder mitnehmen möchten.");
            return;
        }
        if (!turnstileToken && !isTestMode) {
            alert("Bitte bestätigen Sie, dass Sie ein Mensch sind.");
            return;
        }

        let finalPickupTime: string;
        if (time === "ASAP") {
            finalPickupTime = new Date(new Date().getTime() + 20 * 60000).toISOString();
        } else if (time === "CUSTOM") {
            if (!customTime) {
                alert("Bitte gib eine Uhrzeit ein.");
                return;
            }
            const [hh, mm] = customTime.split(":").map(Number);
            const d = new Date();
            d.setHours(hh, mm, 0, 0);
            finalPickupTime = d.toISOString();
        } else {
            finalPickupTime = time;
        }

        const orderPayload = {
            items,
            customer: { name, phone },
            pickup_time: finalPickupTime,
            total_price: getTotal() + tip,
            tip_amount: tip,
            dining_option: diningOption,
            turnstile_token: isTestMode ? "mock-token-for-dev" : turnstileToken,
        };

        setIsSubmitting(true);
        try {
            if (paymentMethod === 'stripe') {
                // --- Stripe online payment ---
                const res = await fetch("/api/stripe/create-checkout-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderPayload),
                });
                const data = await res.json();
                if (!res.ok) {
                    alert("Stripe-Fehler: " + data.error);
                    return;
                }
                // Redirect to Stripe Checkout – cart will be cleared on success page
                window.location.href = data.url;
            } else {
                // --- Pay at pickup (existing flow) ---
                const res = await fetch("/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(orderPayload),
                });
                const data = await res.json();
                if (!res.ok) {
                    alert("Error: " + data.error + (data.details ? "\nDetails: " + data.details : ""));
                    return;
                }
                window.dispatchEvent(new Event("orderPlaced"));
                clearCart();
                window.scrollTo({ top: 0, behavior: "smooth" });
                onComplete();
            }
        } catch (e) {
            alert("Fehler bei der Bestellung.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-[#fffdf9] p-6 rounded-2xl shadow-xl space-y-5 border border-[#ddd0b8]">
            {features.maintenanceMode ? (
                <div className="p-4 bg-orange-50 border-orange-200 border rounded-xl text-center">
                    <h3 className="font-bold text-orange-800 text-lg mb-2">Vorübergehend pausiert</h3>
                    <p className="text-sm text-orange-900">
                        Wir erhalten gerade sehr viele Bestellungen und müssen kurz pausieren. 
                        Bitte versuchen Sie es in ein paar Minuten nochmal.
                    </p>
                </div>
            ) : (
                <>
            <h2 className="text-xl font-bold text-[#1a1008]">Checkout</h2>
            <form onSubmit={handleOrder} className="space-y-5">

                {/* Dining Option Tiles */}
                {(allowPickup || allowDineIn) && (
                    <div>
                        <label className="block text-sm font-semibold text-[#1a1008] mb-2">
                            Wie möchten Sie essen?
                            <span className="text-[#8b1a1a] ml-1">*</span>
                        </label>
                        <div className={`grid gap-3 ${allowPickup && allowDineIn ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {allowPickup && (
                                <DiningTile
                                    icon="🏠"
                                    label="Mitnehmen"
                                    sublabel="Zum Mitnehmen verpackt"
                                    selected={diningOption === "takeaway"}
                                    onClick={() => setDiningOption("takeaway")}
                                />
                            )}
                            {allowDineIn && (
                                <DiningTile
                                    icon="🍽️"
                                    label="Vor Ort"
                                    sublabel="Im Restaurant essen"
                                    selected={diningOption === "dine-in"}
                                    onClick={() => setDiningOption("dine-in")}
                                />
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-[#1a1008]">Vorname</label>
                    <input required value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full mt-1 p-2.5 border border-[#ddd0b8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30" placeholder="Max" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[#1a1008]">Handynummer</label>
                    <input required value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="w-full mt-1 p-2.5 border border-[#ddd0b8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30" placeholder="+49 170 1234567" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[#1a1008]">Wunsch-Abholzeit</label>
                    <select required value={time} onChange={(e) => setTime(e.target.value)} className="w-full mt-1 p-2.5 border border-[#ddd0b8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30">
                        <option value="">Bitte wählen...</option>
                        {timeOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {time === "CUSTOM" && (
                    <div>
                        <label className="block text-sm font-medium text-[#1a1008]">Uhrzeit eingeben</label>
                        <input type="time" required value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="w-full mt-1 p-2.5 border border-[#ddd0b8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8b1a1a]/30" />
                    </div>
                )}

                {ENABLE_TIPS && (
                    <div className="pt-2">
                        <label className="block text-sm font-medium mb-2 text-[#1a1008]">Trinkgeld (Optional)</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[0, 1, 2, getTotal() * 0.1].map((amt, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setTip(amt)}
                                    className={`py-2 px-1 text-sm rounded-xl border ${tip === amt ? 'bg-[#8b1a1a] text-white border-[#8b1a1a]' : 'bg-white text-[#5c4a32] border-[#ddd0b8] hover:bg-[#fdf5ee]'}`}
                                >
                                    {idx === 0 ? "Keines" : idx === 3 ? "10%" : amt.toFixed(2) + " €"}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!isTestMode && (
                    <div id="turnstile-container" className="flex justify-center my-2">
                        <Script
                            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                            strategy="lazyOnload"
                            onLoad={() => {
                                (window as any).turnstile?.render("#turnstile-container", {
                                    sitekey: typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "1x00000000000000000000AA" : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
                                    callback: (token: string) => setTurnstileToken(token),
                                    "expired-callback": () => setTurnstileToken(""),
                                    "error-callback": () => setTurnstileToken(""),
                                });
                            }}
                        />
                    </div>
                )}
                {isTestMode && (
                    <div className="p-3 bg-red-50 text-red-800 text-sm rounded-xl text-center font-bold border border-red-200">
                        ⚠️ Testmodus aktiv (Cloudflare umgangen)
                    </div>
                )}

                {/* Payment Method Selector */}
                <div>
                    <label className="block text-sm font-semibold text-[#1a1008] mb-2">
                        Zahlungsart
                        <span className="text-[#8b1a1a] ml-1">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('cash')}
                            className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-center ${
                                paymentMethod === 'cash'
                                    ? 'border-[#8b1a1a] bg-[#8b1a1a] text-white shadow-lg scale-[1.03]'
                                    : 'border-[#ddd0b8] bg-[#fffdf9] text-[#1a1008] hover:border-[#8b1a1a] hover:bg-[#fdf5ee]'
                            }`}
                        >
                            {paymentMethod === 'cash' && (
                                <span className="absolute top-2 right-2 text-xs bg-white/20 rounded-full px-1.5 py-0.5 font-bold">✓</span>
                            )}
                            <span className="text-2xl">💵</span>
                            <span className="font-bold text-sm">Bar / Karte</span>
                            <span className={`text-xs ${paymentMethod === 'cash' ? 'text-white/80' : 'text-[#5c4a32]'}`}>Bei Abholung</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentMethod('stripe')}
                            className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer text-center ${
                                paymentMethod === 'stripe'
                                    ? 'border-[#8b1a1a] bg-[#8b1a1a] text-white shadow-lg scale-[1.03]'
                                    : 'border-[#ddd0b8] bg-[#fffdf9] text-[#1a1008] hover:border-[#8b1a1a] hover:bg-[#fdf5ee]'
                            }`}
                        >
                            {paymentMethod === 'stripe' && (
                                <span className="absolute top-2 right-2 text-xs bg-white/20 rounded-full px-1.5 py-0.5 font-bold">✓</span>
                            )}
                            <span className="text-2xl">💳</span>
                            <span className="font-bold text-sm">Online zahlen</span>
                            <span className={`text-xs ${paymentMethod === 'stripe' ? 'text-white/80' : 'text-[#5c4a32]'}`}>Karte / PayPal</span>
                        </button>
                    </div>
                    {paymentMethod === 'stripe' && (
                        <p className="mt-2 text-xs text-[#5c4a32] bg-[#fdf5ee] border border-[#ddd0b8] rounded-xl p-2 text-center">
                            🔒 Sichere Zahlung via Stripe · Du wirst zur Checkout-Seite weitergeleitet
                        </p>
                    )}
                    {paymentMethod === 'cash' && (
                        <p className="mt-2 text-xs text-[#5c4a32] bg-blue-50 border border-blue-100 rounded-xl p-2 text-center">
                            💵 Zahlung erfolgt in bar oder per Karte bei Abholung
                        </p>
                    )}
                </div>

                <button
                    disabled={isSubmitting || items.length === 0 || !diningOption}
                    type="submit"
                    className="w-full py-3 bg-[#8b1a1a] text-white font-bold rounded-xl disabled:opacity-40 hover:bg-[#6e1313] transition-colors"
                >
                    {isSubmitting
                        ? (paymentMethod === 'stripe' ? 'Weiterleitung zu Stripe...' : 'Wird gesendet...')
                        : paymentMethod === 'stripe'
                            ? `Jetzt online bezahlen (${(getTotal() + tip).toFixed(2)} €) →`
                            : `Kostenpflichtig bestellen (${(getTotal() + tip).toFixed(2)} €)`
                    }
                </button>
            </form>
            </>
            )}
        </div>
    );
}
