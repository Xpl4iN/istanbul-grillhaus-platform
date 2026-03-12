#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

async function setupDatabase() {
    console.log('🚀 Setting up Istanbul Grillhaus database...')

    try {
        // Generate Prisma client
        console.log('📦 Generating Prisma client...')
        execSync('npx prisma generate', { stdio: 'inherit' })

        // Push schema to database
        console.log('🗄️  Pushing schema to database...')
        execSync('npx prisma db push', { stdio: 'inherit' })

        // Seed the database
        console.log('🌱 Seeding database...')
        execSync('npx prisma db seed', { stdio: 'inherit' })

        console.log('✅ Istanbul Grillhaus database setup complete!')

    } catch (error) {
        console.error('❌ Database setup failed:', error.message)
        process.exit(1)
    }
}

if (require.main === module) {
    setupDatabase()
}

module.exports = { setupDatabase }