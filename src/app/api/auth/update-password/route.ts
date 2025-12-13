import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { password } = await req.json();

        if (!password || password.length < 8) {
            return new NextResponse('Invalid password', { status: 400 });
        }

        const hashedPassword = await hash(password, 12);

        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return new NextResponse('Error updating password', { status: 500 });
    }
}
