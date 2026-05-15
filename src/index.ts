import dotenv from "dotenv";
import logger from "./config/logger";
import { shutdown } from "./services";
import { setup_HandleError } from "./utils";
import { getBoolEnv } from "./utils/env";
import app from "./app";
import { initAgent } from "./Agent/index";
import { runAgents } from "./agentLoop";

dotenv.config();

async function startServer() {
  try {
    await initAgent();
  } catch (err) {
    logger.error("Error during agent initialization:", err);
    process.exit(1);
  }

  const port = process.env.PORT || 3000;
  const server = app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });

  if (getBoolEnv("IG_AGENT_ENABLED", false)) {
    runAgents().catch((error) => {
      setup_HandleError(error, "Error running agents:");
    });
  } else {
    logger.warn("Instagram automation is disabled. Set IG_AGENT_ENABLED=true to start the agent loop.");
  }

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM signal.");
    shutdown(server);
  });
  process.on("SIGINT", () => {
    logger.info("Received SIGINT signal.");
    shutdown(server);
  });
}

startServer();
