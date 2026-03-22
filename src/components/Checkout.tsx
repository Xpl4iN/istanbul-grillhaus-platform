"use client";
import { useState, useMemo, useEffect } from "react";
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

const PAYMENT_METHOD_CONFIG: Record<string, { icon: string; label: string; sublabel: string }> = {
    local: { icon: "💵💳", label: "Bar / Karte", sublabel: "Zahlung vor Ort bei Abholung" },
    online: { icon: "🌐", label: "Sicher online bezahlen", sublabel: "Sichere Zahlung im Voraus" },
};

export default function Checkout({ onComplete, features = {}, products = [] }: { onComplete: () => void, features?: any, products?: any[] }) {
    const { items, getTotal, clearCart, isTestMode, diningOption, setDiningOption, addItem } = useCartStore();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [time, setTime] = useState("");
    const [customTime, setCustomTime] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tip, setTip] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

    const [showDrinkUpsell, setShowDrinkUpsell] = useState(false);
    const [isDrinksExpanded, setIsDrinksExpanded] = useState(false);

    const allowPickup = features.allowPickup ?? true;
    const allowDineIn = features.allowDineIn ?? false;
    const allowDelivery = features.allowDelivery === true;
    const onlinePayments = features.onlinePayments === true;
    const paymentMethods: string[] = useMemo(
        () => onlinePayments ? ["local", "online"] : ["local"],
        [onlinePayments]
    );
    
    // Automatically select an option if only one is available and none provided yet
    useEffect(() => {
        if (!diningOption) {
            const availableOptions: Array<'takeaway' | 'dine-in' | 'delivery'> = [];
            if (allowPickup) availableOptions.push("takeaway");
            if (allowDineIn) availableOptions.push("dine-in");
            if (allowDelivery) availableOptions.push("delivery");
            if (availableOptions.length === 1) setDiningOption(availableOptions[0]);
        }
    }, [diningOption, allowPickup, allowDineIn, allowDelivery, setDiningOption]);

    // Auto-select payment method if only one is available
    useEffect(() => {
        if (!paymentMethod && paymentMethods.length === 1) {
            setPaymentMethod(paymentMethods[0]);
        }
    }, [paymentMethod, paymentMethods]);

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

    const [shopSettings, setShopSettings] = useState<any>(null);

    useEffect(() => {
        fetch('/api/menu').then(r => r.json()).then(data => {
            if (data.shopSettings) setShopSettings(data.shopSettings);
        });
    }, []);

    const openingHours = useMemo(() => {
        if (!shopSettings?.opening_hours_json) return null;
        try {
            return JSON.parse(shopSettings.opening_hours_json);
        } catch (e) {
            return null;
        }
    }, [shopSettings]);

    const timeOptions = useMemo(() => {
        if (!openingHours) return [];
        const options = [];
        const now = new Date();
        const berlinNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
        
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayIdx = berlinNow.getDay();
        const todayKey = days[currentDayIdx];
        const schedToday = openingHours[todayKey] || openingHours[todayKey.charAt(0).toUpperCase() + todayKey.slice(1)];

        if (!schedToday || !schedToday.open || !schedToday.close) return [];

        const [openH, openM] = schedToday.open.split(':').map(Number);
        const [closeH, closeM] = schedToday.close.split(':').map(Number);

        const firstPickupToday = new Date(berlinNow);
        firstPickupToday.setHours(openH, openM, 0, 0);

        // Add 20 mins preparation lead time
        let startTime = new Date(berlinNow.getTime() + 20 * 60000);

        if (startTime < firstPickupToday && !isTestMode) {
            startTime = new Date(firstPickupToday);
        }

        const remainder = startTime.getMinutes() % 15;
        if (remainder !== 0) {
            startTime = new Date(startTime.getTime() + (15 - remainder) * 60000);
        }

        const closingTimeToday = new Date(berlinNow);
        closingTimeToday.setHours(closeH, closeM, 0, 0);

        // Standard ASAP Option if within hours
        if (berlinNow < closingTimeToday && (berlinNow >= firstPickupToday || isTestMode)) {
            options.push({ label: "Wird sofort abgeholt (ca. 15-20 Min)", value: "ASAP" });
        }

        // Generate slots up to 2 hours in the future, but only within opening hours
        const endRange = new Date(startTime.getTime() + 120 * 60000);
        let current = new Date(startTime);

        while (current <= endRange && current < closingTimeToday) {
            const h = current.getHours().toString().padStart(2, "0");
            const m = current.getMinutes().toString().padStart(2, "0");
            options.push({ label: `${h}:${m} Uhr`, value: current.toISOString() });
            current = new Date(current.getTime() + 15 * 60000);
        }

        if (options.length > 0) {
            options.push({ label: "Andere Zeit...", value: "CUSTOM" });
        }
        return options;
    }, [isTestMode, openingHours]);

    const isOrderingAllowed = useMemo(() => {
        if (isTestMode) return true;
        const now = new Date();
        const berlinNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));
        
        // General limit for today's orders: 09:00 AM
        const orderStartToday = new Date(berlinNow);
        orderStartToday.setHours(9, 0, 0, 0);
        
        // Also check if we already passed today's closing time
        if (!openingHours) return false;
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayKey = days[berlinNow.getDay()];
        const schedToday = openingHours[todayKey] || openingHours[todayKey.charAt(0).toUpperCase() + todayKey.slice(1)];
        
        if (!schedToday?.close) return false;
        const [closeH, closeM] = schedToday.close.split(':').map(Number);
        const closingTimeToday = new Date(berlinNow);
        closingTimeToday.setHours(closeH, closeM, 0, 0);

        return berlinNow >= orderStartToday && berlinNow < closingTimeToday;
    }, [isTestMode, openingHours]);

    if (!isOrderingAllowed && !isTestMode) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-xl space-y-4 text-center border border-red-100">
                <span className="text-4xl">🕒</span>
                <h2 className="text-xl font-bold">Kasse aktuell geschlossen</h2>
                <p className="text-sm text-gray-600">
                    Wir nehmen Bestellungen für heute von <strong>09:00 Uhr</strong> bis zum Ladenschluss entgegen.
                </p>
            </div>
        );
    }

    const handleOrder = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Check for drinks - only trigger upsell if no drinks are in cart
        const hasDrink = items.some(i => i.product.is_drink);
        if (!hasDrink && !showDrinkUpsell) {
            setShowDrinkUpsell(true);
            return;
        }

        if (!diningOption) {
            alert("Bitte wählen Sie, ob Sie Vor-Ort essen oder mitnehmen möchten.");
            return;
        }
        if (paymentMethods.length > 0 && !paymentMethod) {
            alert("Bitte wählen Sie eine Zahlungsmethode.");
            return;
        }
        if (!turnstileToken && !isTestMode) {
            alert("Bitte bestästigen Sie, dass Sie ein Mensch sind.");
            return;
        }

        let finalPickupTime: string;
        const now = new Date();
        const berlinNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }));

        if (time === "ASAP") {
            finalPickupTime = new Date(berlinNow.getTime() + 20 * 60000).toISOString();
        } else if (time === "CUSTOM") {
            if (!customTime) {
                alert("Bitte gib eine Uhrzeit ein.");
                return;
            }
            const [hh, mm] = customTime.split(":").map(Number);
            const d = new Date(berlinNow);
            d.setHours(hh, mm, 0, 0);
            
            // Final check against opening hours
            if (openingHours) {
                const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                const todayKey = days[d.getDay()];
                const schedToday = openingHours[todayKey] || openingHours[todayKey.charAt(0).toUpperCase() + todayKey.slice(1)];
                
                const timeStr = hh.toString().padStart(2, '0') + ':' + mm.toString().padStart(2, '0');
                if (schedToday?.open && (timeStr < schedToday.open || timeStr > schedToday.close)) {
                    alert(`Die gewählte Zeit (${timeStr} Uhr) liegt außerhalb unserer heutigen Öffnungszeiten (${schedToday.open} - ${schedToday.close} Uhr).`);
                    return;
                }
            }
            finalPickupTime = d.toISOString();
        } else {
            finalPickupTime = time;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items,
                    customer: { name, phone },
                    pickup_time: finalPickupTime,
                    total_price: getTotal() + tip,
                    tip_amount: tip,
                    dining_option: diningOption,
                    payment_method: paymentMethod,
                    turnstile_token: isTestMode ? "mock-token-for-dev" : turnstileToken,
                }),
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
        } catch (e) {
            alert("Fehler bei der Bestellung.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeDiningCount = [allowPickup, allowDineIn, allowDelivery].filter(Boolean).length;
    const diningGridCols = activeDiningCount === 3 ? 'grid-cols-3' : activeDiningCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

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
                {(allowPickup || allowDineIn || allowDelivery) && (
                    <div>
                        <label className="block text-sm font-semibold text-[#1a1008] mb-2">
                            Wie möchten Sie essen?
                            <span className="text-[#8b1a1a] ml-1">*</span>
                        </label>
                        <div className={`grid gap-3 ${diningGridCols}`}>
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
                            {allowDelivery && (
                                <DiningTile
                                    icon="🚗"
                                    label="Lieferung"
                                    sublabel="Direkt nach Hause"
                                    selected={diningOption === "delivery"}
                                    onClick={() => setDiningOption("delivery")}
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

                {/* Payment Method Selector */}
                {paymentMethods.length > 0 && (
                    <div>
                        <label className="block text-sm font-semibold text-[#1a1008] mb-2">
                            Zahlungsmethode
                            <span className="text-[#8b1a1a] ml-1">*</span>
                        </label>
                        <div className={`grid gap-3 ${paymentMethods.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {paymentMethods.map((method) => {
                                const config = PAYMENT_METHOD_CONFIG[method];
                                if (!config) return null;
                                return (
                                    <DiningTile
                                        key={method}
                                        icon={config.icon}
                                        label={config.label}
                                        sublabel={config.sublabel}
                                        selected={paymentMethod === method}
                                        onClick={() => setPaymentMethod(method)}
                                    />
                                );
                            })}
                        </div>
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

                <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100">
                    {paymentMethod === 'local'
                        ? 'Hinweis: Zahlung vor Ort (Bar oder Karte) bei Abholung.'
                        : paymentMethod === 'online'
                        ? 'Hinweis: Online-Zahlung – Sie werden nach der Bestellung zum Bezahlen weitergeleitet.'
                        : 'Hinweis: Zahlung erfolgt vor Ort bei Abholung.'}
                </div>

                <button
                    disabled={isSubmitting || items.length === 0 || !diningOption || (paymentMethods.length > 0 && !paymentMethod)}
                    type="submit"
                    className="w-full py-3 bg-[#8b1a1a] text-white font-bold rounded-xl disabled:opacity-40 hover:bg-[#6e1313] transition-colors"
                >
                    {isSubmitting ? "Wird gesendet..." : `Kostenpflichtig bestellen (${(getTotal() + tip).toFixed(2)} €)`}
                </button>
            </form>

            {/* Drink Upsell Popup */}
            {showDrinkUpsell && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className={`bg-[#fffdf9] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border-x-4 border-t-4 sm:border-b-4 border-[#8b1a1a] overflow-hidden transition-all duration-300 ease-out relative ${isDrinksExpanded ? 'max-h-[90vh] overflow-y-auto' : 'max-h-[40vh]'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        {isDrinksExpanded && (
                            <button 
                                onClick={() => {
                                    setShowDrinkUpsell(false);
                                    setIsDrinksExpanded(false);
                                }}
                                className="absolute top-6 right-6 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md text-[#8b1a1a] transition-colors border border-[#8b1a1a]/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        )}

                        <div className="p-8 space-y-6">
                            {!isDrinksExpanded ? (
                                <div className="text-center space-y-6 py-4">
                                    <div className="text-4xl">🥤✨</div>
                                    <h3 className="text-2xl font-black text-[#8b1a1a] leading-tight">Noch ein Getränk dazu?</h3>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDrinksExpanded(true);
                                                // Small delay to ensure the content is rendered before scrolling
                                                setTimeout(() => {
                                                    const el = document.getElementById('upsell-question');
                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 100);
                                            }}
                                            className="w-full py-4 bg-[#8b1a1a] text-white font-bold rounded-2xl shadow-lg hover:bg-[#6e1313] transition-all active:scale-[0.98]"
                                        >
                                            Ja, gerne
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOrder()}
                                            className="w-full py-3 text-[#5c4a32] font-semibold hover:bg-[#fdf5ee] rounded-2xl transition-colors text-sm"
                                        >
                                            Nein danke, Kostenpflichtig bestellen ({(getTotal() + tip).toFixed(2)} €)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 pb-4">
                                    <div id="upsell-question" className="text-center space-y-2 pt-4">
                                        <div className="text-3xl">🥤</div>
                                        <h3 className="text-xl font-black text-[#8b1a1a]">Welches Getränk darf's sein?</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        {products.filter(p => p.is_drink).map(drink => {
                                            const existingItems = items.filter(i => 
                                                i.product_id === drink.id && 
                                                Object.keys(i.modifiers).length === 0
                                            );
                                            const itemCount = existingItems.reduce((sum, i) => sum + i.quantity, 0);
                                            
                                            return (
                                                <div 
                                                    key={drink.id}
                                                    className={`flex items-stretch gap-2 transition-all active:scale-[0.98] ${itemCount > 0 ? 'scale-[1.02]' : ''}`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            addItem({
                                                                product: drink,
                                                                product_id: drink.id,
                                                                quantity: 1,
                                                                price: drink.base_price,
                                                                modifiers: {}
                                                            });
                                                        }}
                                                        className={`flex-1 flex justify-between items-center p-4 bg-white border-2 rounded-2xl transition-all group ${itemCount > 0 ? 'border-[#8b1a1a] bg-[#fffcfc]' : 'border-[#ddd0b8]'}`}
                                                    >
                                                        <div className="text-left flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="font-bold text-base text-[#1a1008] group-hover:text-[#8b1a1a]">{drink.name}</div>
                                                                {itemCount > 0 && (
                                                                    <span className="bg-[#8b1a1a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-in zoom-in duration-200">
                                                                        {itemCount}x
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {drink.deposit_amount && drink.deposit_amount > 0 && (
                                                                <div className="text-[10px] opacity-60 font-medium">Inkl. {drink.deposit_amount.toFixed(2)} € Pfand</div>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0 font-bold text-base px-2 py-0.5 rounded-md border border-[#8b1a1a] text-[#8b1a1a] min-w-[60px] text-center">
                                                            {drink.base_price.toFixed(2)} €
                                                        </div>
                                                    </button>
                                                    
                                                    {itemCount > 0 && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const lastItem = [...existingItems].reverse()[0];
                                                                if (lastItem) {
                                                                    const { setItemQuantity } = useCartStore.getState();
                                                                    setItemQuantity(lastItem.id, lastItem.quantity - 1);
                                                                }
                                                            }}
                                                            className="px-4 bg-[#fdf0f0] border-2 border-[#e8b4b4] text-[#7a1a1a] rounded-2xl hover:bg-[#7a1a1a] hover:text-white hover:border-[#7a1a1a] transition-all flex items-center justify-center font-black text-xl"
                                                            aria-label="Entfernen"
                                                        >
                                                            −
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-4 border-t border-[#ddd0b8]/50">
                                        <button
                                            type="button"
                                            onClick={() => handleOrder()}
                                            className="w-full py-4 bg-[#8b1a1a] text-white font-bold rounded-2xl shadow-lg hover:bg-[#6e1313] transition-all active:scale-[0.98]"
                                        >
                                            Jetzt Kostenpflichtig bestellen ({(getTotal() + tip).toFixed(2)} €)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
}
