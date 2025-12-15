const https = require('https');
const fs = require('fs');

// Read env directly
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

if (!EMAIL || !TOKEN || !DOMAIN) {
    console.error("Missing credentials");
    process.exit(1);
}

const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
const postData = JSON.stringify({
    jql: 'key = ITR-618',
    maxResults: 1,
    fields: ['*all'] // Request ALL fields
});

const options = {
    hostname: DOMAIN.replace('https://', '').replace('/', ''),
    path: '/rest/api/3/search',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Content-Length': postData.length
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (!json.issues || json.issues.length === 0) {
                console.log("No issues found.");
                return;
            }
            const issue = json.issues[0];
            console.log(`Inspecting Issue: ${issue.key}`);

            // Check native worklog
            console.log("--- Native Worklog ---");
            if (issue.fields.worklog) {
                console.log(`Total Worklogs: ${issue.fields.worklog.total}`);
                console.log("First Worklog:", issue.fields.worklog.worklogs[0] || "None");
            } else {
                console.log("No 'worklog' field present.");
            }

            // Check for Tempo Team / Account custom fields
            console.log("\n--- Custom Fields (Potential Tempo) ---");
            Object.keys(issue.fields).forEach(key => {
                if (key.startsWith('customfield_')) {
                    // We don't know the names, but sometimes values give a hint or specific known IDs
                    // Tempo Account is usually one, Tempo Team another.
                    // But RAW worklogs (hours per day) are usually NOT in custom fields.
                }
            });

            // Helpful Output: Custom Field Names (requires another call usually, but let's just see keys)
            console.log("Custom Fields found: " + Object.keys(issue.fields).filter(k => k.startsWith('customfield_')).length);

        } catch (e) {
            console.error(e);
        }
    });
});

req.write(postData);
req.end();
