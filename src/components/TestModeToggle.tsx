"use client";
import { useCartStore } from "@/store/cartStore";

export default function TestModeToggle() {
    const { isTestMode, toggleTestMode } = useCartStore();

    return (
        <button 
            onClick={toggleTestMode}
            className={`fixed top-2 left-2 z-50 px-3 py-1 text-xs font-bold rounded-lg border shadow-sm transition-colors ${isTestMode ? "bg-red-600 text-white border-red-700" : "bg-white text-gray-500 border-gray-300"}`}
        >
            {isTestMode ? "Testmodus: AN" : "Testmodus: AUS"}
        </button>
    );
}
