
import OpenAI from 'openai';

export const getModels = async (source) => {
    const client = new OpenAI({
        apiKey: source.apiKey,
        baseURL: source.baseUrl,
    });

    const models = await client.models.list();
    return models.data;
};

export const generateCompletion = async ({ source, prompt }) => {
    const client = new OpenAI({
        apiKey: source.apiKey,
        baseURL: source.baseUrl,
    });

    return await client.chat.completions.create({
        model: source.modelID,
        messages: [{ role: 'user', content: prompt }],
    });
};

export const generateStreamingCompletion = async ({ source, prompt }) => {
    const client = new OpenAI({
        apiKey: source.apiKey,
        baseURL: source.baseUrl,
    });

    const start = performance.now();
    let firstTextTime = null;
    let content = '';
    let usage = null;
    let servedModel = null;

    const stream = await client.chat.completions.create({
        model: source.modelID,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
        if (chunk.usage) {
            usage = chunk.usage;
        }

        if (chunk.model) {
            servedModel = chunk.model;
        }

        const text = chunk.choices[0]?.delta?.content;

        if (typeof text === 'string' && text.length > 0) {
            if (firstTextTime === null) {
                firstTextTime = performance.now();
            }

            content += text;
        }
    }

    const end = performance.now();

    return {
        content,
        ttftMs: firstTextTime === null ? null : firstTextTime - start,
        latencyMs: end - start,
        completion: {
            model: servedModel,
            usage,
        },
    };
};
