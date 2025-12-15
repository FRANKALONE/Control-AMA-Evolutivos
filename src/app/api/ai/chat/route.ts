import { NextRequest, NextResponse } from 'next/server';
import { chatWithContext } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, context } = body;

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        const lastMessage = messages[messages.length - 1];

        let contextWithData = context || {};

        if (lastMessage.role === 'user') {
            const { searchJiraContext } = await import('@/lib/gemini'); // Lazy load to avoid circular deps if any
            const dataFound = await searchJiraContext(lastMessage.content);

            if (dataFound) {
                console.log("🐛 DEBUG: Jira Data Found for Chat:", JSON.stringify(dataFound, null, 2));
                contextWithData = {
                    ...contextWithData,
                    jiraData: dataFound
                };
            } else {
                console.log("🐛 DEBUG: No Jira Data found for query:", lastMessage.content);
            }
        }

        const reply = await chatWithContext(messages, contextWithData);

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error("AI Chat Error", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
