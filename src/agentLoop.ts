import logger from "./config/logger";
import { getIgClient, closeIgClient } from "./client/Instagram";
import { getNumberEnv } from "./utils/env";
import { getIgProfile } from "./config/igProfile";
import { setIgCooldown } from "./utils";

const runInstagramOnce = async (): Promise<void> => {
  const igClient = await getIgClient(process.env.IGusername, process.env.IGpassword);
  await igClient.interactWithPosts();
};

export const runAgents = async (): Promise<void> => {
  const profile = getIgProfile();
  const intervalMs = profile.intervalMs;

  while (true) {
    logger.info("Starting Instagram agent iteration...");
    let didRelogin = false;

    try {
      await runInstagramOnce();
      logger.info("Instagram agent iteration finished.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Instagram agent iteration failed:", error);

      const isAuthIssue =
        message.toLowerCase().includes("login") || message.toLowerCase().includes("challenge");

      if (isAuthIssue) {
        if (!didRelogin) {
          didRelogin = true;
          logger.warn("Attempting one re-login before stopping the loop...");
          try {
            await closeIgClient();
            await runInstagramOnce();
            logger.info("Re-login attempt succeeded.");
          } catch (retryError) {
            logger.error("Re-login attempt failed:", retryError);
            await setIgCooldown(getNumberEnv("IG_COOLDOWN_MINUTES", 60));
            logger.error("Stopping agent loop due to login/challenge requirement.");
            return;
          }
        } else {
          await setIgCooldown(getNumberEnv("IG_COOLDOWN_MINUTES", 60));
          logger.error("Stopping agent loop due to login/challenge requirement.");
          return;
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};
