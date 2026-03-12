import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Create admin user
    const admin = await prisma.user.upsert({
        where: { email: 'admin@istanbulgrillhaus.de' },
        update: {},
        create: {
            id: 'admin-istanbul',
            email: 'admin@istanbulgrillhaus.de',
            role: 'OWNER'
        },
    })

    // Create categories
    const kebapCategory = await prisma.category.create({
        data: {
            name: 'Kebap',
            sort_order: 1,
            is_active: true
        }
    })

    const dönerCategory = await prisma.category.create({
        data: {
            name: 'Döner',
            sort_order: 2,
            is_active: true
        }
    })

    const pideCategory = await prisma.category.create({
        data: {
            name: 'Pide',
            sort_order: 3,
            is_active: true
        }
    })

    // Create products
    await prisma.product.createMany({
        data: [
            {
                name: 'Döner Kebap',
                description: 'Frisches Dönerfleisch mit Salat, Tomaten, Zwiebeln und Sauce',
                base_price: 5.50,
                category_id: dönerCategory.id,
                is_vegetarian: false,
                is_spicy: false
            },
            {
                name: 'Köfte Kebap',
                description: 'Rinder-Köfte mit Salat, Tomaten, Zwiebeln und Sauce',
                base_price: 5.50,
                category_id: kebapCategory.id,
                is_vegetarian: false,
                is_spicy: false
            },
            {
                name: 'Adana Kebap',
                description: 'Gewürzte Hackfleischspieße mit Salat, Tomaten, Zwiebeln und Sauce',
                base_price: 6.50,
                category_id: kebapCategory.id,
                is_vegetarian: false,
                is_spicy: true
            },
            {
                name: 'Pide Käse',
                description: 'Fladenbrot mit Käse überbacken',
                base_price: 4.50,
                category_id: pideCategory.id,
                is_vegetarian: true,
                is_spicy: false
            },
            {
                name: 'Pide Sucuklu',
                description: 'Fladenbrot mit Sucuk, Käse und Ei',
                base_price: 5.50,
                category_id: pideCategory.id,
                is_vegetarian: false,
                is_spicy: false
            }
        ]
    })

    // Create shop settings
    await prisma.shopSettings.create({
        data: {
            is_open_right_now: true,
            opening_hours_json: JSON.stringify({
                monday: { open: '11:00', close: '22:00' },
                tuesday: { open: '11:00', close: '22:00' },
                wednesday: { open: '11:00', close: '22:00' },
                thursday: { open: '11:00', close: '22:00' },
                friday: { open: '11:00', close: '23:00' },
                saturday: { open: '12:00', close: '23:00' },
                sunday: { open: '12:00', close: '21:00' }
            })
        }
    })

    console.log('✅ Istanbul Grillhaus data seeded successfully!')
    console.log(`👤 Admin user: ${admin.email}`)
    console.log(`🏪 Categories: ${kebapCategory.name}, ${dönerCategory.name}, ${pideCategory.name}`)
    console.log(`🛒 Products: 5 items created`)
}

main().then(async () => {
    await prisma.$disconnect()
}).catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})