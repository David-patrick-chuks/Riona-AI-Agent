import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../config/logger";
import { geminiApiKeys } from "../secret";
import { handleError } from "../utils";
import { InstagramCommentSchema } from "./schema";
import fs from "fs";
import path from "path";
import * as readlineSync from "readline-sync";

// Track API key state across requests
let currentAgentApiKeyIndex = 0;
const triedAgentApiKeys = new Set<number>();

// Function to get the next API key specifically for the agent
const getNextAgentApiKey = () => {
    // Add the current key to tried keys
    triedAgentApiKeys.add(currentAgentApiKeyIndex);

    // Move to next key
    currentAgentApiKeyIndex = (currentAgentApiKeyIndex + 1) % geminiApiKeys.length;

    // Check if we've tried all keys
    if (triedAgentApiKeys.size >= geminiApiKeys.length) {
        // All keys have been tried, reset tracking and throw error
        triedAgentApiKeys.clear();
        throw new Error("All API keys have reached their rate limits. Please try again later.");
    }

    return geminiApiKeys[currentAgentApiKeyIndex];
};

export async function runAgent(schema: InstagramCommentSchema, prompt: string): Promise<any> {
    let geminiApiKey = geminiApiKeys[currentAgentApiKeyIndex];

    if (!geminiApiKey) {
        logger.error("No Gemini API key available.");
        return "No API key available.";
    }
    const generationConfig = {
        responseMimeType: "application/json",
        responseSchema: schema,
    };

    const googleAI = new GoogleGenerativeAI(geminiApiKey);
    const model = googleAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig,
    });

    try {
        const result = await model.generateContent(prompt);

        if (!result || !result.response) {
            logger.info("No response received from the AI model. || Service Unavailable");
            return "Service unavailable!";
        }

        const responseText = result.response.text();
        const data = JSON.parse(responseText);

        return data;
    } catch (error) {
        if (error instanceof Error && error.message.includes("429 Too Many Requests")) {
            logger.error(`---GEMINI_API_KEY_${currentAgentApiKeyIndex + 1} limit exhausted, switching to the next API key...`);
            try {
                geminiApiKey = getNextAgentApiKey();
                return runAgent(schema, prompt);
            } catch (keyError) {
                if (keyError instanceof Error) {
                    logger.error("API key error:", keyError.message);
                    return `Error: ${keyError.message}`;
                } else {
                    logger.error("Unknown error when trying to get next API key");
                    return "Error: All API keys have reached their rate limits. Please try again later.";
                }
            }
        } else {
            return await handleError(error, currentAgentApiKeyIndex, schema, prompt, runAgent);
        }
    }
}

export function chooseCharacter(): any {
    const charactersDir = (() => {
        const buildPath = path.join(__dirname, "characters");
        if (fs.existsSync(buildPath)) {
            return buildPath;
        } else {
            // Fallback to source directory
            return path.join(process.cwd(), "src", "Agent", "characters");
        }
    })();
    const files = fs.readdirSync(charactersDir);
    const jsonFiles = files.filter(file => file.endsWith(".json"));
    if (jsonFiles.length === 0) {
        throw new Error("No character JSON files found");
    }
    console.log("Select a character:");
    jsonFiles.forEach((file, index) => {
        console.log(`${index + 1}: ${file}`);
    });
    const answer = readlineSync.question("Enter the number of your choice: ");
    const selection = parseInt(answer);
    if (isNaN(selection) || selection < 1 || selection > jsonFiles.length) {
        throw new Error("Invalid selection");
    }
    const chosenFile = path.join(charactersDir, jsonFiles[selection - 1]);
    const data = fs.readFileSync(chosenFile, "utf8");
    const characterConfig = JSON.parse(data);
    return characterConfig;
}

export function initAgent(): any {
    try {
        const character = chooseCharacter();
        console.log("Character selected:", character);
        return character;
    } catch (error) {
        console.error("Error selecting character:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    (() => {
        initAgent();
    })();
}
