import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hash } from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomBytes } from 'crypto';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 403 });
    }

    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                jiraGestorName: true,
                lastLogin: true,
                mustChangePassword: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(users);
    } catch (error) {
        return new NextResponse('Error fetching users', { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 403 });
    }

    try {
        const body = await req.json();
        const { name, email, role, password, jiraGestorName } = body;

        if (!email || !role) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing) {
            return new NextResponse('User already exists', { status: 409 });
        }

        // Determine password (manual or auto)
        const finalPassword = password && password.trim() !== ''
            ? password
            : randomBytes(4).toString('hex');

        const hashedPassword = await hash(finalPassword, 12);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                jiraGestorName: jiraGestorName || null,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=random`,
                mustChangePassword: true
            }
        });

        return NextResponse.json({
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            tempPassword: finalPassword // Return the one used (manual or auto) for display
        });

    } catch (error) {
        console.error(error);
        return new NextResponse('Error creating user', { status: 500 });
    }
}
