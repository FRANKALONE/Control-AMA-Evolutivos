const fs = require('fs');
const path = require('path');

// Load env manual
const loadEnv = (file) => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                const val = match[2].trim().replace(/^"|"$/g, '');
                process.env[key] = val;
            }
        });
    }
};
loadEnv(path.join(__dirname, '.env'));
loadEnv(path.join(__dirname, '.env.local'));

const JIRA_DOMAIN = process.env.NEXT_PUBLIC_JIRA_DOMAIN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

async function fetchJira(jql) {
    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        console.error('Missing Env Vars');
        return;
    }

    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) domain = `https://${domain}`;

    const url = `${domain}/rest/api/3/search/jql`;

    console.log(`\nTesting JQL: ${jql}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jql,
                fields: ['summary', 'status', 'issuetype', 'parent'],
                maxResults: 10
            })
        });

        if (!response.ok) {
            console.log(`Error: ${response.status} ${response.statusText}`);
            const txt = await response.text();
            console.log(txt);
            return;
        }

        const json = await response.json();
        console.log(`Found: ${json.total} issues`);
        if (json.issues.length > 0) {
            console.log('Sample Issue:', json.issues[0].key, json.issues[0].fields.summary);
            console.log('Type:', json.issues[0].fields.issuetype.name);
        }
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    // 1. Check strict parent
    await fetchJira('parent = "OES-838"');

    // 2. Check issuetype existence
    await fetchJira('issuetype = "Hito Evolutivo" AND parent = "OES-838"');

    // 3. Check Epic Link (Classic projects)
    await fetchJira('"Epic Link" = "OES-838"');

    // 4. Broad search to see what IS linked to it?
    // Hard to do via JQL without "linkedIssues", but let's try finding issues with summary similarity?
    // Or just check if OES-838 exists and what type it is
    await fetchJira('key = "OES-838"');
}

main();
