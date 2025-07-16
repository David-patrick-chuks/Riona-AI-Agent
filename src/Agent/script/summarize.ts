/* eslint-disable no-unused-vars */
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import logger from "../../config/logger";

import dotenv from "dotenv";
dotenv.config();


const geminiApiKeys = [
    process.env.GEMINI_API_KEY_1 || "API_KEY_1",
    process.env.GEMINI_API_KEY_2 || "API_KEY_2",
    process.env.GEMINI_API_KEY_3 || "API_KEY_3",
    process.env.GEMINI_API_KEY_4 || "API_KEY_4",
    process.env.GEMINI_API_KEY_5 || "API_KEY_5",
    process.env.GEMINI_API_KEY_6 || "API_KEY_6",
    process.env.GEMINI_API_KEY_7 || "API_KEY_7",
    process.env.GEMINI_API_KEY_8 || "API_KEY_8",
    process.env.GEMINI_API_KEY_9 || "API_KEY_9",
    process.env.GEMINI_API_KEY_10 || "API_KEY_10",
    process.env.GEMINI_API_KEY_11 || "API_KEY_11",
    process.env.GEMINI_API_KEY_12 || "API_KEY_12",
    process.env.GEMINI_API_KEY_13 || "API_KEY_13",
    process.env.GEMINI_API_KEY_14 || "API_KEY_14",
    process.env.GEMINI_API_KEY_15 || "API_KEY_15",
    process.env.GEMINI_API_KEY_16 || "API_KEY_16",
    process.env.GEMINI_API_KEY_17 || "API_KEY_17",
    process.env.GEMINI_API_KEY_18 || "API_KEY_18",
    process.env.GEMINI_API_KEY_19 || "API_KEY_19",
    process.env.GEMINI_API_KEY_20 || "API_KEY_20",
    process.env.GEMINI_API_KEY_21 || "API_KEY_21",
    process.env.GEMINI_API_KEY_22 || "API_KEY_22",
    process.env.GEMINI_API_KEY_23 || "API_KEY_23",
    process.env.GEMINI_API_KEY_24 || "API_KEY_24",
    process.env.GEMINI_API_KEY_25 || "API_KEY_25",
    process.env.GEMINI_API_KEY_26 || "API_KEY_26",
    process.env.GEMINI_API_KEY_27 || "API_KEY_27",
    process.env.GEMINI_API_KEY_28 || "API_KEY_28",
    process.env.GEMINI_API_KEY_29 || "API_KEY_29",
    process.env.GEMINI_API_KEY_30 || "API_KEY_30",
    process.env.GEMINI_API_KEY_31 || "API_KEY_31",
    process.env.GEMINI_API_KEY_32 || "API_KEY_32",
    process.env.GEMINI_API_KEY_33 || "API_KEY_33",
    process.env.GEMINI_API_KEY_34 || "API_KEY_34",
    process.env.GEMINI_API_KEY_35 || "API_KEY_35",
    process.env.GEMINI_API_KEY_36 || "API_KEY_36",
    process.env.GEMINI_API_KEY_37 || "API_KEY_37",
    process.env.GEMINI_API_KEY_38 || "API_KEY_38",
    process.env.GEMINI_API_KEY_39 || "API_KEY_39",
    process.env.GEMINI_API_KEY_40 || "API_KEY_40",
    process.env.GEMINI_API_KEY_41 || "API_KEY_41",
    process.env.GEMINI_API_KEY_42 || "API_KEY_42",
    process.env.GEMINI_API_KEY_43 || "API_KEY_43",
    process.env.GEMINI_API_KEY_44 || "API_KEY_44",
    process.env.GEMINI_API_KEY_45 || "API_KEY_45",
    process.env.GEMINI_API_KEY_46 || "API_KEY_46",
    process.env.GEMINI_API_KEY_47 || "API_KEY_47",
    process.env.GEMINI_API_KEY_48 || "API_KEY_48",
    process.env.GEMINI_API_KEY_49 || "API_KEY_49",
    process.env.GEMINI_API_KEY_50 || "API_KEY_50",
];


let currentApiKeyIndex = 0; // Keeps track of the current API key in use
let triedApiKeys = new Set<number>(); // Keep track of which keys we've tried in one request cycle

