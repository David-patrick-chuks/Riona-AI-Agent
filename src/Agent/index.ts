import { GoogleGenAI } from '@google/genai';
import logger from '../config/logger';
import { geminiApiKeys } from '../secret';
import { handleError } from '../utils';
import { InstagramCommentSchema } from './schema';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// Track API key state across requests
let currentAgentApiKeyIndex = 0;
const triedAgentApiKeys = new Set<number>();

/**
 * Gets the next API key for the agent with rotation
 * @returns Next available Gemini API key
 * @throws Error if all keys have been tried
 */
const getNextAgentApiKey = () => {
  triedAgentApiKeys.add(currentAgentApiKeyIndex);

  // Move to next key
  currentAgentApiKeyIndex = (currentAgentApiKeyIndex + 1) % geminiApiKeys.length;

  // Check if we've tried all keys
  if (triedAgentApiKeys.size >= geminiApiKeys.length) {
    triedAgentApiKeys.clear();
    throw new Error('All API keys have reached their rate limits. Please try again later.');
  }

  return geminiApiKeys[currentAgentApiKeyIndex];
};

/**
 * Runs the AI agent with the given schema and prompt
 * @param schema - JSON schema for the response
 * @param prompt - Prompt to send to the model
 * @param apiKeyIndex - Index of API key to use
 * @returns Parsed JSON response from the model
 */
export async function runAgent(
  schema: InstagramCommentSchema,
  prompt: string,
  apiKeyIndex: number = currentAgentApiKeyIndex,
): Promise<any> {
  let geminiApiKey = geminiApiKeys[apiKeyIndex];

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
    // Rotate API key on 429
    if (
      error instanceof Error &&
      (error.message.includes('429') ||
        error.message.toLowerCase().includes('resource_exhausted') ||
        error.message.toLowerCase().includes('rate limit'))
    ) {
      logger.error(
        `---GEMINI_API_KEY_${apiKeyIndex + 1} limit exhausted, switching to the next API key...`,
      );
      try {
        geminiApiKey = getNextAgentApiKey();
        return runAgent(schema, prompt, currentAgentApiKeyIndex);
      } catch (keyError) {
        if (keyError instanceof Error) {
          logger.error('API key error:', keyError.message);
          return `Error: ${keyError.message}`;
        } else {
          logger.error('Unknown error when trying to get next API key');
          return 'Error: All API keys have reached their rate limits. Please try again later.';
        }
      }
    }
    return handleError(error, apiKeyIndex, schema, prompt, runAgent);
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
    const adrianStylePath = path.join(__dirname, '..', 'config', 'adrian-style');
    const requireModule = createRequire(__filename);
    const loaded = requireModule(adrianStylePath);
    const adrianStyle = loaded.default || loaded.adrianStyleConfig;
    const name = adrianStyle?.userProfile?.name ?? 'adrian-style';
    const handle = adrianStyle?.userProfile?.instagram;
    logger.info(`Character loaded: ${name}${handle ? ` (@${handle})` : ''} [adrian-style]`);
    return adrianStyle;
  } catch (adrianError) {
    logger.warn(
      `Could not load adrian-style: ${adrianError instanceof Error ? adrianError.message : String(adrianError)}. Falling back to JSON characters.`,
    );

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

    const chosenFile = jsonFiles[0];
    const data = fs.readFileSync(path.join(charactersDir, chosenFile), 'utf8');
    const character = JSON.parse(data);
    const name = character?.name ?? character?.userProfile?.name ?? chosenFile;
    logger.info(`Character loaded: ${name} [${chosenFile}]`);
    return character;
  }
}

/**
 * Initializes the agent by selecting a character
 * Exits the process if initialization fails
 * @returns Character/style configuration
 */
export function initAgent(): any {
  try {
    return chooseCharacter();
  } catch (error) {
    logger.error('Error selecting character:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  (() => {
    initAgent();
  })();
}
