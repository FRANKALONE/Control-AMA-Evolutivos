import { NextRequest, NextResponse } from 'next/server';
import { getJiraIssues, getJiraComments } from '@/lib/jira';
import { generateInsight } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const { issueKey } = await request.json();

        if (!issueKey) {
            return NextResponse.json({ error: 'Missing issueKey' }, { status: 400 });
        }

        // 1. Fetch Evolutivo (Parent)
        const parentJql = `key = "${issueKey}"`;
        // Fetch specific fields needed context
        const parentData = await getJiraIssues(parentJql, ['customfield_10254', 'description'], 1, false);
        const parent = parentData.issues?.[0];

        if (!parent) {
            return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
        }

        // 2. Fetch Hitos (Children)
        const hitosJql = `parent = "${issueKey}" AND issuetype in ("Hito Evolutivo", "Hitos Evolutivos")`;
        const hitosData = await getJiraIssues(hitosJql, ['duedate', 'status', 'assignee'], 50, true);
        const hitos = hitosData.issues || [];

        // 3. Fetch Comments (We need to implement getJiraComments in lib/jira.ts)
        // For now, let's assume it exists or use a try-catch if I haven't implemented it yet.
        // I will implement it in the same step/next step.
        let comments: any[] = [];
        try {
            comments = await getJiraComments(issueKey);
        } catch (e) {
            console.warn("Could not fetch comments", e);
        }

        // 4. Generate Insight
        const insight = await generateInsight(parent, hitos, comments);

        return NextResponse.json({ insight });

    } catch (error: any) {
        console.error("AI Analyze Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
