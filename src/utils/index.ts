import { promises as fs } from "fs";
import path from "path";
import { geminiApiKeys } from "../secret";
import logger from "../config/logger";


export async function Instagram_cookiesExist(): Promise<boolean> {
    try {
        const cookiesPath = "./cookies/Instagramcookies.json";
        await fs.access(cookiesPath); // Check if file exists

        const cookiesData = await fs.readFile(cookiesPath, "utf-8");
        const cookies = JSON.parse(cookiesData);

        // Priority-based cookie validation
        const primaryCookie = cookies.find((cookie: { name: string }) => cookie.name === 'sessionid');
        const fallbackCookie = cookies.find((cookie: { name: string }) => cookie.name === 'csrftoken');

        const currentTimestamp = Math.floor(Date.now() / 1000);

        // Validate primary cookie (sessionid)
        if (primaryCookie && primaryCookie.expires > currentTimestamp) {
            return true;
        }

        // Fallback to csrftoken if sessionid is missing or expired
        if (fallbackCookie && fallbackCookie.expires > currentTimestamp) {
            return true;
        }

        return false;
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
            logger.warn("Cookies file does not exist.");
            return false;
        } else {
            logger.error("Error checking cookies:", error);
            return false;
        }
    }
}



export async function saveCookies(cookiesPath: string, cookies: any[]): Promise<void> {
    try {
        const dir = path.dirname(cookiesPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(cookiesPath, JSON.stringify(cookies, null, 2));
        logger.info("Cookies saved successfully.");
    } catch (error) {
        logger.error("Error saving cookies:", error);
        throw new Error("Failed to save cookies.");
    }
}

export async function loadCookies(cookiesPath: string): Promise<any[]> {
    try {
        // Check if the file exists
        await fs.access(cookiesPath);

        // Read and parse the cookies file
        const cookiesData = await fs.readFile(cookiesPath, "utf-8");
        const cookies = JSON.parse(cookiesData);
        return cookies;
    } catch (error) {
        logger.error("Cookies file does not exist or cannot be read.", error);
        return [];
    }
}

// Set to track which API keys have been tried
const triedApiKeys = new Set<number>();

// Function to get the next API key in the list
export const getNextApiKey = (currentApiKeyIndex: number) => {
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


export async function handleError(error: unknown, currentApiKeyIndex: number, schema: any, prompt: string, runAgent: (schema: any, prompt: string) => Promise<string>): Promise<string> {
    if (error instanceof Error) {
        if (error.message.includes("429 Too Many Requests")) {
            logger.error(`---GEMINI_API_KEY_${currentApiKeyIndex + 1} limit exhausted, switching to the next API key...`);
            try {
                const geminiApiKey = getNextApiKey(currentApiKeyIndex);
                const currentApiKeyName = `GEMINI_API_KEY_${currentApiKeyIndex + 1}`;
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
        } else if (error.message.includes("503 Service Unavailable")) {
            logger.error("Service is temporarily unavailable. Retrying...");
            await new Promise(resolve => setTimeout(resolve, 5000));
            return runAgent(schema, prompt);
        } else if (error.message.includes("All API keys have reached their rate limits")) {
            logger.error(error.message);
            return `Error: ${error.message}`;
        } else {
            logger.error(`Error generating training prompt: ${error.message}`);
            return `An error occurred: ${error.message}`;
        }
    } else {
        logger.error("An unknown error occurred:", error);
        return "An unknown error occurred.";
    }
}


export function setup_HandleError(error: unknown, context: string): void {
    if (error instanceof Error) {
        if (error.message.includes("net::ERR_ABORTED")) {
            logger.error(`ABORTION error occurred in ${context}: ${error.message}`);
        } else {
            logger.error(`Error in ${context}: ${error.message}`);
        }
    } else {
        logger.error(`An unknown error occurred in ${context}: ${error}`);
    }
}





// Function to save tweet data to tweetData.json
export const saveTweetData = async function (tweetContent: string, imageUrl: string, timeTweeted: string): Promise<void> {
    const tweetDataPath = path.join(__dirname, '../data/tweetData.json');
    const tweetData = {
        tweetContent,
        imageUrl: imageUrl || null,
        timeTweeted,
    };

    try {
        // Check if the file exists
        await fs.access(tweetDataPath);
        // Read the existing data
        const data = await fs.readFile(tweetDataPath, 'utf-8');
        const json = JSON.parse(data);
        // Append the new tweet data
        json.push(tweetData);
        // Write the updated data back to the file
        await fs.writeFile(tweetDataPath, JSON.stringify(json, null, 2));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            // File does not exist, create it with the new tweet data
            await fs.writeFile(tweetDataPath, JSON.stringify([tweetData], null, 2));
        } else {
            logger.error('Error saving tweet data:', error);
            throw error;
        }
    }
};

// Function to check if the first object's time in tweetData.json is more than 24 hours old and delete the file if necessary
export const checkAndDeleteOldTweetData = async function (): Promise<void> {
    const tweetDataPath = path.join(__dirname, '../data/tweetData.json');

    try {
        // Check if the file exists
        await fs.access(tweetDataPath);
        // Read the existing data
        const data = await fs.readFile(tweetDataPath, 'utf-8');
        const json = JSON.parse(data);

        if (json.length > 0) {
            const firstTweetTime = new Date(json[0].timeTweeted).getTime();
            const currentTime = Date.now();
            const timeDifference = currentTime - firstTweetTime;

            // Check if the time difference is more than 24 hours (86400000 milliseconds)
            if (timeDifference > 86400000) {
                await fs.unlink(tweetDataPath);
                logger.info('tweetData.json file deleted because the first tweet is more than 24 hours old.');
            }
        }
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code !== 'ENOENT') {
            logger.error('Error checking tweet data:', err);
            throw err;
        }
    }
};



// Function to check if the tweetData.json file has 17 or more objects
export const canSendTweet = async function (): Promise<boolean> {
    const tweetDataPath = path.join(__dirname, '../data/tweetData.json');

    try {
        // Check if the file exists
        await fs.access(tweetDataPath);
        // Read the existing data
        const data = await fs.readFile(tweetDataPath, 'utf-8');
        const json = JSON.parse(data);

        // Check if the file has 17 or more objects
        if (json.length >= 17) {
            return false;
        }
        return true;
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
            // File does not exist, so it's safe to send a tweet
            return true;
        } else {
            logger.error('Error checking tweet data:', err);
            throw err;
        }
    }
};




/// Function to save scraped data to scrapedData.json
export const saveScrapedData = async function (link: string, content: string): Promise<void> {
    const scrapedDataPath = path.join(__dirname, '../data/scrapedData.json');
    const scrapedDataDir = path.dirname(scrapedDataPath);
    const scrapedData = {
        link,
        content,
    };

    try {
        // Ensure the directory exists
        await fs.mkdir(scrapedDataDir, { recursive: true });

        // Check if the file exists
        await fs.access(scrapedDataPath);
        // Read the existing data
        const data = await fs.readFile(scrapedDataPath, 'utf-8');
        const json = JSON.parse(data);
        // Append the new scraped data
        json.push(scrapedData);
        // Write the updated data back to the file
        await fs.writeFile(scrapedDataPath, JSON.stringify(json, null, 2));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            // File does not exist, create it with the new scraped data
            await fs.writeFile(scrapedDataPath, JSON.stringify([scrapedData], null, 2));
        } else {
            logger.error('Error saving scraped data:', error);
            throw error;
        }
    }
};
