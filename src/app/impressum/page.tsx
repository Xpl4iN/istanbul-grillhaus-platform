import Link from 'next/link';

export default function Impressum() {
    return (
        <main className="min-h-screen bg-[#f5f0e8] p-8 md:p-16 text-[#1a1008] font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <Link href="/" className="text-[#8b1a1a] font-bold text-sm hover:underline flex items-center gap-2">
                    ← Zurück zur Speisekarte
                </Link>
                <h1 className="text-4xl font-bold border-b-2 border-[#8b1a1a] pb-4">Impressum</h1>
                
                <section className="space-y-2">
                    <h2 className="text-xl font-bold">Angaben gemäß § 5 TMG</h2>
                    <p>Istanbul Grillhaus<br />
                    Münchener Str. 9<br />
                    82362 Weilheim in Oberbayern</p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-xl font-bold">Kontakt</h2>
                    <p>Telefon: 0881 92706810<br />
                    E-Mail: info@istanbul-grillhaus-weilheim.de</p>
                </section>

                <section className="space-y-2 text-sm opacity-70">
                    <p>Haftung für Inhalte: Wir sind für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.</p>
                </section>
            </div>
        </main>
    );
}
