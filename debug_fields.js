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

async function fetchFields() {
    if (!JIRA_DOMAIN || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        console.error('Missing Env Vars');
        return;
    }

    let domain = JIRA_DOMAIN.replace(/\/$/, '');
    if (!domain.startsWith('http')) domain = `https://${domain}`;

    const url = `${domain}/rest/api/3/field`;

    console.log(`Fetching Fields from: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.log(`Error: ${response.status} ${response.statusText}`);
            const txt = await response.text();
            console.log(txt);
            return;
        }

        const fields = await response.json();
        console.log(`Total Fields: ${fields.length}`);

        const candidates = fields.filter(f =>
            f.name.toLowerCase().includes('inicio') ||
            f.name.toLowerCase().includes('start') ||
            f.name.toLowerCase().includes('planif')
        );

        console.log('Candidates found:');
        candidates.forEach(c => {
            console.log(`${c.id}: ${c.name}`);
        });

    } catch (e) {
        console.error(e);
    }
}

fetchFields();
