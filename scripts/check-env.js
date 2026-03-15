const required = ['IGusername', 'IGpassword', 'MONGODB_URI'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Env check passed');
