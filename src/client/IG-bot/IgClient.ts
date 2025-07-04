import * as puppeteer from 'puppeteer';
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker";
import UserAgent from "user-agents";
import { Server } from "proxy-chain";
import { IGpassword, IGusername } from "../../secret";
import logger from "../../config/logger";
import { Instagram_cookiesExist, loadCookies, saveCookies } from "../../utils";
import { runAgent } from "../../Agent";
import { getInstagramCommentSchema } from "../../Agent/schema";
import readline from "readline";
import fs from "fs/promises";
import { getShouldExitInteractions } from '../../api/agent';

// Add stealth plugin to puppeteer
puppeteerExtra.use(StealthPlugin());
puppeteerExtra.use(
  AdblockerPlugin({
    // Optionally enable Cooperative Mode for several request interceptors
    interceptResolutionPriority: puppeteer.DEFAULT_INTERCEPT_RESOLUTION_PRIORITY,
  })
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class IgClient {
    private browser: puppeteer.Browser | null = null;
    private page: puppeteer.Page | null = null;
    private username: string;
    private password: string;

    constructor(username?: string, password?: string) {
        this.username = username || '';
        this.password = password || '';
    }

    async init() {
        // const server = new Server({ port: 8000 });
        // await server.listen();
        // const proxyUrl = server.getProxyUrl();
        // logger.info(`Using proxy URL: ${proxyUrl}`);

        // Center the window on a 1920x1080 screen
        const width = 1280;
        const height = 800;
        const screenWidth = 1920;
        const screenHeight = 1080;
        const left = Math.floor((screenWidth - width) / 2);
        const top = Math.floor((screenHeight - height) / 2);
        this.browser = await puppeteerExtra.launch({
            headless: false,
            args: [
                `--window-size=${width},${height}`,
                `--window-position=${left},${top}`
            ],
        });
        this.page = await this.browser.newPage();
        const userAgent = new UserAgent({ deviceCategory: "desktop" });
        await this.page.setUserAgent(userAgent.toString());
        await this.page.setViewport({ width, height });

        if (await Instagram_cookiesExist()) {
            await this.loginWithCookies();
        } else {
            await this.loginWithCredentials();
        }
    }

    private async loginWithCookies() {
        if (!this.page) throw new Error("Page not initialized");
        const cookies = await loadCookies("./cookies/Instagramcookies.json");
        if(cookies.length > 0) {
            await this.page.setCookie(...cookies);
        }
        
        logger.info("Loaded cookies. Navigating to Instagram home page.");
        await this.page.goto("https://www.instagram.com/", {
            waitUntil: "networkidle2",
        });
        const url = this.page.url();
        if (url.includes("/login/")) {
            logger.warn("Cookies are invalid or expired. Falling back to credentials login.");
            await this.loginWithCredentials();
        } else {
            logger.info("Successfully logged in with cookies.");
        }
    }

    private async loginWithCredentials() {
        if (!this.page || !this.browser) throw new Error("Browser/Page not initialized");
        logger.info("Logging in with credentials...");
        await this.page.goto("https://www.instagram.com/accounts/login/", {
            waitUntil: "networkidle2",
        });
        await this.page.waitForSelector('input[name="username"]');
        await this.page.type('input[name="username"]', this.username);
        await this.page.type('input[name="password"]', this.password);
        await this.page.click('button[type="submit"]');
        await this.page.waitForNavigation({ waitUntil: "networkidle2" });
        const cookies = await this.page.cookies();
        await saveCookies("./cookies/Instagramcookies.json", cookies);
        logger.info("Successfully logged in and saved cookies.");
        await this.handleNotificationPopup();
    }

    async handleNotificationPopup() {
        if (!this.page) throw new Error("Page not initialized");
        console.log("Checking for notification popup...");

        try {
            // Wait for the dialog to appear, with a timeout
            const dialogSelector = 'div[role="dialog"]';
            await this.page.waitForSelector(dialogSelector, { timeout: 5000 });
            const dialog = await this.page.$(dialogSelector);

            if (dialog) {
                console.log("Notification dialog found. Searching for 'Not Now' button.");
                const notNowButtonSelectors = ["button", `div[role="button"]`];
                let notNowButton: puppeteer.ElementHandle<Element> | null = null;

                for (const selector of notNowButtonSelectors) {
                    // Search within the dialog context
                    const elements = await dialog.$$(selector);
                    for (const element of elements) {
                        try {
                            const text = await element.evaluate((el) => el.textContent);
                            if (text && text.trim().toLowerCase() === "not now") {
                                notNowButton = element;
                                console.log(`Found 'Not Now' button with selector: ${selector}`);
                                break;
                            }
                        } catch (e) {
                            // Ignore errors from stale elements
                        }
                    }
                    if (notNowButton) break;
                }

                if (notNowButton) {
                    try {
                        console.log("Dismissing 'Not Now' notification popup...");
                        // Using evaluate to click because it can be more reliable
                        await notNowButton.evaluate((btn:any) => btn.click());
                        await delay(1500); // Wait for popup to close
                        console.log("'Not Now' notification popup dismissed.");
                    } catch (e) {
                        console.warn("Failed to click 'Not Now' button. It might be gone or covered.", e);
                    }
                } else {
                    console.log("'Not Now' button not found within the dialog.");
                }
            }
        } catch (error) {
            console.log("No notification popup appeared within the timeout period.");
            // If it times out, it means no popup, which is fine.
        }
    }

    async sendDirectMessage(username: string, message: string) {
        if (!this.page) throw new Error("Page not initialized");
        try {
            await this.sendDirectMessageWithMedia(username, message);
        } catch (error) {
            logger.error("Failed to send direct message", error);
            throw error;
        }
    }

    async sendDirectMessageWithMedia(username: string, message: string, mediaPath?: string) {
        if (!this.page) throw new Error("Page not initialized");
        try {
            await this.page.goto(`https://www.instagram.com/${username}/`, {
                waitUntil: "networkidle2",
            });
            console.log("Navigated to user profile");
            await delay(3000);

            const messageButtonSelectors = ['div[role="button"]', "button", 'a[href*="/direct/t/"]', 'div[role="button"] span', 'div[role="button"] div'];
            let messageButton: puppeteer.ElementHandle<Element> | null = null;
            for (const selector of messageButtonSelectors) {
                const elements = await this.page.$$(selector);
                for (const element of elements) {
                    const text = await element.evaluate((el: Element) => el.textContent);
                    if (text && text.trim() === "Message") {
                        messageButton = element;
                        break;
                    }
                }
                if (messageButton) break;
            }
            if (!messageButton) throw new Error("Message button not found.");
            await messageButton.click();
            await delay(2000); // Wait for message modal to open
            await this.handleNotificationPopup();

            if (mediaPath) {
                const fileInput = await this.page.$('input[type="file"]');
                if (fileInput) {
                    await fileInput.uploadFile(mediaPath);
                    await this.handleNotificationPopup();
                    await delay(2000); // wait for upload
                } else {
                    logger.warn("File input for media not found.");
                }
            }

            const messageInputSelectors = ['textarea[placeholder="Message..."]', 'div[role="textbox"]', 'div[contenteditable="true"]', 'textarea[aria-label="Message"]'];
            let messageInput: puppeteer.ElementHandle<Element> | null = null;
            for (const selector of messageInputSelectors) {
                messageInput = await this.page.$(selector);
                if (messageInput) break;
            }
            if (!messageInput) throw new Error("Message input not found.");
            await messageInput.type(message);
            await this.handleNotificationPopup();
            await delay(2000);

            const sendButtonSelectors = ['div[role="button"]', "button"];
            let sendButton: puppeteer.ElementHandle<Element> | null = null;
            for (const selector of sendButtonSelectors) {
                const elements = await this.page.$$(selector);
                for (const element of elements) {
                    const text = await element.evaluate((el: Element) => el.textContent);
                    if (text && text.trim() === "Send") {
                        sendButton = element;
                        break;
                    }
                }
                if (sendButton) break;
            }
            if (!sendButton) throw new Error("Send button not found.");
            await sendButton.click();
            await this.handleNotificationPopup();
            console.log("Message sent successfully");
        } catch (error) {
            logger.error(`Failed to send DM to ${username}`, error);
            throw error;
        }
    }

    async sendDirectMessagesFromFile(file: Buffer | string, message: string, mediaPath?: string) {
        if (!this.page) throw new Error("Page not initialized");
        logger.info(`Sending DMs from provided file content`);
        let fileContent: string;
        if (Buffer.isBuffer(file)) {
            fileContent = file.toString('utf-8');
        } else {
            fileContent = file;
        }
        const usernames = fileContent.split("\n");
        for (const username of usernames) {
            if (username.trim()) {
                await this.handleNotificationPopup();
                await this.sendDirectMessageWithMedia(username.trim(), message, mediaPath);
                await this.handleNotificationPopup();
                // add delay to avoid being flagged
                await delay(30000);
            }
        }
    }

    async interactWithPosts() {
        if (!this.page) throw new Error("Page not initialized");
        let postIndex = 1; // Start with the first post
        const maxPosts = 20; // Limit to prevent infinite scrolling
        const page = this.page;
        while (postIndex <= maxPosts) {
            // Check for exit flag
            if (typeof getShouldExitInteractions === 'function' && getShouldExitInteractions()) {
                console.log('Exit from interactions requested. Stopping loop.');
                break;
            }
            try {
                const postSelector = `article:nth-of-type(${postIndex})`;
                // Check if the post exists
                if (!(await page.$(postSelector))) {
                    console.log("No more posts found. Ending iteration...");
                    return;
                }
                const likeButtonSelector = `${postSelector} svg[aria-label="Like"]`;
                const likeButton = await page.$(likeButtonSelector);
                let ariaLabel = null;
                if (likeButton) {
                    ariaLabel = await likeButton.evaluate((el: Element) => el.getAttribute("aria-label"));
                }
                if (ariaLabel === "Like" && likeButton) {
                    console.log(`Liking post ${postIndex}...`);
                    await likeButton.click();
                    await page.keyboard.press("Enter");
                    console.log(`Post ${postIndex} liked.`);
                } else if (ariaLabel === "Unlike") {
                    console.log(`Post ${postIndex} is already liked.`);
                } else {
                    console.log(`Like button not found for post ${postIndex}.`);
                }
                // Extract and log the post caption
                const captionSelector = `${postSelector} div.x9f619 span._ap3a div span._ap3a`;
                const captionElement = await page.$(captionSelector);
                let caption = "";
                if (captionElement) {
                    caption = await captionElement.evaluate((el) => (el as HTMLElement).innerText);
                    console.log(`Caption for post ${postIndex}: ${caption}`);
                } else {
                    console.log(`No caption found for post ${postIndex}.`);
                }
                // Check if there is a '...more' link to expand the caption
                const moreLinkSelector = `${postSelector} div.x9f619 span._ap3a span div span.x1lliihq`;
                const moreLink = await page.$(moreLinkSelector);
                if (moreLink && captionElement) {
                    console.log(`Expanding caption for post ${postIndex}...`);
                    await moreLink.click();
                    const expandedCaption = await captionElement.evaluate((el) => (el as HTMLElement).innerText);
                    console.log(
                        `Expanded Caption for post ${postIndex}: ${expandedCaption}`
                    );
                    caption = expandedCaption;
                }
                // Comment on the post
                const commentBoxSelector = `${postSelector} textarea`;
                const commentBox = await page.$(commentBoxSelector);
                if (commentBox) {
                    console.log(`Commenting on post ${postIndex}...`);
                    const prompt = `human-like Instagram comment based on to the following post: "${caption}". make sure the reply\n            Matchs the tone of the caption (casual, funny, serious, or sarcastic).\n            Sound organic—avoid robotic phrasing, overly perfect grammar, or anything that feels AI-generated.\n            Use relatable language, including light slang, emojis (if appropriate), and subtle imperfections like minor typos or abbreviations (e.g., 'lol' or 'omg').\n            If the caption is humorous or sarcastic, play along without overexplaining the joke.\n            If the post is serious (e.g., personal struggles, activism), respond with empathy and depth.\n            Avoid generic praise ('Great post!'); instead, react specifically to the content (e.g., 'The way you called out pineapple pizza haters 😂👏').\n            *Keep it concise (1-2 sentences max) and compliant with Instagram's guidelines (no spam, harassment, etc.).*`;
                    const schema = getInstagramCommentSchema();
                    const result = await runAgent(schema, prompt);
                    const comment = (result[0]?.comment ?? "") as string;
                    await commentBox.type(comment);
                    // New selector approach for the post button
                    const postButton = await page.evaluateHandle(() => {
                        const buttons = Array.from(
                            document.querySelectorAll('div[role="button"]')
                        );
                        return buttons.find(
                            (button) =>
                                button.textContent === "Post" && !button.hasAttribute("disabled")
                        );
                    });
                    // Only click if postButton is an ElementHandle and not null
                    const postButtonElement = postButton && postButton.asElement ? postButton.asElement() : null;
                    if (postButtonElement) {
                        console.log(`Posting comment on post ${postIndex}...`);
                        await (postButtonElement as puppeteer.ElementHandle<Element>).click();
                        console.log(`Comment posted on post ${postIndex}.`);
                        // Wait for comment to be posted and UI to update
                        await delay(2000);
                    } else {
                        console.log("Post button not found.");
                    }
                } else {
                    console.log("Comment box not found.");
                }
                // Wait before moving to the next post
                const waitTime = Math.floor(Math.random() * 5000) + 5000;
                console.log(
                    `Waiting ${waitTime / 1000} seconds before moving to the next post...`
                );
                await delay(waitTime);
                // Extra wait to ensure all actions are complete before scrolling
                await delay(1000);
                // Scroll to the next post
                await page.evaluate(() => {
                    window.scrollBy(0, window.innerHeight);
                });
                postIndex++;
            } catch (error) {
                console.error(`Error interacting with post ${postIndex}:`, error);
                break;
            }
        }
    }

    async scrapeFollowers(targetAccount: string, maxFollowers: number) {
        if (!this.page) throw new Error("Page not initialized");
        const page = this.page;
        try {
            // Navigate to the target account's followers page
            await page.goto(`https://www.instagram.com/${targetAccount}/followers/`, {
                waitUntil: "networkidle2",
            });
            console.log(`Navigated to ${targetAccount}'s followers page`);

            // Wait for the followers modal to load (try robustly)
            try {
                await page.waitForSelector('div a[role="link"] span[title]');
            } catch {
                // fallback: wait for dialog
                await page.waitForSelector('div[role="dialog"]');
            }
            console.log("Followers modal loaded");

            const followers: string[] = [];
            let previousHeight = 0;
            let currentHeight = 0;
            maxFollowers = maxFollowers + 4;
            // Scroll and collect followers until we reach the desired amount or can't scroll anymore
            console.log(maxFollowers);
            while (followers.length < maxFollowers) {
                // Get all follower links in the current view
                const newFollowers = await page.evaluate(() => {
                    const followerElements =
                        document.querySelectorAll('div a[role="link"]');
                    return Array.from(followerElements)
                        .map((element) => element.getAttribute("href"))
                        .filter(
                            (href): href is string => href !== null && href.startsWith("/")
                        )
                        .map((href) => href.substring(1)); // Remove leading slash
                });

                // Add new unique followers to our list
                for (const follower of newFollowers) {
                    if (!followers.includes(follower) && followers.length < maxFollowers) {
                        followers.push(follower);
                        console.log(`Found follower: ${follower}`);
                    }
                }

                // Scroll the followers modal
                await page.evaluate(() => {
                    const dialog = document.querySelector('div[role="dialog"]');
                    if (dialog) {
                        dialog.scrollTop = dialog.scrollHeight;
                    }
                });

                // Wait for potential new content to load
                await delay(1000);

                // Check if we've reached the bottom
                currentHeight = await page.evaluate(() => {
                    const dialog = document.querySelector('div[role="dialog"]');
                    return dialog ? dialog.scrollHeight : 0;
                });

                if (currentHeight === previousHeight) {
                    console.log("Reached the end of followers list");
                    break;
                }

                previousHeight = currentHeight;
            }

            console.log(`Successfully scraped ${followers.length - 4} followers`);
            return followers.slice(4, maxFollowers);
        } catch (error) {
            console.error(`Error scraping followers for ${targetAccount}:`, error);
            throw error;
        }
    }

    public async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}

export async function scrapeFollowersHandler(targetAccount: string, maxFollowers: number) {
    const client = new IgClient();
    await client.init();
    const followers = await client.scrapeFollowers(targetAccount, maxFollowers);
    await client.close();
    return followers;
}