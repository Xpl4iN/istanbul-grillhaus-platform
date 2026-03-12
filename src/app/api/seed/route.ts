import prisma from "@/lib/db";
import { NextResponse } from "next/server";



export async function GET(req: Request) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expectedSecret = process.env.SEED_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 401 });
    }

    try {
        await prisma.orderItemModifier.deleteMany();
        await prisma.orderItem.deleteMany();
        await prisma.order.deleteMany();
        await prisma.modifier.deleteMany();
        await prisma.modifierGroup.deleteMany();
        await prisma.product.deleteMany();
        await prisma.category.deleteMany();

        // Kategorien
        const catDoener = await prisma.category.create({ data: {  name: "Döner & Dürüm", sort_order: 10 } });
        const catPide = await prisma.category.create({ data: {  name: "Pide & Lahmacun", sort_order: 20 } });
        const catTeller = await prisma.category.create({ data: {  name: "Tellerportionen", sort_order: 30 } });
        const catBox = await prisma.category.create({ data: {  name: "Döner Boxen", sort_order: 40 } });
        const catPizza = await prisma.category.create({ data: {  name: "Pizza (ø 32cm)", sort_order: 50 } });
        const catSalad = await prisma.category.create({ data: {  name: "Salat", sort_order: 60 } });
        const catBeilagen = await prisma.category.create({ data: {  name: "Beilagen", sort_order: 70 } });
        const catDrinks = await prisma.category.create({ data: {  name: "Getränke", sort_order: 80 } });

        // Modifier Templates
        const fleischOptionen = [
            { name: "Putenfleisch (Standard)", price_delta: 0.00 },
            { name: "Kalb", price_delta: 0.00 },
            { name: "Gemischt", price_delta: 0.00 }
        ];

        const pideOptionen = [
            { name: "Hackfleisch", price_delta: 0.00 },
            { name: "Spinat", price_delta: 0.00 },
            { name: "Käse", price_delta: 0.00 }
        ];

        const boxBeilagen = [
            { name: "Pommes", price_delta: 0.00 },
            { name: "Salat", price_delta: 0.00 },
            { name: "Reis", price_delta: 0.00 }
        ];

        const doenerExtras = [
            { name: "Scharf", price_delta: 0.00 },
            { name: "Ohne Zwiebeln", price_delta: 0.00 },
            { name: "Ohne Tomaten", price_delta: 0.00 },
            { name: "Ohne Kraut", price_delta: 0.00 },
            { name: "Ohne Rotkraut", price_delta: 0.00 },
            { name: "Ohne Eisbergsalat", price_delta: 0.00 },
            { name: "Ohne Soße", price_delta: 0.00 },
            { name: "Viel Soße", price_delta: 0.00 },
            { name: "Nur Fleisch", price_delta: 2.00 },
            { name: "Extra Fleisch", price_delta: 1.50 },
            { name: "Extra Käse", price_delta: 1.00 }
        ];

        const pizzaExtras = [
            { name: "Extra Käse", price_delta: 1.50 },
            { name: "Extra Fleisch", price_delta: 2.00 },
            { name: "Ohne Zwiebeln", price_delta: 0.00 },
            { name: "Mit Knoblauch", price_delta: 0.50 }
        ];

        const createProduct = async (
            categoryId: string,
            name: string,
            description: string,
            price: number,
            opts: {
                needsFleisch?: boolean,
                needsPideType?: boolean,
                needsBoxBeilage?: boolean,
                canHavePizzaExtras?: boolean,
                canHaveDoenerExtras?: boolean
            } = {},
            extraData: { allergens?: string, additives?: string, deposit_amount?: number } = {}
        ) => {
            const product = await prisma.product.create({
                data: {
                    
                    category_id: categoryId,
                    name,
                    description,
                    base_price: price,
                    ...extraData
                }
            });

            if (opts.needsFleisch) {
                const mg = await prisma.modifierGroup.create({
                    data: { product_id: product.id, name: "Welches Fleisch?", is_required: true, max_selections: 1 }
                });
                await prisma.modifier.createMany({ data: fleischOptionen.map(o => ({ ...o, group_id: mg.id })) });
            }

            if (opts.needsPideType) {
                const mg = await prisma.modifierGroup.create({
                    data: { product_id: product.id, name: "Welche Sorte?", is_required: true, max_selections: 1 }
                });
                await prisma.modifier.createMany({ data: pideOptionen.map(o => ({ ...o, group_id: mg.id })) });
            }

            if (opts.needsBoxBeilage) {
                const mg = await prisma.modifierGroup.create({
                    data: { product_id: product.id, name: "Welche Beilage?", is_required: true, max_selections: 1 }
                });
                await prisma.modifier.createMany({ data: boxBeilagen.map(o => ({ ...o, group_id: mg.id })) });
            }

            if (opts.canHaveDoenerExtras) {
                const mg = await prisma.modifierGroup.create({
                    data: { product_id: product.id, name: "Extras & Anpassungen", is_required: false, max_selections: 5 }
                });
                await prisma.modifier.createMany({ data: doenerExtras.map(o => ({ ...o, group_id: mg.id })) });
            }

            if (opts.canHavePizzaExtras) {
                const mg = await prisma.modifierGroup.create({
                    data: { product_id: product.id, name: "Pizza Extras", is_required: false, max_selections: 5 }
                });
                await prisma.modifier.createMany({ data: pizzaExtras.map(o => ({ ...o, group_id: mg.id })) });
            }
        };

        // 1. Döner & Dürüm
        await createProduct(catDoener.id, "Döner Sandwich", "Klassisch im Brot", 7.00, { needsFleisch: true, canHaveDoenerExtras: true }, { allergens: "a, g" });
        await createProduct(catDoener.id, "Döner Sandwich mit Käse", "Mit leckerem Weichkäse", 7.50, { needsFleisch: true, canHaveDoenerExtras: true }, { allergens: "a, g" });
        await createProduct(catDoener.id, "Döner XL", "Für den großen Hunger", 9.00, { needsFleisch: true, canHaveDoenerExtras: true }, { allergens: "a, g" });
        await createProduct(catDoener.id, "Vegetar. Sandwich m. Käse", "Mit Salat und Weichkäse", 6.50, { canHaveDoenerExtras: true }, { allergens: "a, g" });
        await createProduct(catDoener.id, "Döner Dürüm", "Im gerollten Yufka", 8.00, { needsFleisch: true, canHaveDoenerExtras: true }, { allergens: "a, g" });
        await createProduct(catDoener.id, "Döner Dürüm mit Käse", "Mit leckerem Weichkäse", 8.50, { needsFleisch: true, canHaveDoenerExtras: true }, { allergens: "a, g" });
        await createProduct(catDoener.id, "Falafel Sandwich", "Mit knusprigen Falafel", 7.00, { canHaveDoenerExtras: true }, { allergens: "a" });
        await createProduct(catDoener.id, "Falafel Dürüm", "Im gerollten Yufka", 8.00, { canHaveDoenerExtras: true }, { allergens: "a" });

        // 2. Pide & Lahmacun
        await createProduct(catPide.id, "Lahmacun mit Salat", "Türkische Pizza", 7.00, { canHaveDoenerExtras: true }, { allergens: "a" });
        await createProduct(catPide.id, "Lahmacun mit Käse", "Türkische Pizza mit Weichkäse", 7.50, { canHaveDoenerExtras: true }, { allergens: "a, g" });
        await createProduct(catPide.id, "Lahmacun m. Dönerfl", "Türkische Pizza mit Fleisch", 8.50, { needsFleisch: true, canHaveDoenerExtras: true }, { allergens: "a, g" });
        await createProduct(catPide.id, "Pide", "Schiffchen aus Teig", 8.00, { needsPideType: true }, { allergens: "a, g" });

        // 3. Tellerportionen
        await createProduct(catTeller.id, "Döner Teller mit Salat", "Frisch zubereitet", 12.00, { needsFleisch: true }, { allergens: "g" });
        await createProduct(catTeller.id, "Döner Teller mit Salat u. Reis", "Frisch zubereitet", 12.00, { needsFleisch: true }, { allergens: "g" });
        await createProduct(catTeller.id, "Döner Teller m. Pommes u. Salat", "Frisch zubereitet", 12.00, { needsFleisch: true }, { allergens: "g" });
        await createProduct(catTeller.id, "Falafel Teller m. Salat u. Reis", "Vegetarisches Highlight", 10.00, {}, { allergens: "a" });
        await createProduct(catTeller.id, "Falafel Teller m. Salat u. Pommes", "Vegetarisches Highlight", 10.00, {}, { allergens: "a" });

        // 4. Döner Boxen
        await createProduct(catBox.id, "Große Döner Box", "Mit Beilage nach Wahl", 8.00, { needsFleisch: true, needsBoxBeilage: true });
        await createProduct(catBox.id, "Döner Box mit Pommes", "Der Klassiker to go", 7.00, { needsFleisch: true });
        await createProduct(catBox.id, "Döner Box mit Reis", "To go", 7.00, { needsFleisch: true });
        await createProduct(catBox.id, "Döner Box mit Salat", "To go", 7.00, { needsFleisch: true });
        await createProduct(catBox.id, "Vegetarische Box", "Mit Reis, Salat u. Pommes", 6.00);

        // 5. Beilagen
        await createProduct(catBeilagen.id, "Pommes kl.", "Klein und knusprig", 3.50);
        await createProduct(catBeilagen.id, "Pommes gr.", "Groß und knusprig", 4.50);

        // 6. Pizza
        await createProduct(catPizza.id, "Margherita", "Der Klassiker", 8.50, { canHavePizzaExtras: true }, { allergens: "a, g" });
        await createProduct(catPizza.id, "Salami", "Mit feiner Salami", 9.50, { canHavePizzaExtras: true }, { allergens: "a, g", additives: "1, 2, 3" });
        await createProduct(catPizza.id, "Funghi", "Mit frischen Champignons", 9.50, { canHavePizzaExtras: true }, { allergens: "a, g" });
        await createProduct(catPizza.id, "Sucuk Pizza", "Mit würziger Knoblauchwurst", 10.00, { canHavePizzaExtras: true }, { allergens: "a, g", additives: "1, 2, 3" });
        await createProduct(catPizza.id, "Spinaci", "Mit Spinat", 9.50, { canHavePizzaExtras: true }, { allergens: "a, g" });
        await createProduct(catPizza.id, "Verdure", "Mit knackigem Gemüse", 9.50, { canHavePizzaExtras: true }, { allergens: "a, g" });
        await createProduct(catPizza.id, "Artischocken", "Mit Artischocken", 9.50, { canHavePizzaExtras: true }, { allergens: "a, g" });
        await createProduct(catPizza.id, "Tonno", "Mit Thunfisch", 9.50, { canHavePizzaExtras: true }, { allergens: "a, d, g" });
        await createProduct(catPizza.id, "Regina", "Mit Schinken & Champignons", 10.50, { canHavePizzaExtras: true }, { allergens: "a, g", additives: "2, 3" });
        await createProduct(catPizza.id, "Pizza mit Dönerfleisch", "Der Verkaufsschlager", 11.00, { needsFleisch: true, canHavePizzaExtras: true }, { allergens: "a, g" });

        // 7. Salate
        await createProduct(catSalad.id, "Thunfisch Salat", "Hausgemacht. Frisch.", 8.00, {}, { allergens: "c, d" });
        await createProduct(catSalad.id, "Istanbul Salat", "Mit leckerem Dönerfleisch", 9.00, { needsFleisch: true }, { allergens: "g" });

        // 8. Getränke
        await createProduct(catDrinks.id, "Cola 0,33l", "Koffeinhaltig", 2.00, {}, { additives: "1, 9", deposit_amount: 0.25 });
        await createProduct(catDrinks.id, "Fanta 0,33l", "Erfrischungsgetränk", 2.00, {}, { additives: "1, 3", deposit_amount: 0.25 });
        await createProduct(catDrinks.id, "Mezzo Mix 0,33l", "Koffeinhaltig", 2.00, {}, { additives: "1, 3, 9", deposit_amount: 0.25 });
        await createProduct(catDrinks.id, "Wasser 0,33l", "Spritzig", 1.50, {}, { deposit_amount: 0.15 });
        await createProduct(catDrinks.id, "Ayran 0,25l", "Kühl und erfrischend", 1.50, {}, { allergens: "g" });
        await createProduct(catDrinks.id, "Uludağ 0,33l", "Türkische Limonade", 2.00, {}, { deposit_amount: 0.25, additives: "1, 3" });
        await createProduct(catDrinks.id, "Helles 0,5l", "Bier", 3.00, {}, { allergens: "a", deposit_amount: 0.08 });
        await createProduct(catDrinks.id, "Weizen 0,5l", "Bier", 3.00, {}, { allergens: "a", deposit_amount: 0.08 });
        await createProduct(catDrinks.id, "Tasse Kaffee", "Heißgetränk", 2.00);
        await createProduct(catDrinks.id, "Türk. Tee", "Heißgetränk", 1.50);

        // Shop Settings
        const openingHours = {
            monday: { open: "10:00", close: "21:30" },
            tuesday: { open: "10:00", close: "21:30" },
            wednesday: { open: "10:00", close: "21:30" },
            thursday: { open: "10:00", close: "21:30" },
            friday: { open: "10:00", close: "21:30" },
            saturday: { open: "10:00", close: "21:30" },
            sunday: { open: "10:00", close: "21:00" }
        };

        await prisma.shopSettings.upsert({
            where: { 
            update: {
                is_open_right_now: true,
                opening_hours_json: JSON.stringify(openingHours)
            },
            create: {
                 
                id: "1",
                is_open_right_now: true,
                opening_hours_json: JSON.stringify(openingHours)
            }
        });

        return NextResponse.json({ success: true, message: "Database re-seeded with all missing items." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
