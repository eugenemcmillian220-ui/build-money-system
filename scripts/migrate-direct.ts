import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    console.error("❌ POSTGRES_URL is missing.");
    process.exit(1);
  }

  console.log("🚀 Connecting to Postgres...");
  const client = new Client({
    connectionString: postgresUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connected. Reading migration...");

    const migrationPath = path.join(process.cwd(), "supabase/migrations/20260415_phase10_economy_rpcs.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("⏳ Executing migration SQL...");
    await client.query(sql);
    
    console.log("✅ Migration applied successfully.");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
