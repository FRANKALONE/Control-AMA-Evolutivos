const https = require('https');
const fs = require('fs');

let env = {};
try {
    const data = fs.readFileSync('.env.local', 'utf8');
    data.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts.shift().trim();
            const value = parts.join('=').trim();
            if (key && value) env[key] = value;
        }
    });
} catch (e) {
    console.error("Could not read .env.local");
}

const EMAIL = env['JIRA_EMAIL'];
const TOKEN = env['JIRA_API_TOKEN'];
const DOMAIN = env['NEXT_PUBLIC_JIRA_DOMAIN'];

const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');

// Direct Issue Fetch (No JQL)
const issueKey = 'ITR-618';
const options = {
    hostname: DOMAIN.replace('https://', '').replace('/', ''),
    path: `/rest/api/3/issue/${issueKey}`, // ?expand=names,renderedFields
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
    }
};

console.log(`Fetching ${options.hostname}${options.path}...`);

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        if (res.statusCode === 200) {
            try {
                const json = JSON.parse(data);
                console.log("Success! Issue ID:", json.id);
                console.log("Fields available:", Object.keys(json.fields).length);

                // Now we can actually answer the user's question about Worklog!
                if (json.fields.worklog) {
                    console.log("--- WORKLOG FIELD FOUND ---");
                    console.log(`Total: ${json.fields.worklog.total}`);
                    if (json.fields.worklog.worklogs.length > 0) {
                        console.log("Sample Worklog:", JSON.stringify(json.fields.worklog.worklogs[0], null, 2));
                    } else {
                        console.log("Worklog array is empty (no time logged natively).");
                    }
                } else {
                    console.log("--- NO WORKLOG FIELD ---");
                }

                // Look for Tempo Custom Fields again
                const potentialTempo = Object.keys(json.fields).filter(k => k.includes('customfield'));
                // We'd need names to be sure, usually encoded in explicit 'names' expand, but let's just count them.
                console.log(`Custom Fields found: ${potentialTempo.length}`);

            } catch (e) {
                console.error("Error parsing JSON:", e);
            }
        } else {
            console.log("Error Body:", data);
        }
    });
});

req.end();
