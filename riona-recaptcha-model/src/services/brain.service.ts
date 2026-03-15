import OpenAI from 'openai';
import { IHistoryItem, IMediaPart } from '@/types';
import logger from '@/utils/logger';

class BrainService {
    private client: OpenAI;

    constructor() {
        const apiKey = process.env.LLM7_API_KEY;
        const baseURL = process.env.LLM7_BASE_URL || "https://api.llm7.io/v1";

        if (!apiKey) {
            logger.warn("LLM7_API_KEY is missing. Brain functions will fail.");
        }

        this.client = new OpenAI({
            baseURL: baseURL,
            apiKey: apiKey || 'unused'
        });
    }

    /**
     * Generate response or plan actions using LLM7.
     * Supports multimodal input (screenshots).
     */
    async think(params: {
        systemPrompt: string;
        userMessage: string;
        history?: IHistoryItem[];
        mediaParts?: IMediaPart[];
        model?: string;
    }) {
        const { systemPrompt, userMessage, history = [], mediaParts = [], model = "default" } = params;

        try {
            const messages: any[] = [
                { role: 'system', content: systemPrompt }
            ];

            history.forEach(msg => {
                messages.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });

            let userContent: any = userMessage;

            if (mediaParts && mediaParts.length > 0) {
                userContent = [{ type: 'text', text: userMessage }];
                mediaParts.forEach(m => {
                    if (m.inline_data) {
                        userContent.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:${m.inline_data.mime_type};base64,${m.inline_data.data}`
                            }
                        });
                    } else if (m.type === 'image_url') {
                        userContent.push(m);
                    }
                });
            }

            logger.info(`Brain Payload - Messages Count: ${messages.length}, Model: ${model}`);

            const response = await this.client.chat.completions.create({
                model: model,
                messages: [...messages, { role: 'user', content: userContent }],
            });

            const text = response.choices[0]?.message?.content || "I'm having trouble thinking right now.";
            
            return {
                text,
                usage: response.usage ? {
                    prompt_tokens: response.usage.prompt_tokens,
                    completion_tokens: response.usage.completion_tokens
                } : null
            };

        } catch (error: any) {
            logger.error(`Brain Error: ${error.message}`);
            return { text: "I need a moment. My connection is fuzzy.", usage: null };
        }
    }
}

export default new BrainService();
