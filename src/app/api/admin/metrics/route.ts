import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const metrics = await prisma.dailyMetric.findMany({
            orderBy: { date: 'desc' }
        });
        return NextResponse.json(metrics);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const body = await request.json();

        if (body.all) {
            await prisma.dailyMetric.deleteMany({});
            return NextResponse.json({ success: true, message: 'All metrics deleted' });
        }

        if (body.id) {
            await prisma.dailyMetric.delete({
                where: { id: parseInt(body.id) }
            });
            return NextResponse.json({ success: true, message: `Metric ${body.id} deleted` });
        }

        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
