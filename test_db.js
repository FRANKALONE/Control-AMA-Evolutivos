const { PrismaClient } = require('@prisma/client');

async function main() {
    console.log('Initializing Prisma Client (v5)...');
    const prisma = new PrismaClient();

    try {
        console.log('Attempting Upsert...');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Test basic connection
        const metric = await prisma.dailyMetric.upsert({
            where: { date: today },
            update: { count: 123 },
            create: { date: today, count: 123 }
        });

        console.log('Success!', metric);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
