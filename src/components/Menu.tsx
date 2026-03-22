"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { Product, CartItem, useCartStore, ModifierGroup } from "@/store/cartStore";
import Configurator from "./Configurator";
import Checkout from "./Checkout";
import { Caveat_Brush } from "next/font/google";
import Link from "next/link";
import OrderHistory from "./OrderHistory";

const signFont = Caveat_Brush({ weight: "400", subsets: ["latin"] });

const LMIV_LEGEND: Record<string, string> = {
    "1": "Farbstoff",
    "2": "Konservierungsstoff",
    "3": "Antioxidationsmittel",
    "4": "Geschmacksverstärker",
    "5": "Geschwefelt",
    "6": "Geschwärzt",
    "7": "Gewachst",
    "8": "Phosphat",
    "9": "Süßungsmittel",
    "10": "Phenylalaninquelle",
    "a": "Glutenhaltiges Getreide",
    "b": "Krebstiere",
    "c": "Eier",
    "d": "Fisch",
    "e": "Erdnüsse",
    "f": "Sojabohnen",
    "g": "Milch",
    "h": "Schalenfrüchte",
    "i": "Sellerie",
    "j": "Senf",
    "k": "Sesamsamen",
    "l": "Schwefeldioxid",
    "m": "Lupinen",
    "n": "Weichtiere"
};

function iconFor(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes("döner") || lower.includes("dürüm")) return "🥙";
    if (lower.includes("pide") || lower.includes("lahmacun")) return "🫓";
    if (lower.includes("teller")) return "🍽️";
    if (lower.includes("box")) return "📦";
    if (lower.includes("pizza")) return "🍕";
    if (lower.includes("salat")) return "🥗";
    if (lower.includes("beilage") || lower.includes("beilagen")) return "🍟";
    if (lower.includes("getränk") || lower.includes("trank")) return "🥤";
    return "🍴";
}

function ProductSuperscript({ allergens, additives }: { allergens?: string | null, additives?: string | null }) {
    const parts = [];
    if (additives) parts.push(...additives.split(',').map(s => s.trim()));
    if (allergens) parts.push(...allergens.split(',').map(s => s.trim()));

    if (parts.length === 0) return null;

    return (
        <sup className="text-[10px] ml-0.5 opacity-60 font-medium whitespace-nowrap">
            {parts.join(', ')}
        </sup>
    );
}

// Business hours configuration
const isStoreOpen = (hours: any) => {
    if (!hours) return false;
    const now = new Date();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];
    const formatter = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false });
    const currentTimeStr = formatter.format(now);
    
    // Fallback support for both lowercase and capital day names
    const todayHours = hours[currentDay] || hours[currentDay.charAt(0).toUpperCase() + currentDay.slice(1)];
    
    if (!todayHours || !todayHours.open || !todayHours.close) return false;
    return currentTimeStr >= todayHours.open && currentTimeStr <= todayHours.close;
};

const formatOpeningHours = (hours: any) => {
    if (!hours) return "Öffnungszeiten nicht hinterlegt";
    
    // Normalize keys to title case for the days array
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayLabels: Record<string, string> = {
        'Monday': 'Mo', 'Tuesday': 'Di', 'Wednesday': 'Mi', 'Thursday': 'Do', 'Friday': 'Fr', 'Saturday': 'Sa', 'Sunday': 'So'
    };

    const groups: { days: string[]; hours: string }[] = [];
    let currentGroup: { days: string[]; hours: string } | null = null;

    dayNames.forEach(day => {
        // Try both "Monday" and "monday"
        const schedule = hours[day] || hours[day.toLowerCase()];
        const hoursStr = (schedule?.open && schedule?.close) ? `${schedule.open}–${schedule.close}` : 'Geschlossen';
        
        if (currentGroup && currentGroup.hours === hoursStr) {
            currentGroup.days.push(day);
        } else {
            currentGroup = { days: [day], hours: hoursStr };
            groups.push(currentGroup);
        }
    });

    const output = groups.map(group => {
        const startDay = dayLabels[group.days[0]];
        const endDay = dayLabels[group.days[group.days.length - 1]];
        const rangeLabel = group.days.length > 1 ? `${startDay}–${endDay}` : startDay;
        return `${rangeLabel}: ${group.hours}`;
    }).join(' · ');

    return output || "Öffnungszeiten nicht verfügbar";
};

