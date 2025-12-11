import { NextResponse } from 'next/server';
import { getJiraIssues, getJiraIssueCount } from '@/lib/jira';
import { parseISO, isPast, isToday, isFuture, addDays, isBefore, startOfDay } from 'date-fns';
import prisma from '@/lib/db';

export async function GET(request: Request) {
    try {
        // 1. Fetch specifically "Hitos Evolutivos" that are not closed.
        const jql = `projectType = "service_desk" AND issuetype = "Hitos Evolutivos" AND status != "Cerrado" AND duedate is not EMPTY ORDER BY duedate ASC`;

        // 1b. Fetch metric: Total Active Evolutivos (Parent tickets)
        // Criteria: Type=Evolutivo, Status != Closed AND != Entregado en PRD
        const evolutivosJql = `projectType = "service_desk" AND issuetype = "Evolutivo" AND status != "Cerrado" AND status != "Entregado en PRD"`;

        // Run both initial fetches in parallel for speed
        const [hitosData, activeEvolutivosCount] = await Promise.all([
            getJiraIssues(jql),
            getJiraIssueCount(evolutivosJql)
        ]);

        // PERSIST METRIC: Save/Update today's count in DB
        // UPSERT ensures only ONE record per day.
        try {
            const today = startOfDay(new Date());
            await prisma.dailyMetric.upsert({
                where: { date: today },
                update: { count: activeEvolutivosCount },
                create: { date: today, count: activeEvolutivosCount }
            });
        } catch (dbError) {
            console.error("Failed to save daily metric:", dbError);
            // Proceed without failing the request
        }

        let issues = hitosData.issues || [];

        // 2. ENRICHMENT: Fetch Parent Details for "Gestor del ticket" (customfield_10254)
        // Extract unique valid parent keys
        const parentKeys = [...new Set(issues
            .filter((i: any) => i.fields.parent && i.fields.parent.key)
            .map((i: any) => i.fields.parent.key)
        )];

        const managerMap = new Map();

        if (parentKeys.length > 0) {
            try {
                // Fetch parents in batch (Limit handled by maxResults=100 in lib, might need pagination if >100 parents, but unlikely for now)
                const parentsJql = `key in (${parentKeys.join(',')})`;
                const parentsData = await getJiraIssues(parentsJql, ['customfield_10254']); // Request Gestor field

                if (parentsData.issues) {
                    parentsData.issues.forEach((p: any) => {
                        // customfield_10254 is the User Object
                        const gestor = p.fields.customfield_10254;
                        if (gestor && gestor.displayName) {
                            managerMap.set(p.key, {
                                name: gestor.displayName,
                                avatar: gestor.avatarUrls?.['48x48'] || null,
                                id: gestor.accountId
                            });
                        }
                    });
                }
            } catch (err) {
                console.error("Error fetching parents for enrichment:", err);
            }
        }

        // 3. Attach Manager to Issues & Bucket them
        const now = new Date();
        const nextWeek = addDays(now, 7);

        const expired: any[] = [];
        const today: any[] = [];
        const upcoming: any[] = [];
        const others: any[] = [];

        // We map to a new array to avoid mutating read-only refs if any, and inject manager
        const enrichedIssues = issues.map((issue: any) => {
            const pKey = issue.fields.parent?.key;
            const manager = pKey ? managerMap.get(pKey) : null;
            return { ...issue, manager };
        });

        enrichedIssues.forEach((issue: any) => {
            const dueDateStr = issue.fields.duedate;
            if (!dueDateStr) return;

            const dueDate = parseISO(dueDateStr);

            if (isToday(dueDate)) {
                today.push(issue);
            } else if (isPast(dueDate)) {
                expired.push(issue);
            } else if (isFuture(dueDate) && isBefore(dueDate, nextWeek)) {
                upcoming.push(issue);
            } else {
                others.push(issue);
            }
        });

        return NextResponse.json({
            summary: {
                expired: expired.length,
                today: today.length,
                upcoming: upcoming.length,
                total: issues.length,
                activeEvolutivos: activeEvolutivosCount
            },
            issues: {
                expired,
                today,
                upcoming,
                others
            },
            // Return all managers found for the frontend filter
            managers: Array.from(managerMap.values()).reduce((acc: any[], curr) => {
                if (!acc.find(m => m.id === curr.id)) acc.push(curr);
                return acc;
            }, [])
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
