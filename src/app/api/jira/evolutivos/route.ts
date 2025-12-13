import { NextRequest, NextResponse } from 'next/server';
import { getJiraIssues } from '@/lib/jira';
import { parseISO, compareAsc } from 'date-fns';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const includeChildren = searchParams.get('includeChildren') === 'true';
    try {
        // 1. Fetch All Active Evolutivos (Parents)
        // Request 'customfield_10254' (Gestor) and 'customfield_10002' (Organization)
        const evolutivosJql = `projectType = "service_desk" AND issuetype = "Evolutivo" AND status != "Cerrado" AND status != "Entregado en PRD"`;
        const parentData = await getJiraIssues(evolutivosJql, ['customfield_10254', 'customfield_10002', 'customfield_10121'], 100, true);
        const parents = parentData.issues || [];

        if (parents.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Fetch All Open Hitos linked to these parents
        // We use 'parent in (...)'. Helper to chunk array
        const chunkArray = (arr: any[], size: number) => {
            const chunks = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        };

        const parentKeys = parents.map((p: any) => p.key);
        const keyChunks = chunkArray(parentKeys, 50); // Safe chunk size for JQL

        // Fetch hitos in parallel chunks
        const hitosPromises = keyChunks.map(chunk => {
            // Updated JQL: Removed projectType restriction to find ALL children regardless of project context
            // Just search by parent and type (Allow plural/singular variation just in case)
            const jql = `issuetype in ("Hito Evolutivo", "Hitos Evolutivos") AND parent in (${chunk.join(',')})`;
            // Request 'customfield_10124' (Fecha inicio planificada)
            return getJiraIssues(jql, ['customfield_10124'], 100, true);
        });

        const hitosResults = await Promise.all(hitosPromises);

        // Flatten all issues from all chunks
        const hitos = hitosResults.flatMap(res => res.issues || []);

        // 3. Map Hitos to Parents
        const hitosByParent: Record<string, any[]> = {};
        hitos.forEach((hito: any) => {
            const pKey = hito.fields.parent?.key;
            if (pKey) {
                if (!hitosByParent[pKey]) hitosByParent[pKey] = [];
                hitosByParent[pKey].push(hito);
            }
        });

        // 4. Enrich & Calculate Sorting Key
        // Helper to check exclusion
        const EXCLUDED_BILLING_MODES = ['T&M facturable', 'T&M contra bolsa'];

        const enrichedList = parents.map((parent: any, index: number) => {
            const children = hitosByParent[parent.key] || [];

            // "Active" children for date calculation (User specific: "not equal to Cerrado")
            const activeChildren = children.filter((c: any) =>
                c.fields.status?.name !== 'Cerrado'
            );

            // Find "Latest" due date among OPEN children
            let latestDateObj: Date | null = null;
            let latestDateStr: string | null = null;

            activeChildren.forEach((child: any) => {
                const dStr = child.fields.duedate;
                if (dStr) {
                    const d = parseISO(dStr); // ISO YYYY-MM-DD
                    // Want the LATEST (Max) date
                    if (!latestDateObj || d > latestDateObj) {
                        latestDateObj = d;
                        latestDateStr = dStr;
                    }
                }
            });

            // Gestor extraction
            const gestorField = parent.fields.customfield_10254;
            const gestor = gestorField ? {
                name: gestorField.displayName,
                avatar: gestorField.avatarUrls?.['48x48'],
                id: gestorField.accountId
            } : null;

            // Organization extraction
            const orgField = parent.fields.customfield_10002;
            const organization = orgField && orgField.length > 0 ? orgField[0].name : null;

            // Billing Mode extraction (customfield_10121)
            // It's usually an object with 'value' or 'id'
            const billingField = parent.fields.customfield_10121;
            const billingMode = billingField?.value || null;

            const isUnplanned = activeChildren.length === 0;

            // FILTER: If Unplanned AND Billing Mode is Excluded -> Return null (to filter later)
            if (isUnplanned && EXCLUDED_BILLING_MODES.includes(billingMode)) {
                return null;
            }

            return {
                key: parent.key,
                summary: parent.fields.summary,
                status: parent.fields.status.name,
                assignee: parent.fields.assignee,
                gestor,
                organization,
                billingMode, // Return it just in case we need it in UI
                project: parent.fields.project.name,
                totalHitos: hitosByParent[parent.key] ? hitosByParent[parent.key].length : 0,
                pendingHitos: activeChildren.length,
                latestDeadline: latestDateStr, // YYYY-MM-DD
                latestDeadlineObj: latestDateObj, // For sorting
                parentDeadline: parent.fields.duedate || null,
                children: includeChildren ? children : undefined // Include children for Timeline
            };
        }).filter(Boolean); // Remove nulls

        // 5. Sort
        // Logic:
        // - No Planificados (totalHitos == 0) -> First.
        // - Then Planificados (totalHitos > 0).
        // - within Planificados, sort by latestDeadline Ascending.
        enrichedList.sort((a: any, b: any) => {
            // Priority 1: Unplanned (TotalHitos == 0)
            if (a.totalHitos === 0 && b.totalHitos > 0) return -1;
            if (a.totalHitos > 0 && b.totalHitos === 0) return 1;

            // Priority 2: Date (Using logic: If calculated exists, use it. Else use parent. Else null?)
            // User requirement was "latest due date of their non-closed child milestones".
            // So we stick to a.latestDeadlineObj for sorting PLANNED ones.
            // But if they are sorting UNPLANNED ones, maybe use parentDeadline?

            const getDate = (item: any) => item.latestDeadlineObj || (item.parentDeadline ? parseISO(item.parentDeadline) : null);

            const dateA = getDate(a);
            const dateB = getDate(b);

            if (!dateA && !dateB) return 0;
            if (!dateA) return 1; // No date -> Bottom
            if (!dateB) return -1;

            return compareAsc(dateA, dateB);
        });

        return NextResponse.json(enrichedList);

    } catch (error: any) {
        console.error("Evolutivos API Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
