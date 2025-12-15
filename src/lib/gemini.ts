import { GoogleGenerativeAI } from "@google/generative-ai";
import { getJiraIssues, getJiraComments } from './jira';

const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("GOOGLE_API_KEY is not defined");
}

const genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

export async function searchJiraContext(query: string) {
    // Detect typical Jira Key format (e.g., VIV-209, OBS-123)
    const keyMatch = query.match(/\b[A-Z]+-\d+\b/);

    if (keyMatch) {
        const issueKey = keyMatch[0];
        console.log(`🤖 AI Searching Jira for Key: ${issueKey}`);
        const issues = await getJiraIssues(`key = ${issueKey}`, [], 1, true);
        if (issues && issues.length > 0) {
            const issue = issues[0];
            // Fetch comments too for more context
            const comments = await getJiraComments(issueKey);
            return { type: 'issue', data: issue, comments };
        }
    }

    // Fuzzy search (basic) - if it looks like a project name
    if (query.length > 5 && !query.includes('hola')) {
        console.log(`🤖 AI Searching Jira for Text: ${query}`);
        // Search in summary or description
        const jql = `summary ~ "${query}" OR description ~ "${query}" AND issuetype = Evolutivo`;
        const issues = await getJiraIssues(jql, [], 3);
        if (issues && issues.length > 0) {
            return { type: 'search_results', data: issues };
        }
    }

    return null;
}

export async function generateInsight(evolutivo: any, hitos: any[], comments: any[]) {
    // 1. Prepare Context
    const summary = evolutivo.fields.summary;
    const description = evolutivo.fields.description || "Sin descripción";
    const status = evolutivo.fields.status.name;
    const assignee = evolutivo.fields.assignee?.displayName || "Sin asignar";

    // Hitos Summary
    const hitosText = hitos.map(h => {
        const hKey = h.key;
        const hSum = h.fields.summary;
        const hStatus = h.fields.status.name;
        const hAssignee = h.fields.assignee?.displayName || "Sin responsable";
        const hDate = h.fields.duedate || "Sin fecha";
        return `- [${hKey}] ${hSum} (Estado: ${hStatus}, Responsable: ${hAssignee}, Fecha: ${hDate})`;
    }).join('\n');

    // Comments Summary (last 5)
    const commentsText = comments.slice(0, 5).map(c => {
        const author = c.author.displayName;
        const body = c.body;
        return `"${body}" - ${author}`;
    }).join('\n');

    // 2. Prompt
    const prompt = `
Eres un asistente experto en gestión de proyectos de desarrollo de software (Evolutivos).
Tu objetivo es analizar el estado de un "Evolutivo", sus "Hitos" y los comentarios recientes para dar un Insight ejecutivo.

REGLAS CLAVE DEL NEGOCIO:
1. Son CRÍTICOS los hitos llamados "Entrega en DES", "Entrega para Pruebas", "Entrega en PRO", "Puesta en marcha", "Transporte a Productivo" o similares. Menciónalos.
2. Los hitos SIN RESPONSABLE asignado suelen ser hitos de CLIENTE. Alerta sobre ellos si están próximos o bloquean.
3. El tono debe ser profesional, directo y orientado a la acción.

DATOS DEL EVOLUTIVO:
Título: ${summary}
Estado: ${status}
Responsable: ${assignee}
Descripción: ${description.substring(0, 500)}...

HITOS:
${hitosText}

COMENTARIOS RECIENTES:
${commentsText}

Tu respuesta debe ser en formato MARKDOWN y seguir esta estructura:
### 📊 Análisis de Situación
[Resumen corto del estado real]

### 🚨 Riesgos y Bloqueos
[Lista de riesgos detectados, especialmente fechas vencidas o hitos sin responsable]

### 💡 Recomendación
[1 o 2 acciones sugeridas para el Gestor]
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("Gemini Insight Error:", error);
        return "No se pudo generar el insight debido a un error de configuración o conexión con Gemini.";
    }
}

export async function chatWithContext(messages: any[], contextArg?: any) {
    // Inject context into system message if provided
    let systemInstruction = "Eres un asistente virtual integrado en el Dashboard de Evolutivos de Altim/Vivenio. Ayudas al usuario a entender el estado de los proyectos. Tienes acceso a datos de JIRA en tiempo real.\n\n" +
        "⚠️ REGLA DE ORO: NO INVENTES DATOS. Si no tienes información sobre 'Progreso %', 'Riesgos', 'Fase', etc., NO LOS PONGAS. Solo reporta lo que ves en el CONTEXTO o en los DATOS DE JIRA (Estado, Responsable, Descripción, Comentarios). Si el estado es 'En Curso', no asumas un % de avance arbitrario.";

    if (contextArg) {
        if (contextArg.jiraData) {
            const jd = contextArg.jiraData;
            if (jd.type === 'issue') {
                systemInstruction += `\n\n🔎 DATO ENCONTRADO EN JIRA (Usar esta información como la VERDAD ABSOLUTA):\n` +
                    `Evolutivo: ${jd.data.key} - ${jd.data.fields.summary}\n` +
                    `Estado: ${jd.data.fields.status.name}\n` +
                    `Responsable: ${jd.data.fields.assignee?.displayName || 'Sin asignar'}\n` +
                    `Descripción: ${jd.data.fields.description}\n` +
                    `Comentarios recientes: ${JSON.stringify(jd.comments?.slice(0, 3) || [])}`;
            } else if (jd.type === 'search_results') {
                systemInstruction += `\n\n🔎 RESULTADOS DE BÚSQUEDA JIRA:\n` +
                    jd.data.map((i: any) => `- ${i.key}: ${i.fields.summary} (${i.fields.status.name})`).join('\n');
            }
        }

        systemInstruction += `\n\nCONTEXTO NAVEGACIÓN: ${JSON.stringify(contextArg).substring(0, 500)}`;
    }


    // Gemini Chat specific format
    // History needs to be mapped from role 'user'/'assistant' to 'user'/'model'
    let history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    // FIX: Ensure history starts with 'user'
    while (history.length > 0 && history[0].role === 'model') {
        history.shift();
    }

    const lastMessage = messages[messages.length - 1].content;

    try {
        const chat = model.startChat({
            history: history,
            systemInstruction: {
                role: 'system',
                parts: [{ text: systemInstruction }]
            },
        });

        const result = await chat.sendMessage(lastMessage);
        const response = await result.response;
        return response.text();
    } catch (error: any) {
        console.error("Gemini Chat Error Details:", JSON.stringify(error, null, 2));
        return `Error: ${error.message || "Lo siento, no puedo responder en este momento."}`;
    }
}
