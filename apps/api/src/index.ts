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
{
  "name": "@riona/api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"
  }
}

{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "strict": true,
    "module": "commonjs",
    "target": "es2020"
  }
}

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

app.get('/hello', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

export default app;

});
