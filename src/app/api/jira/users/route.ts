import { NextResponse } from 'next/server';
import { getJiraIssues } from '@/lib/jira';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return new NextResponse('Unauthorized', { status: 403 });
    }

    try {
        // Fetch ALL Active Evolutivos to harvest users involved (Gestors & Assignees)
        // Using the same base logic as the dashboard to ensure "the same users"
        const jql = `projectType = "service_desk" AND issuetype = "Evolutivo" AND status != "Cerrado" AND status != "Entregado en PRD"`;

        // We only need specific fields
        const data = await getJiraIssues(jql, ['customfield_10254', 'assignee'], 100, true);
        const issues = data.issues || [];

        const uniqueUsers = new Map<string, any>();

        issues.forEach((issue: any) => {
            // 1. Harvest Gestor (customfield_10254)
            const gestor = issue.fields.customfield_10254;
            if (gestor && gestor.accountId) {
                uniqueUsers.set(gestor.accountId, {
                    accountId: gestor.accountId,
                    displayName: gestor.displayName,
                    avatar: gestor.avatarUrls?.['48x48']
                });
            }

            // 2. Harvest Assignee (Responsable)
            const assignee = issue.fields.assignee;
            if (assignee && assignee.accountId) {
                uniqueUsers.set(assignee.accountId, {
                    accountId: assignee.accountId,
                    displayName: assignee.displayName,
                    avatar: assignee.avatarUrls?.['48x48']
                });
            }
        });

        // Convert Map to Array and sort by name
        const usersList = Array.from(uniqueUsers.values()).sort((a, b) =>
            (a.displayName || '').localeCompare(b.displayName || '')
        );

        return NextResponse.json(usersList);
    } catch (error) {
        console.error("Jira Users API Error", error);
        return new NextResponse('Error fetching jira users', { status: 500 });
    }
}
