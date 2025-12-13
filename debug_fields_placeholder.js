
const { getJiraIssues } = require('./src/lib/jira');

async function debugFields() {
    try {
        // Fetch one Evolutivo to inspect fields
        const jql = 'projectType = "service_desk" AND issuetype = "Evolutivo" MAXRESULTS 1';
        // We can't use the lib function directly if it's TS and uses imports. 
        // I'll assume I can't run TS directly with node.
        // I will use a simple fetch to the existing API if possible? 
        // No, I can't call localhost API easily from a script without server running. 
        // I should modify the existing route temporarily to log fields or create a new temporary route.
        // Actually, I can just modify `src/app/api/jira/evolutivos/route.ts` to log the fields of the first issue it finds.

    } catch (e) {
        console.error(e);
    }
}
