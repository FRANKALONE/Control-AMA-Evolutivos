import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 403 });
    }

    try {
        const id = parseInt(params.id);
        const { password } = await req.json();

        if (isNaN(id)) return new NextResponse('Invalid ID', { status: 400 });
        if (!password || password.length < 8) return new NextResponse('Password too short', { status: 400 });

        const hashedPassword = await hash(password, 12);

        await prisma.user.update({
            where: { id },
            data: {
                password: hashedPassword,
                mustChangePassword: true, // Force change on next login
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return new NextResponse('Error resetting password', { status: 500 });
    }
}
