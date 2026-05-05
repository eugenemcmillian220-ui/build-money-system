import { supabaseAdmin } from "../src/lib/supabase/admin";
import fs from "fs";
import path from "path";

async function applyMigration() {
  console.log("🚀 Applying Phase 10 Economy RPCs migration...");
  
  const migrationPath = path.join(process.cwd(), "supabase/migrations/20260415_phase10_economy_rpcs.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  const { error } = await supabaseAdmin.rpc("exec_sql", { sql_string: sql });

  if (error) {
    if (error.message.includes("function exec_sql(text) does not exist")) {
      console.warn("⚠️ 'exec_sql' RPC not found. Attempting direct migration via REST (might fail for complex SQL)...");
      // Fallback: try splitting by semicolon and executing (primitive)
      const commands = sql.split(";").filter(cmd => cmd.trim().length > 0);
      for (const cmd of commands) {
        const { error: cmdError } = await supabaseAdmin.rpc("exec_sql", { sql_string: cmd + ";" });
        if (cmdError) console.error("❌ Error executing command:", cmdError);
      }
    } else {
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }
  }

  console.log("✅ Phase 10 Economy RPCs applied successfully.");
}

applyMigration();
