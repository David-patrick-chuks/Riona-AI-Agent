import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import mime from "mime-types";  

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY_41;
if (!apiKey) {
  throw new Error("API key is missing");
}

const ai = new GoogleGenAI({ apiKey });

// Function to upload, process, and delete the audio file with support for various formats
const processAudioFile = async (fileName: string): Promise<void> => {
  try {
    // Resolve the file path relative to the project root
    const filePath = path.resolve(__dirname, fileName);

    // Check if the file exists at the resolved path
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get MIME type of the file based on the extension
    const mimeType = mime.lookup(filePath);
    if (!mimeType || !mimeType.startsWith("audio/")) {
      throw new Error("Invalid audio file format.");
    }

    // Upload the audio file with the correct MIME type
    let file = await ai.files.upload({
      file: filePath,
      config: { mimeType: mimeType, displayName: "Audio sample" },
    });

    // Wait for the audio file to be processed (ACTIVE)
    while (file.state && file.state.toString() !== "ACTIVE") {
      process.stdout.write(".");
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      file = await ai.files.get({ name: file.name });
    }

    // Log the uploaded file URI
    console.log(`Uploaded file ${file.displayName || file.name} as: ${file.uri}`);

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: createUserContent([
        createPartFromUri(file.uri, file.mimeType),
        "Generate a transcript of the audio.",
      ]),
    });

    // Log the response
    console.log(result.text);

    await ai.files.delete({ name: file.name });
    console.log(`Deleted ${file.displayName || file.name}`);

  } catch (error) {
    console.error("Error processing audio file:", error);
  }
};

// Example usage: Call the function with the correct file name relative to the project root
processAudioFile("LilTjay.mp3").catch((error) => {
  console.error("An error occurred:", error);
});
