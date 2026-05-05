import { callLLMJson } from "../llm";
import { z } from "zod";

export const migrationResultSchema = z.object({
  sql: z.string(),
  description: z.string(),
  isDestructive: z.boolean(),
  entitiesAffected: z.array(z.string()),
});

export type MigrationResult = z.infer<typeof migrationResultSchema>;

/**
 * Phase 2: Neural Migrations - SQL Forge Agent
 * Generates safe SQL migrations based on changes in the manifestation's intent.
 */
export async function runSqlForge(currentSchema: string, intentChange: string): Promise<MigrationResult> {
  const systemPrompt = `You are 'The SQL Forge'. Your mission is to generate safe PostgreSQL migrations.
Analyze the current schema and the desired intent change. 
Generate the SQL 'ALTER' or 'CREATE' statements.

Current Schema:
${currentSchema || "No existing schema."}

Intent Change: "${intentChange}"

Rules:
1. Prefer additive changes (ADD COLUMN) over destructive ones.
2. Ensure RLS policies are considered.
3. Return valid SQL.

Return JSON ONLY:
{
  "sql": "...",
  "description": "Explanation of the migration.",
  "isDestructive": boolean,
  "entitiesAffected": ["table_name", "..."]
}`;

  try {
    return await callLLMJson(
      [{ role: "system", content: systemPrompt }],
      migrationResultSchema,
      { temperature: 0.1 }
    );
  } catch (err) {
    console.error("SQL Forge failed:", err);
    return {
      sql: "-- Manual SQL review required.",
      description: "Neural link error during SQL generation.",
      isDestructive: false,
      entitiesAffected: []
    };
  }
}
