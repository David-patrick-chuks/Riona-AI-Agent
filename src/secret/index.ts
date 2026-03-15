import dotenv from "dotenv";
import jwt from 'jsonwebtoken';
import { Request } from 'express';
dotenv.config();

export const IGusername: string = process.env.IGusername || "default_IGusername";
export const IGpassword: string = process.env.IGpassword || "default_IGpassword";
export const Xusername: string = process.env.Xusername || "default_Xusername";
export const Xpassword: string = process.env.Xpassword || "default_Xpassword";

export const TWITTER_API_CREDENTIALS = {
  appKey: process.env.TWITTER_API_KEY || "default_TWITTER_API_KEY",
  appSecret: process.env.TWITTER_API_SECRET || "default_TWITTER_API_SECRET",
  accessToken: process.env.TWITTER_ACCESS_TOKEN || "default TWITTER_ACCESS_TOKEN",
  accessTokenSecret: process.env.TWITTER_ACCESS_SECRET || "default_TWITTER_ACCESS_SECRET",
  bearerToken: process.env.TWITTER_BEARER_TOKEN || "default_TWITTER_BEARER_TOKEN",
}

const isRealKey = (value?: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^API_KEY_\d+$/i.test(trimmed)) return false;
  if (trimmed.toLowerCase().startsWith("your_")) return false;
  return true;
};

const numberedKeys = Object.keys(process.env)
  .filter((k) => k.startsWith("GEMINI_API_KEY_"))
  .map((k) => ({ key: k, index: Number(k.replace("GEMINI_API_KEY_", "")) }))
  .filter((k) => !Number.isNaN(k.index))
  .sort((a, b) => a.index - b.index)
  .map((k) => process.env[k.key])
  .filter(isRealKey) as string[];

const primaryKey = isRealKey(process.env.GEMINI_API_KEY)
  ? [process.env.GEMINI_API_KEY as string]
  : [];

export const geminiApiKeys = [...primaryKey, ...numberedKeys];

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '2h';

export function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookie = req.headers['cookie'];
  if (cookie) {
    const match = cookie.match(/token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}
