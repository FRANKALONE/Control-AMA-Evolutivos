import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
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
        const { name, email, role, jiraGestorName } = await req.json();

        if (isNaN(id)) return new NextResponse('Invalid ID', { status: 400 });

        await prisma.user.update({
            where: { id },
            data: {
                name,
                email,
                role,
                jiraGestorName: jiraGestorName || null
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return new NextResponse('Error updating user', { status: 500 });
    }
}
