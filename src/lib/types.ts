import { z } from "zod";

export type FileMap = Record<string, string>;

export type AgentPhase = 'planning' | 'vision' | 'building' | 'testing' | 'fixing' | 'complete';

export type DeploymentStatus = 'pending' | 'building' | 'ready' | 'error' | 'cancelled';

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<MessageContent>;
}

export type MessageContent = 
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface GenerationResult {
  files: FileMap;
  description?: string;
  prompt?: string;
  timestamp?: number;
  schema?: string;
  integrations?: string[];
  id?: string;
  abTest?: {
    name: string;
    hypothesis: string;
    variantB: FileMap;
  };
}

export const fileMapSchema: z.ZodType<FileMap> = z.record(
  z.string(),
  z.string().min(1, "File content cannot be empty"),
);

/**
 * Coerces `schema` to a string. LLMs occasionally return a structured
 * object for `schema` (e.g. `{ tables: [...] }`) instead of the SQL
 * string the pipeline expects. Stringify it so downstream code that
 * treats `schema` as text (migrations, Supabase sync) keeps working.
 */
const schemaStringField = z.preprocess((v) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}, z.string().optional());

export const generationResultSchema = z.object({
  files: fileMapSchema,
  description: z.string().optional(),
  prompt: z.string().optional(),
  timestamp: z.number().optional(),
  schema: schemaStringField,
  integrations: z.array(z.string()).optional(),
  id: z.string().optional(),
}) as unknown as z.ZodType<GenerationResult>;

/**
 * Schema for validating LLM responses - timestamp is omitted as it's added after validation
 */
export const llmResponseSchema = z.object({
  files: fileMapSchema,
  description: z.string().optional(),
  schema: schemaStringField,
  integrations: z.array(z.string()).optional(),
});

export type IntentClassification = z.infer<typeof intentClassificationSchema>;
export type ScoutResult = z.infer<typeof scoutResultSchema>;
export type ChroniclerResult = z.infer<typeof chroniclerResultSchema>;
export type HeraldResult = z.infer<typeof heraldResultSchema>;
export type PhantomResult = z.infer<typeof phantomResultSchema>;
export type SecurityResult = z.infer<typeof securityResultSchema>;

export interface ManifestOptions extends Record<string, unknown> {
  mode?: string;
  protocol?: string;
  theme?: string;
  primaryColor?: string;
}

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

export interface ProjectManifest {
  mode: string;
  protocol: string;
  strategy?: string;
  docs?: ChroniclerResult;
  simulation?: PhantomResult;
  launch?: HeraldResult;
  visuals?: {
    theme: "dark" | "light" | "system";
    primaryColor: string;
    fontFamily: string;
  };
  security?: SecurityResult & {
    auditLog: string[];
    lastScanAt: string;
  };
  sentinel?: {
    vulnerabilitiesFixed: string[];
    penetrationLog: string[];
    hardeningScore: number;
  };
  economy?: {
    agentRoi: number;
    stakingAvailable: boolean;
    suggestedStake: number;
    estimatedMonthlyRevenue: number;
  };
  broker?: {
    mergerPotential: Array<{
      targetProjectId: string;
      compatibility: number;
      strategy: string;
    }>;
    negotiationStrategy: string;
  };
  legal?: {
    patentDraft: string;
    tos: string;
    privacyPolicy: string;
    status: "drafted" | "filed" | "verified";
  };
  monetization?: {
    affiliateCut: number;
    revenueShareActive: boolean;
  };
  lifecycle?: {
    blueprintId?: string;
    uxDrift?: number;
    lastSimulationAt?: string;
  };
  qa?: {
    status: "pass" | "fail" | "running" | "idle";
    lastRunAt?: string;
    reportUrl?: string;
    errors?: string[];
    screenshotUrl?: string;
  };
}

export interface Project extends GenerationResult {
  id: string;
  name?: string;
  createdAt: string;
  orgId?: string;
  status?: ProjectStatus;
  deployment?: DeploymentInfo;
  githubRepo?: string;
  manifest?: ProjectManifest;
  metadata?: Record<string, unknown>;
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
  visuals?: {
    theme: string;
    primaryColor: string;
  };
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
  prompt: z.string().min(1, "Prompt is required").max(100000, "Prompt is too long"),
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
  enablePIIScanning: boolean;
}