export default function Menu({ initialProducts = [], initialIsOpen = true, openingHours = null, features = {} }: { initialProducts?: Product[], initialIsOpen?: boolean, openingHours?: any, features?: any }) {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [isOpen, setIsOpen] = useState(initialIsOpen);
    const [showLMIVModal, setShowLMIVModal] = useState(false);
    const [editingCartItem, setEditingCartItem] = useState<Pick<CartItem, 'id' | 'product' | 'modifiers'> | null>(null);
    const { items, getTotal, removeItem, setItemQuantity, isTestMode } = useCartStore();

    // Update isOpen state based on actual business hours
    useEffect(() => {
        const updateOpenStatus = () => {
            setIsOpen(isStoreOpen(openingHours));
        };
        updateOpenStatus();
        const interval = setInterval(updateOpenStatus, 60000);
        return () => clearInterval(interval);
    }, [openingHours]);

    const isCurrentlyOpen = isOpen || isTestMode;
    const navRef = useRef<HTMLDivElement>(null);

    const groupedProducts = useMemo(() => {
        const groups: Record<string, { categoryName: string; categoryId: string; sortOrder: number; products: Product[] }> = {};
        products.forEach(p => {
            const catId = p.category?.id || 'other';
            const catName = p.category?.name || 'Sonstiges';
            const catOrder = p.category?.sort_order || 999;
            if (!groups[catId]) {
                groups[catId] = { categoryName: catName, categoryId: catId, sortOrder: catOrder, products: [] };
            }
            groups[catId].products.push(p);
        });
        return Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder);
    }, [products]);

    const scrollToCategory = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const offset = 80;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 pt-4">
            <header className="mb-6 rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: "linear-gradient(160deg,#0a5c45 0%,#096a50 50%,#074f3c 100%)", border: "3px solid #0d7a5e" }}>
                <div className="px-8 pt-8 pb-4 text-center">
                    <h1 className={`${signFont.className} text-7xl sm:text-9xl tracking-widest text-white leading-none`}
                        style={{ textShadow: "0 3px 8px rgba(0,0,0,0.6)" }}>
                        İSTANBUL
                    </h1>
                    <div style={{ height: "2px", background: "linear-gradient(90deg,transparent,#b8860b,transparent)", margin: "8px auto", width: "80%" }} />
                    <p className="text-xl font-light" style={{ color: "#e8d5a3", letterSpacing: "0.25em" }}>
                        DÖNER · PIZZA · GRILLHAUS
                    </p>
                </div>
                <div className="flex justify-center gap-4 flex-wrap text-sm px-6 py-3"
                    style={{ background: "rgba(0,0,0,0.25)", color: "#a8d5c0" }}>
                    <span>📍 Münchener Str. 9, Weilheim</span>
                    <span>📞 0881 92706810</span>
                    <span>🥩 100% Halal</span>
                </div>
            </header>

            <div className="mb-4">
                {!isCurrentlyOpen ? (
                    <div className="p-4 rounded-xl text-center font-semibold text-sm border"
                        style={{ background: "#fdf0f0", borderColor: "#e8b4b4", color: "#7a1a1a" }}>
                        🕒 Geschlossen · Öffnungszeiten: {formatOpeningHours(openingHours)}
                    </div>
                ) : (
                    <div className="p-3 rounded-xl text-center font-semibold text-xs border"
                        style={{ background: "#f0fdf4", borderColor: "#b4e8c1", color: "#1a7a3a" }}>
                        ✅ Geöffnet · Jetzt vorbestellen & abholen
                    </div>
                )}
            </div>

            {!showCheckout && (
                <div className="sticky top-0 z-40 mb-6"
                    style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
                    <nav className="px-4 sm:px-6 py-3 bg-[#f5f0e8]/95 backdrop-blur-sm border-b border-[#ddd0b8]/50 overflow-x-auto flex justify-start md:justify-center gap-2 no-scrollbar"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {groupedProducts.map(group => (
                            <button
                                key={group.categoryId}
                                onClick={() => scrollToCategory(group.categoryId)}
                                className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border"
                                style={{ background: "#fffdf9", borderColor: "#ddd0b8", color: "#5c4a32", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                            >
                                {iconFor(group.categoryName)} {group.categoryName}
                            </button>
                        ))}
                    </nav>
                </div>
            )}

            {showCheckout ? (
                <div className="space-y-6">
                    <button onClick={() => setShowCheckout(false)}
                        className="flex items-center gap-2 font-semibold text-sm hover:opacity-70 transition"
                        style={{ color: "#8b1a1a" }}>
                        ← Zurück zur Speisekarte
                    </button>
                    <div className="rounded-2xl p-6 border shadow-sm space-y-4"
                        style={{ background: "#fffdf9", borderColor: "#ddd0b8" }}>
                        <h2 className="text-xl font-bold" style={{ color: "#1a1008" }}>Ihr Warenkorb</h2>
                        {items.length === 0 ? (
                            <p className="text-sm" style={{ color: "#5c4a32" }}>Ihr Warenkorb ist leer.</p>
                        ) : (
                            <ul className="divide-y divide-[#eddfc8]">
                                {items.map(item => (
                                    <li key={item.id} className="py-4 flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-[#1a1008]">{item.quantity}× {item.product.name}</p>
                                            {Object.keys(item.modifiers).length > 0 && (
                                                <ul className="text-[11px] mt-1 space-y-0.5 font-medium text-[#8b1a1a]/80">
                                                    {Object.entries(item.modifiers).flatMap(([groupId, modIds]) => {
                                                        const group = [...(item.product.modifier_groups || []), ...((item.product as any).global_modifier_groups || [])] as ModifierGroup[];
                                                        const targetGroup = group.find(g => g.id === groupId);
                                                        if (!targetGroup) return [];
                                                        return modIds.map(modId => {
                                                            const mod = targetGroup.modifiers.find(m => m.id === modId);
                                                            return mod ? <li key={modId}>+ {mod.name}</li> : null;
                                                        });
                                                    })}
                                                </ul>
                                            )}
                                            <button
                                                onClick={() => setEditingCartItem({ id: item.id, product: item.product, modifiers: item.modifiers })}
                                                className="mt-2 text-[11px] font-bold text-[#b8860b] hover:opacity-70 flex items-center gap-1 uppercase tracking-wider"
                                            >
                                                <span>✏️</span> ANPASSEN
                                            </button>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="font-bold text-sm">{(item.price * item.quantity).toFixed(2)} €</span>
                                            <div className="flex items-center gap-1 bg-[#f5f0e8] p-1 rounded-lg">
                                                <button onClick={() => setItemQuantity(item.id, Math.max(0, item.quantity - 1))} className="w-6 h-6 flex items-center justify-center font-bold text-[#5c4a32]">−</button>
                                                <span className="text-xs font-bold w-4 text-center text-[#5c4a32]">{item.quantity}</span>
                                                <button onClick={() => setItemQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center font-bold text-[#5c4a32]">+</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="pt-4 flex justify-between font-bold text-lg"
                            style={{ borderTop: "2px solid #ddd0b8", color: "#1a1008" }}>
                            <span>Gesamtbetrag</span><span>{getTotal().toFixed(2)} €</span>
                        </div>
                    </div>
                    {items.length > 0 && (
                        isCurrentlyOpen ? <Checkout onComplete={() => setShowCheckout(false)} features={features} /> : (
                            <div className="rounded-xl p-5 text-center border font-semibold"
                                style={{ background: "#fdf0f0", borderColor: "#e8b4b4", color: "#7a1a1a" }}>
                                🕒 Aktuell geschlossen.
                            </div>
                        )
                    )}
                </div>
            ) : (
                <div className="space-y-12">
                    {groupedProducts.map(group => (
                        <section key={group.categoryName} id={group.categoryId} className="scroll-mt-24">
                            <div className="flex items-center gap-3 mb-5">
                                <span className="text-2xl">{iconFor(group.categoryName)}</span>
                                <h2 className="text-xl font-bold" style={{ color: "#8b1a1a" }}>{group.categoryName}</h2>
                                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg,#b8860b55,transparent)" }} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {group.products.map(p => (
                                    <button key={p.id} onClick={() => setSelectedProduct(p)}
                                        className="text-left w-full rounded-xl p-4 transition-all duration-200 group"
                                        style={{ background: "#fffdf9", border: "1px solid #ddd0b8", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h3 className="font-semibold text-base" style={{ color: "#1a1008" }}>
                                                    {p.name}
                                                    <ProductSuperscript allergens={p.allergens} additives={p.additives} />
                                                </h3>
                                                {p.description && <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "#7a6248" }}>{p.description}</p>}
                                                {p.deposit_amount && p.deposit_amount > 0 && (
                                                    <p className="text-[10px] mt-1 font-medium opacity-70" style={{ color: "#5c4a32" }}>Inkl. {p.deposit_amount.toFixed(2)} € Pfand</p>
                                                )}
                                            </div>
                                            <span className="shrink-0 font-bold text-sm px-2 py-0.5 rounded-md transition-colors group-hover:bg-[#a12323]"
                                                style={{ background: "#8b1a1a", color: "#fff", minWidth: "54px", textAlign: "center" }}>
                                                {p.base_price.toFixed(2)} €
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <OrderHistory />

            <footer className="mt-16 pt-8 border-t border-[#ddd0b8] text-center space-y-4">
                <button onClick={() => setShowLMIVModal(true)} className="text-xs font-semibold hover:underline" style={{ color: "#8b1a1a" }}>Allergene & Zusatzstoffe einsehen</button>
                <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#5c4a32" }}>
                    <Link href="/impressum" className="hover:text-[#8b1a1a] transition-colors">Impressum</Link>
                    <Link href="/datenschutz" className="hover:text-[#8b1a1a] transition-colors">Datenschutz</Link>
                </div>
                <p className="text-[10px] opacity-40">© {new Date().getFullYear()} Istanbul Grillhaus Weilheim. Alle Preise in Euro inkl. MwSt.</p>
            </footer>

            {showLMIVModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLMIVModal(false)}>
                    <div className="bg-[#fffdf9] w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border-2 border-[#8b1a1a]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold" style={{ color: "#8b1a1a" }}>Allergene & Zusatzstoffe</h2>
                            <button onClick={() => setShowLMIVModal(false)} className="text-2xl leading-none">×</button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 text-xs">
                            <section>
                                <h3 className="font-bold mb-2 border-b pb-1" style={{ color: "#5c4a32" }}>Zusatzstoffe (Zahlen)</h3>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                                    {Object.entries(LMIV_LEGEND).filter(([k]) => !isNaN(Number(k))).map(([k, v]) => (
                                        <div key={k} className="flex gap-2"><span className="font-bold min-w-[20px]">{k}</span><span className="opacity-80">{v}</span></div>
                                    ))}
                                </div>
                            </section>
                            <section className="mt-4">
                                <h3 className="font-bold mb-2 border-b pb-1" style={{ color: "#5c4a32" }}>Allergene (Buchstaben)</h3>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                                    {Object.entries(LMIV_LEGEND).filter(([k]) => isNaN(Number(k))).map(([k, v]) => (
                                        <div key={k} className="flex gap-2"><span className="font-bold min-w-[20px] uppercase">{k}</span><span className="opacity-80">{v}</span></div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        <button onClick={() => setShowLMIVModal(false)} className="w-full mt-8 py-3 bg-[#8b1a1a] text-white font-bold rounded-xl">Verstanden</button>
                    </div>
                </div>
            )}

            {selectedProduct && <Configurator product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
            {editingCartItem && (
                <Configurator
                    product={editingCartItem.product}
                    onClose={() => setEditingCartItem(null)}
                    editCartItemId={editingCartItem.id}
                    initialModifiers={editingCartItem.modifiers}
                    hideDrinkUpsell
                />
            )}

            {!showCheckout && items.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-none flex justify-center z-40"
                    style={{ background: "linear-gradient(to top,#f5f0e8 60%,transparent)" }}>
                    <button onClick={() => setShowCheckout(true)}
                        className="pointer-events-auto w-full max-w-sm flex items-center justify-between py-4 px-6 text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all"
                        style={{ background: "linear-gradient(135deg,#8b1a1a 0%,#6b1414 100%)", boxShadow: "0 8px 24px rgba(139,26,26,0.35)" }}>
                        <div className="flex items-center gap-3">
                            <span className="text-sm px-2 py-0.5 rounded-md font-bold" style={{ background: "rgba(255,255,255,0.2)" }}>{items.length}</span>
                            <span>Warenkorb & Kasse</span>
                        </div>
                        <span className="text-lg font-bold">{getTotal().toFixed(2)} €</span>
                    </button>
                </div>
            )}
        </div>
    );
}
