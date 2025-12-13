const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@altim.com';
    const password = 'password123';
    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            email,
            name: 'Admin Inicial',
            password: hashedPassword,
            role: 'ADMIN',
            avatar: `https://ui-avatars.com/api/?name=Admin+Inicial&background=random`,
            mustChangePassword: true
        },
    });
    console.log({ user });
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
