import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 403 });
    }

    const id = parseInt(params.id);

    if (isNaN(id)) {
        return new NextResponse('Invalid ID', { status: 400 });
    }

    try {
        await prisma.user.delete({
            where: { id }
        });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        return new NextResponse('Error deleting user', { status: 500 });
    }
}
