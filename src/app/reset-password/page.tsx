"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function ResetPassword() {
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();

    // Verify that an active recovery session is present before showing the form
    useEffect(() => {
        getSupabaseClient().auth.getSession().then(({ data }) => {
            if (data.session) {
                setSessionReady(true);
            } else {
                setError("Ungültiger oder abgelaufener Link. Bitte fordere einen neuen Passwort-Reset-Link an.");
            }
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
            return;
        }
        if (password !== confirm) {
            setError("Die Passwörter stimmen nicht überein.");
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
            if (updateError) {
                if (updateError.message.includes("expired") || updateError.message.includes("invalid")) {
                    setError("Der Link ist abgelaufen. Bitte fordere einen neuen Passwort-Reset-Link an.");
                } else {
                    setError(updateError.message);
                }
            } else {
                setSuccess(true);
                setTimeout(() => router.push("/admin/login"), 3000);
            }
        } catch (err) {
            console.error("[ResetPassword] Unexpected error:", err);
            setError("Ein unbekannter Fehler ist aufgetreten.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-black text-gray-900">Neues Passwort</h1>
                    <p className="text-gray-500 mt-2 text-sm">Lege dein neues Passwort fest</p>
                </div>

                {success ? (
                    <div className="text-center space-y-4">
                        <div className="text-green-600 font-bold bg-green-50 py-4 px-4 rounded-xl">
                            ✅ Passwort erfolgreich geändert!
                        </div>
                        <p className="text-gray-500 text-sm">Du wirst in Kürze weitergeleitet…</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Neues Passwort"
                                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:bg-white outline-none transition-colors text-gray-900"
                                minLength={8}
                                autoFocus
                                required
                                disabled={!sessionReady}
                            />
                            <input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="Passwort bestätigen"
                                className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:bg-white outline-none transition-colors text-gray-900"
                                minLength={8}
                                required
                                disabled={!sessionReady}
                            />
                        </div>

                        {error && (
                            <p className="text-red-500 text-center text-sm font-bold bg-red-50 py-2 px-3 rounded-lg">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !sessionReady || password.length < 8 || confirm.length < 8}
                            className="w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-600/30 disabled:opacity-50"
                        >
                            {loading ? "Wird gespeichert…" : "Passwort speichern"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
