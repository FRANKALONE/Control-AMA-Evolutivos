import { NextResponse } from 'next/server';

const JIRA_DOMAIN = process.env.NEXT_PUBLIC_JIRA_DOMAIN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

export async function getJiraIssues(jql: string, extraFields: string[] = [], maxResults: number = 100, fetchAll: boolean = false) {
    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        throw new Error('Missing JIRA credentials');
    }

    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) {
        domain = `https://${domain}`;
    }

    const url = `${domain}/rest/api/3/search/jql`;

    let allIssues: any[] = [];
    let nextPageToken: string | undefined = undefined;
    let isFirst = true;

    // Safety limit for loops
    let pageCount = 0;
    const MAX_PAGES = 50;

    do {
        const body: any = {
            jql,
            fields: ['summary', 'status', 'assignee', 'duedate', 'priority', 'issuetype', 'project', 'parent', 'organizations', ...extraFields],
            maxResults: fetchAll ? 100 : maxResults,
        };

        if (nextPageToken) {
            body.nextPageToken = nextPageToken;
        }

        console.log(`DEBUG: Fetching JIRA Page ${pageCount + 1} (Strict POST):`, url);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(
                    `${JIRA_EMAIL}:${JIRA_API_TOKEN}`
                ).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('JIRA API Error:', response.status, errorText);
            throw new Error(`JIRA API Error: ${response.status} ${response.statusText}`);
        }

        const json = await response.json();

        if (!fetchAll) {
            return json;
        }

        if (json.issues) {
            allIssues = [...allIssues, ...json.issues];
        }

        nextPageToken = json.nextPageToken;
        pageCount++;

    } while (fetchAll && nextPageToken && pageCount < MAX_PAGES);

    return { issues: allIssues, total: allIssues.length };
}

export async function getJiraIssueCount(jql: string) {
    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        throw new Error('Missing JIRA credentials');
    }

    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) {
        domain = `https://${domain}`;
    }

    const url = `${domain}/rest/api/3/search/jql`;
    let total = 0;
    let nextPageToken: string | undefined = undefined;
    let pageCount = 0;
    const MAX_PAGES = 20; // Limit to ~2000 issues to prevent timeouts

    do {
        const body: any = {
            jql,
            fields: ['id'],
            maxResults: 100,
        };
        if (nextPageToken) {
            body.nextPageToken = nextPageToken;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) return total; // or throw

        const json = await response.json();
        if (json.issues) {
            total += json.issues.length;
        }

        nextPageToken = json.nextPageToken;
        pageCount++;

    } while (nextPageToken && pageCount < MAX_PAGES);

    return total;
}

export async function searchJiraUsers(query: string = '') {
    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        throw new Error('Missing JIRA credentials');
    }

    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) {
        domain = `https://${domain}`;
    }

    // Endpoint: /rest/api/3/user/search?query={query}
    const url = `${domain}/rest/api/3/user/search?query=${encodeURIComponent(query)}&maxResults=100&includeActive=true`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${Buffer.from(
                `${JIRA_EMAIL}:${JIRA_API_TOKEN}`
            ).toString('base64')}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('JIRA User Search Error:', response.status, errorText);
        throw new Error(`JIRA API Error: ${response.status}`);
    }

    return await response.json();
}
