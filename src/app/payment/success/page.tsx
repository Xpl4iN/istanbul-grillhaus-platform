'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import Link from 'next/link';
import { Suspense } from 'react';

function PaymentSuccessContent() {
    const searchParams = useSearchParams();
    const shortId = searchParams.get('short_id') || '';
    const clearCart = useCartStore((s) => s.clearCart);

    useEffect(() => {
        const orderId = searchParams.get('order_id');
        if (orderId) {
            // Set cookie for order tracking (12 hours)
            document.cookie = `order_session=${orderId}; path=/; max-age=${60 * 60 * 12}; same-site=lax; secure`;
        }
        clearCart();
        window.dispatchEvent(new Event('orderPlaced'));
    }, [clearCart, searchParams]);

    return (
        <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-6 border border-[#ddd0b8]">
                {/* Success Icon */}
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-[#1a1008] mb-2">Zahlung erfolgreich!</h1>
                    <p className="text-[#5c4a32] text-sm">
                        Deine Bestellung wurde bezahlt und wird jetzt vorbereitet.
                    </p>
                </div>

                {shortId && (
                    <div className="bg-[#fdf5ee] border border-[#ddd0b8] rounded-2xl p-4">
                        <p className="text-xs text-[#5c4a32] uppercase tracking-wide font-semibold mb-1">Bestellnummer</p>
                        <p className="text-3xl font-bold text-[#8b1a1a] tracking-widest">{shortId}</p>
                        <p className="text-xs text-[#5c4a32] mt-1">Zeige diese Nummer bei Abholung vor</p>
                    </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-green-800 text-sm font-medium">
                        ✅ Online bezahlt per Stripe
                    </p>
                    <p className="text-green-700 text-xs mt-1">
                        Kein weiterer Zahlungsvorgang nötig bei Abholung.
                    </p>
                </div>

                <Link
                    href="/"
                    className="block w-full py-3 bg-[#8b1a1a] text-white font-bold rounded-xl hover:bg-[#6e1313] transition-colors"
                >
                    Zurück zur Speisekarte
                </Link>
            </div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#1a1008]">Laden...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
