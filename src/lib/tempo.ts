
import { getJiraUser } from './jira';

const TEMPO_API_TOKEN = process.env.TEMPO_API_TOKEN;

export async function getTempoWorklogs(issueId: string) {
    if (!TEMPO_API_TOKEN) {
        throw new Error('Missing TEMPO_API_TOKEN');
    }

    // https://api.tempo.io/4/worklogs?issueId={issueId}
    const url = `https://api.tempo.io/4/worklogs?issueId=${issueId}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${TEMPO_API_TOKEN}`,
            'Accept': 'application/json'
        },
        // Cache could be useful here, but data changes often
        // cache: 'no-store' 
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('Tempo API Error:', response.status, text);
        throw new Error(`Tempo API Error: ${response.status}`);
    }

    const data = await response.json();
    const worklogs = data.results || [];

    // Collect all unique accountIds
    const accountIds = new Set<string>();
    worklogs.forEach((w: any) => {
        if (w.author && w.author.accountId) {
            accountIds.add(w.author.accountId);
        }
    });

    // Fetch user details in parallel
    const usersMap: Record<string, any> = {};
    await Promise.all(Array.from(accountIds).map(async (accountId) => {
        try {
            const user = await getJiraUser(accountId);
            if (user) {
                usersMap[accountId] = user;
            }
        } catch (e) {
            console.error('Failed to fetch user for Tempo worklog:', accountId, e);
        }
    }));

    // Enrich worklogs
    return worklogs.map((w: any) => {
        const enrichedAuthor = w.author && w.author.accountId ? usersMap[w.author.accountId] : null;
        return {
            ...w,
            author: enrichedAuthor ? {
                accountId: enrichedAuthor.accountId,
                displayName: enrichedAuthor.displayName,
                avatar: enrichedAuthor.avatarUrls?.['48x48']
            } : w.author
        };
    });
}
