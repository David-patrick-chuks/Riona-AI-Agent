import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../config/logger";
import { geminiApiKeys } from "../secret";
import { handleError } from "../utils";
import { InstagramCommentSchema } from "./schema";
import fs from "fs";
import path from "path";
import * as readlineSync from "readline-sync";

export async function runAgent(
  schema: InstagramCommentSchema,
  prompt: string,
  apiKeyIndex: number = 0
): Promise<any> {
  let geminiApiKey = geminiApiKeys[apiKeyIndex];

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
      logger.info(
        "No response received from the AI model. || Service Unavailable"
      );
      return "Service unavailable!";
    }

    const responseText = result.response.text();
    const data = JSON.parse(responseText);

    return data;
  } catch (error) {
    return handleError(error, apiKeyIndex, schema, prompt, runAgent);
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
  const jsonFiles = files.filter((file) => file.endsWith(".json"));
  if (jsonFiles.length === 0) {
    throw new Error("No character JSON files found");
  }
  
  // Always pick the first character
  const chosenFile = path.join(charactersDir, jsonFiles[0]);
  logger.info(`Automatically selected character: ${jsonFiles[0]}`);
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
