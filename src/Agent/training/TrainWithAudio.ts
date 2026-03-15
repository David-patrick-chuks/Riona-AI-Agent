import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY_41 as string;
if (!apiKey) {
    throw new Error("API key is missing");
}

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
        try {
            let file = await this.ai.files.upload({
                file: filePath,
                config: { mimeType, displayName },
            });

            // Poll until the file is processed (state becomes ACTIVE), if state is present
            while (file.state && file.state.toString() !== "ACTIVE") {
                process.stdout.write(".");
                await new Promise((resolve) => setTimeout(resolve, 10_000));
                file = await this.ai.files.get({ name: file.name });
            }

            const result = await this.ai.models.generateContent({
                model: "gemini-1.5-flash",
                contents: createUserContent([
                    createPartFromUri(file.uri, file.mimeType),
                    "Tell me about this audio clip.",
                ]),
            });

            await this.ai.files.delete({ name: file.name });
            console.log(`Deleted ${file.displayName || file.name}`);

            return result.text || "";

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Error processing file: ${error.message}`);
            } else {
                throw new Error(`Unknown error occurred during file processing.`);
            }
        } finally {
            // Delete the temporary file from the local server
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }
}
