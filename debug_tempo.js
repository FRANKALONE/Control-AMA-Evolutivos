
const fs = require('fs');

const TEMPO_TOKEN = 'OIuuZxZ4h4gBYijsMaTFvBm3lz6Kzf-us'; // Hardcoded for test, will put in env later

// Use issue key we know has worklogs: OES-838 or try to find one
const ISSUE_KEY = 'OES-838';

async function testTempo() {
    console.log('Testing Tempo API with Issue Key:', ISSUE_KEY);

    // Check Search Endpoint first as it is versatile
    // https://api.tempo.io/4/worklogs/search
    // But documentation says getting worklogs for an issue might be distinct.
    // Let's try the generic worklogs with issue filter if possible or specific issue endpoint

    // There isn't a direct /issue/{key} endpoint in v4 publicly documented as easily as search. 
    // Usually it is GET /worklogs?issue={key}

    const url = `https://api.tempo.io/4/worklogs/issue/${ISSUE_KEY}`;
    // CAUTION: The above endpoint might not exist. 
    // Let's try the basic search one: https://api.tempo.io/4/worklogs?issue=[key] (if supported)
    // Or simpler: https://api.tempo.io/4/worklogs 

    // Let's try explicitly what usually works for V4:
    // GET https://api.tempo.io/4/worklogs/issue/{issueKey} IS NOT STANDARD V4 usually.
    // Standard V4 is search based.

    // Tempo requires issueId (numeric), not Key.
    // We found ID 95572 for TEN-138 in previous debug steps.
    const ISSUE_ID = '95572';
    const urlSearch = `https://api.tempo.io/4/worklogs?issueId=${ISSUE_ID}`;

    console.log('Fetching:', urlSearch);

    try {
        const response = await fetch(urlSearch, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEMPO_TOKEN}`,
                'Accept': 'application/json'
            }
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Body:', text.substring(0, 1000));

    } catch (e) {
        console.error('Error:', e);
    }
}

testTempo();
