import { YoutubeTranscript } from "youtube-transcript";
import { generateTrainingPrompt } from "../script/summarize";
import logger from "../../config/logger";

interface YoutubeTranscriptResult {
  url: string;
  result?: any;
  error?: string;
}

/**
 * Fetches the transcript of a given YouTube video URL.
 * @param url - The YouTube video URL.
 * @returns A promise that resolves to the transcript text or an error message.
 */
async function getYouTubeTranscript(url: string): Promise<string> {
  try {
    let videoId: string | null = null;

    // Handle both full YouTube URL and shortened YouTube URL
    const parsedUrl = new URL(url);

    // If the URL is a full YouTube URL (youtube.com/watch?v=...)
    if (
      parsedUrl.hostname === "www.youtube.com" ||
      parsedUrl.hostname === "youtube.com"
    ) {
      if (parsedUrl.pathname.includes("/shorts/")) {
        videoId = parsedUrl.pathname.split("/shorts/")[1];
      } else {
        videoId = parsedUrl.searchParams.get("v");
      }
    }
    // If the URL is a shortened YouTube URL (youtu.be/kTADMgEDlIQ)
    else if (parsedUrl.hostname === "youtu.be") {
      videoId = parsedUrl.pathname.split("/")[1]; // Extract the video ID from the path
    }

    // If we couldn't extract a video ID, throw an error
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    // Fetch the transcript using the video ID
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    // Check if the transcript is empty
    if (transcript.length === 0) {
      return "No captions available for this video.";
    }

    // Combine the transcript text into one string
    return transcript.map((item) => item.text).join(" ");
  } catch (error) {
    if (error instanceof Error) {
      return `Error fetching transcript: ${error.message}`;
    }
    return "An unknown error occurred.";
  }
}

/**
 * Trains the agent using the transcript of a given YouTube video URL.
 * @param url - The YouTube video URL.
 * @returns A promise that resolves to the training prompt or an error message.
 */
export async function Train_Agent_with_Youtube_URL(url: string) {
  try {
    const transcript = await getYouTubeTranscript(url);
    if (!transcript) {
      throw new Error("Failed to retrieve transcript from YouTube.");
    }
    const source = await generateTrainingPrompt(transcript);
    if (!source) {
      throw new Error("Failed to generate training prompt.");
    }
    logger.info(`Successfully processed video: ${url}`);
    return source;
  } catch (error) {
    logger.error(`Error processing video ${url}:`, error);
    return {
      error:
        error instanceof Error
          ? error.message
          : `Error in Train_Agent_with_Youtube_URL: ${error}`,
    };
  }
}

/**
 * Trains the agent using multiple YouTube video URLs.
 * @param urls - Array of YouTube video URLs.
 * @returns A promise that resolves to an array of training results.
 */
export async function Train_Agent_with_Multiple_YouTube_URLs(urls: string[]) {
  const results: YoutubeTranscriptResult[] = [];
  for (const url of urls) {
    try {
      const result = await Train_Agent_with_Youtube_URL(url);
      results.push({ url, result });
    } catch (error) {
      results.push({
        url,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  return results;
}

// Example usage with the provided URLs
const urls = [
  "https://www.youtube.com/watch?v=4dp8W1lCw0Y",
  "https://www.youtube.com/watch?v=NXXH3wB7VU8",
  "https://www.youtube.com/watch?v=X0VuB3xo0Ms",
  "https://www.youtube.com/shorts/JDOWP76OJ08",
];

// Execute the training
Train_Agent_with_Multiple_YouTube_URLs(urls)
  .then((results) => {
    logger.info("Training completed for all videos");
    console.log("Training results:", results);
  })
  .catch((error) => {
    logger.error("Error during batch training:", error);
  });
