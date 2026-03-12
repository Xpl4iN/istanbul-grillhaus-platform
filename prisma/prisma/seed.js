const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const doener = await prisma.product.create({
        data: {
            name: "Döner Tasche",
            base_price: 6.50,
            category_id: "hauptspeisen",
            modifiers: {
                create: [
                    { name: "Extra Fleisch", price_delta: 1.50 },
                    { name: "Ohne Zwiebeln", price_delta: 0 },
                    { name: "Mit Käse", price_delta: 0.50 }
                ]
            }
        }
    });

    const duerum = await prisma.product.create({
        data: {
            name: "Dürüm",
            base_price: 7.50,
            category_id: "hauptspeisen",
            modifiers: {
                create: [
                    { name: "Extra Fleisch", price_delta: 1.50 },
                    { name: "Scharf", price_delta: 0 }
                ]
            }
        }
    });

    console.log("Seeded database!");
}

main().catch(console.error).finally(() => prisma.$disconnect());