export type CommentFilterConfig = {
  allow?: string[];
  deny?: string[];
  sentiment?: 'positive' | 'neutral' | 'any';
};

const normalize = (s: string) => s.toLowerCase();

export const getCommentFilterConfig = (): CommentFilterConfig => {
  const allow = (process.env.IG_COMMENT_ALLOWLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const deny = (process.env.IG_COMMENT_DENYLIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const sentiment = (process.env.IG_COMMENT_SENTIMENT || 'any').toLowerCase() as
    | 'positive'
    | 'neutral'
    | 'any';
  return { allow, deny, sentiment };
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

  if (cfg.allow && cfg.allow.length > 0 && !hasAny(comment, cfg.allow)) return true;
  if (cfg.deny && cfg.deny.length > 0 && hasAny(comment, cfg.deny)) return true;

  if (cfg.sentiment && cfg.sentiment !== 'any') {
    const score = sentimentScore(comment);
    if (cfg.sentiment === 'positive' && score <= 0) return true;
    if (cfg.sentiment === 'neutral' && score < 0) return true;
  }

  return false;
};
