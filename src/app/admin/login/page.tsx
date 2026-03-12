"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        
        try {
            const res = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin })
            });
            
            if (res.ok) {
                router.push("/admin");
                router.refresh();
            } else {
                setError("Falscher PIN (Tipp: Standard ist 123456)");
                setPin("");
            }
        } catch {
            setError("Netzwerkfehler");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-black text-gray-900">Admin Login</h1>
                    <p className="text-gray-500 mt-2 text-sm">Bitte gib den Mitarbeiter-PIN ein</p>
                </div>
                
                <input 
                    type="password" 
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••" 
                    className="w-full text-center text-3xl tracking-[0.75em] p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:bg-white outline-none transition-colors"
                    maxLength={6}
                    autoFocus
                    required
                />
                
                {error && <p className="text-red-500 text-center text-sm font-bold bg-red-50 py-2 rounded-lg">{error}</p>}
                
                <button 
                    disabled={loading || pin.length < 4}
                    type="submit" 
                    className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
                >
                    {loading ? "Wird geladen..." : "Einloggen"}
                </button>
            </form>
        </div>
    );
}
