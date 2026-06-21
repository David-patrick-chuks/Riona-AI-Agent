const alwaysRequired = ['IGusername', 'IGpassword'];
const conditionallyRequired = process.env.MONGODB_REQUIRED !== 'false' ? ['MONGODB_URI'] : [];
const required = [...alwaysRequired, ...conditionallyRequired];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Env check passed');
