"use server";

import { listProjectsDB } from "../supabase/db";

export async function getQAProjects() {
  return await listProjectsDB();
}