// Function to get the next API key in the list
const getNextApiKey = () => {
    // Add the current key to tried keys
    triedApiKeys.add(currentApiKeyIndex);

    // Move to next key
    currentApiKeyIndex = (currentApiKeyIndex + 1) % geminiApiKeys.length; // Circular rotation of API keys

    // Check if we've tried all keys
    if (triedApiKeys.size >= geminiApiKeys.length) {
        // All keys have been tried, reset tracking and throw error
        triedApiKeys.clear();
        throw new Error("All API keys have reached their rate limits. Please try again later.");
    }

    return geminiApiKeys[currentApiKeyIndex];
};

function cleanTranscript(rawTranscript: string): string {
    // Remove music or any similar tags like [Music], [Applause], etc.
    const cleaned = rawTranscript.replace(/\[.*?\]/g, '');
    const decoded = cleaned.replace(/&amp;#39;/g, "'");
    return decoded;
}

// comment
const MainPrompt = "You are tasked with transforming the YouTube video transcript into a training-ready system prompt. The goal is to format the transcript into structured data without reducing its content, and prepare it for use in training another AI model.";

const getYouTubeTranscriptSchema = () => {
    return {
        description: `Transform the YouTube video transcript into a structured format, suitable for training another AI model. Ensure the content remains intact and is formatted correctly.`,
        type: SchemaType.ARRAY,
        items: {
            type: SchemaType.OBJECT,
            properties: {
                transcriptTitle: {
                    type: SchemaType.STRING,
                    description: "The title of the YouTube video transcript.",
                    nullable: false,
                },
                fullTranscript: {
                    type: SchemaType.STRING,
                    description: "The full, unaltered YouTube video transcript.",
                    nullable: false,
                },
                contentTokenCount: {
                    type: SchemaType.STRING,
                    description: "The total number of tokens in the full transcript.",
                    nullable: false,
                },
            },
            required: [
                "transcriptTitle",
                "fullTranscript",
                "contentTokenCount",
            ],
        },
    };
};

export async function generateTrainingPrompt(transcript: string, prompt: string = MainPrompt): Promise<any> {
    let geminiApiKey = geminiApiKeys[currentApiKeyIndex];
    let currentApiKeyName = `GEMINI_API_KEY_${currentApiKeyIndex + 1}`;

    if (!geminiApiKey) {
        logger.error("No Gemini API key available.");
        return "No API key available.";
    }

    const schema = await getYouTubeTranscriptSchema();
    const generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema,
    };

    const googleAI = new GoogleGenerativeAI(geminiApiKey);
    const model = googleAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig,
    });


    const cleanedTranscript = cleanTranscript(transcript);
    // Combine the prompt, title, and transcript for processing
    const combinedPrompt = `${prompt}\n\nVideo Transcript:\n${cleanedTranscript}`;

    try {
        const result = await model.generateContent(combinedPrompt);

        if (!result || !result.response) {
            logger.info("No response received from the AI model. || Service Unavailable");
            return "Service unavailable!";
        }

        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        return data;
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("429 Too Many Requests")) {
                logger.error(`---${currentApiKeyName} limit exhausted, switching to the next API key...`); try {
                    geminiApiKey = getNextApiKey();
                    currentApiKeyName = `GEMINI_API_KEY_${currentApiKeyIndex + 1}`;
                    return generateTrainingPrompt(transcript, prompt);
                } catch (keyError) {
                    // This catches the error when all keys have been tried
                    if (keyError instanceof Error) {
                        logger.error(keyError.message);
                        return `Error: ${keyError.message}`;
                    } else {
                        logger.error("Unknown error when trying to get next API key");
                        return "Error: All API keys have reached their rate limits. Please try again later.";
                    }
                }
            } else if (error.message.includes("503 Service Unavailable")) {
                logger.error("Service is temporarily unavailable. Retrying...");
                await new Promise(resolve => setTimeout(resolve, 5000));
                return generateTrainingPrompt(transcript, prompt);
            } else if (error.message.includes("All API keys have reached their rate limits")) {
                logger.error(error.message);
                return `Error: ${error.message}`;
            } else {
                logger.error("Error generating training prompt:", error.message);
                return `An error occurred: ${error.message}`;
            }
        } else {
            logger.error("An unknown error occurred:", error);
            return "An unknown error occurred.";
        }
    }
}
