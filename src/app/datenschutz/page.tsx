import Link from 'next/link';

export default function Datenschutz() {
    return (
        <main className="min-h-screen bg-[#f5f0e8] p-8 md:p-16 text-[#1a1008] font-sans">
            <div className="max-w-2xl mx-auto space-y-8">
                <Link href="/" className="text-[#8b1a1a] font-bold text-sm hover:underline flex items-center gap-2">
                    ← Zurück zur Speisekarte
                </Link>
                <h1 className="text-4xl font-bold border-b-2 border-[#8b1a1a] pb-4">Datenschutz</h1>
                
                <section className="space-y-4">
                    <h2 className="text-xl font-bold">1. Datenschutz auf einen Blick</h2>
                    <p className="text-sm">Der Schutz Ihrer persönlichen Daten ist uns ein besonderes Anliegen. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.</p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold">2. Datenerfassung auf unserer Website</h2>
                    <h3 className="font-bold">Cookies</h3>
                    <p className="text-sm">Unsere Internetseiten verwenden teilweise so genannte Cookies. Cookies richten auf Ihrem Rechner keinen Schaden an und enthalten keine Viren. Sie dienen dazu, unser Angebot nutzerfreundlicher, effektiver und sicherer zu machen.</p>
                </section>

                <p className="text-[10px] opacity-50">Stand: Februar 2025</p>
            </div>
        </main>
    );
}
