export const getBoolEnv = (key: string, defaultValue = false): boolean => {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  return raw.toLowerCase() === 'true' || raw === '1';
};

export const getNumberEnv = (key: string, defaultValue: number): number => {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};
