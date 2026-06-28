import path from 'path';
import dotenv from 'dotenv';
import logger from './config/logger';
import { shutdown } from './services';
import app from './app';
import { initAgent } from './Agent/index';
import { validateRequiredSecrets } from './secret';
import { connectDB } from './config/db';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
dotenv.config({ quiet: true });
validateRequiredSecrets();

async function startServer() {
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/hello', (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

export default app;
  try {
    await initAgent();
  } catch (err) {
    logger.error('Error during agent initialization:', err);
    process.exit(1);
  }

  await connectDB();

  const server = app.listen(process.env.PORT || 3000, () => {
    logger.info(`Server is running on port ${process.env.PORT || 3000}`);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal.');
    shutdown(server);
  });
  process.on('SIGINT', () => {
    logger.info('Received SIGINT signal.');
    shutdown(server);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/hello', (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

export default app;
--- /dev/null
});
