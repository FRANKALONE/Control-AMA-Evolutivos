const https = require('https');
const fs = require('fs');

// Read env directly
let env = {};
try {
    const data = fs.readFileSync('.env.local', 'utf8');
    data.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
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
    path: '/rest/api/3/project',
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
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                console.log(`Found ${json.length} projects:`);
                json.forEach(p => console.log(`- ${p.key}: ${p.name}`));
            } else {
                console.log("Response is not an array:", JSON.stringify(json, null, 2));
            }
        } catch (e) {
            console.error(e);
            console.log("Raw:", data);
        }
    });
});

req.end();
