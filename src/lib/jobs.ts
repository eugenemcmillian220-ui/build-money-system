import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "timeout";

export interface ManifestJob {
  id: string;
  user_id: string;
  prompt: string;
  current_stage: string;
  progress: number;
  status: JobStatus;
  state_snapshot?: Record<string, unknown>;
  resume_token?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export async function createManifestJob(
  userId: string,
  prompt: string,
): Promise<ManifestJob> {
  const { data, error } = await supabaseAdmin
    .from("manifest_jobs")
    .insert({
      user_id: userId,
      prompt,
      current_stage: "classifier",
      status: "pending",
      progress: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ManifestJob;
}

export async function updateJob(
  jobId: string,
  updates: Partial<Omit<ManifestJob, "id">>,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("manifest_jobs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) throw error;
}

export async function getJob(jobId: string): Promise<ManifestJob | null> {
  const { data } = await supabaseAdmin
    .from("manifest_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  return (data as ManifestJob | null) ?? null;
}
