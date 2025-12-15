import { getJiraIssues } from './src/lib/jira';

async function checkFields() {
    // Fetch one issue to see all its fields
    // We need to bypass the strict field selection in our lib or create a raw fetch here.
    // Let's rely on getJiraIssues but ask for *all* fields if possible, or investigate 'worklog' field.

    // Actually, best way is to fetch an issue and log the entire 'fields' object to see if 'tempo' or 'worklog' appears.
    const issues = await getJiraIssues('issuetype = Evolutivo', ['*all'], 1);

    if (issues.issues && issues.issues.length > 0) {
        const issue = issues.issues[0];
        console.log("Issue Key:", issue.key);
        console.log("Field Keys:", Object.keys(issue.fields));

        // Specific check for worklog
        if (issue.fields.worklog) {
            console.log("Generic Jira Worklog found:", JSON.stringify(issue.fields.worklog, null, 2));
        } else {
            console.log("Generic Jira Worklog NOT found (or empty).");
        }

        // Check for custom fields that might be Tempo
        // Tempo usually stores data in customfields or requires its own API.
        const tempoFields = Object.keys(issue.fields).filter(k => k.toLowerCase().includes('tempo'));
        console.log("Potential Tempo Fields:", tempoFields);
    } else {
        console.log("No issues found to inspect.");
    }
}

// We need to run this in a context where 'fetch' and env vars work.
// Since our lib uses 'process.env', we need dotenv.
// I will create a standalone script that imports the lib properly or just rewrites the fetch for simplicity.
