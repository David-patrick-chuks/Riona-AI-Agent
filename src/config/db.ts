import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import logger from './logger';
import { getBoolEnv } from '../utils/env';

let pool: Pool | null = null;

export const isDbConnected = (): boolean => pool !== null;

export const getPool = (): Pool | null => pool;

const getSchemaPath = (): string => {
  const candidates = [
    path.join(process.cwd(), 'src', 'db', 'schema.sql'),
    path.join(__dirname, '../db/schema.sql'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`schema.sql not found. Checked: ${candidates.join(', ')}`);
  }
  return found;
};

const applySchema = async (client: Pool): Promise<void> => {
  const schemaPath = getSchemaPath();
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await client.query(sql);
};

export const connectDB = async (): Promise<boolean> => {
  const url = process.env.DATABASE_URL || '';
  const required = getBoolEnv('DB_REQUIRED', false);

  if (!url) {
    const msg = 'DATABASE_URL is not set. Skipping database connection.';
    if (required) {
      logger.error(msg);
      process.exit(1);
    } else {
      logger.warn(msg);
      return false;
    }
  }

  const connectWithRetry = async (retries = 5, delay = 5000): Promise<boolean> => {
    try {
      const nextPool = new Pool({
        connectionString: url,
        connectionTimeoutMillis: 60000,
      });
      await nextPool.query('SELECT 1');
      await applySchema(nextPool);
      pool = nextPool;
      logger.info('PostgreSQL connected');
      return true;
    } catch (error) {
      if (retries <= 0) {
        logger.error('PostgreSQL connection failed after multiple attempts:', error);
        if (required) {
          process.exit(1);
        }
        return false;
      }

      logger.warn(
        `PostgreSQL connection attempt failed. Retrying in ${delay / 1000} seconds... (${retries} attempts remaining)`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectWithRetry(retries - 1, delay);
    }
  };

  return connectWithRetry();
};

export const closeDB = async (): Promise<void> => {
  if (!pool) return;
  await pool.end().catch(() => undefined);
  pool = null;
};
