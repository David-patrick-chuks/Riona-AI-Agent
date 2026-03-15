const required = ['IGusername', 'IGpassword'];
const envMissing = required.filter((k) => !process.env[k]);
const mongoUri = process.env.MONGODB_URI;
const mongoRequired = (process.env.MONGODB_REQUIRED || 'false').toLowerCase() === 'true';

if (envMissing.length) {
  console.error(`Missing env vars: ${envMissing.join(', ')}`);
  process.exit(1);
}

if (!mongoUri) {
  const msg = 'MONGODB_URI is not set.';
  if (mongoRequired) {
    console.error(`${msg} It is required, so the app will exit.`);
    process.exit(1);
  } else {
    console.warn(`${msg} Continuing without DB.`);
  }
}

const geminiKeys = Object.keys(process.env).filter((k) => k.startsWith('GEMINI_API_KEY'));
if (!geminiKeys.length) {
  console.warn('No GEMINI_API_KEY found. AI features will fail without it.');
}

console.log('Setup check complete.');
