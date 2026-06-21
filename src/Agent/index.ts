import { GoogleGenAI } from '@google/genai';
import logger from '../config/logger';
import { geminiApiKeys } from '../secret';
import { handleError } from '../utils';
import { InstagramCommentSchema } from './schema';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

/**
 * Runs the AI agent with the given schema and prompt.
 * triedKeys is passed through recursive retries so each top-level call
 * has its own isolated rotation state — concurrent requests do not interfere.
 * @param schema - JSON schema for the response
 * @param prompt - Prompt to send to the model
 * @param apiKeyIndex - Index of API key to use
 * @param triedKeys - Caller-owned Set tracking exhausted key indices
 * @returns Parsed JSON response from the model
 */
export async function runAgent(
  schema: InstagramCommentSchema,
  prompt: string,
  apiKeyIndex: number = 0,
  triedKeys: Set<number> = new Set(),
): Promise<any> {
  const geminiApiKey = geminiApiKeys[apiKeyIndex];

  if (!geminiApiKey) {
    logger.error('No valid Gemini API key available.');
    return 'No API key available.';
  }

  const generationConfig = {
    responseMimeType: 'application/json',
    responseJsonSchema: schema,
  };

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: generationConfig,
    });

    if (!result || !result.text) {
      logger.info('No response received from the AI model. || Service Unavailable');
      return 'Service unavailable!';
    }

    const responseText = result.text;
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('Failed to parse AI response as JSON:', parseError);
      return 'Error: Invalid JSON response from AI model.';
    }
    return data;
  } catch (error: any) {
    // Rotate API key on 429 / rate-limit errors
    if (
      error instanceof Error &&
      (error.message.includes('429') ||
        error.message.toLowerCase().includes('resource_exhausted') ||
        error.message.toLowerCase().includes('rate limit'))
    ) {
      logger.error(
        `---GEMINI_API_KEY_${apiKeyIndex + 1} limit exhausted, switching to the next API key...`,
      );
      triedKeys.add(apiKeyIndex);
      if (triedKeys.size >= geminiApiKeys.length) {
        return 'Error: All API keys have reached their rate limits. Please try again later.';
      }
      const nextIndex = (apiKeyIndex + 1) % geminiApiKeys.length;
      return runAgent(schema, prompt, nextIndex, triedKeys);
    }
    return handleError(error, apiKeyIndex, schema, prompt, runAgent, 0, triedKeys);
  }
}

// ===== ZMIENIONE: Ładowanie Adrian's Style =====
/**
 * Chooses a character/style for the agent
 * First tries to load adrian-style.ts, then falls back to JSON characters
 * @returns Character/style configuration object
 */
export function chooseCharacter(): any {
  // Try to load Adrian's custom style first
  try {
    // Use __dirname to get relative path that works in both src and build
    // __dirname will be src/Agent or build/Agent, so go up one level to reach config
    const adrianStylePath = path.join(__dirname, '..', 'config', 'adrian-style');
    logger.info(`Loading Adrian's custom style configuration from: ${adrianStylePath}`);
    const requireModule = createRequire(__filename);
    const loaded = requireModule(adrianStylePath);
    const adrianStyle = loaded.default || loaded.adrianStyleConfig;
    logger.info(`✅ Adrian's style loaded successfully!`);
    return adrianStyle;
  } catch (adrianError) {
    logger.warn(
      `Could not load adrian-style: ${adrianError instanceof Error ? adrianError.message : String(adrianError)}`,
    );
    logger.warn(`Falling back to JSON characters`);

    // Fallback to JSON characters
    const charactersDir = (() => {
      const buildPath = path.join(__dirname, 'characters');
      return fs.existsSync(buildPath)
        ? buildPath
        : path.join(process.cwd(), 'src', 'Agent', 'characters');
    })();

    const files = fs.readdirSync(charactersDir);
    const jsonFiles = files.filter((file) => file.endsWith('.json'));
    if (jsonFiles.length === 0) {
      throw new Error('No character JSON files found and no adrian-style.ts available');
    }

    const chosenFile = path.join(charactersDir, jsonFiles[0]);
    logger.info(`Automatically selected character: ${jsonFiles[0]}`);
    const data = fs.readFileSync(chosenFile, 'utf8');
    return JSON.parse(data);
  }
}

/**
 * Initializes the agent by selecting a character
 * Exits the process if initialization fails
 * @returns Character/style configuration
 */
export function initAgent(): any {
  try {
    const character = chooseCharacter();
    console.log('Character/Style selected:', character);
    return character;
  } catch (error) {
    console.error('Error selecting character:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  (() => {
    initAgent();
  })();
}
