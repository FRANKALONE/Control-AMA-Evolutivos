
// const fetch = require('node-fetch'); // Native fetch in Node 18+
const fs = require('fs');
const path = require('path');

try {
    const envConfig = fs.readFileSync(path.resolve('.env.local'), 'utf8');
    envConfig.split(/\r?\n/).forEach(line => {
        const matches = line.match(/^([^=]+)=(.*)$/);
        if (matches) {
            const key = matches[1].trim();
            const value = matches[2].trim().replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
            process.env[key] = value;
        }
    });
} catch (e) {
    console.error('Error loading .env.local', e);
}

const JIRA_DOMAIN = process.env.NEXT_PUBLIC_JIRA_DOMAIN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

async function debugWorklog() {
    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        console.error('Missing credentials');
        return;
    }

    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) domain = `https://${domain}`;

    const url = `${domain}/rest/api/3/search`;
    const body = {
        jql: 'ORDER BY updated DESC',
        maxResults: 1,
        fields: ['worklog', 'summary']
    };

    console.log(`Config Check: Domain=${JIRA_DOMAIN ? 'OK' : 'MISSING'}, Email=${JIRA_EMAIL ? 'OK' : 'MISSING'}, Token=${JIRA_API_TOKEN ? 'OK (' + JIRA_API_TOKEN.length + ' chars)' : 'MISSING'}`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        console.log('Response Status:', response.status);
        const text = await response.text();
        // console.log('Response Body:', text.substring(0, 500)); // Log first 500 chars

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON:', text);
            return;
        }
        if (data.issues && data.issues.length > 0) {
            const issue = data.issues[0];
            console.log('Issue:', issue.key);
            console.log('Summary:', issue.fields.summary);
            console.log('Worklog Root:', JSON.stringify(issue.fields.worklog, null, 2));

            if (issue.fields.worklog && issue.fields.worklog.worklogs && issue.fields.worklog.worklogs.length > 0) {
                console.log('First Worklog Entry:', JSON.stringify(issue.fields.worklog.worklogs[0], null, 2));
            } else {
                console.log('No worklogs found or empty array');
            }

        } else {
            console.log('No issues found with logged time.');
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

debugWorklog();
