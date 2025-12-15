
import { NextRequest, NextResponse } from 'next/server';
import { getTempoWorklogs } from '@/lib/tempo';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get('issueId');

    if (!issueId) {
        return NextResponse.json({ error: 'Missing issueId parameter' }, { status: 400 });
    }

    try {
        const worklogs = await getTempoWorklogs(issueId);
        return NextResponse.json(worklogs);
    } catch (error: any) {
        console.error('Tempo API Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
