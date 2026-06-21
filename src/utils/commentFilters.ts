export type CommentFilterConfig = {
  allow?: string[];
  deny?: string[];
  sentiment?: 'positive' | 'neutral' | 'any';
  minLength?: number;
  maxLength?: number;
};

const normalize = (s: string) => s.toLowerCase();

const parseList = (value: string): string[] =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const parseSentiment = (value: string): 'positive' | 'neutral' | 'any' => {
  const normalized = value.toLowerCase();
  if (normalized === 'positive' || normalized === 'neutral' || normalized === 'any') {
    return normalized;
  }
  return 'any';
};

const parseNumber = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export const getCommentFilterConfig = (): CommentFilterConfig => {
  const allow = parseList(process.env.IG_COMMENT_ALLOWLIST || '');
  const deny = parseList(process.env.IG_COMMENT_DENYLIST || '');
  const sentiment = parseSentiment(process.env.IG_COMMENT_SENTIMENT || 'any');
  const minLength = parseNumber(process.env.IG_COMMENT_MIN_LENGTH);
  const maxLength = parseNumber(process.env.IG_COMMENT_MAX_LENGTH);
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
