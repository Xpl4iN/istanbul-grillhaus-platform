"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { Product, useCartStore } from "@/store/cartStore";
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
        <sup className="text-[10px] ml-0.5 opacity-60 font-medium">
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
    const todayHours = hours[currentDay];
    if (!todayHours || !todayHours.open || !todayHours.close) return false;
    return currentTimeStr >= todayHours.open && currentTimeStr <= todayHours.close;
};

export default function Menu({ initialProducts = [], initialIsOpen = true, openingHours = null }: { initialProducts?: Product[], initialIsOpen?: boolean, openingHours?: any }) {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [isOpen, setIsOpen] = useState(initialIsOpen);
    const [showLMIVModal, setShowLMIVModal] = useState(false);
    const { items, getTotal, removeItem, isTestMode } = useCartStore();

    // Update isOpen state based on actual business hours
    useEffect(() => {
        const updateOpenStatus = () => {
            setIsOpen(isStoreOpen(openingHours));
        };

        // Initial check
        updateOpenStatus();

        // Set up interval to check every minute
        const interval = setInterval(updateOpenStatus, 60000);

        return () => clearInterval(interval);
    }, []);

    const isCurrentlyOpen = isOpen || isTestMode;

    const navRef = useRef<HTMLDivElement>(null);

    // SSR enabled: API fetch removed, using initial props.

    const groupedProducts = useMemo(() => {
        const groups: Record<string, { categoryName: string; categoryId: string; sortOrder: number; products: Product[] }> = {};
        products.forEach(p => {
            const catName = p.category?.name || "Sonstiges";
            const catId = catName.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const sortOrder = p.category?.sort_order || 999;
            if (!groups[catName]) groups[catName] = { categoryName: catName, categoryId: catId, sortOrder, products: [] };
            groups[catName].products.push(p);
        });
        return Object.values(groups).sort((a, b) => a.sortOrder - b.sortOrder);
    }, [products]);

    const scrollToCategory = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const offset = 80; // Adjusted for sticky header
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 pt-4">
            {/* Header */}
            <header className="mb-6 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-r from-[#0a5c45] via-[#096a50] to-[#074f3c] border-3 border-[#0d7a5e]">
                <div className="px-8 pt-8 pb-4 text-center">
                    <h1 className={`${signFont.className} text-7xl sm:text-9xl tracking-widest text-white leading-none drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]`}>
                        İSTANBUL
                    </h1>
                    <div className="h-0.5 bg-gradient-to-r from-transparent via-[#b8860b] to-transparent mx-auto my-2 w-4/5" />
                    <p className="text-xl font-light text-[#e8d5a3] tracking-[0.25em]">
                        DÖNER · PIZZA · GRILLHAUS
                    </p>
                </div>
                <div className="flex justify-center gap-4 flex-wrap text-sm px-6 py-3 bg-black/25 text-[#a8d5c0]">
                    <span>📍 Münchener Str. 9, Weilheim</span>
                    <span>📞 0881 92706810</span>
                    <span>🥩 100% Halal</span>
                </div>
            </header>

            {/* Status Banner */}
            <div className="mb-4">
                {!isCurrentlyOpen ? (
                    <div className="p-4 rounded-xl text-center font-semibold text-sm border bg-[#fdf0f0] border-[#e8b4b4] text-[#7a1a1a]">
                        🕒 Geschlossen · Öffnungszeiten: Mo–Sa 10:00–21:30 · So 10:00–21:00
                    </div>
                ) : (
                    <div className="p-3 rounded-xl text-center font-semibold text-xs border bg-[#f0fdf4] border-[#b4e8c1] text-[#1a7a3a]">
                        ✅ Geöffnet · Jetzt vorbestellen & abholen
                    </div>
                )}
            </div>

            {/* Sticky Category Nav */}
            {!showCheckout && (
                <div className="sticky top-0 z-40 mb-6 -mx-4 sm:-mx-6 w-screen">
                    <nav className="px-4 sm:px-6 py-3 bg-[#f5f0e8]/95 backdrop-blur-sm border-b border-[#ddd0b8]/50 overflow-x-auto flex justify-start md:justify-center gap-2">
                        {groupedProducts.map(group => (
                            <button
                                key={group.categoryId}
                                onClick={() => scrollToCategory(group.categoryId)}
                                className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 border bg-white border-[#ddd0b8] text-[#5c4a32] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                            >
                                {iconFor(group.categoryName)} {group.categoryName}
                            </button>
                        ))}
                    </nav>
                </div>
            )}

            {/* Main Content */}
            {showCheckout ? (
                <div className="space-y-6">
                    <button onClick={() => setShowCheckout(false)}
                        className="flex items-center gap-2 font-semibold text-sm hover:opacity-70 transition text-[#8b1a1a]">
                        ← Zurück zur Speisekarte
                    </button>
                    <div className="rounded-2xl p-6 border shadow-sm space-y-4 bg-[#fffdf9] border-[#ddd0b8]">
                        <h2 className="text-xl font-bold text-[#1a1008]">Ihr Warenkorb</h2>
                        {items.length === 0 ? (
                            <p className="text-sm text-[#5c4a32]">Ihr Warenkorb ist leer.</p>
                        ) : (
                            <ul>
                                {items.map(item => (
                                    <li key={item.id} className="py-3 flex justify-between items-center border-b last:border-0 border-[#eddfc8]">
                                        <div>
                                            <p className="font-semibold text-sm text-[#1a1008]">{item.quantity}× {item.product.name}</p>
                                            {Object.keys(item.modifiers).length > 0 && (
                                                <ul className="text-[11px] mt-1 space-y-0.5 font-medium text-[#8b1a1a] opacity-85">
                                                    {Object.entries(item.modifiers).flatMap(([groupId, modIds]) => {
                                                        const group = item.product.modifier_groups?.find(g => g.id === groupId);
                                                        if (!group) return [];
                                                        return modIds.map(modId => {
                                                            const mod = group.modifiers.find(m => m.id === modId);
                                                            return mod ? <li key={modId}>+ {mod.name}</li> : null;
                                                        });
                                                    })}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="flex gap-3 items-center">
                                            <span className="font-bold text-sm">{(item.price * item.quantity).toFixed(2)} €</span>
                                            <button onClick={() => removeItem(item.id)}
                                                className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center bg-[#fde8e8] text-[#8b1a1a]">✕</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="pt-4 flex justify-between font-bold text-lg border-t-2 border-[#ddd0b8] text-[#1a1008]">
                            <span>Gesamtbetrag</span><span>{getTotal().toFixed(2)} €</span>
                        </div>
                    </div>
                    {items.length > 0 && (
                        isCurrentlyOpen ? <Checkout onComplete={() => setShowCheckout(false)} /> : (
                            <div className="rounded-xl p-5 text-center border font-semibold bg-[#fdf0f0] border-[#e8b4b4] text-[#7a1a1a]">
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
                                <h2 className="text-xl font-bold text-[#8b1a1a]">{group.categoryName}</h2>
                                <div className="flex-1 h-px bg-gradient-to-r from-[#b8860b] to-transparent opacity-30" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {group.products.map(p => (
                                    <button key={p.id} onClick={() => setSelectedProduct(p)}
                                        className="text-left w-full rounded-xl p-4 transition-all duration-200 group bg-[#fffdf9] border border-[#ddd0b8] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h3 className="font-semibold text-base text-[#1a1008]">
                                                    {p.name}
                                                    <ProductSuperscript allergens={p.allergens} additives={p.additives} />
                                                </h3>
                                                {p.description && <p className="text-xs mt-1.5 line-clamp-2 text-[#7a6248]">{p.description}</p>}
                                                {p.deposit_amount && p.deposit_amount > 0 && (
                                                    <p className="text-[10px] mt-1 font-medium opacity-70 text-[#5c4a32]">
                                                        Inkl. {p.deposit_amount.toFixed(2)} € Pfand
                                                    </p>
                                                )}
                                            </div>
                                            <span className="shrink-0 font-bold text-sm px-2 py-0.5 rounded-md transition-colors group-hover:bg-[#a12323] bg-[#8b1a1a] text-white min-w-[54px] text-center">
                                                {p.base_price.toFixed(2)} €
                                            </span>
                                        </div>
                                        {(p.modifier_groups?.length ?? 0) > 0 && <p className="text-xs mt-3 font-medium flex items-center gap-1 text-[#b8860b]">Anpassbar <span className="text-[10px]">›</span></p>}
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            <OrderHistory />

            {/* Legal Footer */}
            <footer className="mt-16 pt-8 border-t border-[#ddd0b8] text-center space-y-4">
                <button
                    onClick={() => setShowLMIVModal(true)}
                    className="text-xs font-semibold hover:underline text-[#8b1a1a]"
                >
                    Allergene & Zusatzstoffe einsehen
                </button>
                <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-[#5c4a32]">
                    <Link href="/impressum" className="hover:text-[#8b1a1a] transition-colors">Impressum</Link>
                    <Link href="/datenschutz" className="hover:text-[#8b1a1a] transition-colors">Datenschutz</Link>
                </div>
                <p className="text-[10px] opacity-40">© {new Date().getFullYear()} Istanbul Grillhaus Weilheim. Alle Preise in Euro inkl. MwSt.</p>
            </footer>

            {/* LMIV Modal */}
            {showLMIVModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowLMIVModal(false)}>
                    <div className="bg-[#fffdf9] w-full max-w-md max-h-[80vh] overflow-y-auto rounded-2xl p-6 shadow-2xl border-2 border-[#8b1a1a]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-[#8b1a1a]">Allergene & Zusatzstoffe</h2>
                            <button onClick={() => setShowLMIVModal(false)} className="text-2xl leading-none">×</button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 text-xs">
                            <section>
                                <h3 className="font-bold mb-2 border-b pb-1 text-[#5c4a32]">Zusatzstoffe (Zahlen)</h3>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                                    {Object.entries(LMIV_LEGEND).filter(([k]) => !isNaN(Number(k))).map(([k, v]) => (
                                        <div key={k} className="flex gap-2">
                                            <span className="font-bold min-w-[20px]">{k}</span>
                                            <span className="opacity-80">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            <section className="mt-4">
                                <h3 className="font-bold mb-2 border-b pb-1 text-[#5c4a32]">Allergene (Buchstaben)</h3>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-1">
                                    {Object.entries(LMIV_LEGEND).filter(([k]) => isNaN(Number(k))).map(([k, v]) => (
                                        <div key={k} className="flex gap-2">
                                            <span className="font-bold min-w-[20px] uppercase">{k}</span>
                                            <span className="opacity-80">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        <button
                            onClick={() => setShowLMIVModal(false)}
                            className="w-full mt-8 py-3 bg-[#8b1a1a] text-white font-bold rounded-xl"
                        >
                            Verstanden
                        </button>
                    </div>
                </div>
            )}

            {selectedProduct && <Configurator product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

            {/* Sticky cart button */}
            {!showCheckout && items.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-none flex justify-center z-40 bg-gradient-to-t from-[#f5f0e8] via-[#f5f0e8] to-transparent">
                    <button onClick={() => setShowCheckout(true)}
                        className="pointer-events-auto w-full max-w-sm flex items-center justify-between py-4 px-6 text-white font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all bg-gradient-to-r from-[#8b1a1a] to-[#6b1414] shadow-[0_8px_24px_rgba(139,26,26,0.35)]">
                        <div className="flex items-center gap-3">
                            <span className="text-sm px-2 py-0.5 rounded-md font-bold bg-white/20">{items.length}</span>
                            <span>Warenkorb & Kasse</span>
                        </div>
                        <span className="text-lg font-bold">{getTotal().toFixed(2)} €</span>
                    </button>
                </div>
            )}

        </div>
    );
}

