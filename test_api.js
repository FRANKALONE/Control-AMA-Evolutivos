const fs = require('fs');
const https = require('https');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('No .env.local found');
    process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8');
const config = {};
env.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val) config[key.trim()] = val.join('=').trim();
});

const DOMAIN = config.NEXT_PUBLIC_JIRA_DOMAIN || config.JIRA_DOMAIN;
const EMAIL = config.JIRA_EMAIL;
const TOKEN = config.JIRA_API_TOKEN;

const auth = Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
const cleanDomain = DOMAIN.replace(/\/$/, '').replace(/^https?:\/\//, '');

const options = (path, method) => ({
    hostname: cleanDomain,
    port: 443,
    path: path,
    method: method,
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

const getJson = (path, method, body) => {
    return new Promise((resolve, reject) => {
        const req = https.request(options(path, method), (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                console.log(`[${method}] ${path} -> ${res.statusCode}`);
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
                } else {
                    console.log('Error Body:', data);
                    resolve(null);
                }
            });
        });
        req.on('error', (e) => resolve(null));
        // For GET, we don't send body usually, but standard http.request supports it? 
        // JIRA GET params must be query string.
        if (method === 'POST' && body) req.write(JSON.stringify(body));
        req.end();
    });
};

async function run() {
    console.log(`\nTESTING GET /rest/api/3/search...`);

    const jql = `projectType = "service_desk" AND issuetype = "Evolutivo" AND status != "Cerrado" AND status != "Entregado en PRD"`;
    const encodedJql = encodeURIComponent(jql);

    // Test GET
    const path = `/rest/api/3/search?jql=${encodedJql}&maxResults=1&fields=summary`;

    await getJson(path, 'GET');
}

run();
