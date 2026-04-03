import { hypeAgent } from "@/lib/hype-agent";
import { seoLoop } from "@/lib/seo-loop";
import { loadProjectFromStorage } from "@/lib/agent";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300; // Campaign generation can be slow

const requestSchema = z.object({
  projectId: z.string().uuid(),
  includeSEO: z.boolean().optional().default(true),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { projectId, includeSEO } = requestSchema.parse(body);

    const project = await loadProjectFromStorage(projectId);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    // 1. Generate and execute social campaign
    const posts = await hypeAgent.generateCampaign(project);
    const hypeResult = await hypeAgent.executeCampaign(projectId, posts);

    // 2. Generate and publish SEO articles
    let seoArticles = [];
    if (includeSEO) {
      seoArticles = await seoLoop.generateArticles(project, 2);
      await seoLoop.publishBatch(projectId, seoArticles);
    }

    return Response.json({
      success: true,
      campaignId: hypeResult.campaignId,
      postsCount: posts.length,
      seoArticlesCount: seoArticles.length,
    });
  } catch (error) {
    console.error("Hype campaign error:", error);
    return Response.json({ error: "Failed to launch campaign" }, { status: 500 });
  }
}
