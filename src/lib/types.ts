import { z } from "zod";

export type FileMap = Record<string, string>;

export type AgentPhase = 'planning' | 'building' | 'testing' | 'fixing' | 'complete';

export type DeploymentStatus = 'pending' | 'building' | 'ready' | 'error' | 'cancelled';

export interface GenerationResult {
  files: FileMap;
  description?: string;
  timestamp: number;
  schema?: string;
  integrations?: string[];
  id?: string;
}

export const fileMapSchema: z.ZodType<FileMap> = z.record(
  z.string(),
  z.string().min(1, "File content cannot be empty"),
);

export const generationResultSchema: z.ZodType<GenerationResult> = z.object({
  files: fileMapSchema,
  description: z.string().optional(),
  timestamp: z.number(),
  schema: z.string().optional(),
  integrations: z.array(z.string()).optional(),
  id: z.string().optional(),
});

export interface ProjectStatus {
  phase: AgentPhase;
  currentPass: number;
  totalPasses: number;
  message: string;
}

export interface DeploymentInfo {
  id: string;
  url: string;
  status: DeploymentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface Project extends GenerationResult {
  id: string;
  createdAt: string;
  status?: ProjectStatus;
  deployment?: DeploymentInfo;
  githubRepo?: string;
}

export interface AppSpec {
  name: string;
  description: string;
  features: string[];
  pages: Array<{
    route: string;
    description: string;
    components: string[];
  }>;
  components: Array<{
    name: string;
    description: string;
    props?: Record<string, string>;
  }>;
  integrations: string[];
  schema?: string;
  fileStructure: string[];
}


export interface ValidationResult<T> {
  success: true;
  data: T;
  errors?: never;
}

export interface ValidationFailure {
  success: false;
  errors: string[];
}

export type ValidationResponse<T> = ValidationResult<T> | ValidationFailure;

export const singleFileRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt is too long"),
  stream: z.boolean().optional().default(false),
  multiFile: z.boolean().optional().default(false),
});

export type SingleFileRequest = z.infer<typeof singleFileRequestSchema>;

export const multiFileRequestSchema = singleFileRequestSchema.extend({
  multiFile: z.literal(true),
});

export type MultiFileRequest = z.infer<typeof multiFileRequestSchema>;

export type FileType = "tsx" | "ts" | "tsx-component" | "css" | "json" | "other";

export interface FileNode {
  name: string;
  path: string;
  type: FileType;
  isDirectory: boolean;
  children?: FileNode[];
  content?: string;
}

export interface AgentConfig {
  maxRetries: number;
  retryDelay: number;
  model: string;
  temperature: number;
  maxTokens: number;
}

export const defaultAgentConfig: AgentConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  model: "openai/gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 8192,
};

export function detectFileType(filename: string): FileType {
  if (filename.endsWith(".tsx") && !filename.includes("/")) {
    return "tsx-component";
  }
  if (filename.endsWith(".tsx")) return "tsx";
  if (filename.endsWith(".ts")) return "ts";
  if (filename.endsWith(".css")) return "css";
  if (filename.endsWith(".json")) return "json";
  return "other";
}

export function sortFileKeys(files: FileMap): string[] {
  const order = ["page.tsx", "layout.tsx", "loading.tsx", "error.tsx", "not-found.tsx"];
  return Object.keys(files).sort((a, b) => {
    const aIndex = order.indexOf(a.split("/").pop() ?? a);
    const bIndex = order.indexOf(b.split("/").pop() ?? b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
}

export function validateFilePaths(files: FileMap): ValidationResponse<FileMap> {
  const errors: string[] = [];
  
  for (const path of Object.keys(files)) {
    if (path.includes("..")) {
      errors.push(`Invalid path: ${path} - path traversal detected`);
    }
    if (!path.startsWith("app/") && !path.startsWith("components/") && !path.startsWith("lib/")) {
      errors.push(`Invalid path: ${path} - must start with app/, components/, or lib/`);
    }
  }
  
  if (errors.length > 0) {
    return { success: false, errors };
  }
  
  return { success: true, data: files };
}

export function extractMainComponent(files: FileMap): string | null {
  const priorityFiles = [
    "app/page.tsx",
    "components/Page.tsx",
    "components/Home.tsx",
    "components/Main.tsx",
    "index.tsx",
  ];
  
  for (const path of priorityFiles) {
    if (files[path]) {
      return files[path];
    }
  }
  
  const tsxFiles = Object.keys(files).filter(
    (path) => path.endsWith(".tsx") && !path.includes("layout") && !path.includes("loading")
  );
  
  return tsxFiles.length > 0 ? files[tsxFiles[0]] : null;
}
