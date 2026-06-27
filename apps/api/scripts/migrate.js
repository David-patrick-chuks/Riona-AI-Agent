const { loadEnv } = require('./load-env');
loadEnv();

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const schemaPath = path.join(__dirname, '../src/db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    await pool.query(sql);
    console.log('Database schema applied.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message || error);
  process.exit(1);
});
