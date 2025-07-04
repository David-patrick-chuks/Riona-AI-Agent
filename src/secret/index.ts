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

export const geminiApiKeys = [
  process.env.GEMINI_API_KEY_1 || "API_KEY_1",
  process.env.GEMINI_API_KEY_2 || "API_KEY_2",
  process.env.GEMINI_API_KEY_3 || "API_KEY_3",
  process.env.GEMINI_API_KEY_4 || "API_KEY_4",
  process.env.GEMINI_API_KEY_5 || "API_KEY_5",
  process.env.GEMINI_API_KEY_6 || "API_KEY_6",
  process.env.GEMINI_API_KEY_7 || "API_KEY_7",
  process.env.GEMINI_API_KEY_8 || "API_KEY_8",
  process.env.GEMINI_API_KEY_9 || "API_KEY_9",
  process.env.GEMINI_API_KEY_10 || "API_KEY_10",
  process.env.GEMINI_API_KEY_11 || "API_KEY_11",
  process.env.GEMINI_API_KEY_12 || "API_KEY_12",
  process.env.GEMINI_API_KEY_13 || "API_KEY_13",
  process.env.GEMINI_API_KEY_14 || "API_KEY_14",
  process.env.GEMINI_API_KEY_15 || "API_KEY_15",
  process.env.GEMINI_API_KEY_16 || "API_KEY_16",
  process.env.GEMINI_API_KEY_17 || "API_KEY_17",
  process.env.GEMINI_API_KEY_18 || "API_KEY_18",
  process.env.GEMINI_API_KEY_19 || "API_KEY_19",
  process.env.GEMINI_API_KEY_20 || "API_KEY_20",
  process.env.GEMINI_API_KEY_21 || "API_KEY_21",
  process.env.GEMINI_API_KEY_22 || "API_KEY_22",
  process.env.GEMINI_API_KEY_23 || "API_KEY_23",
  process.env.GEMINI_API_KEY_24 || "API_KEY_24",
  process.env.GEMINI_API_KEY_25 || "API_KEY_25",
  process.env.GEMINI_API_KEY_26 || "API_KEY_26",
  process.env.GEMINI_API_KEY_27 || "API_KEY_27",
  process.env.GEMINI_API_KEY_28 || "API_KEY_28",
  process.env.GEMINI_API_KEY_29 || "API_KEY_29",
  process.env.GEMINI_API_KEY_30 || "API_KEY_30",
  process.env.GEMINI_API_KEY_31 || "API_KEY_31",
  process.env.GEMINI_API_KEY_32 || "API_KEY_32",
  process.env.GEMINI_API_KEY_33 || "API_KEY_33",
  process.env.GEMINI_API_KEY_34 || "API_KEY_34",
  process.env.GEMINI_API_KEY_35 || "API_KEY_35",
  process.env.GEMINI_API_KEY_36 || "API_KEY_36",
  process.env.GEMINI_API_KEY_37 || "API_KEY_37",
  process.env.GEMINI_API_KEY_38 || "API_KEY_38",
  process.env.GEMINI_API_KEY_39 || "API_KEY_39",
  process.env.GEMINI_API_KEY_40 || "API_KEY_40",
  process.env.GEMINI_API_KEY_41 || "API_KEY_41",
  process.env.GEMINI_API_KEY_42 || "API_KEY_42",
  process.env.GEMINI_API_KEY_43 || "API_KEY_43",
  process.env.GEMINI_API_KEY_44 || "API_KEY_44",
  process.env.GEMINI_API_KEY_45 || "API_KEY_45",
  process.env.GEMINI_API_KEY_46 || "API_KEY_46",
  process.env.GEMINI_API_KEY_47 || "API_KEY_47",
  process.env.GEMINI_API_KEY_48 || "API_KEY_48",
  process.env.GEMINI_API_KEY_49 || "API_KEY_49",
  process.env.GEMINI_API_KEY_50 || "API_KEY_50",
];

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