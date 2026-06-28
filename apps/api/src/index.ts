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
  try {
{
  "dependencies": {
    "express": "^4.18.2"
  }
}
{
  "name": "@riona/api",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "strict": true
  },
  "include": ["src/**/*"]
}
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

app.use(express.json());

app.get('/hello', (req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
});
