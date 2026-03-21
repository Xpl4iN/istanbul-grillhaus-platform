'use client';

import Link from 'next/link';
import { Suspense } from 'react';

function PaymentCancelContent() {
    return (
        <div className="min-h-screen bg-[#faf8f4] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-6 border border-[#ddd0b8]">
                {/* Cancel Icon */}
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-[#1a1008] mb-2">Zahlung abgebrochen</h1>
                    <p className="text-[#5c4a32] text-sm">
                        Du hast die Zahlung abgebrochen. Deine Bestellung wurde noch nicht aufgegeben.
                    </p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-orange-800 text-sm">
                        Dein Warenkorb ist noch vorhanden. Du kannst direkt zur Kasse zurückkehren oder
                        stattdessen bar / per Karte vor Ort bezahlen.
                    </p>
                </div>

                <div className="space-y-3">
                    <Link
                        href="/"
                        className="block w-full py-3 bg-[#8b1a1a] text-white font-bold rounded-xl hover:bg-[#6e1313] transition-colors"
                    >
                        Zurück zur Bestellung
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function PaymentCancelPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#1a1008]">Laden...</div>}>
            <PaymentCancelContent />
        </Suspense>
    );
}