export const defaultAgentConfig: AgentConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  model: "openai/gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 16384,
  enablePIIScanning: true,
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
    if (path.includes("../") || path.startsWith("..")) {
      errors.push(`Invalid path: ${path} - path traversal detected`);
    }
    if (
      !path.startsWith("app/") &&
      !path.startsWith("components/") &&
      !path.startsWith("lib/") &&
      !path.startsWith("supabase/")
    ) {
      errors.push(`Invalid path: ${path} - must start with app/, components/, lib/, or supabase/`);
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

// ─── Phase 19/20: Agent Output Schemas ────────────────────────────────────────

export const intentClassificationSchema = z.object({
  mode: z.enum(["elite", "universal", "nano"]),
  protocol: z.string(),
  infrastructure: z.object({
    database: z.enum(["supabase", "neon", "turso"]),
    auth: z.enum(["supabase", "clerk", "better-auth"]),
    payments: z.enum(["stripe", "lemon-squeezy", "coinbase"]),
  }),
});

export const scoutResultSchema = z.object({
  strategyMarkdown: z.string(),
  recommendedStack: z.array(z.string()),
  competitorInsights: z.string(),
});

export const chroniclerResultSchema = z.object({
  readme: z.string(),
  architecture: z.string(),
  apiDocs: z.string(),
}).passthrough();

export const heraldResultSchema = z.object({
  socialThread: z.object({
    hook: z.string(),
    posts: z.array(z.string()),
  }),
  productHunt: z.object({
    tagline: z.string(),
    description: z.string(),
    makerComment: z.string(),
  }),
  seoArticle: z.object({
    title: z.string(),
    content: z.string(),
    keywords: z.array(z.string()),
  }),
  hypeEngine: z.object({
    launchSites: z.array(z.object({
      name: z.string(),
      url: z.string(),
      strategy: z.string(),
    })),
    viralHooks: z.array(z.string()),
  }).optional(),
  socialPosts: z.array(z.object({
    platform: z.string(),
    hook: z.string(),
  })).optional(),
}).passthrough();

export const phantomResultSchema = z.object({
  uxScore: z.number().min(0).max(100),
  frictionPoints: z.array(z.string()),
  recommendations: z.array(z.string()),
}).passthrough();

export const securityResultSchema = z.object({
  score: z.number().min(0).max(100),
  vulnerabilities: z.array(z.object({
    severity: z.enum(["low", "medium", "high", "critical"]),
    type: z.string(),
    description: z.string(),
    file: z.string().optional(),
    fix: z.string().optional(),
  })),
  recommendations: z.array(z.string()),
}).passthrough();

export const sentinelResultSchema = z.object({
  vulnerabilitiesFixed: z.array(z.string()),
  penetrationLog: z.array(z.string()),
  hardeningScore: z.number(),
});

export const economyResultSchema = z.object({
  agentRoi: z.number(),
  stakingAvailable: z.boolean(),
  suggestedStake: z.number(),
  estimatedMonthlyRevenue: z.number(),
});

export const brokerResultSchema = z.object({
  mergerPotential: z.array(z.object({
    targetProjectId: z.string(),
    compatibility: z.number(),
    strategy: z.string(),
  })),
  negotiationStrategy: z.string(),
});

export const legalResultSchema = z.object({
  patentDraft: z.string(),
  tos: z.string(),
  privacyPolicy: z.string(),
  status: z.enum(["drafted", "filed", "verified"]),
});

// ─── Phase 6: Autonomous AI Company Builder ──────────────────────────────────

export type IdeaVerdict = 'Promising' | 'Needs Work' | 'Not Viable';
export type MarketSize = 'small' | 'medium' | 'large';
export type CompetitionLevel = 'low' | 'medium' | 'high';
export type TeamRole = 'pm' | 'engineer' | 'designer' | 'marketer' | 'analyst';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';
export type PaymentStatus = 'succeeded' | 'failed' | 'pending';
export type ListingStatus = 'active' | 'paused' | 'removed';

export interface IdeaValidationResult {
  idea: string;
  score: number;
  verdict: IdeaVerdict;
  risks: string[];
  suggestions: string[];
  marketSize: MarketSize;
  competitionLevel: CompetitionLevel;
  timestamp: string;
}

export interface ProductPlan {
  idea: string;
  features: string[];
  stack: {
    frontend: string[];
    backend: string[];
    database: string[];
    infrastructure: string[];
  };
  timeline: string;
  mvpFeatures: string[];
  phases: Array<{ name: string; duration: string; deliverables: string[] }>;
  timestamp: string;
}

export interface GrowthStrategy {
  idea: string;
  channels: Array<{
    name: string;
    type: 'organic' | 'paid' | 'viral' | 'partnership';
    estimatedReach: string;
    costLevel: 'free' | 'low' | 'medium' | 'high';
    timeToResult: string;
  }>;
  strategy: string;
  estimatedReach: string;
  estimatedReachNumber: number;
  tactics: string[];
  kpis: string[];
  timeline: string;
  timestamp: string;
}

export interface MonetizationPlan {
  idea: string;
  models: string[];
  pricingTiers: Array<{
    name: string;
    price: string;
    priceMonthly: number;
    features: string[];
    recommended: boolean;
  }>;
  pricing: string;
  upsells: Array<{ name: string; description: string; additionalRevenue: string }>;
  projectedMRR: string;
  revenueStreams: string[];
  timestamp: string;
}

export interface AITeamResult {
  role: TeamRole;
  result: string;
  artifacts: string[];
  completedAt: string;
}

export interface CompanyBuildResult {
  idea: string;
  validation: IdeaValidationResult;
  plan: ProductPlan;
  teamOutput: AITeamResult[];
  growth: GrowthStrategy;
  revenue: MonetizationPlan;
  buildId: string;
  completedAt: string;
  viable: boolean;
}

export interface MarketplaceListing {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  sellerId: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  purchaseCount: number;
  rating: number;
  reviewCount: number;
  status: ListingStatus;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: { id: string; name: string; priceMonthly: number; priceYearly: number; features: string[] };
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdAt: string;
  cancelledAt?: string;
}
