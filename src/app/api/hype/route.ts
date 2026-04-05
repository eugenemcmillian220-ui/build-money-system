import { hypeAgent } from "@/lib/hype-agent";
import { seoLoop } from "@/lib/seo-loop";
import { mediaAgent } from "@/lib/media-agent";
import { adAgent } from "@/lib/ad-agent";
import { launchAgent } from "@/lib/launch-agent";
import { communityAgent } from "@/lib/community-agent";
import { loadProjectFromStorage } from "@/lib/agent";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300; // Campaign generation can be slow

const requestSchema = z.object({
  projectId: z.string().uuid(),
  includeSEO: z.boolean().optional().default(true),
  includeVideo: z.boolean().optional().default(true),
  includeAds: z.boolean().optional().default(false),
  includeLaunch: z.boolean().optional().default(false),
  communityPlatform: z.enum(["discord", "slack"]).optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { 
      projectId, 
      includeSEO, 
      includeVideo, 
      includeAds, 
      includeLaunch, 
      communityPlatform 
    } = requestSchema.parse(body);

    const project = await loadProjectFromStorage(projectId);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    // 1. Social Campaign (Hype Agent)
    const posts = await hypeAgent.generateCampaign(project);
    await hypeAgent.executeCampaign(projectId, posts);

    // 2. SEO Content (SEO Loop)
    if (includeSEO) {
      const seoArticles = await seoLoop.generateArticles(project, 2);
      await seoLoop.publishBatch(projectId, seoArticles);
    }

    // 3. Video Shorts (Media Agent)
    if (includeVideo) {
      const scripts = await mediaAgent.generateVideoContent(project);
      await mediaAgent.saveScripts(projectId, scripts);
    }

    // 4. Paid Ads (Ad Agent)
    if (includeAds) {
      const ads = await adAgent.generateAdCampaign(project);
      await adAgent.launchCampaign(projectId, ads);
    }

    // 5. Community Launch (Launch Agent)
    if (includeLaunch) {
      const plans = await launchAgent.prepareLaunches(project);
      await launchAgent.scheduleLaunches(projectId, plans);
    }

    // 6. Community Deployment (Community Agent)
    if (communityPlatform) {
      await communityAgent.deployChannel(projectId, communityPlatform, "external_mock_id");
    }

    return Response.json({
      success: true,
      message: "Full Growth Suite orchestration complete.",
    });
  } catch (error) {
    console.error("Hype campaign error:", error);
    return Response.json({ error: "Failed to launch campaign" }, { status: 500 });
  }
}
