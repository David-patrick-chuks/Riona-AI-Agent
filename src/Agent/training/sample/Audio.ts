import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { geminiApiKeys } from '../../../secret';

dotenv.config();

const apiKey = geminiApiKeys[0];
if (!apiKey) {
  throw new Error('At least one GEMINI API key is required (GEMINI_API_KEY or GEMINI_API_KEY_1)');
}

const ai = new GoogleGenAI({ apiKey });
const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_ATTEMPTS = 60;

const processAudioFile = async (fileName: string): Promise<void> => {
  try {
    const filePath = path.resolve(__dirname, fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const mimeType = mime.lookup(filePath);
    if (!mimeType || !mimeType.startsWith('audio/')) {
      throw new Error('Invalid audio file format.');
    }

    const maxMb = Number(process.env.TRAIN_MAX_FILE_MB || 10);
    const dryRun = (process.env.TRAIN_DRY_RUN || 'false').toLowerCase() === 'true';
    const stat = fs.statSync(filePath);
    if (stat.size > maxMb * 1024 * 1024) {
      throw new Error(`File exceeds max size of ${maxMb}MB`);
    }
    if (dryRun) {
      console.log(`DRY_RUN: would upload ${fileName} (${stat.size} bytes)`);
      return;
    }

    let file = await ai.files.upload({
      file: filePath,
      config: { mimeType, displayName: 'Audio sample' },
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
      file = await ai.files.get({ name: file.name });
    }

    if (!file.uri || !file.mimeType) {
      throw new Error('Uploaded file metadata is incomplete.');
    }

    console.log(`Uploaded file ${file.displayName || file.name} as: ${file.uri}`);

    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: createUserContent([
        createPartFromUri(file.uri, file.mimeType),
        'Generate a transcript of the audio.',
      ]),
    });

    console.log(result.text);

    if (!file.name) {
      throw new Error('Uploaded file is missing a name for deletion.');
    }
    await ai.files.delete({ name: file.name });
    console.log(`Deleted ${file.displayName || file.name}`);
  } catch (error) {
    console.error('Error processing audio file:', error);
  }
};

if (require.main === module) {
  processAudioFile('LilTjay.mp3').catch((error) => {
    console.error('An error occurred:', error);
  });
}
