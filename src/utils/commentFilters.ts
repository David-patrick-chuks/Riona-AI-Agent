import logger from '../config/logger';

export type CommentFilterConfig = {
  allow?: string[];
  deny?: string[];
  sentiment?: 'positive' | 'neutral' | 'any';
  minLength?: number;
  maxLength?: number;
};

export type CommentSentiment = NonNullable<CommentFilterConfig['sentiment']>;

const VALID_SENTIMENTS: CommentSentiment[] = ['positive', 'neutral', 'any'];

const normalize = (s: string) => s.toLowerCase();

export const parseCommentSentiment = (raw?: string): CommentSentiment => {
  const value = (raw || 'any').trim().toLowerCase();
  if (VALID_SENTIMENTS.includes(value as CommentSentiment)) {
    return value as CommentSentiment;
  }
  return 'any';
};

export const getCommentFilterConfig = (): CommentFilterConfig => {
  const allow = (process.env.IG_COMMENT_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const deny = (process.env.IG_COMMENT_DENYLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const rawSentiment = process.env.IG_COMMENT_SENTIMENT;
  const sentiment = parseCommentSentiment(rawSentiment);
  if (rawSentiment && sentiment === 'any' && rawSentiment.trim().toLowerCase() !== 'any') {
    logger.warn(
      `Invalid IG_COMMENT_SENTIMENT "${rawSentiment}". Expected any, positive, or neutral. Using "any".`,
    );
  }

  const minLength = process.env.IG_COMMENT_MIN_LENGTH
    ? parseInt(process.env.IG_COMMENT_MIN_LENGTH, 10)
    : undefined;
  const maxLength = process.env.IG_COMMENT_MAX_LENGTH
    ? parseInt(process.env.IG_COMMENT_MAX_LENGTH, 10)
    : undefined;

  return { allow, deny, sentiment, minLength, maxLength };
};

const positiveWords = [
  'love',
  'great',
  'amazing',
  'awesome',
  'nice',
  'beautiful',
  'cool',
  'dope',
  'fire',
  'perfect',
  'slay',
  'wow',
];

const negativeWords = [
  'hate',
  'bad',
  'terrible',
  'awful',
  'worst',
  'ugly',
  'boring',
  'stupid',
  'trash',
];

const hasAny = (text: string, list: string[]) =>
  list.some((w) => normalize(text).includes(normalize(w)));

const sentimentScore = (text: string) => {
  const lower = normalize(text);
  let score = 0;
  for (const w of positiveWords) if (lower.includes(w)) score++;
  for (const w of negativeWords) if (lower.includes(w)) score--;
  return score;
};

export const shouldSkipComment = (comment: string, cfg: CommentFilterConfig): boolean => {
  if (!comment) return true;

  const trimmed = comment.trim();
  if (!trimmed) return true;

  if (cfg.minLength && trimmed.length < cfg.minLength) return true;
  if (cfg.maxLength && trimmed.length > cfg.maxLength) return true;

  if (cfg.allow && cfg.allow.length > 0 && !hasAny(comment, cfg.allow)) return true;
  if (cfg.deny && cfg.deny.length > 0 && hasAny(comment, cfg.deny)) return true;

  if (cfg.sentiment && cfg.sentiment !== 'any') {
    const score = sentimentScore(comment);
    if (cfg.sentiment === 'positive' && score <= 0) return true;
    if (cfg.sentiment === 'neutral' && score < 0) return true;
  }

  return false;
};
