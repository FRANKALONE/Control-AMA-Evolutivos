const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@altim.com';
    const password = 'admin'; // Default password
    const name = 'Administrador';

    console.log(`Checking for existing admin user: ${email}...`);

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log('Admin user already exists.');
        return;
    }

    console.log('Creating admin user...');
    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
            role: 'ADMIN',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff`
        },
    });

    console.log('✅ Admin user created successfully!');
    console.log(`Credentials: ${email} / ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
