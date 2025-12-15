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

const options = {
    hostname: DOMAIN.replace('https://', '').replace('/', ''),
    path: '/rest/api/3/myself',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log("Status:", res.statusCode);
        if (res.statusCode === 200) {
            const json = JSON.parse(data);
            console.log("Logged in as:", json.displayName, json.emailAddress);
            console.log("Active:", json.active);
        } else {
            console.log("Body:", data);
        }
    });
});

req.end();
