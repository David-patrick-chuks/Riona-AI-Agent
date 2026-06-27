const { loadEnv } = require('./load-env');
loadEnv();

const required = ['IGusername', 'IGpassword'];
const envMissing = required.filter((k) => !process.env[k]);
const databaseUrl = process.env.DATABASE_URL;
const dbRequired = (process.env.DB_REQUIRED || 'false').toLowerCase() === 'true';

if (envMissing.length) {
  console.error(`Missing env vars: ${envMissing.join(', ')}`);
  process.exit(1);
}

if (!databaseUrl) {
  const msg = 'DATABASE_URL is not set.';
  if (dbRequired) {
    console.error(`${msg} It is required, so the app will exit.`);
    process.exit(1);
  } else {
    console.warn(`${msg} Continuing without DB (file fallback for action logs).`);
  }
}

const geminiKeys = Object.keys(process.env).filter((k) => k.startsWith('GEMINI_API_KEY'));
if (!geminiKeys.length) {
  console.warn('No GEMINI_API_KEY found. AI features will fail without it.');
}

console.log('Setup check complete.');
