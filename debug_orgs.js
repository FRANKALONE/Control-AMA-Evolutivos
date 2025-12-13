const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...vals] = line.split('=');
        if (key && vals.length > 0) {
            let val = vals.join('='); // Rejoin if value had =
            val = val.trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            process.env[key.trim()] = val;
        }
    });
} catch (e) {
    console.log('Could not load .env.local', e);
}
// const fetch = require('node-fetch'); // Native in Node 18+

async function debugOrgs() {
    const domain = process.env.NEXT_PUBLIC_JIRA_DOMAIN;
    const email = process.env.JIRA_EMAIL;
    const token = process.env.JIRA_API_TOKEN;

    if (!domain || !email || !token) {
        console.error('Missing env vars');
        return;
    }

    console.log('Domain:', domain);
    console.log('Email:', email);
    console.log('Token Length:', token ? token.length : 0);

    const url = `https://${domain.replace(/^https?:\/\//, '')}/rest/api/3/search/jql`;
    const auth = Buffer.from(`${email}:${token}`).toString('base64');

    // Search for 1 active Evolutivo
    const jql = 'issuetype = "Evolutivo"';

    console.log('Fetching 1 Evolutivo to inspect fields...');

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                jql,
                maxResults: 1,
                // Request possible custom field candidates for Organizations (often 10002 or similar)
                fields: ['summary', 'organizations', 'customfield_10002', '*all']
            })
        });

        console.log('Response Status:', res.status);

        if (!res.ok) {
            console.error('Error:', res.status, res.statusText);
            const txt = await res.text();
            console.error(txt);
            return;
        }

        const data = await res.json();
        console.log('Total Issues Found:', data.total);

        if (data.issues && data.issues.length > 0) {
            const issue = data.issues[0];
            console.log('Issue Key:', issue.key);
            console.log('Issue Type:', issue.fields.issuetype.name);
            console.log('Organizations Field (Standard):', JSON.stringify(issue.fields.organizations, null, 2));
            console.log('Organizations Field (customfield_10002):', JSON.stringify(issue.fields.customfield_10002, null, 2));

            // Look for ANY array field that might be organizations
            const arrayFields = Object.keys(issue.fields).filter(k => Array.isArray(issue.fields[k]) && issue.fields[k].length > 0);
            console.log('Non-empty Array Fields:', arrayFields);
            arrayFields.forEach(f => {
                if (!f.startsWith('comment') && !f.startsWith('worklog')) {
                    console.log(`Field ${f}:`, JSON.stringify(issue.fields[f], null, 2));
                }
            });

        } else {
            console.log('No Evolutivos found.');
        }

    } catch (e) {
        console.error(e);
    }
}

debugOrgs();
