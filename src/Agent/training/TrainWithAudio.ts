import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import { geminiApiKeys } from '../../secret';

dotenv.config();

const apiKey = geminiApiKeys[0];
if (!apiKey) {
  throw new Error('At least one GEMINI API key is required (GEMINI_API_KEY or GEMINI_API_KEY_1)');
}

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 60;

export class AIAudioFileService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey });
  }
  /**
   * Uploads the files to Google AIFileManager, i.e a 48 hours temp storage.
   * @param filePath - The local path of the file to upload.
   * @param displayName - The display name for the uploaded file.
   * @param mimeType - The MIME type of the file.
   */
  async processFile(filePath: string, displayName: string, mimeType: string): Promise<string> {
    const dryRun = (process.env.TRAIN_DRY_RUN || 'false').toLowerCase() === 'true';
    try {
      const maxMb = Number(process.env.TRAIN_MAX_FILE_MB || 10);
      const stat = fs.statSync(filePath);
      if (stat.size > maxMb * 1024 * 1024) {
        throw new Error(`File exceeds max size of ${maxMb}MB`);
      }
      if (dryRun) {
        return `DRY_RUN: would upload ${displayName} (${stat.size} bytes)`;
      }
      let file = await this.ai.files.upload({
        file: filePath,
        config: { mimeType, displayName },
      });

      let pollAttempts = 0;
      while (file.state && file.state.toString() !== 'ACTIVE') {
        const state = file.state.toString();
        if (state === 'FAILED' || state === 'ERROR') {
          throw new Error(`File processing failed with state: ${state}`);
        }
        if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          throw new Error('Timed out waiting for uploaded file to become ACTIVE');
        }
        pollAttempts++;
        process.stdout.write('.');
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (!file.name) {
          throw new Error('Uploaded file is missing a name.');
        }
        file = await this.ai.files.get({ name: file.name });
      }

      if (!file.uri || !file.mimeType) {
        throw new Error('Uploaded file metadata is incomplete.');
      }

      const result = await this.ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: createUserContent([
          createPartFromUri(file.uri, file.mimeType),
          'Tell me about this audio clip.',
        ]),
      });

      if (!file.name) {
        throw new Error('Uploaded file is missing a name for deletion.');
      }
      await this.ai.files.delete({ name: file.name });
      console.log(`Deleted ${file.displayName || file.name}`);

      return result.text || '';
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Error processing file: ${error.message}`);
      } else {
        throw new Error(`Unknown error occurred during file processing.`);
      }
    } finally {
      if (!dryRun && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
