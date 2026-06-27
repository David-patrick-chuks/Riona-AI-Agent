const { loadEnv } = require('./load-env');
loadEnv();

const required = ['IGusername', 'IGpassword'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Action logs will use file fallback.');
}

console.log('Env check passed');
